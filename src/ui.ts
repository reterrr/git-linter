/**
 * @file UI rendering functions with minimal side effects.
 * @remarks IO boundary:  Functions here produce DOM elements or HTML strings.
 * Side effects are limited to element creation, not direct DOM mutation.
 */

import type {Issue, Severity, CommitType} from './core.ts';
import {VALID_TYPES} from './core.ts';

const SEVERITY_LABELS: Record<Severity, string> = {
    error: 'BŁĄD',
    warning: 'UWAGA'
};

const TYPE_LABELS: Record<CommitType, string> = {
    feat: 'feat - nowa funkcjonalność',
    fix: 'fix - naprawa błędu',
    docs: 'docs - dokumentacja',
    style: 'style - formatowanie kodu',
    refactor: 'refactor - refaktoryzacja',
    perf: 'perf - optymalizacja wydajności',
    test: 'test - testy',
    build: 'build - system budowania',
    ci: 'ci - ciągła integracja',
    chore: 'chore - zadania pomocnicze',
    revert: 'revert - cofnięcie zmian'
};

/**
 * Creates a severity badge element.
 * @param severity - Error or warning level
 * @returns Span element with appropriate styling
 * @remarks Pure function returning new DOM element, factory pattern.
 */
export const createBadge = (severity: Severity): HTMLSpanElement => {
    const badge = document.createElement('span');
    badge.className = `badge badge-${severity}`;
    badge.textContent = SEVERITY_LABELS[severity];
    return badge;
};

/**
 * Creates a single issue list item.
 * @param issue - Lint issue to render
 * @param onApplyFix - Callback when fix button clicked
 * @returns List item element
 * @remarks Factory function, encapsulates DOM creation logic,
 * callback injection for imperative shell integration.
 */
export const createIssueItem = (
    issue: Issue,
    onApplyFix: (issue: Issue) => void
): HTMLLIElement => {
    const li = document.createElement('li');
    li.className = 'issue-item';

    const badge = createBadge(issue.severity);
    li.appendChild(badge);

    const message = document.createElement('span');
    message.className = 'issue-message';
    message.textContent = `[${issue.rule}] ${issue.message}`;
    li.appendChild(message);

    if (issue.fix && issue.fix.kind !== 'require-user-choice') {
        const fixBtn = document.createElement('button');
        fixBtn.type = 'button';
        fixBtn.className = 'issue-fix-btn';
        fixBtn.textContent = 'Napraw';
        fixBtn.addEventListener('click', () => onApplyFix(issue));
        li.appendChild(fixBtn);
    }

    return li;
};

/**
 * Renders complete issues list into container.
 * @param container - UL element to populate
 * @param issues - Array of lint issues
 * @param onApplyFix - Callback for individual fixes
 * @remarks IO boundary function, performs DOM mutation.
 * Composition of createIssueItem over issues array.
 */
export const renderIssues = (
    container: HTMLUListElement,
    issues: ReadonlyArray<Issue>,
    onApplyFix: (issue: Issue) => void
): void => {
    container.innerHTML = '';

    if (issues.length === 0) {
        const li = document.createElement('li');
        li.className = 'no-issues';
        li.textContent = 'Brak problemów — wiadomość jest poprawna!';
        container.appendChild(li);
        return;
    }

    issues.forEach(issue => {
        container.appendChild(createIssueItem(issue, onApplyFix));
    });
};

/**
 * Creates type selection dropdown.
 * @param selectedType - Currently selected type or undefined
 * @returns Select element with all valid types
 * @remarks Pure factory function, immutable options generation.
 */
export const createTypeSelect = (
    selectedType?: CommitType
): HTMLSelectElement => {
    const select = document.createElement('select');
    select.id = 'type-choice';
    select.name = 'type-choice';

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = '-- Wybierz typ --';
    placeholder.disabled = true;
    placeholder.selected = !selectedType;
    select.appendChild(placeholder);

    VALID_TYPES.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = TYPE_LABELS[type];
        option.selected = type === selectedType;
        select.appendChild(option);
    });

    return select;
};

/**
 * Renders user choice controls.
 * @param container - Container div element
 * @param requiredChoices - Array of required choice types
 * @param currentChoices - Current user selections
 * @param onChange - Callback when selection changes
 * @remarks IO boundary, DOM mutation with event binding.
 * Higher-order function pattern via onChange callback.
 */
export const renderUserChoices = (
    container: HTMLDivElement,
    requiredChoices: ReadonlyArray<'type'>,
    currentChoices: { type?: CommitType },
    onChange: (choiceType: 'type', value: CommitType) => void
): void => {
    container.innerHTML = '';

    requiredChoices.forEach(choiceType => {
        if (choiceType === 'type') {
            const group = document.createElement('div');
            group.className = 'choice-group';

            const label = document.createElement('label');
            label.htmlFor = 'type-choice';
            label.textContent = 'Wybierz typ commita:';
            group.appendChild(label);

            const select = createTypeSelect(currentChoices.type);
            select.addEventListener('change', (e) => {
                const target = e.target as HTMLSelectElement;
                if (target.value) {
                    onChange('type', target.value as CommitType);
                }
            });
            group.appendChild(select);

            container.appendChild(group);
        }
    });
};

/**
 * Updates output panel with fixed text.
 * @param container - Pre element for output
 * @param text - Fixed commit message
 * @remarks IO boundary, simple DOM text update.
 */
export const renderOutput = (
    container: HTMLPreElement,
    text: string
): void => {
    container.textContent = text;
};

/**
 * Shows or hides an element.
 * @param element - Target element
 * @param visible - Whether to show
 * @remarks IO boundary, class toggle for visibility.
 */
export const setVisible = (
    element: HTMLElement,
    visible: boolean
): void => {
    element.classList.toggle('hidden', !visible);
};

/**
 * Enables or disables a button.
 * @param button - Target button element
 * @param enabled - Whether to enable
 * @remarks IO boundary, disabled attribute management.
 */
export const setEnabled = (
    button: HTMLButtonElement,
    enabled: boolean
): void => {
    button.disabled = !enabled;
};