import { LightningElement, track } from 'lwc';
import { subscribe, unsubscribe, onError } from 'lightning/empApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getActiveSessions from '@salesforce/apex/PlanningPokerController.getActiveSessions';
import createSession from '@salesforce/apex/PlanningPokerController.createSession';
import joinSession from '@salesforce/apex/PlanningPokerController.joinSession';
import leaveSession from '@salesforce/apex/PlanningPokerController.leaveSession';
import castVote from '@salesforce/apex/PlanningPokerController.castVote';
import revealVotes from '@salesforce/apex/PlanningPokerController.revealVotes';
import clearVotes from '@salesforce/apex/PlanningPokerController.clearVotes';
import getSession from '@salesforce/apex/PlanningPokerController.getSession';
import closeSession from '@salesforce/apex/PlanningPokerController.closeSession';
import getCurrentUserId from '@salesforce/apex/PlanningPokerController.getCurrentUserId';
import getKanbanConfig from '@salesforce/apex/KanbanBoardController.getKanbanConfig';

const VOTING_SYSTEMS = {
    Fibonacci: {
        label: 'Fibonacci (0, 1, 2, 3, 5, 8, 13, 21, ..)',
        cards: ['0', '1', '2', '3', '5', '8', '13', '21', '34', '55', '?', '∞']
    },
    ModifiedFibonacci: {
        label: 'Modified Fibonacci (0, ½, 1, 2, 3, 5, 8, 13, 20, 40, ..)',
        cards: ['0', '0.5', '1', '2', '3', '5', '8', '13', '20', '40', '?', '∞']
    },
    TShirt: {
        label: 'T-Shirt (XS, S, M, L, XL, XXL)',
        cards: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '?']
    },
    PowersOf2: {
        label: 'Powers of 2 (0, 1, 2, 4, 8, 16, 32, 64)',
        cards: ['0', '1', '2', '4', '8', '16', '32', '64', '?', '∞']
    }
};

const AVATARS = [
    '🐶',
    '🐱',
    '🐭',
    '🐹',
    '🐰',
    '🦊',
    '🐻',
    '🐼',
    '🐨',
    '🐯',
    '🦁',
    '🐮',
    '🐷',
    '🐸',
    '🐵',
    '🐔',
    '🐧',
    '🐦',
    '🦄',
    '🐝'
];

const REACTIONS = ['👍', '🌷', '🍪', '🎉', '💄'];

export default class PlanningPoker extends LightningElement {
    // View state
    @track currentView = 'lobby'; // lobby, voting, results
    @track session = null;
    @track activeSessions = [];
    @track isLoading = false;

    // Lobby form state
    @track displayName = '';
    @track selectedAvatar = '🐶';
    @track selectedRole = 'Observer';
    @track selectedVotingSystem = 'Fibonacci';
    @track showClearPermission = 'Everyone';
    @track sessionName = '';
    @track autoReveal = true;
    @track allowReactions = true;
    @track showAdvancedSettings = false;
    @track isCreatingNew = true;
    @track selectedSessionId = null;

    // Voting state
    @track selectedVote = null;
    @track timerSeconds = 0;
    @track timerActive = false;
    @track showTimerModal = false;
    @track timerInput = 60;

    // Results state
    @track reactions = [];

    // Debug
    @track debugMode = false;

    // Internal
    _subscription = null;
    _currentUserId = null;
    _timerInterval = null;
    _pollInterval = null;

    get votingSystemOptions() {
        return Object.keys(VOTING_SYSTEMS).map((key) => ({
            label: VOTING_SYSTEMS[key].label,
            value: key
        }));
    }

    get avatarOptions() {
        return AVATARS.map((a) => ({ label: a, value: a }));
    }

    get reactionButtons() {
        return REACTIONS.map((r) => ({ label: r, value: r }));
    }

    get showClearOptions() {
        return [
            { label: 'Everyone', value: 'Everyone' },
            { label: 'Creator Only', value: 'CreatorOnly' }
        ];
    }

