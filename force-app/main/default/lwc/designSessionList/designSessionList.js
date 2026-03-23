import { LightningElement, api } from 'lwc';

export default class DesignSessionList extends LightningElement {
    @api sessions = [];
    @api boardId;
    showCreateForm = false;
    newTitle = '';

    get noSessions() {
        return this.sessions.length === 0;
    }

    handleCreate() {
        this.showCreateForm = true;
    }
    handleCancelCreate() {
        this.showCreateForm = false;
        this.newTitle = '';
    }
    handleTitleChange(event) {
        this.newTitle = event.target.value;
    }
    handleSubmitCreate() {
        if (!this.newTitle.trim()) return;
        this.dispatchEvent(
            new CustomEvent('sessioncreate', {
                detail: {
                    boardId: this.boardId,
                    title: this.newTitle.trim()
                },
                bubbles: true,
                composed: true
            })
        );
        this.showCreateForm = false;
        this.newTitle = '';
    }
    handleJoin(event) {
        this.dispatchEvent(
            new CustomEvent('sessionjoin', {
                detail: {
                    sessionId: event.currentTarget.dataset.sessionId
                },
                bubbles: true,
                composed: true
            })
        );
    }
}
