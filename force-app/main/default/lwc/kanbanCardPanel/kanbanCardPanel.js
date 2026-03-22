import { LightningElement, api, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { updateCardAsync, deleteCardAsync } from 'c/kanbanStore';
import getModalSettings from '@salesforce/apex/KanbanBoardController.getModalSettings';
import getCardComments from '@salesforce/apex/KanbanBoardController.getCardComments';
import addCardComment from '@salesforce/apex/KanbanBoardController.addCardComment';
import updateCardComment from '@salesforce/apex/KanbanBoardController.updateCardComment';
import deleteCardComment from '@salesforce/apex/KanbanBoardController.deleteCardComment';
import userId from '@salesforce/user/Id';

const FIELD_METADATA = {
    OpenSF__Subject__c: { fullWidth: true, isTextarea: false },
    OpenSF__Description__c: { fullWidth: true, isTextarea: true },
    OpenSF__Status__c: { fullWidth: false, isTextarea: false },
    OpenSF__CardType__c: { fullWidth: false, isTextarea: false },
    OpenSF__Priority__c: { fullWidth: false, isTextarea: false },
    OpenSF__Epic__c: { fullWidth: false, isTextarea: false },
    OpenSF__Assignee__c: { fullWidth: false, isTextarea: false },
    OpenSF__PeerReviewer__c: { fullWidth: false, isTextarea: false },
    OpenSF__DueDate__c: { fullWidth: false, isTextarea: false },
    OpenSF__StoryPoints__c: { fullWidth: false, isTextarea: false },
    OpenSF__Color__c: { fullWidth: false, isTextarea: false },
    OpenSF__NeedsRefinement__c: { fullWidth: false, isTextarea: false }
};

const FIELD_TO_DTO = {
    OpenSF__Subject__c: 'subject',
    OpenSF__Description__c: 'description',
    OpenSF__Status__c: 'status',
    OpenSF__CardType__c: 'cardType',
    OpenSF__Priority__c: 'priority',
    OpenSF__Epic__c: 'epicId',
    OpenSF__Assignee__c: 'assigneeId',
    OpenSF__PeerReviewer__c: 'peerReviewerId',
    OpenSF__DueDate__c: 'dueDate',
    OpenSF__StoryPoints__c: 'storyPoints',
    OpenSF__Color__c: 'color',
    OpenSF__NeedsRefinement__c: 'needsRefinement'
};

const DESCRIPTION_TEMPLATES = {
    Story: [
        '<h2>User Story</h2>',
        '<p><strong>As a</strong> [type of user],</p>',
        '<p><strong>I want</strong> [goal/desire],</p>',
        '<p><strong>So that</strong> [benefit/value].</p>',
        '<h2>Acceptance Criteria</h2>',
        '<ul><li>Given … When … Then …</li></ul>',
        '<h2>Notes</h2>',
        '<p></p>'
    ].join('\n'),
    Bug: [
        '<h2>Bug Report</h2>',
        '<p><strong>Severity:</strong> </p>',
        '<h2>Steps to Reproduce</h2>',
        '<ol><li></li></ol>',
        '<h2>Expected Behavior</h2>',
        '<p></p>',
        '<h2>Actual Behavior</h2>',
        '<p></p>',
        '<h2>Environment</h2>',
        '<p></p>'
    ].join('\n'),
    Improvement: [
        '<h2>Improvement</h2>',
        '<p><strong>Current behavior:</strong> </p>',
        '<p><strong>Proposed change:</strong> </p>',
        '<h2>Motivation</h2>',
        '<p></p>',
        '<h2>Acceptance Criteria</h2>',
        '<ul><li></li></ul>'
    ].join('\n'),
    Spike: [
        '<h2>Spike / Research</h2>',
        '<p><strong>Timebox:</strong> </p>',
        '<h2>Questions to Answer</h2>',
        '<ul><li></li></ul>',
        '<h2>Approach</h2>',
        '<p></p>',
        '<h2>Findings</h2>',
        '<p></p>'
    ].join('\n'),
    Task: [
        '<h2>Task</h2>',
        '<p><strong>Objective:</strong> </p>',
        '<h2>Steps</h2>',
        '<ul><li></li></ul>',
        '<h2>Done When</h2>',
        '<p></p>'
    ].join('\n'),
    Epic: [
        '<h2>Epic</h2>',
        '<p><strong>Vision:</strong> </p>',
        '<h2>Goals</h2>',
        '<ul><li></li></ul>',
        '<h2>Scope</h2>',
        '<p><strong>In scope:</strong> </p>',
        '<p><strong>Out of scope:</strong> </p>',
        '<h2>Success Metrics</h2>',
        '<p></p>'
    ].join('\n')
};

const MIN_PANEL_WIDTH = 300;
const MAX_PANEL_WIDTH = 800;
const DELETE_CONFIRM_TIMEOUT = 3000;

export default class KanbanCardPanel extends LightningElement {
    /** @type {CardDTO} The card data to display in the panel */
    @api card;
    /** @type {import('c/kanbanStore').Store} The Redux-style store instance */
    @api store;
    /** @type {boolean} Whether the panel is currently visible */
    @api isOpen = false;

    @track modalSettings;
    @track formFields = [];
    @track deleteConfirmState = false;
    @track panelWidth = 400;

    // Comment state
    @track comments = [];
    @track isLoadingComments = false;
    @track newCommentBody = '';

    _resizing = false;
    _deleteTimer;
    _boundHandleResize;
    _boundHandleResizeEnd;
    _lastLoadedCardId;

    @wire(getModalSettings)
    wiredModalSettings({ data, error }) {
        if (data) {
            this.modalSettings = data;
            if (data.visibleFields) {
                this.formFields = this.processFields(data.visibleFields);
            }
        } else if (error) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error loading field settings',
                    message: error.body ? error.body.message : 'Unknown error',
                    variant: 'error'
                })
            );
        }
    }

    renderedCallback() {
        if (
            this.isOpen &&
            this.card?.Id &&
            this.card.Id !== this._lastLoadedCardId
        ) {
            this._lastLoadedCardId = this.card.Id;
            this.loadComments();
        }
    }

    processFields(fieldNames) {
        return fieldNames.map((fieldName) => {
            // Server returns unqualified names (e.g. Subject__c),
            // but lightning-input-field needs the namespace-qualified name
            const qualifiedName = fieldName.startsWith('OpenSF__')
                ? fieldName
                : `OpenSF__${fieldName}`;
            const meta = FIELD_METADATA[qualifiedName] || {
                fullWidth: false,
                isTextarea: false
            };
            return {
                fieldName: qualifiedName,
                key: qualifiedName,
                fullWidth: meta.fullWidth,
                isTextarea: meta.isTextarea,
                columnClass: meta.fullWidth
                    ? 'slds-col slds-size_1-of-1'
                    : 'slds-col slds-size_1-of-2'
            };
        });
    }

    get panelStyle() {
        return `width: ${this.panelWidth}px`;
    }

    get cardRecordUrl() {
        return this.card?.Id
            ? `/lightning/r/OpenSF__Card__c/${this.card.Id}/view`
            : '#';
    }

    handleNameClick(event) {
        event.preventDefault();
        this.dispatchEvent(
            new CustomEvent('navigatetocard', {
                detail: { cardId: this.card.Id }
            })
        );
    }

    get hasFields() {
        return this.formFields && this.formFields.length > 0;
    }

    get descriptionField() {
        return this.formFields.find(
            (f) => f.fieldName === 'OpenSF__Description__c'
        );
    }

    get regularFields() {
        return this.formFields.filter(
            (f) => f.fieldName !== 'OpenSF__Description__c'
        );
    }

    get cardType() {
        return this.card?.OpenSF__CardType__c || null;
    }

    get hasTemplate() {
        return !!this.cardType && !!DESCRIPTION_TEMPLATES[this.cardType];
    }

    get descriptionIsEmpty() {
        const desc = this.card?.OpenSF__Description__c;
        if (!desc) {
            return true;
        }
        const stripped = desc.replace(/<[^>]*>/g, '').trim();
        return stripped.length === 0;
    }

    get showApplyTemplate() {
        return this.hasTemplate && this.descriptionField;
    }

    handleApplyTemplate() {
        if (!this.hasTemplate) {
            return;
        }
        const template = DESCRIPTION_TEMPLATES[this.cardType];
        const descInput = this.template.querySelectorAll(
            'lightning-input-field'
        );
        for (const field of descInput) {
            if (field.fieldName === 'OpenSF__Description__c') {
                field.value = template;
                break;
            }
        }
    }

    get deleteButtonLabel() {
        return this.deleteConfirmState ? 'Confirm Delete' : 'Delete';
    }

    get deleteButtonVariant() {
        return this.deleteConfirmState ? 'destructive' : 'neutral';
    }

    // =========================================================================
    // Comment getters
    // =========================================================================

    get commentCount() {
        return this.comments ? this.comments.length : 0;
    }

    get hasComments() {
        return (
            !this.isLoadingComments && this.comments && this.comments.length > 0
        );
    }

    get noComments() {
        return (
            !this.isLoadingComments &&
            (!this.comments || this.comments.length === 0)
        );
    }

    get isPostDisabled() {
        // Note: in automated test environments, lightning-textarea onchange
        // may not fire, so this getter is best-effort. The handlePostComment
        // method reads the component value directly as a fallback.
        return !this.newCommentBody || !this.newCommentBody.trim();
    }

    // =========================================================================
    // Comment methods
    // =========================================================================

    async loadComments() {
        if (!this.card?.Id) {
            return;
        }
        this.isLoadingComments = true;
        try {
            const rawComments = await getCardComments({ cardId: this.card.Id });
            this.comments = rawComments.map((c) => this.enrichComment(c));
        } catch (error) {
            this.comments = [];
        } finally {
            this.isLoadingComments = false;
        }
    }

    enrichComment(c) {
        return {
            ...c,
            isOwnComment: c.createdById === userId,
            isEditing: false,
            editBody: c.body,
            formattedDate: this.formatRelativeDate(c.createdDate)
        };
    }

    formatRelativeDate(dateStr) {
        if (!dateStr) {
            return '';
        }
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) {
            return 'just now';
        }
        if (diffMins < 60) {
            return `${diffMins}m ago`;
        }
        if (diffHours < 24) {
            return `${diffHours}h ago`;
        }
        if (diffDays < 7) {
            return `${diffDays}d ago`;
        }
        return date.toLocaleDateString();
    }

    handleCommentInputChange(event) {
        this.newCommentBody = event.detail.value;
    }

    async handlePostComment() {
        // Read value from the lightning-textarea component directly
        // in case the onchange binding didn't fire (e.g. automated tests)
        const textareaEl = this.template.querySelector(
            '[data-id="comment-input"]'
        );
        const body = (textareaEl?.value || this.newCommentBody || '').trim();
        if (!body) {
            return;
        }
        try {
            const newComment = await addCardComment({
                cardId: this.card.Id,
                body
            });
            this.comments = [this.enrichComment(newComment), ...this.comments];
            this.newCommentBody = '';
            // Clear the textarea
            if (textareaEl) {
                textareaEl.value = '';
            }
        } catch (error) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error',
                    message: 'Failed to post comment',
                    variant: 'error'
                })
            );
        }
    }

    handleCommentAction(event) {
        const action = event.detail.value;
        const commentId =
            event.currentTarget.dataset.commentId ||
            event.target.closest('[data-comment-id]')?.dataset?.commentId;
        if (!commentId) {
            return;
        }
        if (action === 'edit') {
            this.comments = this.comments.map((c) =>
                c.Id === commentId
                    ? { ...c, isEditing: true, editBody: c.body }
                    : c
            );
        } else if (action === 'delete') {
            this.handleDeleteComment(commentId);
        }
    }

    handleEditInputChange(event) {
        const commentId = event.target.dataset.commentId;
        if (!commentId) {
            return;
        }
        this.comments = this.comments.map((c) =>
            c.Id === commentId ? { ...c, editBody: event.detail.value } : c
        );
    }

    handleCancelEdit(event) {
        const commentId = event.target.dataset.commentId;
        if (!commentId) {
            return;
        }
        this.comments = this.comments.map((c) =>
            c.Id === commentId
                ? { ...c, isEditing: false, editBody: c.body }
                : c
        );
    }

    async handleSaveEdit(event) {
        const commentId = event.target.dataset.commentId;
        if (!commentId) {
            return;
        }
        const comment = this.comments.find((c) => c.Id === commentId);
        if (!comment || !comment.editBody?.trim()) {
            return;
        }
        try {
            const updated = await updateCardComment({
                commentId,
                body: comment.editBody.trim()
            });
            this.comments = this.comments.map((c) =>
                c.Id === commentId
                    ? {
                          ...this.enrichComment(updated),
                          isEditing: false
                      }
                    : c
            );
        } catch (error) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error',
                    message: 'Failed to update comment',
                    variant: 'error'
                })
            );
        }
    }

    async handleDeleteComment(commentId) {
        try {
            await deleteCardComment({ commentId });
            this.comments = this.comments.filter((c) => c.Id !== commentId);
        } catch (error) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error',
                    message: 'Failed to delete comment',
                    variant: 'error'
                })
            );
        }
    }

    // =========================================================================
    // Card save / delete / close
    // =========================================================================

    async handleSave() {
        const inputFields = this.template.querySelectorAll(
            'lightning-input-field'
        );
        const dtoUpdates = {};
        inputFields.forEach((field) => {
            const dtoKey = FIELD_TO_DTO[field.fieldName];
            if (dtoKey) {
                dtoUpdates[dtoKey] = field.value;
            }
        });

        try {
            await this.store.dispatch(
                updateCardAsync(this.card.Id, dtoUpdates)
            );
            this.dispatchEvent(
                new CustomEvent('cardupdated', {
                    detail: { cardId: this.card.Id }
                })
            );
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Success',
                    message: 'Card updated successfully',
                    variant: 'success'
                })
            );
            this.handleClose();
        } catch (error) {
            const message =
                error.body && error.body.message
                    ? error.body.message
                    : 'An error occurred while saving';
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error',
                    message,
                    variant: 'error'
                })
            );
        }
    }

    handleDelete() {
        if (this.deleteConfirmState) {
            this.performDelete();
        } else {
            this.deleteConfirmState = true;
            // eslint-disable-next-line @lwc/lwc/no-async-operation
            this._deleteTimer = setTimeout(() => {
                this.deleteConfirmState = false;
            }, DELETE_CONFIRM_TIMEOUT);
        }
    }

    async performDelete() {
        if (this._deleteTimer) {
            clearTimeout(this._deleteTimer);
            this._deleteTimer = null;
        }
        this.deleteConfirmState = false;

        try {
            await this.store.dispatch(deleteCardAsync(this.card.Id));
            this.dispatchEvent(
                new CustomEvent('carddeleted', {
                    detail: { cardId: this.card.Id }
                })
            );
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Success',
                    message: 'Card deleted',
                    variant: 'success'
                })
            );
        } catch (error) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error',
                    message: 'Failed to delete card',
                    variant: 'error'
                })
            );
        }
        this.handleClose();
    }

    handleClose() {
        this.deleteConfirmState = false;
        this._lastLoadedCardId = null;
        this.comments = [];
        this.newCommentBody = '';
        if (this._deleteTimer) {
            clearTimeout(this._deleteTimer);
            this._deleteTimer = null;
        }
        this.dispatchEvent(new CustomEvent('close'));
    }

    handleKeyDown(event) {
        if (event.key === 'Escape') {
            this.handleClose();
        }
    }

    handleResizeStart(event) {
        event.preventDefault();
        this._resizing = true;
        this._resizeStartX = event.clientX;
        this._resizeStartWidth = this.panelWidth;

        this._boundHandleResize = this.handleResize.bind(this);
        this._boundHandleResizeEnd = this.handleResizeEnd.bind(this);

        window.addEventListener('mousemove', this._boundHandleResize);
        window.addEventListener('mouseup', this._boundHandleResizeEnd);
    }

    handleResize(event) {
        if (!this._resizing) {
            return;
        }
        const delta = this._resizeStartX - event.clientX;
        let newWidth = this._resizeStartWidth + delta;
        newWidth = Math.max(
            MIN_PANEL_WIDTH,
            Math.min(MAX_PANEL_WIDTH, newWidth)
        );
        this.panelWidth = newWidth;
    }

    handleResizeEnd() {
        this._resizing = false;
        window.removeEventListener('mousemove', this._boundHandleResize);
        window.removeEventListener('mouseup', this._boundHandleResizeEnd);
        this._boundHandleResize = null;
        this._boundHandleResizeEnd = null;
    }

    disconnectedCallback() {
        if (this._deleteTimer) {
            clearTimeout(this._deleteTimer);
        }
        if (this._boundHandleResize) {
            window.removeEventListener('mousemove', this._boundHandleResize);
        }
        if (this._boundHandleResizeEnd) {
            window.removeEventListener('mouseup', this._boundHandleResizeEnd);
        }
    }
}
