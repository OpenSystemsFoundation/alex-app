import { LightningElement, api } from 'lwc';

export default class DesignSessionBoard extends LightningElement {
    @api session = {};
    @api boardId;
    @api currentPhase;
    @api activeTool;
    @api notes = [];
    @api votes = [];
    @api participants = [];

    get isFacilitator() {
        return true;
    } // Simplified for now

    handleLeave() {
        this.dispatchEvent(
            new CustomEvent('sessionend', { bubbles: true, composed: true })
        );
    }
    handlePhaseChange(event) {
        this.dispatchEvent(
            new CustomEvent('phasechange', {
                detail: event.detail,
                bubbles: true,
                composed: true
            })
        );
    }
    handleToolChange(event) {
        this.dispatchEvent(
            new CustomEvent('toolchange', {
                detail: event.detail,
                bubbles: true,
                composed: true
            })
        );
    }
    handleNoteAdd(event) {
        this.dispatchEvent(
            new CustomEvent('noteadd', {
                detail: event.detail,
                bubbles: true,
                composed: true
            })
        );
    }
    handleNoteUpdate(event) {
        this.dispatchEvent(
            new CustomEvent('noteupdate', {
                detail: event.detail,
                bubbles: true,
                composed: true
            })
        );
    }
    handleNoteMove(event) {
        this.dispatchEvent(
            new CustomEvent('notemove', {
                detail: event.detail,
                bubbles: true,
                composed: true
            })
        );
    }
    handleNoteDelete(event) {
        this.dispatchEvent(
            new CustomEvent('notedelete', {
                detail: event.detail,
                bubbles: true,
                composed: true
            })
        );
    }
    handleVoteCast(event) {
        this.dispatchEvent(
            new CustomEvent('votecast', {
                detail: event.detail,
                bubbles: true,
                composed: true
            })
        );
    }
}
