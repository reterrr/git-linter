/**
 * @file Pure functions for applying fixes to commit messages.
 * @remarks IO boundary: All functions are pure, no side effects.
 */

import type { Issue, FixAction, UserChoices } from './types.js';
import { parseCommitMessage } from './parser.js';

/**
 * Applies automatic fixes to commit message.
 * @param text - Original commit text
 * @param issues - Lint issues with potential fixes
 * @param userChoices - User-provided choices for ambiguous fixes
 * @returns Fixed commit message string
 * @remarks Pure function, composition of fix transformations.
 */
export const applyFixes = (
    text: string,
    issues:  ReadonlyArray<Issue>,
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
 * Applies a single issue's fix to text.
 */
export const applySingleIssueFix = (
    text: string,
    issue: Issue,
    userChoices: UserChoices = {}
): string => {
    if (! issue.fix) return text;
    return applySingleFix(text, issue.fix, userChoices);
};

/**
 * Applies a single fix action to text.
 * @remarks Pure function, pattern matching on discriminated union.
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
 */
const insertColonAfterTypeScope = (text: string): string => {
    const lines = text.split('\n');
    const header = lines[0] ?? '';

    const pattern = /^([a-zA-Z]+)(\([^)]*\))?(\s*)(.*)$/;
    const match = header.match(pattern);

    if (!match) return text;

    const type = match[1] ?? '';
    const scope = match[2] ?? '';
    const subject = (match[4] ?? '').trim();

    const fixedHeader = subject
        ? `${type}${scope}: ${subject}`
        : `${type}${scope}:  `;

    return [fixedHeader, ...lines.slice(1)].join('\n');
};

/**
 * Removes trailing period from subject.
 */
const removeTrailingPeriodFromSubject = (text: string): string => {
    const lines = text.split('\n');
    const header = lines[0] ?? '';

    const fixed = header.replace(/\.\s*$/, '');

    return [fixed, ...lines.slice(1)].join('\n');
};

/**
 * Ensures blank line after header.
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
 */
const wrapLongLine = (text: string, lineIndex: number): string => {
    const lines = text.split('\n');
    const targetLine = lines[lineIndex];

    const wrapped = wrapAtWidth(targetLine, 72);

    return [
        ... lines.slice(0, lineIndex),
        wrapped,
        ... lines.slice(lineIndex + 1)
    ].join('\n');
};

/**
 * Wraps text at specified width.
 */
const wrapAtWidth = (text: string, width: number): string => {
    const words = text.split(/\s+/);

    const result = words.reduce<{ lines: string[]; current: string }>(
        (acc, word) => {
            const testLine = acc.current ?  `${acc.current} ${word}` : word;

            if (testLine.length <= width) {
                return { ... acc, current: testLine };
            }

            if (acc.current) {
                return {
                    lines: [... acc.lines, acc.current],
                    current: word
                };
            }

            return { ... acc, current: word };
        },
        { lines: [], current: '' }
    );

    const finalLines = result.current
        ? [...result.lines, result.current]
        : result.lines;

    return finalLines.join('\n');
};

/**
 * Applies user choice to fix commit message.
 */
const applyUserChoice = (
    text: string,
    choiceType: 'type',
    userChoices: UserChoices
): string => {
    if (choiceType === 'type' && userChoices.type) {
        const parseResult = parseCommitMessage(text);

        if (!parseResult.ok) return text;

        const { parsed } = parseResult;

        if (parsed.type === null) {
            const colonIndex = text.indexOf(':');
            if (colonIndex !== -1) {
                return `${userChoices.type}${text.slice(colonIndex)}`;
            }
            return `${userChoices.type}: ${text.trim()}`;
        }

        return text.replace(/^[a-zA-Z]+/, userChoices.type);
    }

    return text;
};