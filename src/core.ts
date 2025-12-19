/**
 * @file Pure functional core for commit message parsing, linting, and fixing.
 * @remarks IO boundary: This module contains zero side effects.  All functions are pure.
 */

/** Valid commit types per Conventional Commits specification */
export const VALID_TYPES = [
    'feat', 'fix', 'docs', 'style', 'refactor',
    'perf', 'test', 'build', 'ci', 'chore', 'revert'
] as const;

export type CommitType = typeof VALID_TYPES[number];

/** Severity levels for lint issues */
export type Severity = 'error' | 'warning';

/** Rule identifiers for all implemented lint rules */
export type RuleId = 'R1' | 'R2' | 'R3' | 'R4' | 'R5' | 'R6' | 'R7' | 'R8' | 'R9';

const MESSAGES = {
    R1_EMPTY: 'Nagłówek musi istnieć i nie być pusty',
    R2_MISSING: 'Brak typu commita.  Dozwolone: ',
    R2_LOWERCASE: (t: string) => `Typ "${t}" powinien być małymi literami`,
    R2_INVALID: (t: string) => `Nieprawidłowy typ "${t}". Dozwolone: `,
    R3_INVALID: (s: string) => `Zakres "${s}" musi być w formacie kebab-case lub snake_case (litery, cyfry, -, _)`,
    R4_MISSING_COLON: 'Brak dwukropka po typie/zakresie',
    R5_EMPTY_SUBJECT: 'Temat nie może być pusty',
    R6_TRAILING_PERIOD: 'Temat nie powinien kończyć się kropką',
    R7_TOO_LONG: (len: number) => `Nagłówek za długi (${len} znaków). Maksimum to 100. `,
    R7_WARN: (len: number) => `Długość nagłówka (${len} znaków) przekracza zalecane 72. `,
    R8_BLANK_LINE: 'Treść musi być oddzielona od nagłówka pustą linią',
    R9_LINE_LONG: (n: number, len: number) => `Linia ${n} przekracza 100 znaków (${len})`
};

/**
 * Discriminated union for fix action types.
 * @remarks Discriminated unions enable exhaustive pattern matching and type-safe fix handling.
 */
export type FixAction =
    | { readonly kind: 'trim-whitespace' }
    | { readonly kind: 'lowercase-type'; readonly original: string }
    | { readonly kind: 'insert-colon' }
    | { readonly kind: 'remove-trailing-period' }
    | { readonly kind: 'ensure-blank-line' }
    | { readonly kind: 'wrap-long-line'; readonly lineIndex: number }
    | { readonly kind: 'require-user-choice'; readonly choiceType: 'type' };

/** Represents a single lint issue with optional auto-fix */
export interface Issue {
    readonly rule: RuleId;
    readonly severity: Severity;
    readonly message: string;
    readonly fix: FixAction | null;
}

/**
 * Discriminated union for parse results.
 * @remarks Data-first design:  parsing produces structured data for downstream pure transformations.
 */
export type ParseResult =
    | { readonly ok: true; readonly parsed: ParsedCommit }
    | { readonly ok: false; readonly error: string };

/** Structured representation of a parsed commit message */
export interface ParsedCommit {
    readonly raw: string;
    readonly header: string;
    readonly type: string | null;
    readonly scope: string | null;
    readonly subject: string | null;
    readonly hasColon: boolean;
    readonly body: string | null;
    readonly lines: ReadonlyArray<string>;
}

/** User choices for ambiguous fixes */
export interface UserChoices {
    readonly type?: CommitType;
}

/**
 * Checks if a string matches a valid commit type (case-insensitive).
 * @param s - The string to check
 * @returns True if s matches a valid type case-insensitively
 * @remarks Pure function, total function (defined for all string inputs).
 */
const isValidTypeCaseInsensitive = (s: string): boolean =>
    VALID_TYPES.includes(s.toLowerCase() as CommitType);

/**
 * Checks if a string is exactly a valid commit type.
 * @param s - The string to check
 * @returns True if s is a valid lowercase commit type
 * @remarks Pure function, total function.
 */
const isValidType = (s: string): s is CommitType =>
    VALID_TYPES.includes(s as CommitType);

