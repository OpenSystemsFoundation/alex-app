import { LightningElement, api } from 'lwc';

const ZONES = [
    { id: 'says', label: 'Says', description: 'Direct quotes from users' },
    {
        id: 'thinks',
        label: 'Thinks',
        description: 'Internal thoughts and beliefs'
    },
    {
        id: 'does',
        label: 'Does',
        description: 'Observable actions and behaviors'
    },
    {
        id: 'feels',
        label: 'Feels',
        description: 'Emotions and frustrations'
    }
];

export default class DesignEmpathyMap extends LightningElement {
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
