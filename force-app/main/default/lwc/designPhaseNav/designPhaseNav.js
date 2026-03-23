import { LightningElement, api } from 'lwc';

const PHASE_CONFIG = [
    { id: 'Empathize', label: 'Empathize', icon: '1' },
    { id: 'Define', label: 'Define', icon: '2' },
    { id: 'Ideate', label: 'Ideate', icon: '3' },
    { id: 'Prototype', label: 'Prototype', icon: '4' },
    { id: 'Test', label: 'Test', icon: '5' }
];

export default class DesignPhaseNav extends LightningElement {
    @api currentPhase = 'Empathize';
    @api isFacilitator = false;

    get phases() {
        const currentIdx = PHASE_CONFIG.findIndex(
            (p) => p.id === this.currentPhase
        );
        return PHASE_CONFIG.map((p, i) => ({
            ...p,
            classes: `phase-tab${p.id === this.currentPhase ? ' active' : ''}${i < currentIdx ? ' completed' : ''}`
        }));
    }

    handlePhaseClick(event) {
        const phase = event.currentTarget.dataset.phase;
        this.dispatchEvent(
            new CustomEvent('phasechange', {
                detail: { phase },
                bubbles: true,
                composed: true
            })
        );
    }
}
