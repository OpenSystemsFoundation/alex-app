import { createElement } from 'lwc';
import KanbanCardPanel from 'c/kanbanCardPanel';
import { updateCardAsync, deleteCardAsync } from 'c/kanbanStore';
import { NavigationMixin, mockNavigate } from 'lightning/navigation';
import LightningConfirm from 'lightning/confirm';
import getModalSettings from '@salesforce/apex/KanbanBoardController.getModalSettings';
import getCardComments from '@salesforce/apex/KanbanBoardController.getCardComments';
import addCardComment from '@salesforce/apex/KanbanBoardController.addCardComment';
import updateCardComment from '@salesforce/apex/KanbanBoardController.updateCardComment';
import deleteCardComment from '@salesforce/apex/KanbanBoardController.deleteCardComment';
import getCardFiles from '@salesforce/apex/KanbanBoardController.getCardFiles';
import deleteCardFile from '@salesforce/apex/KanbanBoardController.deleteCardFile';
import getEpicDetail from '@salesforce/apex/KanbanBoardController.getEpicDetail';

jest.mock(
    '@salesforce/apex/KanbanBoardController.getModalSettings',
    () => {
        const { createTestWireAdapter } = require('@salesforce/sfdx-lwc-jest');
        return { default: createTestWireAdapter(jest.fn()) };
    },
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/KanbanBoardController.getCardComments',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/KanbanBoardController.addCardComment',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/KanbanBoardController.updateCardComment',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/KanbanBoardController.deleteCardComment',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/KanbanBoardController.getCardFiles',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/KanbanBoardController.deleteCardFile',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/KanbanBoardController.getEpicDetail',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock('@salesforce/user/Id', () => ({ default: '005ME' }), {
    virtual: true
});
jest.mock('lightning/confirm', () => ({
    __esModule: true,
    default: { open: jest.fn() }
}));
// The shared navigation mock has no [NavigationMixin.Navigate] method,
// so provide one here that records navigation requests.
jest.mock('lightning/navigation', () => {
    const navigate = jest.fn();
    const Navigate = Symbol('Navigate');
    const Mixin = (Base) =>
        class extends Base {
            [Navigate](pageRef) {
                navigate(pageRef);
            }
        };
    Mixin.Navigate = Navigate;
    return { NavigationMixin: Mixin, mockNavigate: navigate };
});
jest.mock('c/kanbanStore', () => ({
    updateCardAsync: jest.fn((cardId, updates) => ({
        type: 'UPDATE_CARD_THUNK',
        cardId,
        updates
    })),
    deleteCardAsync: jest.fn((cardId) => ({
        type: 'DELETE_CARD_THUNK',
        cardId
    }))
}));

// Let pending Apex promises and re-renders settle (setTimeout is lint-restricted in LWC)
async function flushPromises() {
    for (let i = 0; i < 8; i++) {
        // eslint-disable-next-line no-await-in-loop
        await Promise.resolve();
    }
}

const STORY_CARD = {
    Id: 'a01CARD1',
    Name: 'CARD-1',
    cardType: 'Story'
};

function createPanel({ card = STORY_CARD, isOpen = true, store } = {}) {
    const element = createElement('c-kanban-card-panel', {
        is: KanbanCardPanel
    });
    element.card = card;
    element.isOpen = isOpen;
    element.store = store || { dispatch: jest.fn().mockResolvedValue() };
    document.body.appendChild(element);
    return element;
}

async function createRenderedPanel(options) {
    const element = createPanel(options);
    await flushPromises();
    return element;
}

function collectToasts(element) {
    const toasts = [];
    element.addEventListener('lightning__showtoast', (e) =>
        toasts.push(e.detail)
    );
    return toasts;
}

function collectEvents(element, name) {
    const events = [];
    element.addEventListener(name, (e) => events.push(e.detail));
    return events;
}

function query(element, selector) {
    return element.shadowRoot.querySelector(selector);
}

function queryAll(element, selector) {
    return [...element.shadowRoot.querySelectorAll(selector)];
}

function buttonByLabel(element, label, scope = ':not([data-comment-id])') {
    return queryAll(element, `lightning-button${scope}`).find(
        (b) => b.label === label
    );
}

function inputFields(element) {
    return queryAll(element, 'lightning-input-field');
}

async function emitFields(fields) {
    getModalSettings.emit({ data: { visibleFields: fields } });
    await flushPromises();
}

const MINUTE = 60000;
function isoAgo(ms) {
    return new Date(Date.now() - ms).toISOString();
}

function comment(id, overrides = {}) {
    return {
        Id: id,
        body: `Body ${id}`,
        createdById: '005ME',
        createdByName: 'Me',
        createdDate: isoAgo(5 * MINUTE),
        ...overrides
    };
}

