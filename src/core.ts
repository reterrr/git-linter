/**
 * @file Re-exports for backward compatibility.
 * @remarks Barrel file that re-exports all public APIs from new modules.
 */

// Types
export type {
    CommitType,
    Severity,
    RuleId,
    FixAction,
    Issue,
    ParseResult,
    ParsedCommit,
    UserChoices,
    AppState
} from './types.js';

export { VALID_TYPES } from './types.js';

// Parser
export {
    parseCommitMessage,
    preProcess
} from './parser.js';

// Rules
export {
    lintCommit,
    requiresUserChoice,
    getRequiredChoices
} from './rules.js';

// Fixes
export {
    applyFixes,
    applySingleIssueFix
} from './fixes.js';