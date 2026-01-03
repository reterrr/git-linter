/**
 * @file Imperative shell - event handling and coordination.
 * @remarks IO boundary: This is the thin imperative shell that coordinates
 * between user input, pure functional core, and DOM rendering.
 */

import type { AppState, Issue, CommitType } from './types.js';
import {
    parseCommitMessage,
    lintCommit,
    applyFixes,
    applySingleIssueFix,
    preProcess,
    requiresUserChoice,
    getRequiredChoices
} from './core.js';

import {
    renderIssues,
    renderUserChoices,
    renderOutput,
    setVisible,
    setEnabled
} from './ui.js';

// ============ Pure State Functions ============

/**
 * Creates initial application state.
 * @returns Fresh state object
 * @remarks Pure function, factory for initial state.
 */
const createInitialState = (): AppState => ({
    currentText: '',
    fixedText: '',
    issues:  [],
    userChoices: {}
});

/**
 * Updates state from input text (pure function).
 * @param state - Current state
 * @param text - Input text
 * @returns New state with updated issues
 * @remarks Pure function - no side effects.
 */
const updateStateFromInput = (state: AppState, text: string): AppState => {
    const processedText = preProcess(text);
    const parseResult = parseCommitMessage(processedText);

    const issues:  ReadonlyArray<Issue> = parseResult.ok
        ? lintCommit(parseResult.parsed)
        : [{
            rule: 'R1',
            severity: 'error',
            message: parseResult.error,
            fix: null
        }];

    return {
        ...state,
        currentText: processedText,
        issues,
        userChoices: {}
    };
};

/**
 * Updates state with user choice (pure function).
 * @param state - Current state
 * @param choiceType - Type of choice
 * @param value - Selected value
 * @returns New state with updated choices
 */
const updateStateWithChoice = (
    state: AppState,
    choiceType:  'type',
    value:  CommitType
): AppState => ({
    ...state,
    userChoices: {
        ... state.userChoices,
        [choiceType]: value
    }
});

/**
 * Computes fixed text from state (pure function).
 * @param state - Current state
 * @returns Fixed commit message
 */
const computeFixedText = (state: AppState): string =>
    applyFixes(state. currentText, state.issues, state.userChoices);

/**
 * Checks if all required choices are made (pure function).
 * @param state - Current state
 * @returns True if all choices provided
 */
const hasAllRequiredChoices = (state:  AppState): boolean => {
    const required = getRequiredChoices(state.issues);
    return required. every(choice => {
        if (choice === 'type') {
            return state.userChoices.type !== undefined;
        }
        return true;
    });
};

// ============ Imperative Shell ============

/**
 * Main application entry point.
 * @remarks IO boundary: Sets up event listeners and coordinates
 * between DOM events and pure functional core.
 */
const main = (): void => {
    // DOM element references
    const input = document.getElementById('commit-input') as HTMLTextAreaElement;
    const btnLint = document.getElementById('btn-lint') as HTMLButtonElement;
    const btnFix = document.getElementById('btn-fix') as HTMLButtonElement;
    const btnCopy = document.getElementById('btn-copy') as HTMLButtonElement;
    const btnApplyChoices = document.getElementById('btn-apply-choices') as HTMLButtonElement;
    const issuesList = document.getElementById('issues-list') as HTMLUListElement;
    const issuesSection = document.getElementById('issues-section') as HTMLElement;
    const outputSection = document.getElementById('output-section') as HTMLElement;
    const fixedOutput = document.getElementById('fixed-output') as HTMLPreElement;
    const userChoicesSection = document.getElementById('user-choices-section') as HTMLElement;
    const userChoicesContainer = document.getElementById('user-choices') as HTMLDivElement;

    // Mutable state (isolated to shell)
    let state = createInitialState();

    /**
     * Syncs input textarea with current state text.
     * @remarks IO boundary - DOM mutation.
     */
    const syncInputWithState = (): void => {
        input.value = state.currentText;
    };

    // ============ Event Handlers ============

    const handleLint = (): void => {
        // Pure state update
        state = updateStateFromInput(state, input.value);

        // Side effects:  render
        renderIssues(issuesList, state.issues, handleApplySingleFix);
        setVisible(issuesSection, true);

        if (requiresUserChoice(state.issues)) {
            const required = getRequiredChoices(state.issues);
            renderUserChoices(
                userChoicesContainer,
                required,
                state.userChoices,
                handleChoiceChange
            );
            setVisible(userChoicesSection, true);
        } else {
            setVisible(userChoicesSection, false);
        }

        setVisible(outputSection, false);
        setEnabled(btnCopy, false);
    };

    const handleFix = (): void => {
        // Pure computation
        state. fixedText = computeFixedText(state);

        // Update main input with fixed text
        state.currentText = state.fixedText;
        syncInputWithState();

        // Show fixed output panel as well
        renderOutput(fixedOutput, state. fixedText);
        setVisible(outputSection, true);
        setEnabled(btnCopy, true);

        // Re-lint to show updated status
        state = updateStateFromInput(state, state.currentText);
        renderIssues(issuesList, state.issues, handleApplySingleFix);

        // Hide user choices if no longer needed
        if (! requiresUserChoice(state.issues)) {
            setVisible(userChoicesSection, false);
        }
    };

    const handleCopy = async (): Promise<void> => {
        try {
            await navigator.clipboard.writeText(state.fixedText);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const handleChoiceChange = (choiceType: 'type', value: CommitType): void => {
        // Pure state update
        state = updateStateWithChoice(state, choiceType, value);
    };

    const handleApplySingleFix = (issue: Issue): void => {
        // Pure computation
        state.currentText = applySingleIssueFix(
            state.currentText,
            issue,
            state.userChoices
        );

        // Update input textarea immediately
        syncInputWithState();

        // Re-lint to show updated status
        handleLint();
    };

    const handleApplyChoices = (): void => {
        if (hasAllRequiredChoices(state)) {
            handleFix();
        }
    };

    // ============ Event Bindings ============

    btnLint. addEventListener('click', handleLint);
    btnFix.addEventListener('click', handleFix);
    btnCopy.addEventListener('click', handleCopy);
    btnApplyChoices.addEventListener('click', handleApplyChoices);

    input.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            handleLint();
        }
    });
};

document.addEventListener('DOMContentLoaded', main);