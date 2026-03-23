import { LightningElement, api } from 'lwc';

export default class DesignDotVoting extends LightningElement {
    @api items = [];
    @api maxVotes = 3;
    @api votes = [];
    @api currentUserId = '';
    @api isFacilitator = false;
    @api showResults = false;

    get remainingVotes() {
        const used = this.votes.filter(v => v.voterId === this.currentUserId).length;
        return Math.max(0, this.maxVotes - used);
    }
    get sortedItems() {
        const maxVoteCount = Math.max(...this.items.map(i => i.voteCount || 0), 1);
        return [...this.items].sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0)).map(item => ({
            ...item,
            voteDots: this.votes.filter(v => v.noteId === item.id).map((v, i) => ({ key: `${item.id}-${i}`, voterName: v.voterName })),
            barStyle: `width: ${((item.voteCount || 0) / maxVoteCount) * 100}%;`
        }));
    }
    handleVote(event) {
        if (this.remainingVotes <= 0) return;
        this.dispatchEvent(new CustomEvent('votecast', { detail: { noteId: event.currentTarget.dataset.itemId }, bubbles: true, composed: true }));
    }
}
