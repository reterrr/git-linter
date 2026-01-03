/**
 * @file Pure template functions for HTML generation.
 * @remarks IO boundary: All functions are pure, model → string transformations.
 */

import type { Issue, Severity, CommitType } from './types.js';
import { VALID_TYPES } from './types.js';

const SEVERITY_LABELS:  Record<Severity, string> = {
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
 * Escapes HTML special characters.
 */
const escapeHtml = (text: string): string =>
    text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

/**
 * Creates badge HTML string.
 */
export const badgeTemplate = (severity: Severity): string =>
    `<span class="badge badge-${severity}">${SEVERITY_LABELS[severity]}</span>`;

/**
 * Creates fix button HTML string.
 */
export const fixButtonTemplate = (issueIndex: number): string =>
    `<button type="button" class="issue-fix-btn" data-issue-index="${issueIndex}">Napraw</button>`;

/**
 * Creates single issue item HTML string.
 */
export const issueItemTemplate = (issue: Issue, index: number): string => {
    const badge = badgeTemplate(issue.severity);
    const message = `<span class="issue-message">[${issue.rule}] ${escapeHtml(issue.message)}</span>`;
    const fixBtn = issue.fix && issue.fix.kind !== 'require-user-choice'
        ? fixButtonTemplate(index)
        : '';

    return `<li class="issue-item">${badge}${message}${fixBtn}</li>`;
};

/**
 * Creates issues list HTML string.
 */
export const issuesListTemplate = (issues: ReadonlyArray<Issue>): string => {
    if (issues.length === 0) {
        return '<li class="no-issues">Brak problemów — wiadomość jest poprawna!</li>';
    }

    return issues.map((issue, index) => issueItemTemplate(issue, index)).join('');
};

/**
 * Creates type option HTML string.
 */
export const typeOptionTemplate = (type:  CommitType, selected: boolean): string =>
    `<option value="${type}"${selected ? ' selected' : ''}>${TYPE_LABELS[type]}</option>`;

/**
 * Creates type select HTML string.
 */
export const typeSelectTemplate = (selectedType?:  CommitType): string => {
    const placeholder = `<option value="" disabled=${! selectedType ? ' selected' : ''}>-- Wybierz typ --</option>`;
    const options = VALID_TYPES
        .map(type => typeOptionTemplate(type, type === selectedType))
        .join('');

    return `<select id="type-choice" name="type-choice">${placeholder}${options}</select>`;
};

/**
 * Creates user choice group HTML string.
 */
export const choiceGroupTemplate = (choiceType: 'type', selectedType?: CommitType): string => {
    if (choiceType === 'type') {
        return `
            <div class="choice-group">
                <label for="type-choice">Wybierz typ commita:</label>
                ${typeSelectTemplate(selectedType)}
            </div>
        `;
    }
    return '';
};

/**
 * Creates user choices container HTML string.
 */
export const userChoicesTemplate = (
    requiredChoices: ReadonlyArray<'type'>,
    currentChoices: { type?:  CommitType }
): string =>
    requiredChoices
        .map(choiceType => choiceGroupTemplate(choiceType, currentChoices. type))
        .join('');