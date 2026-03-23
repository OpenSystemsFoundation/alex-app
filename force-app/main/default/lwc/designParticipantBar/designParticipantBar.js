import { LightningElement, api } from 'lwc';
export default class DesignParticipantBar extends LightningElement {
    @api participants = [];
    get participantCountLabel() {
        const c = this.participants.length;
        return `${c} participant${c !== 1 ? 's' : ''}`;
    }
}
