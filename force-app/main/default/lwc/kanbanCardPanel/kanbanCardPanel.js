import { LightningElement, api, track, wire } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import LightningConfirm from 'lightning/confirm';

const CARD_TITLE_CLASS =
    'card-panel__title card-panel__title--two-line slds-text-heading_small';
const EPIC_CHILD_NAME_CLASS =
    'epic-child-card__name epic-child-card__name--two-line';
const EPIC_CHILD_SUBJECT_CLASS =
    'epic-child-card__subject epic-child-card__subject--two-line';
import { updateCardAsync, deleteCardAsync } from 'c/kanbanStore';
import getModalSettings from '@salesforce/apex/KanbanBoardController.getModalSettings';
import getCardComments from '@salesforce/apex/KanbanBoardController.getCardComments';
import addCardComment from '@salesforce/apex/KanbanBoardController.addCardComment';
import updateCardComment from '@salesforce/apex/KanbanBoardController.updateCardComment';
import deleteCardComment from '@salesforce/apex/KanbanBoardController.deleteCardComment';
import getCardFiles from '@salesforce/apex/KanbanBoardController.getCardFiles';
import deleteCardFile from '@salesforce/apex/KanbanBoardController.deleteCardFile';
import userId from '@salesforce/user/Id';
import getEpicDetail from '@salesforce/apex/KanbanBoardController.getEpicDetail';

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

export default class KanbanCardPanel extends NavigationMixin(LightningElement) {
    /** @type {CardDTO} The card data to display in the panel */
    _card;
    @api
    get card() {
        return this._card;
    }
    set card(value) {
        const previousId = this._card?.Id;
        this._card = value;
        this.epicDetail = null;
        // The store hands over a fresh object on every update of the same
        // card; only switching to a different card discards the edit flag
        if (value?.Id !== previousId) {
            this._hasUserEdits = false;
        }

        // Force form remount when switching to a different card
        // so lightning-input-field values reset to the new record
        if (value?.Id && value.Id !== previousId) {
            this._formReady = false;
            // eslint-disable-next-line @lwc/lwc/no-async-operation
            Promise.resolve().then(() => {
                this._formReady = true;
            });
        }

        if (value?.cardType === 'Epic' && value?.Id) {
            this.loadEpicDetail(value.Id);
        }
    }
    /** @type {import('c/kanbanStore').Store} The Redux-style store instance */
    @api store;
    /** @type {boolean} Whether the panel is currently visible */
    @api isOpen = false;
    /** @type {number} Persisted panel width provided by the parent view */
    @api
    get initialPanelWidth() {
        return this.panelWidth;
    }
    set initialPanelWidth(value) {
        const parsedWidth = Number(value);
        if (Number.isFinite(parsedWidth)) {
            this.panelWidth = Math.max(
                MIN_PANEL_WIDTH,
                Math.min(MAX_PANEL_WIDTH, parsedWidth)
            );
        }
    }
    /** @type {number} Parent-computed maximum width for the panel in current layout */
    @api
    get maxPanelWidth() {
        return this._maxPanelWidth ?? MAX_PANEL_WIDTH;
    }
    set maxPanelWidth(value) {
        const parsedWidth = Number(value);
        if (Number.isFinite(parsedWidth)) {
            this._maxPanelWidth = Math.max(MIN_PANEL_WIDTH, parsedWidth);
            this.panelWidth = Math.max(
                MIN_PANEL_WIDTH,
                Math.min(this._maxPanelWidth, this.panelWidth)
            );
        }
    }

    @track modalSettings;
    @track formFields = [];
    @track deleteConfirmState = false;
    @track _formReady = true;
    @track panelWidth = 400;
    @track files = [];
    @track filesExpanded = true;
    @track _filesLoaded = false;

    // Comment state
    @track comments = [];
    @track isLoadingComments = false;

