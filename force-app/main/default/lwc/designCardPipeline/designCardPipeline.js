import { LightningElement, api } from 'lwc';

const PHASES = [
    'Empathize',
    'Define',
    'Ideate',
    'Prototype',
    'Test',
    'Refined'
];

export default class DesignCardPipeline extends LightningElement {
    @api phaseCounts = {};
    @api boardId;

    get pipelinePhases() {
        const max = Math.max(
            ...PHASES.map((p) => this.phaseCounts[p] || 0),
            1
        );
        return PHASES.map((p) => ({
            id: p,
            label: p,
            count: this.phaseCounts[p] || 0,
            barStyle: `height: ${((this.phaseCounts[p] || 0) / max) * 100}%;`
        }));
    }
}
