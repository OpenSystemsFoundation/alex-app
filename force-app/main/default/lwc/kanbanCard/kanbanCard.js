import { LightningElement, api } from 'lwc';

export default class KanbanCard extends LightningElement {
    @api card;
    @api experienceCloud;

    handleLinkClick(event) {
        // Bubble up the link click to parent for navigation handling
        const linkClickEvent = new CustomEvent('linkclick', {
            detail: {
                originalEvent: event,
                cardId: this.card.cardId
            },
            bubbles: true,
            composed: true
        });
        this.dispatchEvent(linkClickEvent);
    }
}
