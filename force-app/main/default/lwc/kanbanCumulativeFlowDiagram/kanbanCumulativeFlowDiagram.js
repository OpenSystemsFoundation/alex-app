import { LightningElement, api, track } from 'lwc';
import { loadCumulativeFlowDataAsync } from 'c/kanbanStore';

// Color palette for columns (visually distinct, good for stacked areas)
const COLUMN_COLORS = [
    '#6366f1', // indigo
    '#3b82f6', // blue
    '#06b6d4', // cyan
    '#10b981', // emerald
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#14b8a6', // teal
    '#f97316' // orange
];

export default class KanbanCumulativeFlowDiagram extends LightningElement {
    @api store;
    @api boardId;

    @track daysBack = 30;
    @track showStacked = true;
    @track showGrid = true;
    @track flowData = [];
    @track columnNames = [];
    @track isLoading = false;

    // Tooltip state
    @track showTooltip = false;
    @track tooltipX = 0;
    @track tooltipY = 0;
    @track tooltipDate = '';
    @track tooltipItems = [];
    @track tooltipTotal = 0;

    // Canvas state
    _padding = { top: 20, right: 20, bottom: 45, left: 50 };
    _chartW = 0;
    _chartH = 0;
    _canvasWidth = 0;
    _canvasHeight = 0;

    async connectedCallback() {
        await this.loadData();
    }

    async loadData() {
        if (!this.store || !this.boardId) return;
        this.isLoading = true;
        try {
            const result = await this.store.dispatch(
                loadCumulativeFlowDataAsync(this.boardId, parseInt(this.daysBack, 10))
            );
            this.flowData = result.data || [];

            // Extract column names from first data point
            if (this.flowData.length > 0 && this.flowData[0].columnCounts) {
                this.columnNames = Object.keys(this.flowData[0].columnCounts);
            }
        } catch (error) {
            console.error('Error loading CFD data:', error);
        } finally {
            this.isLoading = false;
        }
    }

    renderedCallback() {
        if (!this.isLoading && this.flowData.length > 0) {
            this.drawChart();
        }
    }

    get legendItems() {
        return this.columnNames.map((name, i) => ({
            name,
            colorStyle: `background-color: ${COLUMN_COLORS[i % COLUMN_COLORS.length]}`
        }));
    }

    get tooltipStyle() {
        return `left: ${this.tooltipX + 12}px; top: ${this.tooltipY - 10}px;`;
    }

    handleDaysChange(event) {
        this.daysBack = event.target.value;
        this.loadData();
    }

    handleStackedToggle() {
        this.showStacked = !this.showStacked;
        this.drawChart();
    }

    handleGridToggle() {
        this.showGrid = !this.showGrid;
        this.drawChart();
    }

    handleMouseMove(event) {
        const canvas = this.template.querySelector('.cfd-canvas');
        if (!canvas || !this.flowData.length) return;

        const rect = canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        const p = this._padding;

        // Find which day index the mouse is over
        const relX = mouseX - p.left;
        if (relX < 0 || relX > this._chartW) {
            this.showTooltip = false;
            return;
        }

        const dayIndex = Math.round(
            (relX / this._chartW) * (this.flowData.length - 1)
        );
        if (dayIndex < 0 || dayIndex >= this.flowData.length) {
            this.showTooltip = false;
            return;
        }

        const dataPoint = this.flowData[dayIndex];
        const counts = dataPoint.columnCounts || {};
        let total = 0;

        this.tooltipItems = this.columnNames.map((name, i) => {
            const val = counts[name] || 0;
            total += val;
            return {
                name,
                value: val,
                colorStyle: `background-color: ${COLUMN_COLORS[i % COLUMN_COLORS.length]}`
            };
        });

        this.tooltipTotal = total;
        this.tooltipDate = dataPoint.snapshotDate || '';
        this.tooltipX = mouseX;
        this.tooltipY = mouseY;
        this.showTooltip = true;

        // Draw crosshair
        this.drawChart(dayIndex);
    }

    handleMouseLeave() {
        this.showTooltip = false;
        this.drawChart();
    }