/**
 * Validates scope format (kebab-case or snake_case).
 * @param scope - The scope string to validate
 * @returns True if scope matches allowed pattern
 * @remarks Pure function using regex pattern matching.
 */
const isValidScope = (scope: string): boolean =>
    /^[a-z0-9]+(?: [-_][a-z0-9]+)*$/i.test(scope);

/**
 * Parses a commit message into structured components.
 * @param text - Raw commit message text
 * @returns ParseResult discriminated union
 * @remarks Pure function, immutable transformations, data-first design.
 * Extracts header, type, scope, subject, and body from raw text.
 */
export const parseCommitMessage = (text: string): ParseResult => {
    const trimmed = text.trim();

    if (trimmed.length === 0) {
        return {ok: false, error: 'Pusta wiadomość commita'};
    }

    const lines = trimmed.split('\n');
    const header = lines[0] ?? '';

    /**
     * Header pattern: type(scope)?:  subject
     * Captures:  type, optional scope (with parens), colon presence, subject
     */
    const headerPattern = /^([a-zA-Z]+)(?:\(([^)]*)\))?(\s*: ?\s*)(.*)$/;
    const match = header.match(headerPattern);

    let type: string | null = null;
    let scope: string | null = null;
    let subject: string | null = null;
    let hasColon = false;

    if (match) {
        type = match[1] ?? null;
        scope = match[2] ?? null;
        const colonPart = match[3] ?? '';
        hasColon = colonPart.includes(':');
        subject = (match[4] ?? '').trim() || null;
    } else {
        subject = header.trim() || null;
    }

    const bodyStartIndex = findBodyStartIndex(lines);
    const body = bodyStartIndex !== null
        ? lines.slice(bodyStartIndex).join('\n').trim() || null
        : null;

    return {
        ok: true,
        parsed: {
            raw: text,
            header,
            type,
            scope,
            subject,
            hasColon,
            body,
            lines: Object.freeze([...lines])
        }
    };
};

/**
 * Finds the index where the body starts (after blank line).
 * @param lines - Array of commit message lines
 * @returns Index of first body line, or null if no body
 * @remarks Pure function, immutable input handling.
 */
const findBodyStartIndex = (lines: ReadonlyArray<string>): number | null => {
    if (lines.length < 2) return null;

    const blankLineIndex = lines.findIndex((line, i) => i > 0 && line.trim() === '');

    if (blankLineIndex === -1) return null;
    if (blankLineIndex >= lines.length - 1) return null;

    const hasNonEmptyAfterBlank = lines
        .slice(blankLineIndex + 1)
        .some(line => line.trim() !== '');

    return hasNonEmptyAfterBlank ? blankLineIndex + 1 : null;
};

/**
 * Checks if body exists without proper blank line separation.
 * @param lines - Array of commit message lines
 * @returns True if there's content after header without blank separator
 * @remarks Pure function analyzing line structure.
 */
const hasBodyWithoutBlankLine = (lines: ReadonlyArray<string>): boolean => {
    if (lines.length < 2) return false;

    const secondLine = lines[1] ?? '';
    return secondLine.trim() !== '';
};

/**
 * Creates an Issue object.
 * @param rule - Rule identifier
 * @param severity - Error or warning severity
 * @param message - Human-readable issue description
 * @param fix - Optional fix action
 * @returns Frozen Issue object
 * @remarks Pure function, factory pattern for immutable data construction.
 */
const createIssue = (
    rule: RuleId,
    severity: Severity,
    message: string,
    fix: FixAction | null = null
): Issue => Object.freeze({rule, severity, message, fix});

/**
 * Lints a parsed commit message against all rules.
 * @param parsed - Structured parsed commit data
 * @returns Readonly array of issues found
 * @remarks Pure function, composition of individual rule checks,
 * higher-order function pattern via reduce, immutable result array.
 */
