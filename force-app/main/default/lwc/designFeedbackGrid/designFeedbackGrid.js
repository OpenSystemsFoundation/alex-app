import { LightningElement, api } from 'lwc';

const ZONES = [
    {
        id: 'likes',
        label: 'Likes',
        description: 'What worked well'
    },
    {
        id: 'wishes',
        label: 'Wishes',
        description: 'What could be improved'
    },
    {
        id: 'questions',
        label: 'Questions',
        description: 'What needs clarification'
    },
    {
        id: 'ideas',
        label: 'Ideas',
        description: 'New suggestions and concepts'
    }
];

export default class DesignFeedbackGrid extends LightningElement {
    @api notes = [];
    zoneConfig = ZONES;
    showVotes = false;

    fwd(event) {
        this.dispatchEvent(
            new CustomEvent(event.type, {
                detail: event.detail,
                bubbles: true,
                composed: true
            })
        );
    }
}