    drawChart(highlightIndex) {
        const canvas = this.template.querySelector('.cfd-canvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const wrapper = canvas.parentElement;
        const width = (canvas.width = wrapper.clientWidth || 600);
        const height = (canvas.height = 320);
        const p = this._padding;
        const chartW = width - p.left - p.right;
        const chartH = height - p.top - p.bottom;

        this._canvasWidth = width;
        this._canvasHeight = height;
        this._chartW = chartW;
        this._chartH = chartH;

        ctx.clearRect(0, 0, width, height);

        const data = this.flowData;
        if (!data.length || !this.columnNames.length) return;

        // Find max total across all days
        let maxTotal = 0;
        data.forEach((dp) => {
            let total = 0;
            this.columnNames.forEach((name) => {
                total += dp.columnCounts?.[name] || 0;
            });
            if (total > maxTotal) maxTotal = total;
        });
        if (maxTotal === 0) maxTotal = 1;

        // Draw grid
        if (this.showGrid) {
            ctx.strokeStyle = 'rgba(229, 231, 235, 0.6)';
            ctx.lineWidth = 0.5;
            const gridLines = 5;
            for (let i = 0; i <= gridLines; i++) {
                const y = p.top + (i / gridLines) * chartH;
                ctx.beginPath();
                ctx.moveTo(p.left, y);
                ctx.lineTo(p.left + chartW, y);
                ctx.stroke();

                // Y-axis labels
                ctx.fillStyle = '#9ca3af';
                ctx.font = '10px sans-serif';
                ctx.textAlign = 'right';
                const val = Math.round(maxTotal * (1 - i / gridLines));
                ctx.fillText(String(val), p.left - 6, y + 3);
            }
        }

        // Draw axes
        ctx.strokeStyle = '#d1d5db';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p.left, p.top);
        ctx.lineTo(p.left, height - p.bottom);
        ctx.lineTo(p.left + chartW, height - p.bottom);
        ctx.stroke();

        // Draw stacked area chart
        const numCols = this.columnNames.length;
        const numDays = data.length;

        if (this.showStacked) {
            // Draw from bottom to top (reversed column order so first column is on top)
            for (let ci = numCols - 1; ci >= 0; ci--) {
                const colName = this.columnNames[ci];
                const color = COLUMN_COLORS[ci % COLUMN_COLORS.length];

                ctx.fillStyle = color + '80'; // 50% opacity
                ctx.strokeStyle = color;
                ctx.lineWidth = 1.5;

                ctx.beginPath();

                // Top line (cumulative)
                for (let di = 0; di < numDays; di++) {
                    const x = p.left + (di / Math.max(numDays - 1, 1)) * chartW;
                    let cumulativeValue = 0;
                    for (let k = 0; k <= ci; k++) {
                        cumulativeValue +=
                            data[di].columnCounts?.[this.columnNames[k]] || 0;
                    }
                    const y = p.top + (1 - cumulativeValue / maxTotal) * chartH;
                    if (di === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }

                // Bottom line (previous cumulative)
                for (let di = numDays - 1; di >= 0; di--) {
                    const x = p.left + (di / Math.max(numDays - 1, 1)) * chartW;
                    let cumulativeValue = 0;
                    for (let k = 0; k < ci; k++) {
                        cumulativeValue +=
                            data[di].columnCounts?.[this.columnNames[k]] || 0;
                    }
                    const y = p.top + (1 - cumulativeValue / maxTotal) * chartH;
                    ctx.lineTo(x, y);
                }

                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            }
        } else {
            // Line chart mode
            for (let ci = 0; ci < numCols; ci++) {
                const colName = this.columnNames[ci];
                const color = COLUMN_COLORS[ci % COLUMN_COLORS.length];

                ctx.strokeStyle = color;
                ctx.lineWidth = 2;
                ctx.beginPath();

                for (let di = 0; di < numDays; di++) {
                    const x = p.left + (di / Math.max(numDays - 1, 1)) * chartW;
                    const val = data[di].columnCounts?.[colName] || 0;
                    const y = p.top + (1 - val / maxTotal) * chartH;
                    if (di === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.stroke();
            }
        }

        // X-axis labels
        ctx.fillStyle = '#6b7280';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        const labelInterval = Math.max(1, Math.ceil(numDays / 10));
        data.forEach((dp, i) => {
            if (i % labelInterval === 0 || i === numDays - 1) {
                const x = p.left + (i / Math.max(numDays - 1, 1)) * chartW;
                const label = dp.snapshotDate
                    ? dp.snapshotDate.substring(5) // MM-DD
                    : `D${i + 1}`;
                ctx.fillText(label, x, height - p.bottom + 18);
            }
        });

        // Draw crosshair on hover
        if (highlightIndex !== undefined && highlightIndex >= 0 && highlightIndex < numDays) {
            const x = p.left + (highlightIndex / Math.max(numDays - 1, 1)) * chartW;
            ctx.strokeStyle = 'rgba(107, 114, 128, 0.5)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(x, p.top);
            ctx.lineTo(x, height - p.bottom);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }
}
