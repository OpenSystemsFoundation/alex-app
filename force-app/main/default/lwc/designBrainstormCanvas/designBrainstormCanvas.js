import { LightningElement, api } from 'lwc';

const ZONES = [
    {
        id: 'unsorted',
        label: 'Ideas',
        description: 'Defer judgment. Go for quantity.'
    }
];

export default class DesignBrainstormCanvas extends LightningElement {
    @api notes = [];
    zoneConfig = ZONES;

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