export const lintCommit = (parsed: ParsedCommit): ReadonlyArray<Issue> => {
    const rules: ReadonlyArray<(p: ParsedCommit) => Issue | null> = [
        checkR1HeaderExists,
        checkR2ValidType,
        checkR3ValidScope,
        checkR4ColonPresent,
        checkR5SubjectNonEmpty,
        checkR6TrailingPeriod,
        checkR7HeaderLength,
        checkR8BlankLineBeforeBody,
        ...createR9LineChecks(parsed)
    ];

    return Object.freeze(
        rules
            .map(rule => rule(parsed))
            .filter((issue): issue is Issue => issue !== null)
    );
};

/**
 * R1: Header must exist and be non-empty.
 * @param parsed - Parsed commit
 * @returns Issue or null
 * @remarks Pure function, total function.
 */
const checkR1HeaderExists = (parsed: ParsedCommit): Issue | null =>
    parsed.header.trim() === ''
        ? createIssue('R1', 'error', MESSAGES.R1_EMPTY)
        : null;

/**
 * R2: Type must be valid.
 * @param parsed - Parsed commit
 * @returns Issue or null
 * @remarks Pure function with conditional fix determination.
 */
const checkR2ValidType = (parsed: ParsedCommit): Issue | null => {
    if (parsed.type === null) {
        return createIssue(
            'R2',
            'error',
            MESSAGES.R2_MISSING + VALID_TYPES.join(', '),
            {kind: 'require-user-choice', choiceType: 'type'}
        );
    }

    if (isValidType(parsed.type)) return null;

    if (isValidTypeCaseInsensitive(parsed.type)) {
        return createIssue(
            'R2',
            'error',
            MESSAGES.R2_LOWERCASE(parsed.type),
            {kind: 'lowercase-type', original: parsed.type}
        );
    }

    return createIssue(
        'R2',
        'error',
        MESSAGES.R2_INVALID(parsed.type) + VALID_TYPES.join(', '),
        {kind: 'require-user-choice', choiceType: 'type'}
    );
};

/**
 * R3: Scope must be kebab-case or snake_case.
 * @param parsed - Parsed commit
 * @returns Issue or null
 * @remarks Pure function, regex validation.
 */
const checkR3ValidScope = (parsed: ParsedCommit): Issue | null => {
    if (parsed.scope === null) return null;
    if (parsed.scope === '') return null;

    return isValidScope(parsed.scope)
        ? null
        : createIssue('R3', 'error', MESSAGES.R3_INVALID(parsed.scope));
};

/**
 * R4: Colon must be present after type/scope.
 * @param parsed - Parsed commit
 * @returns Issue or null
 * @remarks Pure function with auto-fix capability.
 */
const checkR4ColonPresent = (parsed: ParsedCommit): Issue | null =>
    parsed.type !== null && !parsed.hasColon
        ? createIssue('R4', 'error', MESSAGES.R4_MISSING_COLON, {kind: 'insert-colon'})
        : null;

/**
 * R5: Subject must be non-empty.
 * @param parsed - Parsed commit
 * @returns Issue or null
 * @remarks Pure function.
 */
const checkR5SubjectNonEmpty = (parsed: ParsedCommit): Issue | null =>
    parsed.type !== null && parsed.hasColon && (parsed.subject === null || parsed.subject === '')
        ? createIssue('R5', 'error', MESSAGES.R5_EMPTY_SUBJECT)
        : null;

/**
 * R6: Subject must not end with period.
 * @param parsed - Parsed commit
 * @returns Issue or null
 * @remarks Pure function with auto-fix.
 */
const checkR6TrailingPeriod = (parsed: ParsedCommit): Issue | null =>
    parsed.subject?.endsWith('.')
        ? createIssue('R6', 'warning', MESSAGES.R6_TRAILING_PERIOD, {kind: 'remove-trailing-period'})
        : null;

/**
 * R7: Header length constraints.
 * @param parsed - Parsed commit
 * @returns Issue or null
 * @remarks Pure function with threshold-based severity.
 */
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

/**
 * R8: Body must be separated by blank line.
 * @param parsed - Parsed commit
 * @returns Issue or null
 * @remarks Pure function with auto-fix.
 */
const checkR8BlankLineBeforeBody = (parsed: ParsedCommit): Issue | null =>
    hasBodyWithoutBlankLine(parsed.lines)
        ? createIssue('R8', 'error', MESSAGES.R8_BLANK_LINE, {kind: 'ensure-blank-line'})
        : null;

