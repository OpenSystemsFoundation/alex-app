import { LightningElement, api, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import updateCard from '@salesforce/apex/KanbanBoardController.updateCard';
import deleteCard from '@salesforce/apex/KanbanBoardController.deleteCard';
import searchUsers from '@salesforce/apex/KanbanBoardController.searchUsers';

export default class KanbanCardDetail extends LightningElement {
    _card;
    @api isOpen = false;
    
    @track editMode = false;
    @track formData = {};
    @track searchResults = [];
    @track isSearching = false;
    
    priorityOptions = [
        { label: 'High', value: 'High' },
        { label: 'Medium', value: 'Medium' },
        { label: 'Low', value: 'Low' }
    ];
    
    cardTypeOptions = [
        { label: 'Story', value: 'Story' },
        { label: 'Bug', value: 'Bug' },
        { label: 'Task', value: 'Task' },
        { label: 'Epic', value: 'Epic' }
    ];
    
    connectedCallback() {
        if (this.card) {
            this.initFormData();
        }
    }
    
    @api
    set card(value) {
        this._card = value;
        if (value) {
            this.initFormData();
        }
    }
    
    get card() {
        return this._card;
    }
    
    initFormData() {
        if (this.card) {
            this.formData = {
                subject: this.card.Subject__c,
                description: this.card.Description__c,
                priority: this.card.Priority__c,
                cardType: this.card.CardType__c,
                dueDate: this.card.DueDate__c,
                storyPoints: this.card.StoryPoints__c,
                assigneeId: this.card.Assignee__c,
                color: this.card.Color__c
            };
        }
    }
    
    handleClose() {
        this.dispatchEvent(new CustomEvent('close'));
    }
    
    handleEdit() {
        this.editMode = true;
    }
    
    handleCancel() {
        this.editMode = false;
        this.initFormData();
    }
    
    handleFieldChange(event) {
        const field = event.target.dataset.field;
        this.formData[field] = event.target.value;
    }
    
    async handleSave() {
        try {
            const updates = {
                subject: this.formData.subject,
                description: this.formData.description,
                priority: this.formData.priority,
                color: this.formData.color,
                dueDate: this.formData.dueDate,
                storyPoints: this.formData.storyPoints,
                assigneeId: this.formData.assigneeId
            };
            
            await updateCard({
                cardId: this.card.Id,
                updates: updates
            });
            
            this.editMode = false;
            this.showSuccess('Card updated successfully');
            
            // Notify parent to refresh
            this.dispatchEvent(new CustomEvent('cardupdated', {
                detail: { cardId: this.card.Id }
            }));
            
        } catch (error) {
            this.showError('Error updating card', error);
        }
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
            this.showError('Error deleting card', error);
        }
    }
    
    async handleUserSearch(event) {
        const searchTerm = event.target.value;
        
        if (searchTerm.length < 2) {
            this.searchResults = [];
            return;
        }
        
        this.isSearching = true;
        
        try {
            const users = await searchUsers({ searchTerm });
            this.searchResults = users.map(user => ({
                ...user,
                selected: user.Id === this.formData.assigneeId
            }));
        } catch (error) {
            this.showError('Error searching users', error);
        } finally {
            this.isSearching = false;
        }
    }
    
    handleUserSelect(event) {
        const userId = event.currentTarget.dataset.userId;
        this.formData.assigneeId = userId;
        this.searchResults = [];
    }
    
    showSuccess(message) {
        this.dispatchEvent(new ShowToastEvent({
            title: 'Success',
            message: message,
            variant: 'success'
        }));
    }
    
    showError(title, error) {
        let message = 'Unknown error';
        if (error?.body?.message) {
            message = error.body.message;
        } else if (error?.message) {
            message = error.message;
        }
        
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
    
    get assigneeName() {
        return this.card?.Assignee__r?.Name || 'Unassigned';
    }
}