    get votingCards() {
        if (!this.session) {
            return [];
        }
        const system =
            VOTING_SYSTEMS[this.session.votingSystem] ||
            VOTING_SYSTEMS.Fibonacci;
        return system.cards.map((card) => ({
            value: card,
            label: card === '0.5' ? '½' : card,
            cssClass:
                'poker-card' + (this.selectedVote === card ? ' selected' : '')
        }));
    }

    get participants() {
        if (!this.session || !this.session.participants) {
            return [];
        }
        return this.session.participants.map((p) => ({
            ...p,
            isCurrentUser: p.userId === this._currentUserId,
            showVote: this.isRevealed,
            displayVote: this.isRevealed ? p.vote || '-' : '',
            statusLabel:
                p.role === 'Observer' ? 'Observer' : p.hasVoted ? 'Voted' : '',
            statusClass:
                'participant-status' +
                (p.hasVoted ? ' voted' : '') +
                (p.role === 'Observer' ? ' observer' : ''),
            voteClass: 'participant-vote' + (p.vote ? ' has-value' : ''),
            avatarDisplay:
                p.avatar || p.displayName?.charAt(0)?.toUpperCase() || '?'
        }));
    }

    get voters() {
        if (!this.session || !this.session.participants) {
            return [];
        }
        return this.session.participants.filter(
            (p) => p.role === 'Voter' && p.isActive
        );
    }

    get isRevealed() {
        return this.session && this.session.status === 'Revealed';
    }

    get isVoting() {
        return this.session && this.session.status === 'Voting';
    }

    get isLobby() {
        return this.currentView === 'lobby';
    }

    get isSessionView() {
        return this.currentView === 'voting';
    }

    get isCurrentUserVoter() {
        const me = this.participants.find(
            (p) => p.userId === this._currentUserId
        );
        return me && me.role === 'Voter';
    }

    get canShowClear() {
        if (!this.session) {
            return false;
        }
        if (this.session.showClearPermission === 'Everyone') {
            return true;
        }
        return this.session.createdById === this._currentUserId;
    }

    get voteResults() {
        const numericVotes = this.voters
            .filter((v) => v.hasVoted && v.vote && !isNaN(parseFloat(v.vote)))
            .map((v) => parseFloat(v.vote));

        if (numericVotes.length === 0) {
            return {
                stats: [],
                isConsensus: false,
                consensusValue: null,
                chartSegments: []
            };
        }

        const sorted = [...numericVotes].sort((a, b) => a - b);
        const max = Math.max(...numericVotes);
        const min = Math.min(...numericVotes);
        const median = this._calculateMedian(sorted);

        // Count votes for chart
        const voteCounts = {};
        this.voters
            .filter((v) => v.hasVoted && v.vote)
            .forEach((v) => {
                voteCounts[v.vote] = (voteCounts[v.vote] || 0) + 1;
            });

        const totalVotes = Object.values(voteCounts).reduce((s, c) => s + c, 0);
        const isConsensus = Object.keys(voteCounts).length === 1;
        const consensusValue = isConsensus ? Object.keys(voteCounts)[0] : null;

        // Modal vote
        let modalVote = null;
        let maxCount = 0;
        for (const [vote, count] of Object.entries(voteCounts)) {
            if (count > maxCount) {
                maxCount = count;
                modalVote = vote;
            }
        }

        const stats = [];
        if (!isConsensus) {
            if (modalVote !== null) {
                stats.push({ label: 'Modal Vote', value: modalVote });
            }
        } else {
            stats.push({ label: 'Modal Vote', value: consensusValue });
        }
        stats.push({ label: 'Maximum Vote', value: String(max) });
        stats.push({ label: 'Minimum Vote', value: String(min) });
        stats.push({ label: 'Median Vote', value: String(median) });

        // Chart segments for donut
        const colors = [
            '#1B96FF',
            '#FF6B6B',
            '#FFD93D',
            '#6BCB77',
            '#9B59B6',
            '#E67E22',
            '#1ABC9C',
            '#E74C3C'
        ];
        let colorIdx = 0;
        const chartSegments = Object.entries(voteCounts).map(
            ([vote, count]) => ({
                vote,
                count,
                percentage: (count / totalVotes) * 100,
                color: colors[colorIdx++ % colors.length]
            })
        );

        return { stats, isConsensus, consensusValue, chartSegments };
    }

