import { LightningElement, api } from 'lwc';

export default class DesignThinkingView extends LightningElement {
    @api boardId;
    sessions = [];
    activeSession = null;
    currentPhase = null;
    activeTool = null;
    notes = [];
    votes = [];
    participants = [];
    phaseCounts = {};

    get hasActiveSession() {
        return this.activeSession != null;
    }

    handleSessionCreate(event) {
        this.dispatchEvent(
            new CustomEvent('designsessioncreate', {
                detail: event.detail,
                bubbles: true,
                composed: true
            })
        );
    }
    handleSessionJoin(event) {
        this.dispatchEvent(
            new CustomEvent('designsessionjoin', {
                detail: event.detail,
                bubbles: true,
                composed: true
            })
        );
    }
    handleSessionEnd() {
        this.activeSession = null;
        this.currentPhase = null;
        this.activeTool = null;
        this.notes = [];
        this.votes = [];
    }
    handlePhaseChange(event) {
        this.currentPhase = event.detail.phase;
        this.dispatchEvent(
            new CustomEvent('designphasechange', {
                detail: event.detail,
                bubbles: true,
                composed: true
            })
        );
    }
    handleToolChange(event) {
        this.activeTool = event.detail.tool;
        this.dispatchEvent(
            new CustomEvent('designtoolchange', {
                detail: event.detail,
                bubbles: true,
                composed: true
            })
        );
    }
    handleNoteAdd(event) {
        this.dispatchEvent(
            new CustomEvent('designnoteadd', {
                detail: event.detail,
                bubbles: true,
                composed: true
            })
        );
    }
    handleNoteUpdate(event) {
        this.dispatchEvent(
            new CustomEvent('designnoteupdate', {
                detail: event.detail,
                bubbles: true,
                composed: true
            })
        );
    }
    handleNoteMove(event) {
        this.dispatchEvent(
            new CustomEvent('designnotemove', {
                detail: event.detail,
                bubbles: true,
                composed: true
            })
        );
    }
    handleNoteDelete(event) {
        this.dispatchEvent(
            new CustomEvent('designnotedelete', {
                detail: event.detail,
                bubbles: true,
                composed: true
            })
        );
    }
    handleVoteCast(event) {
        this.dispatchEvent(
            new CustomEvent('designvotecast', {
                detail: event.detail,
                bubbles: true,
                composed: true
            })
        );
    }

    @api setSessionData(data) {
        if (data.sessions !== undefined) this.sessions = data.sessions;
        if (data.activeSession !== undefined)
            this.activeSession = data.activeSession;
        if (data.currentPhase !== undefined)
            this.currentPhase = data.currentPhase;
        if (data.activeTool !== undefined) this.activeTool = data.activeTool;
        if (data.notes !== undefined) this.notes = data.notes;
        if (data.votes !== undefined) this.votes = data.votes;
        if (data.participants !== undefined)
            this.participants = data.participants;
        if (data.phaseCounts !== undefined) this.phaseCounts = data.phaseCounts;
    }
}
