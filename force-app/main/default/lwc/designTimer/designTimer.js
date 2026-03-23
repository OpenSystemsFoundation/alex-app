import { LightningElement, api } from 'lwc';

export default class DesignTimer extends LightningElement {
    @api isFacilitator = false;
    _duration = 300;
    remaining = 300;
    isRunning = false;
    _intervalId = null;
    presets = [
        { label: '1m', value: 1 },
        { label: '2m', value: 2 },
        { label: '5m', value: 5 },
        { label: '8m', value: 8 },
        { label: '15m', value: 15 }
    ];

    @api
    get duration() {
        return this._duration;
    }
    set duration(value) {
        this._duration = value;
        this.remaining = value;
    }

    @api syncTimer(data) {
        if (data.remaining !== undefined) this.remaining = data.remaining;
        if (data.running !== undefined) {
            if (data.running && !this.isRunning) this._startTicking();
            else if (!data.running && this.isRunning) this._stopTicking();
        }
    }
    get formattedTime() {
        const m = Math.floor(this.remaining / 60);
        const s = this.remaining % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    get timerClasses() {
        let c = 'timer-value';
        if (this.remaining <= 10 && this.isRunning) c += ' timer-urgent';
        else if (this.remaining <= 30 && this.isRunning) c += ' timer-warning';
        return c;
    }
    get progressStyle() {
        return `width: ${this._duration > 0 ? (this.remaining / this._duration) * 100 : 0}%;`;
    }
    handleStart() {
        this._startTicking();
        this.dispatchEvent(
            new CustomEvent('timerstart', {
                detail: { duration: this._duration, remaining: this.remaining },
                bubbles: true,
                composed: true
            })
        );
    }
    handleStop() {
        this._stopTicking();
        this.dispatchEvent(
            new CustomEvent('timerstop', {
                detail: { remaining: this.remaining },
                bubbles: true,
                composed: true
            })
        );
    }
    handleReset() {
        this._stopTicking();
        this.remaining = this._duration;
    }
    handlePreset(event) {
        this._duration = parseInt(event.currentTarget.dataset.minutes, 10) * 60;
        this.remaining = this._duration;
    }
    _startTicking() {
        this.isRunning = true;
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        this._intervalId = setInterval(() => {
            if (this.remaining > 0) this.remaining -= 1;
            else {
                this._stopTicking();
                this.dispatchEvent(
                    new CustomEvent('timerexpire', {
                        bubbles: true,
                        composed: true
                    })
                );
            }
        }, 1000);
    }
    _stopTicking() {
        this.isRunning = false;
        if (this._intervalId) {
            clearInterval(this._intervalId);
            this._intervalId = null;
        }
    }
    disconnectedCallback() {
        this._stopTicking();
    }
}