    get hasActiveSessions() {
        return this.activeSessions.length > 0;
    }

    get sessionDisplayName() {
        if (!this.session) {
            return '';
        }
        return this.session.sessionName || this.session.name || 'Poker Session';
    }

    get timerDisplay() {
        const mins = Math.floor(this.timerSeconds / 60);
        const secs = this.timerSeconds % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    get showTimer() {
        return this.timerActive && this.timerSeconds > 0;
    }

    get isFormValid() {
        return this.displayName && this.displayName.trim().length > 0;
    }

    get debugInfo() {
        if (!this.debugMode) {
            return null;
        }
        return {
            userId: this._currentUserId,
            sessionId: this.session?.id || 'N/A',
            sessionStatus: this.session?.status || 'N/A',
            participantCount: this.session?.participants?.length || 0,
            voterCount: this.voters.length,
            subscribed: !!this._subscription,
            view: this.currentView
        };
    }

    connectedCallback() {
        this._loadCurrentUserId();
        this._loadActiveSessions();
        this._loadConfig();
        this._registerErrorHandler();
    }

    disconnectedCallback() {
        this._unsubscribe();
        this._stopTimer();
        if (this._pollInterval) {
            clearInterval(this._pollInterval);
        }
    }

    // --- Lobby Handlers ---

    handleDisplayNameChange(event) {
        this.displayName = event.target.value;
    }

    handleAvatarChange(event) {
        this.selectedAvatar = event.detail.value;
    }

    handleRoleChange(event) {
        this.selectedRole = event.target.value;
    }

    handleVotingSystemChange(event) {
        this.selectedVotingSystem = event.detail.value;
    }

    handleShowClearChange(event) {
        this.showClearPermission = event.detail.value;
    }

    handleSessionNameChange(event) {
        this.sessionName = event.target.value;
    }

    handleAutoRevealChange(event) {
        this.autoReveal = event.target.checked;
    }

    handleAllowReactionsChange(event) {
        this.allowReactions = event.target.checked;
    }

    toggleAdvancedSettings() {
        this.showAdvancedSettings = !this.showAdvancedSettings;
    }

    handleRefreshSessions() {
        this._loadActiveSessions();
    }

    handleShowCreateForm() {
        this.isCreatingNew = true;
        this.selectedSessionId = null;
    }

    handleSelectSession(event) {
        this.selectedSessionId = event.currentTarget.dataset.id;
        this.isCreatingNew = false;
    }

    async handleCreateSession() {
        if (!this.isFormValid) {
            return;
        }
        this.isLoading = true;
        try {
            const result = await createSession({
                sessionName: this.sessionName,
                votingSystem: this.selectedVotingSystem,
                showClearPermission: this.showClearPermission,
                autoReveal: this.autoReveal,
                allowReactions: this.allowReactions,
                displayName: this.displayName.trim(),
                avatar: this.selectedAvatar,
                role: this.selectedRole === 'Observer' ? 'Observer' : 'Voter'
            });
            this.session = result;
            this.currentView = 'voting';
            this._subscribeToEvents();
            this._startPolling();
        } catch (error) {
            this._showError('Failed to create session', error);
        } finally {
            this.isLoading = false;
        }
    }

    async handleJoinSession() {
        if (!this.isFormValid || !this.selectedSessionId) {
            return;
        }
        this.isLoading = true;
        try {
            const result = await joinSession({
                sessionId: this.selectedSessionId,
                displayName: this.displayName.trim(),
                avatar: this.selectedAvatar,
                role: this.selectedRole === 'Observer' ? 'Observer' : 'Voter'
            });
            this.session = result;
            this.currentView = 'voting';
            this._subscribeToEvents();
            this._startPolling();
        } catch (error) {
            this._showError('Failed to join session', error);
        } finally {
            this.isLoading = false;
        }
    }

    handleBackToLobby() {
        if (this.session) {
            leaveSession({ sessionId: this.session.id }).catch(() => {});
        }
        this._unsubscribe();
        this._stopTimer();
        if (this._pollInterval) {
            clearInterval(this._pollInterval);
        }
        this.session = null;
        this.selectedVote = null;
        this.currentView = 'lobby';
        this.isCreatingNew = true;
        this.selectedSessionId = null;
        this._loadActiveSessions();
    }

    // --- Voting Handlers ---

    handleCardClick(event) {
        if (!this.isCurrentUserVoter || this.isRevealed) {
            return;
        }
        const vote = event.currentTarget.dataset.value;
        if (this.selectedVote === vote) {
            this.selectedVote = null;
            return;
        }
        this.selectedVote = vote;
        this._castVote(vote);
    }

    async handleRevealVotes() {
        if (!this.canShowClear) {
            return;
        }
        try {
            const result = await revealVotes({ sessionId: this.session.id });
            this.session = result;
        } catch (error) {
            this._showError('Failed to reveal votes', error);
        }
    }

    async handleClearVotes() {
        if (!this.canShowClear) {
            return;
        }
        try {
            const result = await clearVotes({ sessionId: this.session.id });
            this.session = result;
            this.selectedVote = null;
            this.reactions = [];
        } catch (error) {
            this._showError('Failed to clear votes', error);
        }
    }

    handleReaction(event) {
        const reaction = event.currentTarget.dataset.value;
        this.reactions = [
            ...this.reactions,
            { value: reaction, key: Date.now() }
        ];
    }

    // --- Timer ---

    handleSetTimer() {
        this.showTimerModal = true;
    }

    handleTimerInputChange(event) {
        this.timerInput = parseInt(event.target.value, 10) || 60;
    }

    handleStartTimer() {
        this.showTimerModal = false;
        this.timerSeconds = this.timerInput;
        this.timerActive = true;
        this._startTimerCountdown();
    }

    handleCancelTimerModal() {
        this.showTimerModal = false;
    }

    handleStopTimer() {
        this._stopTimer();
    }

    // --- Private Methods ---

    async _loadCurrentUserId() {
        try {
            this._currentUserId = await getCurrentUserId();
        } catch (error) {
            console.error('Failed to get current user ID', error);
        }
    }

    async _loadConfig() {
        try {
            const config = await getKanbanConfig();
            this.debugMode = config?.showDebugInfo || false;
        } catch (error) {
            console.error('Failed to load config', error);
        }
    }

    async _loadActiveSessions() {
        try {
            const sessions = await getActiveSessions();
            this.activeSessions = sessions.map((s) => ({
                ...s,
                displayLabel: s.sessionName || s.name,
                participantCount: s.participants ? s.participants.length : 0,
                votingSystemLabel: VOTING_SYSTEMS[s.votingSystem]
                    ? VOTING_SYSTEMS[s.votingSystem].label
                    : s.votingSystem,
                isSelected: s.id === this.selectedSessionId
            }));
        } catch (error) {
            console.error('Failed to load active sessions', error);
        }
    }

    async _castVote(vote) {
        try {
            await castVote({ sessionId: this.session.id, vote });
        } catch (error) {
            this._showError('Failed to cast vote', error);
        }
    }

    _subscribeToEvents() {
        const channel = '/event/OpenSF__PokerEvent__e';
        subscribe(channel, -1, (message) => {
            this._handleEvent(message);
        }).then((sub) => {
            this._subscription = sub;
        });
    }

    _unsubscribe() {
        if (this._subscription) {
            unsubscribe(this._subscription, () => {
                this._subscription = null;
            });
        }
    }

    _registerErrorHandler() {
        onError((error) => {
            console.error('EMP API error', error);
        });
    }

    async _handleEvent(message) {
        const eventData = message.data.payload;
        const sessionId = eventData.OpenSF__SessionId__c;
        const eventType = eventData.OpenSF__EventType__c;
        const senderId = eventData.OpenSF__SenderId__c;

        if (!this.session || sessionId !== this.session.id) {
            return;
        }

        // Ignore own events for most types (server already updated)
        if (senderId === this._currentUserId) {
            // Still refresh for reveal/clear as they affect session state
            if (
                eventType !== 'VOTES_REVEALED' &&
                eventType !== 'VOTES_CLEARED'
            ) {
                return;
            }
        }

        await this._refreshSession();
    }

    async _refreshSession() {
        if (!this.session) {
            return;
        }
        try {
            const result = await getSession({ sessionId: this.session.id });
            this.session = result;
            if (result.status === 'Revealed') {
                this._renderDonutChart();
            }
        } catch (error) {
            console.error('Failed to refresh session', error);
        }
    }

    _startPolling() {
        if (this._pollInterval) {
            clearInterval(this._pollInterval);
        }
        this._pollInterval = setInterval(() => {
            if (this.session) {
                this._refreshSession();
            }
        }, 5000);
    }

    _startTimerCountdown() {
        if (this._timerInterval) {
            clearInterval(this._timerInterval);
            this._timerInterval = null;
        }
        this._timerInterval = setInterval(() => {
            if (this.timerSeconds > 0) {
                this.timerSeconds--;
            } else {
                this._stopTimer();
                this._showToast('Timer', 'Time is up!', 'info');
            }
        }, 1000);
    }

    _stopTimer() {
        if (this._timerInterval) {
            clearInterval(this._timerInterval);
            this._timerInterval = null;
        }
        this.timerActive = false;
        this.timerSeconds = 0;
    }

    _calculateMedian(sorted) {
        const len = sorted.length;
        if (len === 0) {
            return 0;
        }
        const mid = Math.floor(len / 2);
        return len % 2 !== 0
            ? sorted[mid]
            : (sorted[mid - 1] + sorted[mid]) / 2;
    }

    _renderDonutChart() {
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        setTimeout(() => {
            const canvas = this.template.querySelector('.donut-chart');
            if (!canvas) {
                return;
            }
            const ctx = canvas.getContext('2d');
            const { chartSegments, consensusValue } = this.voteResults;
            const width = canvas.width;
            const height = canvas.height;
            const centerX = width / 2;
            const centerY = height / 2;
            const radius = Math.min(width, height) / 2 - 10;
            const innerRadius = radius * 0.6;

            ctx.clearRect(0, 0, width, height);

            if (chartSegments.length === 0) {
                return;
            }

            let startAngle = -Math.PI / 2;
            for (const seg of chartSegments) {
                const sliceAngle = (seg.percentage / 100) * 2 * Math.PI;
                ctx.beginPath();
                ctx.arc(
                    centerX,
                    centerY,
                    radius,
                    startAngle,
                    startAngle + sliceAngle
                );
                ctx.arc(
                    centerX,
                    centerY,
                    innerRadius,
                    startAngle + sliceAngle,
                    startAngle,
                    true
                );
                ctx.closePath();
                ctx.fillStyle = seg.color;
                ctx.fill();

                // Label
                if (seg.percentage > 10) {
                    const labelAngle = startAngle + sliceAngle / 2;
                    const labelRadius = (radius + innerRadius) / 2;
                    const lx = centerX + Math.cos(labelAngle) * labelRadius;
                    const ly = centerY + Math.sin(labelAngle) * labelRadius;
                    ctx.fillStyle = '#ffffff';
                    ctx.font = 'bold 14px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(seg.vote, lx, ly);
                }

                startAngle += sliceAngle;
            }

            // Center text
            const centerText = consensusValue || '';
            if (centerText) {
                ctx.fillStyle = '#333333';
                ctx.font = 'bold 24px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(centerText, centerX, centerY);
            }
        }, 100);
    }

    _showError(title, error) {
        const message =
            error?.body?.message ||
            error?.message ||
            'An unknown error occurred';
        this._showToast(title, message, 'error');
    }

    _showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }

    // Lifecycle - render chart on results
    renderedCallback() {
        if (this.isRevealed && this.voteResults.chartSegments.length > 0) {
            this._renderDonutChart();
        }
    }
}
