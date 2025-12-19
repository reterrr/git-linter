/**
 * @file Imperative shell - event handling and coordination.
 * @remarks IO boundary: This is the thin imperative shell that coordinates
 * between user input, pure functional core, and DOM rendering.
 * All business logic is delegated to core. ts pure functions.
 */

import {
    parseCommitMessage,
    lintCommit,
    applyFixes,
    applySingleIssueFix,
    preProcess,
    requiresUserChoice,
    getRequiredChoices,
    type Issue,
    type CommitType,
    type UserChoices
} from './core.js';

import {
    renderIssues,
    renderUserChoices,
    renderOutput,
    setVisible,
    setEnabled
} from './ui.js';

/**
 * Application state container.
 * @remarks Mutable state isolated to imperative shell boundary.
 */
interface AppState {
    currentText: string;
    fixedText: string;
    issues: ReadonlyArray<Issue>;
    userChoices: UserChoices;
}

/**
 * Creates initial application state.
 * @returns Fresh state object
 * @remarks Pure function, factory for initial state.
 */
const createInitialState = (): AppState => ({
    currentText: '',
    fixedText: '',
    issues: [],
    userChoices: {}
});

/**
 * Main application entry point.
 * @remarks IO boundary: Sets up event listeners and coordinates
 * between DOM events and pure functional core.
 * Imperative shell pattern - side effects contained here.
 */
const main = (): void => {
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

    let state = createInitialState();

    /**
     * Handles lint button click.
     * @remarks IO boundary: Reads input, calls pure functions, updates DOM.
     */
    const handleLint = (): void => {
        const text = preProcess(input.value);
        state.currentText = text;
        state.userChoices = {};

        const parseResult = parseCommitMessage(text);

        if (!parseResult.ok) {
            state.issues = [{
                rule: 'R1',
                severity: 'error',
                message: parseResult.error,
                fix: null
            }];
        } else {
            state.issues = lintCommit(parseResult.parsed);
        }

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

    /**
     * Handles fix button click.
     * @remarks IO boundary: Applies all fixes, updates output.
     */
    const handleFix = (): void => {
        if (state.issues.length === 0) {
            handleLint();
        }

        if (requiresUserChoice(state.issues) && !hasAllRequiredChoices()) {
            return;
        }

        state.fixedText = applyFixes(state.currentText, state.issues, state.userChoices);

        renderOutput(fixedOutput, state.fixedText);
        setVisible(outputSection, true);
        setEnabled(btnCopy, true);

        input.value = state.fixedText;
        state.currentText = state.fixedText;

        handleLint();
    };

    /**
     * Handles copy button click.
     * @remarks IO boundary: Clipboard API access.
     */
    const handleCopy = async (): Promise<void> => {
        try {
            await navigator.clipboard.writeText(state.fixedText);
            btnCopy.textContent = 'Copied!';
            setTimeout(() => {
                btnCopy.textContent = 'Copy Fixed';
            }, 1500);
        } catch {
            btnCopy.textContent = 'Failed';
            setTimeout(() => {
                btnCopy.textContent = 'Copy Fixed';
            }, 1500);
        }
    };

    /**
     * Handles applying a single issue fix.
     * @param issue - Issue to fix
     * @remarks IO boundary:  Applies single fix and re-lints.
     */
    const handleApplySingleFix = (issue: Issue): void => {
        state.currentText = applySingleIssueFix(
            state.currentText,
            issue,
            state.userChoices
        );
        input.value = state.currentText;
        handleLint();
    };

    /**
     * Handles user choice selection change.
     * @param choiceType - Type of choice changed
     * @param value - Selected value
     * @remarks IO boundary:  Updates state and UI.
     */
    const handleChoiceChange = (choiceType: 'type', value: CommitType): void => {
        state.userChoices = {
            ...state.userChoices,
            [choiceType]: value
        };
    };

    /**
     * Handles apply choices button click.
     * @remarks IO boundary: Triggers fix with user choices.
     */
    const handleApplyChoices = (): void => {
        if (hasAllRequiredChoices()) {
            handleFix();
        }
    };

    /**
     * Checks if all required choices are made.
     * @returns True if all choices are provided
     * @remarks Pure predicate over state.
     */
    const hasAllRequiredChoices = (): boolean => {
        const required = getRequiredChoices(state.issues);
        return required.every(choice => {
            if (choice === 'type') {
                return state.userChoices.type !== undefined;
            }
            return true;
        });
    };

    btnLint.addEventListener('click', handleLint);
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