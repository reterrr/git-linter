/**
 * @file Lint rules for commit message validation.
 * @remarks IO boundary: All functions are pure, no side effects.
 */

import type { Issue, ParsedCommit, RuleId, Severity, FixAction, CommitType } from './types.js';
import { VALID_TYPES } from './types.js';
import { hasBodyWithoutBlankLine } from './parser.js';

/** Localized messages for lint rules */
const MESSAGES = {
    R1_EMPTY:  'Nagłówek musi istnieć i nie być pusty',
    R2_MISSING:  'Brak typu commita.  Dozwolone: ',
    R2_LOWERCASE: (t: string) => `Typ "${t}" powinien być małymi literami`,
    R2_INVALID:  (t: string) => `Nieprawidłowy typ "${t}". Dozwolone: `,
    R3_INVALID: (s: string) => `Zakres "${s}" musi być w formacie kebab-case lub snake_case (litery, cyfry, -, _)`,
    R4_MISSING_COLON: 'Brak dwukropka po typie/zakresie',
    R5_EMPTY_SUBJECT: 'Temat nie może być pusty',
    R6_TRAILING_PERIOD: 'Temat nie powinien kończyć się kropką',
    R7_TOO_LONG: (len: number) => `Nagłówek za długi (${len} znaków). Maksimum to 100. `,
    R7_WARN:  (len: number) => `Długość nagłówka (${len} znaków) przekracza zalecane 72. `,
    R8_BLANK_LINE: 'Treść musi być oddzielona od nagłówka pustą linią',
    R9_LINE_LONG: (n: number, len: number) => `Linia ${n} przekracza 100 znaków (${len})`
};

/**
 * Creates an Issue object.
 * @remarks Pure function, factory pattern for immutable data construction.
 */
const createIssue = (
    rule: RuleId,
    severity: Severity,
    message: string,
    fix:  FixAction | null = null
): Issue => Object.freeze({ rule, severity, message, fix });

/**
 * Checks if a string matches a valid commit type (case-insensitive).
 */
const isValidTypeCaseInsensitive = (s: string): boolean =>
    VALID_TYPES. includes(s.toLowerCase() as CommitType);

/**
 * Checks if a string is exactly a valid commit type.
 */
const isValidType = (s:  string): s is CommitType =>
    VALID_TYPES. includes(s as CommitType);

/**
 * Validates scope format (kebab-case or snake_case).
 */
const isValidScope = (scope: string): boolean =>
    /^[a-z0-9]+(?: [-_][a-z0-9]+)*$/i.test(scope);

// ============ Individual Rule Checks ============

const checkR1HeaderExists = (parsed: ParsedCommit): Issue | null =>
    parsed.header.trim() === ''
        ? createIssue('R1', 'error', MESSAGES.R1_EMPTY)
        : null;

const checkR2ValidType = (parsed: ParsedCommit): Issue | null => {
    if (parsed.type === null) {
        return createIssue(
            'R2',
            'error',
            MESSAGES. R2_MISSING + VALID_TYPES.join(', '),
            { kind: 'require-user-choice', choiceType: 'type' }
        );
    }

    if (isValidType(parsed.type)) return null;

    if (isValidTypeCaseInsensitive(parsed.type)) {
        return createIssue(
            'R2',
            'error',
            MESSAGES.R2_LOWERCASE(parsed.type),
            { kind: 'lowercase-type', original: parsed.type }
        );
    }

    return createIssue(
        'R2',
        'error',
        MESSAGES.R2_INVALID(parsed.type) + VALID_TYPES.join(', '),
        { kind: 'require-user-choice', choiceType: 'type' }
    );
};

const checkR3ValidScope = (parsed: ParsedCommit): Issue | null => {
    if (parsed.scope === null || parsed.scope === '') return null;

    return isValidScope(parsed.scope)
        ? null
        : createIssue('R3', 'error', MESSAGES.R3_INVALID(parsed.scope));
};

const checkR4ColonPresent = (parsed: ParsedCommit): Issue | null =>
    parsed.type !== null && ! parsed.hasColon
        ?  createIssue('R4', 'error', MESSAGES.R4_MISSING_COLON, { kind: 'insert-colon' })
        : null;

const checkR5SubjectNonEmpty = (parsed: ParsedCommit): Issue | null =>
    parsed.type !== null && parsed.hasColon && (parsed.subject === null || parsed. subject === '')
        ? createIssue('R5', 'error', MESSAGES.R5_EMPTY_SUBJECT)
        : null;

const checkR6TrailingPeriod = (parsed: ParsedCommit): Issue | null =>
    parsed.subject?. endsWith('.')
        ? createIssue('R6', 'warning', MESSAGES.R6_TRAILING_PERIOD, { kind: 'remove-trailing-period' })
        : null;

const checkR7HeaderLength = (parsed: ParsedCommit): Issue | null => {
    const len = parsed.header.length;

    if (len > 100) {
        return createIssue('R7', 'error', MESSAGES.R7_TOO_LONG(len));
    }

    if (len > 72) {
        return createIssue('R7', 'warning', MESSAGES.R7_WARN(len));
    }

    return null;
};

const checkR8BlankLineBeforeBody = (parsed: ParsedCommit): Issue | null =>
    hasBodyWithoutBlankLine(parsed.lines)
        ? createIssue('R8', 'error', MESSAGES.R8_BLANK_LINE, { kind: 'ensure-blank-line' })
        : null;

const createR9LineChecks = (
    parsed: ParsedCommit
): ReadonlyArray<(p: ParsedCommit) => Issue | null> =>
    parsed.lines.map((line, index) => () =>
        line.length > 100
            ? createIssue(
                'R9',
                'error',
                MESSAGES. R9_LINE_LONG(index + 1, line.length),
                { kind: 'wrap-long-line', lineIndex:  index }
            )
            : line.length > 75
                ? createIssue(
                    'R9',
                    'warning',
                    MESSAGES.R9_LINE_LONG(index + 1, line. length),
                    { kind:  'wrap-long-line', lineIndex: index }
                )
                : null
    );

// ============ Main Lint Function ============

/**
 * Lints a parsed commit message against all rules.
 * @param parsed - Structured parsed commit data
 * @returns Readonly array of issues found
 * @remarks Pure function, composition of individual rule checks.
 */
export const lintCommit = (parsed: ParsedCommit): ReadonlyArray<Issue> => {
    const rules:  ReadonlyArray<(p:  ParsedCommit) => Issue | null> = [
        checkR1HeaderExists,
        checkR2ValidType,
        checkR3ValidScope,
        checkR4ColonPresent,
        checkR5SubjectNonEmpty,
        checkR6TrailingPeriod,
        checkR7HeaderLength,
        checkR8BlankLineBeforeBody,
        ... createR9LineChecks(parsed)
    ];

    return Object.freeze(
        rules
            .map(rule => rule(parsed))
            .filter((issue): issue is Issue => issue !== null)
    );
};

/**
 * Checks if any issue requires user choice.
 */
export const requiresUserChoice = (issues: ReadonlyArray<Issue>): boolean =>
    issues.some(issue => issue.fix?. kind === 'require-user-choice');

/**
 * Gets required choice types from issues.
 */
export const getRequiredChoices = (
    issues: ReadonlyArray<Issue>
): ReadonlyArray<'type'> =>
    Object.freeze(
        issues
            .filter(issue => issue.fix?.kind === 'require-user-choice')
            .map(issue => (issue.fix as { kind: 'require-user-choice'; choiceType: 'type' }).choiceType)
            .filter((v, i, a) => a.indexOf(v) === i)
    );