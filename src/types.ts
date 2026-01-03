/**
 * @file Type definitions for commit message linting.
 * @remarks Pure type declarations, no runtime code.
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

/**
 * Discriminated union for fix action types.
 * @remarks Discriminated unions enable exhaustive pattern matching and type-safe fix handling.
 */
export type FixAction =
    | { readonly kind: 'trim-whitespace' }
    | { readonly kind:  'lowercase-type'; readonly original: string }
    | { readonly kind: 'insert-colon' }
    | { readonly kind:  'remove-trailing-period' }
    | { readonly kind: 'ensure-blank-line' }
    | { readonly kind: 'wrap-long-line'; readonly lineIndex: number }
    | { readonly kind: 'require-user-choice'; readonly choiceType: 'type' };

/** Represents a single lint issue with optional auto-fix */
export interface Issue {
    readonly rule: RuleId;
    readonly severity: Severity;
    readonly message: string;
    readonly fix:  FixAction | null;
}

/**
 * Discriminated union for parse results.
 * @remarks Data-first design:  parsing produces structured data for downstream pure transformations.
 */
export type ParseResult =
    | { readonly ok: true; readonly parsed: ParsedCommit }
    | { readonly ok:  false; readonly error: string };

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
    readonly type?:  CommitType;
}

/** Application state container */
export interface AppState {
    currentText: string;
    fixedText: string;
    issues:  ReadonlyArray<Issue>;
    userChoices: UserChoices;
}