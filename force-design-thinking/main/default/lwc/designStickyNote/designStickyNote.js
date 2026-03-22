import { LightningElement, api } from 'lwc';

export default class DesignStickyNote extends LightningElement {
    @api note = {};
    @api isEditable = true;
    @api showVotes = false;
    isEditing = false;
    editText = '';

    get noteClasses() {
        return `sticky-note${this.isEditing ? ' editing' : ''}`;
    }
    get noteStyle() {
        return `background-color: ${this.note?.color || '#FFE082'};`;
    }
    handleDragStart(event) {
        event.dataTransfer.setData('text/plain', JSON.stringify({
            noteId: this.note.id, sourceZone: this.note.zone
        }));
        event.dataTransfer.effectAllowed = 'move';
    }
    handleEdit() {
        if (!this.isEditable) return;
        this.isEditing = true;
        this.editText = this.note.text;
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        setTimeout(() => {
            const ta = this.template.querySelector('.note-textarea');
            if (ta) ta.focus();
        }, 0);
    }
    handleSaveEdit() {
        this.isEditing = false;
        if (this.editText !== this.note.text) {
            this.dispatchEvent(new CustomEvent('noteupdate', {
                detail: { noteId: this.note.id, text: this.editText },
                bubbles: true, composed: true
            }));
        }
    }
    handleKeyDown(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.editText = event.target.value;
            this.handleSaveEdit();
        } else if (event.key === 'Escape') {
            this.isEditing = false;
        } else {
            this.editText = event.target.value;
        }
    }
    handleDelete() {
        this.dispatchEvent(new CustomEvent('notedelete', {
            detail: { noteId: this.note.id }, bubbles: true, composed: true
        }));
    }
}
