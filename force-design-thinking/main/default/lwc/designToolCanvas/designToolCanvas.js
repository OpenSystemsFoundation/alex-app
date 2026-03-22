import { LightningElement, api } from 'lwc';

export default class DesignToolCanvas extends LightningElement {
    @api activeTool;
    @api currentPhase;
    @api notes = [];
    @api votes = [];
    @api session = {};

    get isEmpathyMap() {
        return this.activeTool === 'EmpathyMap';
    }
    get isBrainstorm() {
        return this.activeTool === 'Brainstorm';
    }
    get isFeedbackGrid() {
        return this.activeTool === 'FeedbackGrid';
    }
    get isHMW() {
        return this.activeTool === 'HMWBuilder';
    }
    get isDotVoting() {
        return this.activeTool === 'DotVoting';
    }
    get noTool() {
        return !this.activeTool;
    }

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