    // Epic state
    @track epicDetail = null;
    @track epicDetailLoading = false;

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
            this.loadFiles();
        }
    }

    /**
     * A form field changed because the user edited it. Loading the record
     * fills the fields without firing change, so this only tracks real edits.
     *
     * Comparing against a snapshot taken on the form's load event missed
     * edits: the fields show the record a moment before load fires, so an
     * edit made in that window became part of the "original" values.
     */
    handleFieldChange() {
        this._hasUserEdits = true;
    }

    /**
     * Whether the user changed any field since the card was opened.
     * @returns {boolean}
     */
    @api
    hasPendingChanges() {
        return !!this._hasUserEdits;
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

    get cardNameClass() {
        return CARD_TITLE_CLASS;
    }

    get cardNameTitle() {
        return this.card?.Name || null;
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

    get isEpicCard() {
        return (
            this.card?.cardType === 'Epic' ||
            this.card?.OpenSF__CardType__c === 'Epic'
        );
    }

    get hasEpicChildCards() {
        return (
            this.epicDetail?.childCards && this.epicDetail.childCards.length > 0
        );
    }

    get epicChildCards() {
        const childCards = this.epicDetail?.childCards;
        if (!childCards || childCards.length === 0) {
            return [];
        }
        return childCards.map((child) => {
            return {
                ...child,
                nameClass: EPIC_CHILD_NAME_CLASS,
                nameTitle: child?.name || null,
                subjectClass: EPIC_CHILD_SUBJECT_CLASS,
                subjectTitle: child?.subject || null
            };
        });
    }

    get epicProgressPercent() {
        return this.epicDetail?.progressPercent || 0;
    }

    get epicProgressStyle() {
        return `width: ${this.epicProgressPercent}%`;
    }

    get epicProgressLabel() {
        if (!this.epicDetail) return '';
        return `${this.epicDetail.completedCards} of ${this.epicDetail.totalCards} cards completed (${this.epicProgressPercent}%)`;
    }

    get epicPointsLabel() {
        if (!this.epicDetail) return '';
        return `${this.epicDetail.completedPoints || 0} / ${this.epicDetail.totalPoints || 0} points`;
    }

    async loadEpicDetail(epicId) {
        this.epicDetailLoading = true;
        try {
            this.epicDetail = await getEpicDetail({ epicId });
        } catch (error) {
            // eslint-disable-next-line no-console
            console.warn('Failed to load epic detail:', error);
            this.epicDetail = null;
        } finally {
            this.epicDetailLoading = false;
        }
    }

    handleChildCardClick(event) {
        const cardId = event.currentTarget.dataset.cardId;
        if (cardId) {
            this.dispatchEvent(
                new CustomEvent('navigatetocard', {
                    detail: { cardId }
                })
            );
        }
    }

    get cardType() {
        return this.card?.cardType || this.card?.OpenSF__CardType__c || null;
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
                this._hasUserEdits = true;
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

    async handlePostComment() {
        const textareaEl = this.template.querySelector(
            '[data-id="comment-input"]'
        );
        const body = (textareaEl?.value || '').trim();
        if (!body) {
            return;
        }
        try {
            const newComment = await addCardComment({
                cardId: this.card.Id,
                body
            });
            this.comments = [this.enrichComment(newComment), ...this.comments];
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
            this.comments = this.comments.map((c) => {
                return c.Id === commentId
                    ? { ...c, isEditing: true, editBody: c.body }
                    : c;
            });
        } else if (action === 'delete') {
            this.handleDeleteComment(commentId);
        }
    }

    handleEditInputChange(event) {
        const commentId = event.target.dataset.commentId;
        if (!commentId) {
            return;
        }
        this.comments = this.comments.map((c) => {
            return c.Id === commentId
                ? { ...c, editBody: event.detail.value }
                : c;
        });
    }

    handleCancelEdit(event) {
        const commentId = event.target.dataset.commentId;
        if (!commentId) {
            return;
        }
        this.comments = this.comments.map((c) => {
            return c.Id === commentId
                ? { ...c, isEditing: false, editBody: c.body }
                : c;
        });
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
            this.comments = this.comments.map((c) => {
                return c.Id === commentId
                    ? {
                          ...this.enrichComment(updated),
                          isEditing: false
                      }
                    : c;
            });
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
            this._closePanel();
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
        this._closePanel();
    }

    // =========================================================================
    // File Attachment Methods
    // =========================================================================

    get acceptedFormats() {
        return [
            '.pdf',
            '.png',
            '.jpg',
            '.jpeg',
            '.gif',
            '.doc',
            '.docx',
            '.xls',
            '.xlsx',
            '.csv',
            '.txt',
            '.zip',
            '.ppt',
            '.pptx',
            '.svg'
        ];
    }

    get hasFiles() {
        return this.files && this.files.length > 0;
    }

    get noFiles() {
        return this._filesLoaded && (!this.files || this.files.length === 0);
    }

    get fileCount() {
        return this.files ? this.files.length : 0;
    }

    get filesToggleIcon() {
        return this.filesExpanded
            ? 'utility:chevrondown'
            : 'utility:chevronright';
    }

    toggleFilesSection() {
        this.filesExpanded = !this.filesExpanded;
    }

    async loadFiles() {
        try {
            const rawFiles = await getCardFiles({ cardId: this.card.Id });
            this.files = (rawFiles || []).map((f) => ({
                contentDocumentId: f.contentDocumentId,
                title: f.title,
                fileExtension: f.fileExtension,
                iconName: this._getFileIcon(f.fileExtension),
                formattedSize: this._formatFileSize(f.contentSize),
                downloadUrl: `/sfc/servlet.shepherd/version/download/${f.latestVersionId}`
            }));
        } catch (error) {
            console.error('Error loading files:', error);
            this.files = [];
        }
        this._filesLoaded = true;
    }

    async handleUploadFinished(event) {
        const uploadedFiles = event.detail.files;
        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Success',
                message: uploadedFiles.length + ' file(s) uploaded',
                variant: 'success'
            })
        );
        await this.loadFiles();
    }

    async handleDeleteFile(event) {
        const fileId = event.currentTarget.dataset.fileId;
        try {
            await deleteCardFile({
                contentDocumentId: fileId,
                cardId: this.card && this.card.Id
            });
            this.files = this.files.filter(
                (f) => f.contentDocumentId !== fileId
            );
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Success',
                    message: 'File deleted',
                    variant: 'success'
                })
            );
        } catch (error) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error',
                    message: 'Failed to delete file',
                    variant: 'error'
                })
            );
        }
    }

    handleDownloadFile(event) {
        const url = event.currentTarget.dataset.url;
        window.open(url, '_blank');
    }

    handlePreviewFile(event) {
        event.preventDefault();
        const fileId = event.currentTarget.dataset.fileId;
        this[NavigationMixin.Navigate]({
            type: 'standard__namedPage',
            attributes: {
                pageName: 'filePreview'
            },
            state: {
                recordIds: this.files.map((f) => f.contentDocumentId).join(','),
                selectedRecordId: fileId
            }
        });
    }

    _getFileIcon(extension) {
        const iconMap = {
            pdf: 'doctype:pdf',
            png: 'doctype:image',
            jpg: 'doctype:image',
            jpeg: 'doctype:image',
            gif: 'doctype:image',
            svg: 'doctype:image',
            doc: 'doctype:word',
            docx: 'doctype:word',
            xls: 'doctype:excel',
            xlsx: 'doctype:excel',
            csv: 'doctype:csv',
            ppt: 'doctype:ppt',
            pptx: 'doctype:ppt',
            txt: 'doctype:txt',
            zip: 'doctype:zip',
            xml: 'doctype:xml',
            html: 'doctype:html'
        };
        return iconMap[extension?.toLowerCase()] || 'doctype:attachment';
    }

    _formatFileSize(bytes) {
        if (!bytes || bytes === 0) {
            return '0 B';
        }
        const units = ['B', 'KB', 'MB', 'GB'];
        let i = 0;
        let size = bytes;
        while (size >= 1024 && i < units.length - 1) {
            size /= 1024;
            i++;
        }
        return size.toFixed(i === 0 ? 0 : 1) + ' ' + units[i];
    }

    async handleClose() {
        if (this.hasPendingChanges()) {
            const discard = await LightningConfirm.open({
                message: 'You have unsaved changes. Discard and close?',
                label: 'Unsaved changes',
                variant: 'header'
            });
            if (!discard) {
                return;
            }
        }
        this._closePanel();
    }

    /** Internal close — skips the dirty check (used after save/delete) */
    _closePanel() {
        this.deleteConfirmState = false;
        this._lastLoadedCardId = null;
        this._hasUserEdits = false;
        this.comments = [];
        this.files = [];
        this._filesLoaded = false;
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
        this._panelEl = this.template.querySelector('.card-panel');

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
            Math.min(this.maxPanelWidth, newWidth)
        );
        this._lastResizeWidth = newWidth;
        if (this._panelEl) {
            this._panelEl.style.width = `${newWidth}px`;
        }
    }

    handleResizeEnd() {
        this._resizing = false;
        if (this._lastResizeWidth != null) {
            this.panelWidth = this._lastResizeWidth;
            this.dispatchEvent(
                new CustomEvent('panelresize', {
                    detail: { width: this._lastResizeWidth }
                })
            );
            this._lastResizeWidth = null;
        }
        this._panelEl = null;
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
