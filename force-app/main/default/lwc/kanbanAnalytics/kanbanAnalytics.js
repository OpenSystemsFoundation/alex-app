import { LightningElement, api, track } from 'lwc';
import { loadCycleTimeAnalyticsAsync } from 'c/kanbanStore';

export default class KanbanAnalytics extends LightningElement {
    @api store;
    @api boardId;
    @api isOpen = false;

    @track activeTab = 'cycletime';
    @track cycleTimeData = null;
    @track isLoading = false;

    async connectedCallback() {
        if (this.isOpen) {
            await this.loadData();
        }
    }

    async loadData() {
        if (!this.store || !this.boardId) return;
        this.isLoading = true;
        try {
            const result = await this.store.dispatch(
                loadCycleTimeAnalyticsAsync(this.boardId, 30)
            );
            const data = result.data;
            // Enrich card details with formatted times
            if (data && data.cardDetails) {
                data.cardDetails = data.cardDetails.map((card) => ({
                    ...card,
                    formattedCycleTime: this.formatHours(card.cycleTimeHours),
                    formattedLeadTime: this.formatHours(card.leadTimeHours)
                }));
            }
            this.cycleTimeData = data;
        } catch (error) {
            console.error('Error loading analytics:', error);
        } finally {
            this.isLoading = false;
        }
    }

    formatHours(hours) {
        if (hours == null) return '-';
        if (hours < 1) return `${Math.round(hours * 60)}m`;
        if (hours < 24) return `${hours.toFixed(1)}h`;
        const days = hours / 24;
        return `${days.toFixed(1)}d`;
    }

    get isCycleTimeTab() {
        return this.activeTab === 'cycletime';
    }
    get isCfdTab() {
        return this.activeTab === 'cfd';
    }

    get cycleTimeTabClass() {
        return `slds-tabs_default__item${this.isCycleTimeTab ? ' slds-is-active' : ''}`;
    }
    get cfdTabClass() {
        return `slds-tabs_default__item${this.isCfdTab ? ' slds-is-active' : ''}`;
    }

    get hasCycleTimeData() {
        return (
            this.cycleTimeData &&
            ((this.cycleTimeData.columnTimes &&
                this.cycleTimeData.columnTimes.length > 0) ||
                (this.cycleTimeData.cardDetails &&
                    this.cycleTimeData.cardDetails.length > 0))
        );
    }

    get formattedAvgCycleTime() {
        return this.formatHours(this.cycleTimeData?.averageCycleTimeHours);
    }

    get formattedAvgLeadTime() {
        return this.formatHours(this.cycleTimeData?.averageLeadTimeHours);
    }

    handleTabClick(event) {
        this.activeTab = event.currentTarget.dataset.tab;
    }

    handleClose() {
        this.dispatchEvent(new CustomEvent('close'));
    }

    _chartDrawnForData = null;

    renderedCallback() {
        if (
            this.isOpen &&
            !this.isLoading &&
            this.isCycleTimeTab &&
            this.hasCycleTimeData &&
            this._chartDrawnForData !== this.cycleTimeData
        ) {
            this._chartDrawnForData = this.cycleTimeData;
            this.drawColumnTimeChart();
        }
    }

    drawColumnTimeChart() {
        const canvas = this.template.querySelector('.column-time-canvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.parentElement.clientWidth || 500;
        canvas.width = width;
        const height = (canvas.height = 240);
        const p = { top: 20, right: 20, bottom: 50, left: 60 };
        const chartW = width - p.left - p.right;
        const chartH = height - p.top - p.bottom;

        ctx.clearRect(0, 0, width, height);

        const data = this.cycleTimeData?.columnTimes || [];
        if (!data.length) return;

        const maxMinutes = Math.max(...data.map((d) => d.averageMinutes || 0));
        if (maxMinutes === 0) return;

        const barWidth = Math.min(50, chartW / data.length - 15);
        const colors = [
            '#6366f1',
            '#3b82f6',
            '#06b6d4',
            '#10b981',
            '#f59e0b',
            '#ef4444',
            '#8b5cf6',
            '#ec4899'
        ];

        // Draw grid
        ctx.strokeStyle = 'rgba(229, 231, 235, 0.6)';
        ctx.lineWidth = 0.5;
        for (let i = 0; i <= 4; i++) {
            const y = p.top + (i / 4) * chartH;
            ctx.beginPath();
            ctx.moveTo(p.left, y);
            ctx.lineTo(p.left + chartW, y);
            ctx.stroke();

            ctx.fillStyle = '#9ca3af';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'right';
            const val = maxMinutes * (1 - i / 4);
            ctx.fillText(this.formatMinutes(val), p.left - 8, y + 3);
        }

        // Bars
        data.forEach((d, i) => {
            const barH = ((d.averageMinutes || 0) / maxMinutes) * chartH;
            const x =
                p.left + (i + 0.5) * (chartW / data.length) - barWidth / 2;
            const y = p.top + chartH - barH;

            // Bar
            ctx.fillStyle = colors[i % colors.length];
            ctx.beginPath();
            ctx.roundRect(x, y, barWidth, barH, [3, 3, 0, 0]);
            ctx.fill();

            // Value on top
            ctx.fillStyle = '#374151';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(
                this.formatMinutes(d.averageMinutes),
                x + barWidth / 2,
                y - 5
            );

            // Label below
            ctx.fillStyle = '#6b7280';
            ctx.font = '10px sans-serif';
            ctx.save();
            ctx.translate(x + barWidth / 2, height - p.bottom + 10);
            ctx.rotate(-Math.PI / 6);
            ctx.textAlign = 'right';
            ctx.fillText(d.columnName || '', 0, 0);
            ctx.restore();
        });
    }

    formatMinutes(min) {
        if (min == null) return '-';
        if (min < 60) return `${Math.round(min)}m`;
        if (min < 1440) return `${(min / 60).toFixed(1)}h`;
        return `${(min / 1440).toFixed(1)}d`;
    }
}
