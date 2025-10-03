import { LightningElement, api, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import deleteCard from '@salesforce/apex/KanbanBoardController.deleteCard';
import getModalSettings from '@salesforce/apex/KanbanBoardController.getModalSettings';

export default class KanbanCardDetail extends LightningElement {
    @api card;
    @api isOpen = false;
    
    @track modalSettings = null;
    @track formFields = [];
    
    // Field metadata for layout and sizing
    fieldMetadata = {
        'OpenSF__Subject__c': { fullWidth: true, isTextarea: false },
        'OpenSF__Description__c': { fullWidth: true, isTextarea: true },
        'OpenSF__Status__c': { fullWidth: false, isTextarea: false },
        'OpenSF__CardType__c': { fullWidth: false, isTextarea: false },
        'OpenSF__Priority__c': { fullWidth: false, isTextarea: false },
        'OpenSF__Epic__c': { fullWidth: false, isTextarea: false },
        'OpenSF__Assignee__c': { fullWidth: false, isTextarea: false },
        'OpenSF__PeerReviewer__c': { fullWidth: false, isTextarea: false },
        'OpenSF__DueDate__c': { fullWidth: false, isTextarea: false },
        'OpenSF__StoryPoints__c': { fullWidth: false, isTextarea: false },
        'OpenSF__Color__c': { fullWidth: false, isTextarea: false }
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
            const metadata = this.fieldMetadata[fieldName] || { fullWidth: false, isTextarea: false };
            return {
                fieldName: fieldName,
                key: `field-${index}`,
                fullWidth: metadata.fullWidth,
                isTextarea: metadata.isTextarea,
                isRegularField: !metadata.isTextarea,
                columnClass: metadata.fullWidth ? 'slds-col slds-size_1-of-1' : 'slds-col slds-size_1-of-2'
            };
        });
    }
    
    handleClose() {
        this.dispatchEvent(new CustomEvent('close'));
    }
    
    handleSave() {
        // Trigger the form submit
        const form = this.template.querySelector('lightning-record-edit-form');
        if (form) {
            form.submit();
        }
    }
    
    handleSuccess() {
        this.showSuccess('Card updated successfully');
        
        // Notify parent to refresh
        this.dispatchEvent(new CustomEvent('cardupdated', {
            detail: { cardId: this.card.Id }
        }));
        
        // Close the modal after successful save
        this.handleClose();
    }
    
    handleError(event) {
        const message = event.detail?.message || 'Error updating card';
        this.showError('Error', message);
    }
    
    async handleDelete() {
        if (!confirm('Are you sure you want to delete this card?')) {
            return;
        }
        
        try {
            await deleteCard({ cardId: this.card.Id });
            this.showSuccess('Card deleted successfully');
            this.handleClose();
            
            this.dispatchEvent(new CustomEvent('carddeleted', {
                detail: { cardId: this.card.Id }
            }));
            
        } catch (error) {
            this.showError('Error deleting card', error.body?.message || error.message);
        }
    }
    
    showSuccess(message) {
        this.dispatchEvent(new ShowToastEvent({
            title: 'Success',
            message: message,
            variant: 'success'
        }));
    }
    
    showError(title, message) {
        this.dispatchEvent(new ShowToastEvent({
            title: title,
            message: message,
            variant: 'error'
        }));
    }
    
    get modalClass() {
        return this.isOpen ? 'slds-modal slds-fade-in-open' : 'slds-modal';
    }
    
    get backdropClass() {
        return this.isOpen ? 'slds-backdrop slds-backdrop_open' : 'slds-backdrop';
    }
    
    get hasFields() {
        return this.formFields && this.formFields.length > 0;
    }
    
    get descriptionField() {
        return this.formFields.find(field => field.isTextarea);
    }
    
    get regularFields() {
        return this.formFields.filter(field => field.isRegularField);
    }
}
