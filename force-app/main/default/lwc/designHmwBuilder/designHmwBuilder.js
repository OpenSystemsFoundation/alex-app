import { LightningElement, api } from 'lwc';

const ZONES = [
    {
        id: 'hmw',
        label: 'How Might We...',
        description: 'Write HMW statements'
    }
];

export default class DesignHmwBuilder extends LightningElement {
    @api notes = [];
    @api votes = [];
    zoneConfig = ZONES;
    showVotes = true;

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