describe('c-kanban-card-panel', () => {
    beforeEach(() => {
        getCardComments.mockResolvedValue([]);
        getCardFiles.mockResolvedValue([]);
        getEpicDetail.mockResolvedValue(null);
    });

    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    describe('visibility and loading', () => {
        it('renders nothing and loads nothing while closed', async () => {
            const element = await createRenderedPanel({ isOpen: false });
            expect(query(element, '.card-panel')).toBeNull();
            expect(getCardComments).not.toHaveBeenCalled();
            expect(getCardFiles).not.toHaveBeenCalled();
        });

        it('loads comments and files once per card when open', async () => {
            const element = await createRenderedPanel();
            expect(query(element, '.card-panel')).not.toBeNull();
            expect(getCardComments).toHaveBeenCalledWith({
                cardId: 'a01CARD1'
            });
            expect(getCardFiles).toHaveBeenCalledWith({ cardId: 'a01CARD1' });

            // Re-rendering for the same card does not reload
            element.isOpen = false;
            await flushPromises();
            element.isOpen = true;
            await flushPromises();
            expect(getCardComments).toHaveBeenCalledTimes(1);

            // Switching to a new card triggers a reload and form remount
            element.card = { Id: 'a01CARD2', Name: 'CARD-2' };
            await flushPromises();
            expect(getCardComments).toHaveBeenLastCalledWith({
                cardId: 'a01CARD2'
            });
            expect(query(element, 'lightning-record-edit-form').recordId).toBe(
                'a01CARD2'
            );
        });

        it('does not load data for a card without an Id', async () => {
            const element = await createRenderedPanel({ card: { Name: 'X' } });
            expect(getCardComments).not.toHaveBeenCalled();
            expect(query(element, '.card-panel__title-link').href).toMatch(
                /#$/
            );
        });

        it('keeps the form mounted when the same card is set again', async () => {
            const element = await createRenderedPanel();
            const form = query(element, 'lightning-record-edit-form');
            element.card = { ...STORY_CARD, Name: 'Renamed' };
            await flushPromises();
            expect(query(element, 'lightning-record-edit-form')).toBe(form);
            expect(query(element, '.card-panel__title-link').textContent).toBe(
                'Renamed'
            );
        });
    });

    describe('header', () => {
        it('renders name, record link and title and dispatches navigatetocard', async () => {
            const element = await createRenderedPanel();
            const link = query(element, '.card-panel__title-link');
            expect(link.textContent).toBe('CARD-1');
            expect(link.getAttribute('href')).toBe(
                '/lightning/r/OpenSF__Card__c/a01CARD1/view'
            );
            const heading = query(element, 'h2');
            expect(heading.title).toBe('CARD-1');
            expect(heading.className).toContain('card-panel__title--two-line');

            const navigations = collectEvents(element, 'navigatetocard');
            const click = new CustomEvent('click', { cancelable: true });
            link.dispatchEvent(click);
            expect(click.defaultPrevented).toBe(true);
            expect(navigations).toEqual([{ cardId: 'a01CARD1' }]);
        });

        it('omits the heading title when the card has no name', async () => {
            const element = await createRenderedPanel({
                card: { Id: 'a01X' }
            });
            expect(query(element, 'h2').hasAttribute('title')).toBe(false);
        });
    });

    describe('modal settings wire', () => {
        it('builds qualified form fields with layout metadata', async () => {
            const element = await createRenderedPanel();
            await emitFields([
                'Subject__c',
                'OpenSF__Status__c',
                'Custom__c',
                'Description__c'
            ]);

            const fields = inputFields(element);
            expect(fields.map((f) => f.fieldName)).toEqual([
                'OpenSF__Subject__c',
                'OpenSF__Status__c',
                'OpenSF__Custom__c',
                'OpenSF__Description__c'
            ]);
            expect(fields.map((f) => f.variant)).toEqual([
                'label-stacked',
                'label-stacked',
                'label-stacked',
                'label-hidden'
            ]);
            expect(fields[0].parentElement.className).toBe(
                'slds-col slds-size_1-of-1'
            );
            expect(fields[1].parentElement.className).toBe(
                'slds-col slds-size_1-of-2'
            );
            expect(fields[2].parentElement.className).toBe(
                'slds-col slds-size_1-of-2'
            );
        });

        it('ignores settings without visibleFields and empty wire values', async () => {
            const element = await createRenderedPanel();
            const toasts = collectToasts(element);
            getModalSettings.emit({ data: {} });
            getModalSettings.emit({ data: undefined, error: undefined });
            await flushPromises();
            expect(inputFields(element)).toHaveLength(0);
            expect(toasts).toHaveLength(0);
        });

        it('shows a toast with the server message on error', async () => {
            const element = await createRenderedPanel();
            const toasts = collectToasts(element);
            getModalSettings.emit({ error: { body: { message: 'Boom' } } });
            expect(toasts).toEqual([
                {
                    title: 'Error loading field settings',
                    message: 'Boom',
                    variant: 'error'
                }
            ]);
        });

        it('shows a generic toast when the error has no body', async () => {
            const element = await createRenderedPanel();
            const toasts = collectToasts(element);
            getModalSettings.emit({ error: {} });
            expect(toasts[0].message).toBe('Unknown error');
        });
    });

    describe('description template', () => {
        it('applies the template for the card type into the description field', async () => {
            const element = await createRenderedPanel({
                card: { Id: 'a01BUG', Name: 'BUG-1', cardType: 'Bug' }
            });
            await emitFields(['Subject__c', 'Description__c']);

            const button = query(element, '.template-btn');
            expect(button).not.toBeNull();
            button.click();

            const [subject, description] = inputFields(element);
            expect(description.value).toContain('<h2>Bug Report</h2>');
            expect(subject.value).toBeUndefined();
            // Applying a template is an unsaved edit
            expect(element.hasPendingChanges()).toBe(true);
        });

        it('uses the namespaced card type field when cardType is missing', async () => {
            const element = await createRenderedPanel({
                card: { Id: 'a01T', OpenSF__CardType__c: 'Task' }
            });
            await emitFields(['Description__c']);
            query(element, '.template-btn').click();
            expect(inputFields(element)[0].value).toContain('<h2>Task</h2>');
        });

        it('hides the template button for unknown or missing card types', async () => {
            const element = await createRenderedPanel({
                card: { Id: 'a01U', cardType: 'Unknown' }
            });
            await emitFields(['Description__c']);
            expect(query(element, '.template-btn')).toBeNull();

            element.card = { Id: 'a01V' };
            await flushPromises();
            expect(query(element, '.template-btn')).toBeNull();
        });

        it('hides the template button when there is no description field', async () => {
            const element = await createRenderedPanel();
            await emitFields(['Subject__c']);
            expect(query(element, '.template-btn')).toBeNull();
        });
    });

    describe('epic detail', () => {
        const EPIC_DETAIL = {
            progressPercent: 50,
            completedCards: 1,
            totalCards: 2,
            completedPoints: 3,
            totalPoints: 8,
            childCards: [
                {
                    id: 'c1',
                    name: 'CARD-10',
                    subject: 'First child',
                    storyPoints: 3,
                    status: 'Done',
                    cardType: 'Story',
                    assigneeName: 'Ada'
                },
                { id: '', name: null, subject: null }
            ]
        };

        it('loads epic detail and renders progress and child cards', async () => {
            getEpicDetail.mockResolvedValue(EPIC_DETAIL);
            const element = await createRenderedPanel({
                card: { Id: 'a01EPIC', Name: 'EPIC-1', cardType: 'Epic' }
            });

            expect(getEpicDetail).toHaveBeenCalledWith({ epicId: 'a01EPIC' });
            expect(
                query(element, '.epic-detail__progress-fill').style.width
            ).toBe('50%');
            const labels = queryAll(
                element,
                '.epic-detail__progress .slds-text-body_small'
            ).map((s) => s.textContent);
            expect(labels).toEqual([
                '1 of 2 cards completed (50%)',
                '3 / 8 points'
            ]);

            const children = queryAll(element, '.epic-child-card');
            expect(children).toHaveLength(2);
            expect(
                children[0].querySelector('.epic-child-card__name').title
            ).toBe('CARD-10');
            expect(
                children[0].querySelector('.epic-child-card__subject').title
            ).toBe('First child');
            expect(
                children[0].querySelector('.epic-child-card__sp').textContent
            ).toBe('3');
            expect(
                [...children[0].querySelectorAll('.epic-child-badge')].map(
                    (b) => b.textContent
                )
            ).toEqual(['Done', 'Story', 'Ada']);
            expect(
                children[1]
                    .querySelector('.epic-child-card__name')
                    .hasAttribute('title')
            ).toBe(false);
            expect(children[1].querySelector('.epic-child-badge')).toBeNull();

            const navigations = collectEvents(element, 'navigatetocard');
            children[0].click();
            children[1].click();
            expect(navigations).toEqual([{ cardId: 'c1' }]);
        });

        it('shows a spinner while loading and defaults missing numbers', async () => {
            let resolveDetail;
            getEpicDetail.mockReturnValue(
                new Promise((resolve) => {
                    resolveDetail = resolve;
                })
            );
            const element = await createRenderedPanel({
                card: { Id: 'a01EPIC', cardType: 'Epic' }
            });
            expect(
                queryAll(element, 'lightning-spinner').some(
                    (s) => s.alternativeText === 'Loading epic details'
                )
            ).toBe(true);

            resolveDetail({ completedCards: 0, totalCards: 0 });
            await flushPromises();
            expect(
                queryAll(element, 'lightning-spinner').some(
                    (s) => s.alternativeText === 'Loading epic details'
                )
            ).toBe(false);
            const labels = queryAll(
                element,
                '.epic-detail__progress .slds-text-body_small'
            ).map((s) => s.textContent);
            expect(labels).toEqual([
                '0 of 0 cards completed (0%)',
                '0 / 0 points'
            ]);
            expect(
                query(element, '.epic-detail__progress-fill').style.width
            ).toBe('0%');
            expect(
                query(element, '.epic-detail-section').textContent
            ).toContain('No child cards linked to');
        });

        it('treats an empty child list as no children', async () => {
            getEpicDetail.mockResolvedValue({ ...EPIC_DETAIL, childCards: [] });
            const element = await createRenderedPanel({
                card: { Id: 'a01EPIC', cardType: 'Epic' }
            });
            expect(queryAll(element, '.epic-child-card')).toHaveLength(0);
            expect(
                query(element, '.epic-detail-section').textContent
            ).toContain('No child cards linked to');
        });

        it('clears epic detail when loading fails', async () => {
            const warn = jest.spyOn(console, 'warn').mockImplementation();
            getEpicDetail.mockRejectedValue(new Error('nope'));
            const element = await createRenderedPanel({
                card: { Id: 'a01EPIC', cardType: 'Epic' }
            });
            expect(warn).toHaveBeenCalledWith(
                'Failed to load epic detail:',
                expect.any(Error)
            );
            expect(query(element, '.epic-detail-section')).not.toBeNull();
            expect(query(element, '.epic-detail__progress')).toBeNull();
        });

        it('shows the epic section without loading when only the namespaced type is Epic', async () => {
            const element = await createRenderedPanel({
                card: { Id: 'a01EPIC', OpenSF__CardType__c: 'Epic' }
            });
            expect(getEpicDetail).not.toHaveBeenCalled();
            expect(query(element, '.epic-detail-section')).not.toBeNull();
        });

        it('hides the epic section for non-epic cards', async () => {
            const element = await createRenderedPanel();
            expect(query(element, '.epic-detail-section')).toBeNull();
        });
    });

    describe('comments', () => {
        it('renders enriched comments with relative dates and ownership', async () => {
            getCardComments.mockResolvedValue([
                comment('c1', { createdDate: isoAgo(10000) }),
                comment('c2', {
                    createdDate: isoAgo(5 * MINUTE),
                    createdById: '005OTHER',
                    createdByPhotoUrl: 'https://img/p.png'
                }),
                comment('c3', { createdDate: isoAgo(3 * 60 * MINUTE) }),
                comment('c4', { createdDate: isoAgo(2 * 24 * 60 * MINUTE) }),
                comment('c5', { createdDate: '2020-01-15T12:00:00Z' }),
                comment('c6', { createdDate: null })
            ]);
            const element = await createRenderedPanel();

            const dates = queryAll(element, '.comment-date').map(
                (d) => d.textContent
            );
            expect(dates).toEqual([
                'just now',
                '5m ago',
                '3h ago',
                '2d ago',
                new Date('2020-01-15T12:00:00Z').toLocaleDateString(),
                ''
            ]);
            const items = queryAll(element, '.comment-item');
            expect(items[1].querySelector('img.comment-avatar').src).toBe(
                'https://img/p.png'
            );
            expect(
                items[0].querySelector('.comment-avatar-icon')
            ).not.toBeNull();
            // Only own comments get the action menu
            expect(
                items[0].querySelector('lightning-button-menu')
            ).not.toBeNull();
            expect(items[1].querySelector('lightning-button-menu')).toBeNull();
            expect(
                query(element, '.comments-section h3').textContent
            ).toContain('(6)');
            expect(query(element, '[data-id="no-comments"]')).toBeNull();
        });

        it('shows the empty state when there are no comments', async () => {
            const element = await createRenderedPanel();
            expect(query(element, '[data-id="no-comments"]')).not.toBeNull();
            expect(query(element, '.comment-list')).toBeNull();
        });

        it('shows a spinner while comments load', async () => {
            getCardComments.mockReturnValue(new Promise(() => {}));
            const element = await createRenderedPanel();
            expect(
                queryAll(element, 'lightning-spinner').some(
                    (s) => s.alternativeText === 'Loading comments'
                )
            ).toBe(true);
            expect(query(element, '[data-id="no-comments"]')).toBeNull();
        });

        it('falls back to an empty list when loading fails', async () => {
            getCardComments.mockRejectedValue(new Error('fail'));
            const element = await createRenderedPanel();
            expect(query(element, '[data-id="no-comments"]')).not.toBeNull();
        });

        it('posts a trimmed comment, prepends it and clears the input', async () => {
            getCardComments.mockResolvedValue([comment('c1')]);
            addCardComment.mockResolvedValue(
                comment('c2', { body: 'Hello', createdDate: isoAgo(0) })
            );
            const element = await createRenderedPanel();
            const textarea = query(element, '[data-id="comment-input"]');
            textarea.value = '  Hello  ';
            query(element, '[data-id="post-comment-btn"]').click();
            await flushPromises();

            expect(addCardComment).toHaveBeenCalledWith({
                cardId: 'a01CARD1',
                body: 'Hello'
            });
            expect(
                queryAll(element, '.comment-body').map((b) =>
                    b.textContent.trim()
                )
            ).toEqual(['Hello', 'Body c1']);
            expect(textarea.value).toBe('');
        });

        it('does not post a blank comment', async () => {
            const element = await createRenderedPanel();
            query(element, '[data-id="comment-input"]').value = '   ';
            query(element, '[data-id="post-comment-btn"]').click();
            await flushPromises();
            expect(addCardComment).not.toHaveBeenCalled();
        });

        it('shows an error toast when posting fails', async () => {
            addCardComment.mockRejectedValue(new Error('fail'));
            const element = await createRenderedPanel();
            const toasts = collectToasts(element);
            query(element, '[data-id="comment-input"]').value = 'Hi';
            query(element, '[data-id="post-comment-btn"]').click();
            await flushPromises();
            expect(toasts).toEqual([
                {
                    title: 'Error',
                    message: 'Failed to post comment',
                    variant: 'error'
                }
            ]);
        });

        async function renderWithComments() {
            getCardComments.mockResolvedValue([
                comment('c1'),
                comment('c2', { body: 'Second' })
            ]);
            return createRenderedPanel();
        }

        function menuFor(element, id) {
            return query(
                element,
                `lightning-button-menu[data-comment-id="${id}"]`
            );
        }

        async function selectAction(element, id, value) {
            menuFor(element, id).dispatchEvent(
                new CustomEvent('select', { detail: { value } })
            );
            await flushPromises();
        }

        it('edits a comment and saves the trimmed body', async () => {
            updateCardComment.mockResolvedValue(
                comment('c1', { body: 'Edited' })
            );
            const element = await renderWithComments();
            await selectAction(element, 'c1', 'edit');

            const editor = query(element, 'lightning-textarea');
            expect(editor.value).toBe('Body c1');
            expect(queryAll(element, 'lightning-textarea')).toHaveLength(1);

            editor.dispatchEvent(
                new CustomEvent('change', { detail: { value: ' Edited ' } })
            );
            await flushPromises();
            expect(query(element, 'lightning-textarea').value).toBe(' Edited ');

            buttonByLabel(element, 'Save', '[data-comment-id="c1"]').click();
            await flushPromises();

            expect(updateCardComment).toHaveBeenCalledWith({
                commentId: 'c1',
                body: 'Edited'
            });
            expect(query(element, 'lightning-textarea')).toBeNull();
            expect(
                queryAll(element, '.comment-body').map((b) =>
                    b.textContent.trim()
                )
            ).toEqual(['Edited', 'Second']);
        });

        it('cancels an edit and restores the original body', async () => {
            const element = await renderWithComments();
            await selectAction(element, 'c2', 'edit');
            query(element, 'lightning-textarea').dispatchEvent(
                new CustomEvent('change', { detail: { value: 'Draft' } })
            );
            await flushPromises();

            buttonByLabel(element, 'Cancel', '[data-comment-id="c2"]').click();
            await flushPromises();
            expect(query(element, 'lightning-textarea')).toBeNull();
            expect(
                queryAll(element, '.comment-body').map((b) =>
                    b.textContent.trim()
                )
            ).toEqual(['Body c1', 'Second']);

            // Re-entering edit mode starts from the saved body
            await selectAction(element, 'c2', 'edit');
            expect(query(element, 'lightning-textarea').value).toBe('Second');
        });

        it('does not save a blank edit', async () => {
            const element = await renderWithComments();
            await selectAction(element, 'c1', 'edit');
            query(element, 'lightning-textarea').dispatchEvent(
                new CustomEvent('change', { detail: { value: '   ' } })
            );
            await flushPromises();
            buttonByLabel(element, 'Save', '[data-comment-id="c1"]').click();
            await flushPromises();
            expect(updateCardComment).not.toHaveBeenCalled();
            expect(query(element, 'lightning-textarea')).not.toBeNull();
        });

        it('does not save when the comment no longer exists', async () => {
            const element = await renderWithComments();
            await selectAction(element, 'c1', 'edit');
            const save = buttonByLabel(
                element,
                'Save',
                '[data-comment-id="c1"]'
            );
            save.setAttribute('data-comment-id', 'missing');
            save.click();
            await flushPromises();
            expect(updateCardComment).not.toHaveBeenCalled();
        });

        it('shows an error toast when saving an edit fails', async () => {
            updateCardComment.mockRejectedValue(new Error('fail'));
            const element = await renderWithComments();
            const toasts = collectToasts(element);
            await selectAction(element, 'c1', 'edit');
            buttonByLabel(element, 'Save', '[data-comment-id="c1"]').click();
            await flushPromises();
            expect(toasts[0].message).toBe('Failed to update comment');
            expect(query(element, 'lightning-textarea')).not.toBeNull();
        });

        it('ignores edit controls that lack a comment id', async () => {
            const element = await renderWithComments();
            await selectAction(element, 'c1', 'edit');

            const editor = query(element, 'lightning-textarea');
            const save = buttonByLabel(
                element,
                'Save',
                '[data-comment-id="c1"]'
            );
            const cancel = buttonByLabel(
                element,
                'Cancel',
                '[data-comment-id="c1"]'
            );
            [editor, save, cancel].forEach((el) =>
                el.removeAttribute('data-comment-id')
            );

            editor.dispatchEvent(
                new CustomEvent('change', { detail: { value: 'Changed' } })
            );
            save.click();
            cancel.click();
            await flushPromises();

            expect(updateCardComment).not.toHaveBeenCalled();
            // Still editing, with the original draft
            expect(query(element, 'lightning-textarea').value).toBe('Body c1');
        });

        it('deletes a comment', async () => {
            deleteCardComment.mockResolvedValue();
            const element = await renderWithComments();
            await selectAction(element, 'c1', 'delete');
            expect(deleteCardComment).toHaveBeenCalledWith({
                commentId: 'c1'
            });
            expect(
                queryAll(element, '.comment-item').map(
                    (li) => li.dataset.commentId
                )
            ).toEqual(['c2']);
        });

        it('shows an error toast when deleting a comment fails', async () => {
            deleteCardComment.mockRejectedValue(new Error('fail'));
            const element = await renderWithComments();
            const toasts = collectToasts(element);
            await selectAction(element, 'c1', 'delete');
            expect(toasts[0].message).toBe('Failed to delete comment');
            expect(queryAll(element, '.comment-item')).toHaveLength(2);
        });

        it('falls back to the closest comment element for the id', async () => {
            deleteCardComment.mockResolvedValue();
            const element = await renderWithComments();
            const menu = menuFor(element, 'c2');
            menu.removeAttribute('data-comment-id');
            menu.dispatchEvent(
                new CustomEvent('select', { detail: { value: 'delete' } })
            );
            await flushPromises();
            expect(deleteCardComment).toHaveBeenCalledWith({
                commentId: 'c2'
            });
        });

        it('ignores menu actions without a resolvable comment id or unknown actions', async () => {
            const element = await renderWithComments();
            const menu = menuFor(element, 'c1');
            menu.dispatchEvent(
                new CustomEvent('select', { detail: { value: 'archive' } })
            );
            menu.removeAttribute('data-comment-id');
            menu.closest('.comment-item').removeAttribute('data-comment-id');
            menu.dispatchEvent(
                new CustomEvent('select', { detail: { value: 'delete' } })
            );
            await flushPromises();
            expect(deleteCardComment).not.toHaveBeenCalled();
            expect(query(element, 'lightning-textarea')).toBeNull();
        });
    });

    describe('files', () => {
        const RAW_FILES = [
            {
                contentDocumentId: '069A',
                title: 'spec',
                fileExtension: 'pdf',
                contentSize: 500,
                latestVersionId: '068A'
            },
            {
                contentDocumentId: '069B',
                title: 'photo',
                fileExtension: 'PNG',
                contentSize: 2048,
                latestVersionId: '068B'
            },
            {
                contentDocumentId: '069C',
                title: 'blob',
                fileExtension: 'bin',
                contentSize: 5 * 1024 * 1024,
                latestVersionId: '068C'
            },
            {
                contentDocumentId: '069D',
                title: 'noext',
                contentSize: 0,
                latestVersionId: '068D'
            },
            {
                contentDocumentId: '069E',
                title: 'huge',
                fileExtension: 'zip',
                contentSize: 3 * 1024 * 1024 * 1024 * 1024,
                latestVersionId: '068E'
            }
        ];

        function fileItems(element) {
            return queryAll(element, '.card-file-item');
        }

        it('renders files with icons, sizes and count', async () => {
            getCardFiles.mockResolvedValue(RAW_FILES);
            const element = await createRenderedPanel();

            const items = fileItems(element);
            expect(items).toHaveLength(5);
            expect(
                items.map((li) => li.querySelector('lightning-icon').iconName)
            ).toEqual([
                'doctype:pdf',
                'doctype:image',
                'doctype:attachment',
                'doctype:attachment',
                'doctype:zip'
            ]);
            expect(
                items.map((li) => li.querySelector('p').textContent.trim())
            ).toEqual(['500 B', '2.0 KB', '5.0 MB', '0 B', '3072.0 GB']);
            expect(items[0].querySelector('a').textContent).toBe('spec.pdf');
            expect(
                query(element, '.card-panel__files h3').textContent
            ).toContain('(5)');
        });

        it('shows the empty state when the server returns no files', async () => {
            getCardFiles.mockResolvedValue(null);
            const element = await createRenderedPanel();
            expect(fileItems(element)).toHaveLength(0);
            expect(query(element, '.card-panel__files').textContent).toContain(
                'No files attached'
            );
        });

        it('falls back to no files when loading fails', async () => {
            const error = jest.spyOn(console, 'error').mockImplementation();
            getCardFiles.mockRejectedValue(new Error('fail'));
            const element = await createRenderedPanel();
            expect(error).toHaveBeenCalledWith(
                'Error loading files:',
                expect.any(Error)
            );
            expect(query(element, '.card-panel__files').textContent).toContain(
                'No files attached'
            );
        });

        it('collapses and expands the files section', async () => {
            const element = await createRenderedPanel();
            const toggle = query(
                element,
                'button[title="Toggle files section"]'
            );
            expect(toggle.querySelector('lightning-icon').iconName).toBe(
                'utility:chevrondown'
            );
            expect(query(element, 'lightning-file-upload')).not.toBeNull();

            toggle.click();
            await flushPromises();
            expect(toggle.querySelector('lightning-icon').iconName).toBe(
                'utility:chevronright'
            );
            expect(query(element, 'lightning-file-upload')).toBeNull();

            toggle.click();
            await flushPromises();
            expect(query(element, 'lightning-file-upload')).not.toBeNull();
        });

        it('configures the uploader and reloads files after upload', async () => {
            const element = await createRenderedPanel();
            const toasts = collectToasts(element);
            const uploader = query(element, 'lightning-file-upload');
            expect(uploader.recordId).toBe('a01CARD1');
            expect(uploader.accept).toContain('.pdf');
            expect(uploader.accept).toHaveLength(15);

            getCardFiles.mockResolvedValue([RAW_FILES[0]]);
            uploader.dispatchEvent(
                new CustomEvent('uploadfinished', {
                    detail: { files: [{}, {}] }
                })
            );
            await flushPromises();

            expect(toasts[0]).toEqual({
                title: 'Success',
                message: '2 file(s) uploaded',
                variant: 'success'
            });
            expect(getCardFiles).toHaveBeenCalledTimes(2);
            expect(fileItems(element)).toHaveLength(1);
        });

        it('deletes a file and removes it from the list', async () => {
            getCardFiles.mockResolvedValue(RAW_FILES.slice(0, 2));
            deleteCardFile.mockResolvedValue();
            const element = await createRenderedPanel();
            const toasts = collectToasts(element);

            query(
                element,
                'lightning-button-icon[data-file-id="069A"]'
            ).click();
            await flushPromises();

            expect(deleteCardFile).toHaveBeenCalledWith({
                contentDocumentId: '069A',
                cardId: 'a01CARD1'
            });
            expect(fileItems(element)).toHaveLength(1);
            expect(toasts[0].message).toBe('File deleted');
        });

        it('shows an error toast when deleting a file fails', async () => {
            getCardFiles.mockResolvedValue(RAW_FILES.slice(0, 2));
            deleteCardFile.mockRejectedValue(new Error('fail'));
            const element = await createRenderedPanel();
            const toasts = collectToasts(element);

            query(
                element,
                'lightning-button-icon[data-file-id="069B"]'
            ).click();
            await flushPromises();

            expect(fileItems(element)).toHaveLength(2);
            expect(toasts[0]).toEqual({
                title: 'Error',
                message: 'Failed to delete file',
                variant: 'error'
            });
        });

        it('opens the download url in a new tab', async () => {
            getCardFiles.mockResolvedValue([RAW_FILES[0]]);
            const open = jest.spyOn(window, 'open').mockImplementation();
            const element = await createRenderedPanel();
            query(element, 'lightning-button-icon[data-url]').click();
            expect(open).toHaveBeenCalledWith(
                '/sfc/servlet.shepherd/version/download/068A',
                '_blank'
            );
        });

        it('navigates to the file preview with all file ids', async () => {
            getCardFiles.mockResolvedValue(RAW_FILES.slice(0, 2));
            const element = await createRenderedPanel();
            const link = query(
                element,
                'a[title="Preview file"][data-file-id="069B"]'
            );
            const click = new CustomEvent('click', { cancelable: true });
            link.dispatchEvent(click);

            expect(click.defaultPrevented).toBe(true);
            expect(typeof NavigationMixin.Navigate).toBe('symbol');
            expect(mockNavigate).toHaveBeenCalledWith({
                type: 'standard__namedPage',
                attributes: { pageName: 'filePreview' },
                state: {
                    recordIds: '069A,069B',
                    selectedRecordId: '069B'
                }
            });
        });
    });

    describe('save', () => {
        async function renderWithFields(store) {
            const element = await createRenderedPanel({ store });
            await emitFields(['Subject__c', 'Priority__c', 'Custom__c']);
            const [subject, priority, custom] = inputFields(element);
            subject.value = 'New subject';
            priority.value = 'High';
            custom.value = 'ignored';
            return element;
        }

        it('dispatches updateCardAsync with DTO keys and closes on success', async () => {
            const store = { dispatch: jest.fn().mockResolvedValue() };
            const element = await renderWithFields(store);
            const toasts = collectToasts(element);
            const updated = collectEvents(element, 'cardupdated');
            const closed = collectEvents(element, 'close');

            buttonByLabel(element, 'Save').click();
            await flushPromises();

            expect(updateCardAsync).toHaveBeenCalledWith('a01CARD1', {
                subject: 'New subject',
                priority: 'High'
            });
            expect(store.dispatch).toHaveBeenCalledWith({
                type: 'UPDATE_CARD_THUNK',
                cardId: 'a01CARD1',
                updates: { subject: 'New subject', priority: 'High' }
            });
            expect(updated).toEqual([{ cardId: 'a01CARD1' }]);
            expect(toasts).toEqual([
                {
                    title: 'Success',
                    message: 'Card updated successfully',
                    variant: 'success'
                }
            ]);
            expect(closed).toHaveLength(1);
        });

        it('shows the server error message when saving fails', async () => {
            const store = {
                dispatch: jest
                    .fn()
                    .mockRejectedValue({ body: { message: 'Locked' } })
            };
            const element = await renderWithFields(store);
            const toasts = collectToasts(element);
            const closed = collectEvents(element, 'close');

            buttonByLabel(element, 'Save').click();
            await flushPromises();

            expect(toasts).toEqual([
                { title: 'Error', message: 'Locked', variant: 'error' }
            ]);
            expect(closed).toHaveLength(0);
        });

        it.each([[{}], [{ body: {} }]])(
            'shows a generic message when the error is %j',
            async (error) => {
                const store = { dispatch: jest.fn().mockRejectedValue(error) };
                const element = await renderWithFields(store);
                const toasts = collectToasts(element);
                buttonByLabel(element, 'Save').click();
                await flushPromises();
                expect(toasts[0].message).toBe(
                    'An error occurred while saving'
                );
            }
        );
    });

    describe('delete', () => {
        function deleteButton(element) {
            return queryAll(element, '.card-panel__footer lightning-button')[0];
        }

        it('requires confirmation and resets after the timeout', async () => {
            jest.useFakeTimers();
            const store = { dispatch: jest.fn() };
            const element = await createRenderedPanel({ store });
            const button = deleteButton(element);
            expect(button.label).toBe('Delete');
            expect(button.variant).toBe('neutral');

            button.click();
            await flushPromises();
            expect(button.label).toBe('Confirm Delete');
            expect(button.variant).toBe('destructive');
            expect(store.dispatch).not.toHaveBeenCalled();

            jest.advanceTimersByTime(3000);
            await flushPromises();
            expect(button.label).toBe('Delete');
        });

        it('deletes the card on confirmation and closes', async () => {
            jest.useFakeTimers();
            const store = { dispatch: jest.fn().mockResolvedValue() };
            const element = await createRenderedPanel({ store });
            const toasts = collectToasts(element);
            const deleted = collectEvents(element, 'carddeleted');
            const closed = collectEvents(element, 'close');

            deleteButton(element).click();
            await flushPromises();
            deleteButton(element).click();
            await flushPromises();

            expect(deleteCardAsync).toHaveBeenCalledWith('a01CARD1');
            expect(store.dispatch).toHaveBeenCalledWith({
                type: 'DELETE_CARD_THUNK',
                cardId: 'a01CARD1'
            });
            expect(deleted).toEqual([{ cardId: 'a01CARD1' }]);
            expect(toasts[0].message).toBe('Card deleted');
            expect(closed).toHaveLength(1);
            expect(jest.getTimerCount()).toBe(0);
            expect(deleteButton(element).label).toBe('Delete');
        });

        it('shows an error toast and still closes when delete fails', async () => {
            const store = {
                dispatch: jest.fn().mockRejectedValue(new Error('fail'))
            };
            const element = await createRenderedPanel({ store });
            const toasts = collectToasts(element);
            const deleted = collectEvents(element, 'carddeleted');
            const closed = collectEvents(element, 'close');

            deleteButton(element).click();
            await flushPromises();
            deleteButton(element).click();
            await flushPromises();

            expect(deleted).toHaveLength(0);
            expect(toasts[0]).toEqual({
                title: 'Error',
                message: 'Failed to delete card',
                variant: 'error'
            });
            expect(closed).toHaveLength(1);
        });

        it('clears a pending delete confirmation when the panel closes', async () => {
            jest.useFakeTimers();
            const element = await createRenderedPanel();
            deleteButton(element).click();
            await flushPromises();
            expect(jest.getTimerCount()).toBe(1);

            buttonByLabel(element, 'Cancel').click();
            await flushPromises();
            expect(jest.getTimerCount()).toBe(0);
            expect(deleteButton(element).label).toBe('Delete');
        });

        it('clears a pending delete timer on disconnect', async () => {
            jest.useFakeTimers();
            const element = await createRenderedPanel();
            deleteButton(element).click();
            await flushPromises();
            expect(jest.getTimerCount()).toBe(1);
            document.body.removeChild(element);
            expect(jest.getTimerCount()).toBe(0);
        });
    });

    describe('close and dirty check', () => {
        /** A user edit: the field changes and fires change (loads don't). */
        function editField(field, value) {
            field.value = value;
            field.dispatchEvent(new CustomEvent('change'));
        }

        async function renderLoadedForm() {
            const element = await createRenderedPanel();
            await emitFields(['Subject__c', 'Status__c']);
            const [subject, status] = inputFields(element);
            subject.value = 'Original';
            status.value = 'To Do';
            query(element, 'lightning-record-edit-form').dispatchEvent(
                new CustomEvent('load')
            );
            return element;
        }

        it('reports no pending changes before the form has loaded', async () => {
            const element = await createRenderedPanel();
            expect(element.hasPendingChanges()).toBe(false);
            const closed = collectEvents(element, 'close');
            buttonByLabel(element, 'Cancel').click();
            await flushPromises();
            expect(LightningConfirm.open).not.toHaveBeenCalled();
            expect(closed).toHaveLength(1);
        });

        it('closes without confirmation when nothing changed', async () => {
            const element = await renderLoadedForm();
            expect(element.hasPendingChanges()).toBe(false);
            const closed = collectEvents(element, 'close');
            queryAll(element, 'lightning-button-icon')
                .find((b) => b.alternativeText === 'Close')
                .click();
            await flushPromises();
            expect(LightningConfirm.open).not.toHaveBeenCalled();
            expect(closed).toHaveLength(1);
        });

        it('asks for confirmation with unsaved changes and stays open when declined', async () => {
            LightningConfirm.open.mockResolvedValue(false);
            const element = await renderLoadedForm();
            editField(inputFields(element)[1], 'Done');
            expect(element.hasPendingChanges()).toBe(true);
            const closed = collectEvents(element, 'close');

            buttonByLabel(element, 'Cancel').click();
            await flushPromises();

            expect(LightningConfirm.open).toHaveBeenCalledWith({
                message: 'You have unsaved changes. Discard and close?',
                label: 'Unsaved changes',
                variant: 'header'
            });
            expect(closed).toHaveLength(0);
        });

        it('closes when the user confirms discarding changes', async () => {
            LightningConfirm.open.mockResolvedValue(true);
            const element = await renderLoadedForm();
            editField(inputFields(element)[0], 'Changed');
            const closed = collectEvents(element, 'close');

            buttonByLabel(element, 'Cancel').click();
            await flushPromises();

            expect(closed).toHaveLength(1);
            // The edit flag is discarded on close
            expect(element.hasPendingChanges()).toBe(false);
        });

        it('detects an edit made before the form reports load', async () => {
            // The fields show the record shortly before load fires; an edit
            // in that window must still count as unsaved
            const element = await createRenderedPanel();
            await emitFields(['Subject__c']);
            editField(inputFields(element)[0], 'Typed early');
            query(element, 'lightning-record-edit-form').dispatchEvent(
                new CustomEvent('load')
            );
            expect(element.hasPendingChanges()).toBe(true);
        });

        it('keeps unsaved edits when the store re-sends the same card', async () => {
            const element = await renderLoadedForm();
            editField(inputFields(element)[0], 'Changed');
            element.card = { ...STORY_CARD };
            expect(element.hasPendingChanges()).toBe(true);
        });

        it('discards the edit flag when a different card is opened', async () => {
            const element = await renderLoadedForm();
            editField(inputFields(element)[0], 'Changed');
            element.card = { ...STORY_CARD, Id: 'a0B000000000099' };
            expect(element.hasPendingChanges()).toBe(false);
        });

        it('closes on Escape and ignores other keys', async () => {
            const element = await createRenderedPanel();
            const closed = collectEvents(element, 'close');
            const panel = query(element, '.card-panel');

            panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
            await flushPromises();
            expect(closed).toHaveLength(0);

            panel.dispatchEvent(
                new KeyboardEvent('keydown', { key: 'Escape' })
            );
            await flushPromises();
            expect(closed).toHaveLength(1);
        });

        it('re-fetches comments and files after closing resets the loaded card', async () => {
            const element = await createRenderedPanel();
            buttonByLabel(element, 'Cancel').click();
            await flushPromises();
            expect(getCardComments).toHaveBeenCalledTimes(2);
            expect(getCardFiles).toHaveBeenCalledTimes(2);
        });
    });

    describe('panel width and resizing', () => {
        function panelEl(element) {
            return query(element, '.card-panel');
        }

        it('clamps the initial width and ignores invalid values', async () => {
            const element = await createRenderedPanel();
            expect(element.initialPanelWidth).toBe(400);
            expect(panelEl(element).style.width).toBe('400px');

            element.initialPanelWidth = 1200;
            expect(element.initialPanelWidth).toBe(800);
            element.initialPanelWidth = 100;
            expect(element.initialPanelWidth).toBe(300);
            element.initialPanelWidth = 'wide';
            expect(element.initialPanelWidth).toBe(300);
            element.initialPanelWidth = '550';
            await flushPromises();
            expect(panelEl(element).style.width).toBe('550px');
        });

        it('clamps max width and shrinks the panel to fit', async () => {
            const element = await createRenderedPanel();
            expect(element.maxPanelWidth).toBe(800);

            element.maxPanelWidth = 'nope';
            expect(element.maxPanelWidth).toBe(800);

            element.maxPanelWidth = 350;
            expect(element.maxPanelWidth).toBe(350);
            expect(element.initialPanelWidth).toBe(350);

            element.maxPanelWidth = 100;
            expect(element.maxPanelWidth).toBe(300);
            expect(element.initialPanelWidth).toBe(300);
        });

        it('resizes by dragging the handle and reports the final width', async () => {
            const element = await createRenderedPanel();
            element.maxPanelWidth = 600;
            const resized = collectEvents(element, 'panelresize');
            const handle = query(element, '.card-panel__resize-handle');

            const down = new MouseEvent('mousedown', {
                clientX: 1000,
                cancelable: true
            });
            handle.dispatchEvent(down);
            expect(down.defaultPrevented).toBe(true);

            window.dispatchEvent(new MouseEvent('mousemove', { clientX: 900 }));
            expect(panelEl(element).style.width).toBe('500px');

            // Clamped to the max and min widths
            window.dispatchEvent(new MouseEvent('mousemove', { clientX: 0 }));
            expect(panelEl(element).style.width).toBe('600px');
            window.dispatchEvent(
                new MouseEvent('mousemove', { clientX: 5000 })
            );
            expect(panelEl(element).style.width).toBe('300px');

            window.dispatchEvent(new MouseEvent('mouseup'));
            await flushPromises();
            expect(resized).toEqual([{ width: 300 }]);
            expect(element.initialPanelWidth).toBe(300);

            // Listeners removed: further moves do nothing
            window.dispatchEvent(new MouseEvent('mousemove', { clientX: 0 }));
            expect(panelEl(element).style.width).toBe('300px');
        });

        it('does not report a resize when the mouse never moved', async () => {
            const element = await createRenderedPanel();
            const resized = collectEvents(element, 'panelresize');
            query(element, '.card-panel__resize-handle').dispatchEvent(
                new MouseEvent('mousedown', { clientX: 500 })
            );
            window.dispatchEvent(new MouseEvent('mouseup'));
            await flushPromises();
            expect(resized).toHaveLength(0);
            expect(element.initialPanelWidth).toBe(400);
        });

        it('removes resize listeners on disconnect', async () => {
            const removeSpy = jest.spyOn(window, 'removeEventListener');
            const element = await createRenderedPanel();
            query(element, '.card-panel__resize-handle').dispatchEvent(
                new MouseEvent('mousedown', { clientX: 500 })
            );
            document.body.removeChild(element);
            expect(removeSpy).toHaveBeenCalledWith(
                'mousemove',
                expect.any(Function)
            );
            expect(removeSpy).toHaveBeenCalledWith(
                'mouseup',
                expect.any(Function)
            );
        });

        it('does not remove listeners on disconnect when not resizing', async () => {
            const removeSpy = jest.spyOn(window, 'removeEventListener');
            const element = await createRenderedPanel();
            document.body.removeChild(element);
            expect(removeSpy).not.toHaveBeenCalledWith(
                'mousemove',
                expect.any(Function)
            );
        });
    });
});