/**
 * Creates R9 checks for each line.
 * @param parsed - Parsed commit
 * @returns Array of check functions
 * @remarks Higher-order function returning array of rule checkers.
 */
const createR9LineChecks = (
    parsed: ParsedCommit
): ReadonlyArray<(p: ParsedCommit) => Issue | null> =>
    parsed.lines
        .map((line, index) => () =>
            line.length > 100
                ? createIssue(
                    'R9',
                    'error',
                    MESSAGES.R9_LINE_LONG(index + 1, line.length),
                    {kind: 'wrap-long-line', lineIndex: index}
                )
                : line.length > 75
                    ? createIssue(
                        'R9',
                        'warning',
                        MESSAGES.R9_LINE_LONG(index + 1, line.length),
                        {kind: 'wrap-long-line', lineIndex: index}
                    ) : null
        );

/**
 * Checks if any issue requires user choice.
 * @param issues - Array of lint issues
 * @returns True if user input is needed
 * @remarks Pure function, predicate over immutable data.
 */
export const requiresUserChoice = (issues: ReadonlyArray<Issue>): boolean =>
    issues.some(issue => issue.fix?.kind === 'require-user-choice');

/**
 * Gets required choice types from issues.
 * @param issues - Array of lint issues
 * @returns Array of choice type identifiers
 * @remarks Pure function, immutable transformation with filter-map composition.
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

/**
 * Applies automatic fixes to commit message.
 * @param text - Original commit text
 * @param issues - Lint issues with potential fixes
 * @param userChoices - User-provided choices for ambiguous fixes
 * @returns Fixed commit message string
 * @remarks Pure function, composition of fix transformations,
 * immutable intermediate results, fold pattern over fixes.
 */
export const applyFixes = (
    text: string,
    issues: ReadonlyArray<Issue>,
    userChoices: UserChoices = {}
): string => {
    const fixes = issues
        .map(issue => issue.fix)
        .filter((fix): fix is FixAction => fix !== null);

    return fixes.reduce(
        (current, fix) => applySingleFix(current, fix, userChoices),
        text
    );
};

/**
 * Applies a single fix action to text.
 * @param text - Current text state
 * @param fix - Fix action to apply
 * @param userChoices - User choices for ambiguous fixes
 * @returns Transformed text
 * @remarks Pure function, pattern matching on discriminated union,
 * each case returns new string (immutable transformation).
 */
const applySingleFix = (
    text: string,
    fix: FixAction,
    userChoices: UserChoices
): string => {
    switch (fix.kind) {
        case 'trim-whitespace':
            return text.trim();

        case 'lowercase-type':
            return text.replace(
                new RegExp(`^${fix.original}`, 'i'),
                fix.original.toLowerCase()
            );

        case 'insert-colon':
            return insertColonAfterTypeScope(text);

        case 'remove-trailing-period':
            return removeTrailingPeriodFromSubject(text);

        case 'ensure-blank-line':
            return ensureBlankLineAfterHeader(text);

        case 'wrap-long-line':
            return wrapLongLine(text, fix.lineIndex);

        case 'require-user-choice':
            return applyUserChoice(text, fix.choiceType, userChoices);
    }
};

/**
 * Inserts colon after type/scope in header.
 * @param text - Commit message text
 * @returns Text with colon inserted
 * @remarks Pure function handling multiple patterns:
 * - type(scope) subject -> type(scope): subject
 * - type(scope)subject -> type(scope): subject
 * - type subject -> type:  subject
 * - type -> type:
 */
const insertColonAfterTypeScope = (text: string): string => {
    const lines = text.split('\n');
    const header = lines[0] ?? '';

    /** Pattern: type with optional scope, optional whitespace, optional subject */
    const pattern = /^([a-zA-Z]+)(\([^)]*\))?(\s*)(.*)$/;
    const match = header.match(pattern);

    if (!match) return text;

    const type = match[1] ?? '';
    const scope = match[2] ?? '';
    const subject = (match[4] ?? '').trim();

    const fixedHeader = subject
        ? `${type}${scope}:  ${subject}`
        : `${type}${scope}:  `;

    return [fixedHeader, ...lines.slice(1)].join('\n');
};

