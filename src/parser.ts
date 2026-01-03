/**
 * @file Pure functional parser for commit messages.
 * @remarks IO boundary:  This module contains zero side effects.  All functions are pure.
 */

import type { ParseResult, ParsedCommit } from './types.js';

/**
 * Parses a commit message into structured components.
 * @param text - Raw commit message text
 * @returns ParseResult discriminated union
 * @remarks Pure function, immutable transformations, data-first design.
 */
export const parseCommitMessage = (text: string): ParseResult => {
    const trimmed = text.trim();

    if (trimmed.length === 0) {
        return { ok: false, error: 'Pusta wiadomość commita' };
    }

    const lines = trimmed.split('\n');
    const header = lines[0] ??  '';

    /**
     * Header pattern: type(scope)?:  subject
     * Captures:  type, optional scope (with parens), colon presence, subject
     */
    const headerPattern = /^([a-zA-Z]+)(?:\(([^)]*)\))?(\s*:?\s*)(.*)$/;
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
        subject = header. trim() || null;
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
export const findBodyStartIndex = (lines: ReadonlyArray<string>): number | null => {
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
export const hasBodyWithoutBlankLine = (lines: ReadonlyArray<string>): boolean => {
    if (lines.length < 2) return false;

    const secondLine = lines[1] ?? '';
    return secondLine.trim() !== '';
};

/**
 * Pre-processes text with trivial whitespace fixes.
 * @param text - Raw input text
 * @returns Trimmed text
 * @remarks Pure function, idempotent transformation.
 */
export const preProcess = (text: string): string => text.trim();