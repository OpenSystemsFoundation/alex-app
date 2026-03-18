import { LightningElement, api, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { updateCard, deleteCardAsync } from 'c/kanbanStore';
import getModalSettings from '@salesforce/apex/KanbanBoardController.getModalSettings';

export default class KanbanCardDetail extends LightningElement {
    @api card;
    @api store;
    @api isOpen = false;

    @track modalSettings = null;
    @track formFields = [];
    @track deleteConfirmState = false;
    deleteTimeout = null;

    // Store original card state before optimistic update for rollback
    originalCardState = null;

    // Field metadata for layout and sizing
    fieldMetadata = {
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
        OpenSF__Color__c: { fullWidth: false, isTextarea: false }
    };

    @wire(getModalSettings)
    wiredSettings({ error, data }) {
        if (data) {
            this.modalSettings = data;
            if (data.visibleFields) {
                this.processFields(data.visibleFields);
            }
        } else if (error) {
            console.error('Error loading modal settings:', error);
            // Use defaults
            this.processFields([
                'OpenSF__Subject__c',
                'OpenSF__Description__c',
                'OpenSF__Priority__c',
                'OpenSF__CardType__c',
                'OpenSF__Assignee__c',
                'OpenSF__DueDate__c',
                'OpenSF__StoryPoints__c',
                'OpenSF__Color__c'
            ]);
        }
    }

    processFields(fieldNames) {
        this.formFields = fieldNames.map((fieldName, index) => {
            const metadata = this.fieldMetadata[fieldName] || {
                fullWidth: false,
                isTextarea: false
            };
            return {
                fieldName: fieldName,
                key: `field-${index}`,
                fullWidth: metadata.fullWidth,
                isTextarea: metadata.isTextarea,
                isRegularField: !metadata.isTextarea,
                columnClass: metadata.fullWidth
                    ? 'slds-col slds-size_1-of-1'
                    : 'slds-col slds-size_1-of-2'
            };
        });
    }

    renderedCallback() {
        // Focus the modal when it opens to enable keyboard events
        if (this.isOpen) {
            const modal = this.template.querySelector('section[role="dialog"]');
            if (modal && document.activeElement !== modal) {
                modal.focus();
            }
        }
    }

    handleClose() {
        this.dispatchEvent(new CustomEvent('close'));
    }

    handleSave() {
        const form = this.template.querySelector('lightning-record-edit-form');
        if (!form) {
            return;
        }

        // Get all field values for optimistic update
        const fields = this.template.querySelectorAll('lightning-input-field');
        const updates = {};

        fields.forEach((field) => {
            if (field.value !== undefined && field.value !== null) {
                updates[field.fieldName] = field.value;
            }
        });

        // Store original state for potential rollback
        if (this.store && Object.keys(updates).length > 0) {
            this.originalCardState = { ...this.card };

            // Optimistically update store immediately
            this.store.dispatch(updateCard(this.card.Id, updates));
        }

        // Let the form handle the server sync
        form.submit();
    }

    handleSuccess() {
        // Clear the original state since save succeeded
        this.originalCardState = null;

        this.showSuccess('Card updated successfully');

        // Notify parent to refresh
        this.dispatchEvent(
            new CustomEvent('cardupdated', {
                detail: { cardId: this.card.Id }
            })
        );

        // Close the modal after successful save
        this.handleClose();
    }

    handleError(event) {
        const message = event.detail?.message || 'Error updating card';

        // Rollback the optimistic update if we have original state
        if (this.store && this.originalCardState) {
            // Extract only the fields that were updated
            const rollbackUpdates = {};
            Object.keys(this.originalCardState).forEach((key) => {
                if (key.endsWith('__c') || key === 'Name') {
                    rollbackUpdates[key] = this.originalCardState[key];
                }
            });

            this.store.dispatch(updateCard(this.card.Id, rollbackUpdates));
            this.originalCardState = null;
        }

        this.showError('Error', message);
    }

    handleDelete() {
        // Clear any existing timeout
        if (this.deleteTimeout) {
            clearTimeout(this.deleteTimeout);
        }

        // If not in confirm state, enter confirm state
        if (!this.deleteConfirmState) {
            this.deleteConfirmState = true;

            // Reset state after 3 seconds
            // eslint-disable-next-line @lwc/lwc/no-async-operation
            this.deleteTimeout = setTimeout(() => {
                this.deleteConfirmState = false;
            }, 3000);
        }
        // If already in confirm state, perform delete
        else {
            this.deleteConfirmState = false;
            clearTimeout(this.deleteTimeout);
            this.performDelete();
        }
    }

    async performDelete() {
        if (!this.store) {
            this.showError('Error', 'Store not available');
            return;
        }

        try {
            await this.store.dispatch(deleteCardAsync(this.card.Id));
            this.showSuccess('Card deleted successfully');
            this.handleClose();

            this.dispatchEvent(
                new CustomEvent('carddeleted', {
                    detail: { cardId: this.card.Id }
                })
            );
        } catch (error) {
            this.showError(
                'Error deleting card',
                error.body?.message || error.message
            );
        }
    }

    handleKeyDown(event) {
        // Close on Escape key
        if (event.key === 'Escape') {
            event.preventDefault();
            this.handleClose();
        }
    }

    showSuccess(message) {
        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Success',
                message: message,
                variant: 'success'
            })
        );
    }

    showError(title, message) {
        this.dispatchEvent(
            new ShowToastEvent({
                title: title,
                message: message,
                variant: 'error'
            })
        );
    }

    get modalClass() {
        return this.isOpen ? 'slds-modal slds-fade-in-open' : 'slds-modal';
    }

    get backdropClass() {
        return this.isOpen
            ? 'slds-backdrop slds-backdrop_open'
            : 'slds-backdrop';
    }

    get hasFields() {
        return this.formFields && this.formFields.length > 0;
    }

    get descriptionField() {
        return this.formFields.find((field) => field.isTextarea);
    }

    get regularFields() {
        return this.formFields.filter((field) => field.isRegularField);
    }

    get deleteButtonLabel() {
        return this.deleteConfirmState ? 'Confirm?' : 'Delete';
    }

    get deleteButtonVariant() {
        return this.deleteConfirmState ? 'destructive' : 'destructive-text';
    }
}
