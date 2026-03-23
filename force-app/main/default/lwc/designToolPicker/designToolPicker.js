import { LightningElement, api } from 'lwc';

const TOOLS_BY_PHASE = {
    Empathize: [
        {
            id: 'EmpathyMap',
            label: 'Empathy Map',
            icon: 'utility:sentiment_positive'
        },
        {
            id: 'Brainstorm',
            label: 'Interview Notes',
            icon: 'utility:note'
        }
    ],
    Define: [
        {
            id: 'AffinityDiagram',
            label: 'Affinity Diagram',
            icon: 'utility:kanban'
        },
        {
            id: 'HMWBuilder',
            label: 'How Might We',
            icon: 'utility:help'
        }
    ],
    Ideate: [
        {
            id: 'Brainstorm',
            label: 'Brainstorm',
            icon: 'utility:light_bulb'
        },
        { id: 'DotVoting', label: 'Dot Voting', icon: 'utility:like' },
        { id: 'SCAMPER', label: 'SCAMPER', icon: 'utility:shuffle' }
    ],
    Prototype: [
        {
            id: 'StoryboardBuilder',
            label: 'Storyboard',
            icon: 'utility:image'
        },
        {
            id: 'AcceptanceCriteria',
            label: 'Acceptance Criteria',
            icon: 'utility:check'
        }
    ],
    Test: [
        {
            id: 'FeedbackGrid',
            label: 'Feedback Grid',
            icon: 'utility:comments'
        },
        {
            id: 'DecisionMatrix',
            label: 'Decision Matrix',
            icon: 'utility:matrix'
        },
        { id: 'DotVoting', label: 'Dot Voting', icon: 'utility:like' }
    ]
};

export default class DesignToolPicker extends LightningElement {
    @api currentPhase = 'Empathize';
    @api activeTool = null;

    get availableTools() {
        const tools = TOOLS_BY_PHASE[this.currentPhase] || [];
        return tools.map((t) => ({
            ...t,
            classes: `tool-btn${t.id === this.activeTool ? ' active' : ''}`
        }));
    }

    handleToolSelect(event) {
        this.dispatchEvent(
            new CustomEvent('toolchange', {
                detail: { tool: event.currentTarget.dataset.tool },
                bubbles: true,
                composed: true
            })
        );
    }
}
