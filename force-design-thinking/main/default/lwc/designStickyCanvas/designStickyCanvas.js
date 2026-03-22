import { LightningElement, api } from 'lwc';

export default class DesignStickyCanvas extends LightningElement {
    @api zoneConfig = [];
    @api notes = [];
    @api isEditable = true;
    @api showVotes = false;
    @api columns = 2;

    get zones() {
        return this.zoneConfig.map(z => ({ ...z, notes: this.notes.filter(n => n.zone === z.id) }));
    }
    get gridStyle() { return `grid-template-columns: repeat(${this.columns}, 1fr);`; }
    get totalNoteCount() { return this.notes.length; }

    handleAddNote() {
        const defaultZone = this.zoneConfig.length > 0 ? this.zoneConfig[0].id : 'unsorted';
        this.dispatchEvent(new CustomEvent('noteadd', { detail: { zone: defaultZone, positionX: 0, positionY: 0 }, bubbles: true, composed: true }));
    }
    handleNoteUpdate(event) {
        this.dispatchEvent(new CustomEvent('noteupdate', { detail: event.detail, bubbles: true, composed: true }));
    }
    handleNoteDelete(event) {
        this.dispatchEvent(new CustomEvent('notedelete', { detail: event.detail, bubbles: true, composed: true }));
    }
    handleDragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        event.currentTarget.classList.add('zone-drag-over');
    }
    handleDragLeave(event) {
        event.currentTarget.classList.remove('zone-drag-over');
    }
    handleDrop(event) {
        event.preventDefault();
        event.currentTarget.classList.remove('zone-drag-over');
        try {
            const data = JSON.parse(event.dataTransfer.getData('text/plain'));
            const targetZone = event.currentTarget.dataset.zoneId;
            if (data.sourceZone !== targetZone) {
                this.dispatchEvent(new CustomEvent('notemove', {
                    detail: { noteId: data.noteId, zone: targetZone, positionX: 0, positionY: 0 },
                    bubbles: true, composed: true
                }));
            }
        } catch (e) { /* invalid drag data */ }
    }
}
