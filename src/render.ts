/**
 * @file DOM rendering functions with side effects.
 * @remarks IO boundary: Functions here perform DOM mutations.
 */

import type { Issue, CommitType } from './types.js';
import {
    issuesListTemplate,
    userChoicesTemplate
} from './templates.js';

/**
 * Renders issues list into container using template.
 * @param container - UL element to populate
 * @param issues - Array of lint issues
 * @param onApplyFix - Callback for individual fixes
 * @remarks IO boundary function, performs DOM mutation.
 */
export const renderIssues = (
    container: HTMLUListElement,
    issues: ReadonlyArray<Issue>,
    onApplyFix: (issue: Issue) => void
): void => {
    container.innerHTML = issuesListTemplate(issues);

    // Attach event listeners to fix buttons
    container.querySelectorAll('.issue-fix-btn').forEach(btn => {
        const index = parseInt((btn as HTMLElement).dataset.issueIndex ??  '0', 10);
        btn.addEventListener('click', () => {
            const issue = issues[index];
            if (issue) onApplyFix(issue);
        });
    });
};

/**
 * Renders user choice controls.
 * @param container - Container div element
 * @param requiredChoices - Array of required choice types
 * @param currentChoices - Current user selections
 * @param onChange - Callback when selection changes
 * @remarks IO boundary, DOM mutation with event binding.
 */
export const renderUserChoices = (
    container: HTMLDivElement,
    requiredChoices: ReadonlyArray<'type'>,
    currentChoices: { type?: CommitType },
    onChange: (choiceType: 'type', value: CommitType) => void
): void => {
    container.innerHTML = userChoicesTemplate(requiredChoices, currentChoices);

    // Attach event listener to select
    const select = container.querySelector('#type-choice') as HTMLSelectElement | null;
    if (select) {
        select.addEventListener('change', (e) => {
            const target = e.target as HTMLSelectElement;
            if (target.value) {
                onChange('type', target.value as CommitType);
            }
        });
    }
};

/**
 * Updates output panel with fixed text.
 */
export const renderOutput = (
    container: HTMLPreElement,
    text: string
): void => {
    container. textContent = text;
};

/**
 * Shows or hides an element.
 */
export const setVisible = (
    element: HTMLElement,
    visible: boolean
): void => {
    element. classList.toggle('hidden', !visible);
};

/**
 * Enables or disables a button.
 */
export const setEnabled = (
    button: HTMLButtonElement,
    enabled: boolean
): void => {
    button.disabled = !enabled;
};