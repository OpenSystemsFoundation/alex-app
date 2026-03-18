import { LightningElement, api, track } from 'lwc';
import { loadBurndownDataAsync, loadVelocityDataAsync } from 'c/kanbanStore';

export default class KanbanSprintReports extends LightningElement {
    @api store;
    @api sprintId;
    @api boardId;
    @api isOpen = false;

    @track activeTab = 'burndown';
    @track burndownData = [];
    @track velocityData = [];
    @track isLoading = false;

    async connectedCallback() {
        if (this.isOpen) {
            await this.loadData();
        }
    }

    async loadData() {
        if (!this.store) return;
        this.isLoading = true;

        try {
            if (this.sprintId) {
                const burnResult = await this.store.dispatch(
                    loadBurndownDataAsync(this.sprintId)
                );
                this.burndownData = burnResult.data || [];
            }

            if (this.boardId) {
                const velResult = await this.store.dispatch(
                    loadVelocityDataAsync(this.boardId, 10)
                );
                this.velocityData = velResult.data || [];
            }
        } catch (error) {
            console.error('Error loading report data:', error);
        } finally {
            this.isLoading = false;
        }
    }

    get isBurndownTab() { return this.activeTab === 'burndown'; }
    get isVelocityTab() { return this.activeTab === 'velocity'; }
    get isSummaryTab() { return this.activeTab === 'summary'; }

    get burndownTabClass() {
        return `slds-tabs_default__item${this.isBurndownTab ? ' slds-is-active' : ''}`;
    }
    get velocityTabClass() {
        return `slds-tabs_default__item${this.isVelocityTab ? ' slds-is-active' : ''}`;
    }
    get summaryTabClass() {
        return `slds-tabs_default__item${this.isSummaryTab ? ' slds-is-active' : ''}`;
    }

    get hasBurndownData() { return this.burndownData.length > 0; }
    get hasVelocityData() { return this.velocityData.length > 0; }

    get averageVelocity() {
        if (!this.velocityData.length) return 0;
        const total = this.velocityData.reduce((sum, s) => sum + (s.velocity || 0), 0);
        return Math.round(total / this.velocityData.length);
    }

    handleTabClick(event) {
        this.activeTab = event.currentTarget.dataset.tab;
    }

    handleClose() {
        this.dispatchEvent(new CustomEvent('close'));
    }

    renderedCallback() {
        if (this.isOpen && !this.isLoading) {
            if (this.isBurndownTab && this.hasBurndownData) {
                this.drawBurndownChart();
            } else if (this.isVelocityTab && this.hasVelocityData) {
                this.drawVelocityChart();
            }
        }
    }

    drawBurndownChart() {
        const canvas = this.template.querySelector('.burndown-canvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width = canvas.parentElement.clientWidth || 500;
        const height = canvas.height = 300;
        const padding = { top: 20, right: 20, bottom: 40, left: 50 };
        const chartW = width - padding.left - padding.right;
        const chartH = height - padding.top - padding.bottom;

        ctx.clearRect(0, 0, width, height);

        const data = this.burndownData;
        if (!data.length) return;

        const maxPoints = Math.max(...data.map(d => d.totalPoints || 0));
        if (maxPoints === 0) return;

        // Draw axes
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding.left, padding.top);
        ctx.lineTo(padding.left, height - padding.bottom);
        ctx.lineTo(width - padding.right, height - padding.bottom);
        ctx.stroke();

        // Ideal line
        ctx.strokeStyle = '#ccc';
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(padding.left, padding.top);
        ctx.lineTo(width - padding.right, height - padding.bottom);
        ctx.stroke();
        ctx.setLineDash([]);

        // Actual burndown line
        ctx.strokeStyle = '#0176d3';
        ctx.lineWidth = 2;
        ctx.beginPath();
        data.forEach((d, i) => {
            const x = padding.left + (i / (data.length - 1)) * chartW;
            const y = padding.top + (1 - (d.remainingPoints || 0) / maxPoints) * chartH;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Labels
        ctx.fillStyle = '#666';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        data.forEach((d, i) => {
            if (i % Math.ceil(data.length / 7) === 0 || i === data.length - 1) {
                const x = padding.left + (i / (data.length - 1)) * chartW;
                const label = d.snapshotDate ? d.snapshotDate.substring(5) : `D${i + 1}`;
                ctx.fillText(label, x, height - padding.bottom + 20);
            }
        });
    }

    drawVelocityChart() {
        const canvas = this.template.querySelector('.velocity-canvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width = canvas.parentElement.clientWidth || 500;
        const height = canvas.height = 300;
        const padding = { top: 20, right: 20, bottom: 40, left: 50 };
        const chartW = width - padding.left - padding.right;
        const chartH = height - padding.top - padding.bottom;

        ctx.clearRect(0, 0, width, height);

        const data = this.velocityData;
        if (!data.length) return;

        const maxVel = Math.max(...data.map(d => d.velocity || 0));
        if (maxVel === 0) return;

        const barWidth = Math.min(40, chartW / data.length - 10);

        // Bars
        data.forEach((d, i) => {
            const barH = ((d.velocity || 0) / maxVel) * chartH;
            const x = padding.left + (i + 0.5) * (chartW / data.length) - barWidth / 2;
            const y = padding.top + chartH - barH;

            ctx.fillStyle = '#0176d3';
            ctx.fillRect(x, y, barWidth, barH);

            // Label
            ctx.fillStyle = '#666';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(d.Name || `S${i + 1}`, x + barWidth / 2, height - padding.bottom + 15);
            ctx.fillText(String(d.velocity || 0), x + barWidth / 2, y - 5);
        });

        // Average line
        const avgY = padding.top + chartH - (this.averageVelocity / maxVel) * chartH;
        ctx.strokeStyle = '#ea001e';
        ctx.setLineDash([5, 3]);
        ctx.beginPath();
        ctx.moveTo(padding.left, avgY);
        ctx.lineTo(width - padding.right, avgY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#ea001e';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`Avg: ${this.averageVelocity}`, width - padding.right + 3, avgY + 4);
    }
}