/**
 * Removes trailing period from subject.
 * @param text - Commit message text
 * @returns Text with subject period removed
 * @remarks Pure function, regex transformation.
 */
const removeTrailingPeriodFromSubject = (text: string): string => {
    const lines = text.split('\n');
    const header = lines[0] ?? '';

    const fixed = header.replace(/\.\s*$/, '');

    return [fixed, ...lines.slice(1)].join('\n');
};

/**
 * Ensures blank line after header.
 * @param text - Commit message text
 * @returns Text with blank line after header
 * @remarks Pure function, immutable array operations.
 */
const ensureBlankLineAfterHeader = (text: string): string => {
    const lines = text.split('\n');

    if (lines.length < 2) return text;

    const header = lines[0];
    const rest = lines.slice(1);

    if (rest[0]?.trim() === '') return text;

    return [header, '', ...rest].join('\n');
};

/**
 * Wraps a long line at word boundaries.
 * @param text - Commit message text
 * @param lineIndex - Index of line to wrap
 * @returns Text with line wrapped
 * @remarks Pure function, conservative wrapping at 72 chars.
 */
const wrapLongLine = (text: string, lineIndex: number): string => {
    const lines = text.split('\n');
    const targetLine = lines[lineIndex];

    const wrapped = wrapAtWidth(targetLine, 72);

    return [
        ...lines.slice(0, lineIndex),
        wrapped,
        ...lines.slice(lineIndex + 1)
    ].join('\n');
};

/**
 * Wraps text at specified width.
 * @param text - Text to wrap
 * @param width - Target width
 * @returns Wrapped text with newlines
 * @remarks Pure function, recursive word accumulation pattern.
 */
const wrapAtWidth = (text: string, width: number): string => {
    const words = text.split(/\s+/);

    const result = words.reduce<{ lines: string[]; current: string }>(
        (acc, word) => {
            const testLine = acc.current ? `${acc.current} ${word}` : word;

            if (testLine.length <= width) {
                return {...acc, current: testLine};
            }

            if (acc.current) {
                return {
                    lines: [...acc.lines, acc.current],
                    current: word
                };
            }

            return {...acc, current: word};
        },
        {lines: [], current: ''}
    );

    const finalLines = result.current
        ? [...result.lines, result.current]
        : result.lines;

    return finalLines.join('\n');
};

/**
 * Applies user choice to fix commit message.
 * @param text - Commit message text
 * @param choiceType - Type of choice to apply
 * @param userChoices - User's selections
 * @returns Fixed text with user choice applied
 * @remarks Pure function, pattern matching on choice type.
 */
const applyUserChoice = (
    text: string,
    choiceType: 'type',
    userChoices: UserChoices
): string => {
    if (choiceType === 'type' && userChoices.type) {
        const parseResult = parseCommitMessage(text);

        if (!parseResult.ok) return text;

        const {parsed} = parseResult;

        if (parsed.type === null) {
            const colonIndex = text.indexOf(':');
            if (colonIndex !== -1) {
                return `${userChoices.type}${text.slice(colonIndex)}`;
            }
            return `${userChoices.type}:  ${text.trim()}`;
        }

        return text.replace(/^[a-zA-Z]+/, userChoices.type);
    }

    return text;
};

/**
 * Applies a single issue's fix to text.
 * @param text - Current text
 * @param issue - Issue with fix to apply
 * @param userChoices - User choices
 * @returns Fixed text
 * @remarks Pure function, delegates to applySingleFix.
 */
export const applySingleIssueFix = (
    text: string,
    issue: Issue,
    userChoices: UserChoices = {}
): string => {
    if (!issue.fix) return text;
    return applySingleFix(text, issue.fix, userChoices);
};

/**
 * Pre-processes text with trivial whitespace fixes.
 * @param text - Raw input text
 * @returns Trimmed text
 * @remarks Pure function, idempotent transformation.
 */
export const preProcess = (text: string): string => text.trim();