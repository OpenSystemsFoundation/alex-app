import { LightningElement, api, track } from 'lwc';
import getRetroData from '@salesforce/apex/RetrospectiveController.getRetroData';
import createRetroCard from '@salesforce/apex/RetrospectiveController.createRetroCard';
import toggleVote from '@salesforce/apex/RetrospectiveController.toggleVote';
import revealAuthors from '@salesforce/apex/RetrospectiveController.revealAuthors';
import updateRetroStatus from '@salesforce/apex/RetrospectiveController.updateRetroStatus';
import deleteRetroCard from '@salesforce/apex/RetrospectiveController.deleteRetroCard';
import createActionItem from '@salesforce/apex/RetrospectiveController.createActionItem';
import getBoards from '@salesforce/apex/RetrospectiveController.getBoards';
import searchUsers from '@salesforce/apex/KanbanBoardController.searchUsers';
import Id from '@salesforce/user/Id';

const TEMPLATE_CONFIG = {
    Start_Stop_Continue: {
        categories: ['Start', 'Stop', 'Continue'],
        icons: { Start: '\u{1F680}', Stop: '\u{1F6D1}', Continue: '\u{2705}' },
        colors: {
            Start: '#4caf50',
            Stop: '#f44336',
            Continue: '#2196f3'
        },
        placeholders: {
            Start: 'What should we start doing?',
            Stop: 'What should we stop doing?',
            Continue: 'What should we continue doing?'
        }
    },
    Mad_Sad_Glad: {
        categories: ['Mad', 'Sad', 'Glad'],
        icons: { Mad: '\u{1F621}', Sad: '\u{1F622}', Glad: '\u{1F604}' },
        colors: { Mad: '#f44336', Sad: '#2196f3', Glad: '#4caf50' },
        placeholders: {
            Mad: 'What made you mad?',
            Sad: 'What made you sad?',
            Glad: 'What made you glad?'
        }
    },
    Four_Ls: {
        categories: ['Liked', 'Learned', 'Lacked', 'Longed For'],
        icons: {
            Liked: '\u{1F44D}',
            Learned: '\u{1F4DA}',
            Lacked: '\u{1F614}',
            'Longed For': '\u{2B50}'
        },
        colors: {
            Liked: '#4caf50',
            Learned: '#2196f3',
            Lacked: '#ff9800',
            'Longed For': '#9c27b0'
        },
        placeholders: {
            Liked: 'What did you like?',
            Learned: 'What did you learn?',
            Lacked: 'What was lacking?',
            'Longed For': 'What did you long for?'
        }
    },
    Went_Well_Improve: {
        categories: ['Went Well', 'To Improve', 'Action Items'],
        icons: {
            'Went Well': '\u{1F389}',
            'To Improve': '\u{1F527}',
            'Action Items': '\u{1F4CB}'
        },
        colors: {
            'Went Well': '#4caf50',
            'To Improve': '#ff9800',
            'Action Items': '#2196f3'
        },
        placeholders: {
            'Went Well': 'What went well?',
            'To Improve': 'What can we improve?',
            'Action Items': 'What actions should we take?'
        }
    }
};

const STATUS_ORDER = ['Draft', 'Active', 'Voting', 'Reviewing', 'Completed'];

export default class RetroBoard extends LightningElement {
    @api recordId;

    @track _retro = null;
    @track _cards = [];
    @track _categories = [];
    @track _currentUserVoteCount = 0;
    @track _isLoading = true;
    @track _error = null;
    @track _isRefreshing = false;
    @track _subscriptionStatus = 'disconnected';

    // Action Item Modal state
    @track showActionItemModal = false;
    @track _actionItemCardId = null;
    @track _actionItemBoardId = null;
    @track _actionItemDestination = 'first_column';
    @track _actionItemAssigneeId = null;
    @track _availableBoards = [];
    @track assigneeSearchTerm = '';
    @track assigneeResults = [];
    @track selectedAssigneeName = '';

    _currentUserId = Id;
    _searchDebounce = null;
    _toastManager = null;

    // =========================================================================
    // Lifecycle
    // =========================================================================

    connectedCallback() {
        this.loadRetroData();
    }

    renderedCallback() {
        if (!this._toastManager) {
            this._toastManager = this.template.querySelector(
                'c-toast-manager'
            );
        }
    }

    // =========================================================================
    // Data Loading
    // =========================================================================

    async loadRetroData() {
        if (!this.recordId) return;
        try {
            this._isLoading = true;
            const data = await getRetroData({ retroId: this.recordId });
            this._retro = data.retro;
            this._cards = data.cards;
            this._categories = data.categories;
            this._currentUserVoteCount = data.currentUserVoteCount;
            this._error = null;
        } catch (e) {
            this._error = e.body?.message || 'Error loading retrospective';
        } finally {
            this._isLoading = false;
        }
    }

    // =========================================================================
    // Computed Properties
    // =========================================================================

    get isLoading() {
        return this._isLoading;
    }

    get error() {
        return this._error;
    }

    get hasData() {
        return this._retro && !this._isLoading;
    }

    get retroName() {
        return this._retro?.Name || 'Retrospective';
    }

    get sprintName() {
        return this._retro?.sprintName || '';
    }

    get retroStatus() {
        return this._retro?.status || 'Draft';
    }

    get statusBadgeClass() {
        const status = (this.retroStatus || '').toLowerCase();
        return `retro-status-badge retro-status-badge--${status}`;
    }

    get isFacilitator() {
        // For now, any user can facilitate. In the future, add an Owner/Facilitator field.
        return true;
    }

    get showAuthors() {
        if (!this._retro) return false;
        return this._retro.showAlways || this._retro.revealed;
    }

    get canReveal() {
        return (
            this.isFacilitator &&
            this._retro &&
            !this._retro.revealed &&
            !this._retro.showAlways
        );
    }

    get showVoteIndicator() {
        return (
            this._retro?.maxVotesPerUser > 0 &&
            (this.retroStatus === 'Active' || this.retroStatus === 'Voting')
        );
    }

    get votesRemainingLabel() {
        const max = this._retro?.maxVotesPerUser || 0;
        const used = this._currentUserVoteCount || 0;
        return `${max - used} / ${max} votes left`;
    }

    get showAlwaysButtonClass() {
        return this._retro?.showAlways
            ? 'retro-action-btn retro-action-btn--toggle retro-action-btn--active'
            : 'retro-action-btn retro-action-btn--toggle';
    }

    get canAdvanceStatus() {
        if (!this._retro) return false;
        const idx = STATUS_ORDER.indexOf(this.retroStatus);
        return idx >= 0 && idx < STATUS_ORDER.length - 1;
    }

    get nextStatusLabel() {
        const idx = STATUS_ORDER.indexOf(this.retroStatus);
        if (idx < 0 || idx >= STATUS_ORDER.length - 1) return '';
        const next = STATUS_ORDER[idx + 1];
        return `Move to ${next}`;
    }

    get templateConfig() {
        const template = this._retro?.template || 'Start_Stop_Continue';
        return TEMPLATE_CONFIG[template] || TEMPLATE_CONFIG.Start_Stop_Continue;
    }

    get columnsWithCards() {
        const config = this.templateConfig;
        return this._categories.map((category) => {
            const cards = this._cards
                .filter((c) => c.category === category)
                .map((c) => this._enrichCard(c));
            const color = config.colors[category] || '#607d8b';
            return {
                category,
                icon: config.icons[category] || '',
                placeholder:
                    config.placeholders[category] || 'Add a card...',
                cardCount: cards.length,
                cards,
                isEmpty: cards.length === 0,
                columnStyle: `--column-color: ${color}`,
                headerStyle: `background-color: ${color}`
            };
        });
    }

    get refreshButtonClass() {
        return this._isRefreshing
            ? 'topbar-icon-btn topbar-icon-btn--spinning'
            : 'topbar-icon-btn';
    }

    get retroSubscriptionChannel() {
        return '/event/OpenSF__RetroUpdateEvent__e';
    }

    get connectionStatusConfig() {
        return {
            status: this._subscriptionStatus,
            eventCount: 0,
            lastSyncTime: null,
            syncState: 'idle',
            pendingOperationsCount: 0,
            lastSyncError: null
        };
    }

    // Action Item Modal getters
    get actionItemModalText() {
        if (!this._actionItemCardId) return '';
        const card = this._cards.find(
            (c) => c.Id === this._actionItemCardId
        );
        return card?.text || '';
    }

    get availableBoards() {
        return this._availableBoards.map((b) => ({
            ...b,
            isSelected: b.Id === this._actionItemBoardId
        }));
    }

    get actionItemCreateDisabled() {
        return !this._actionItemBoardId;
    }

    // =========================================================================
    // Card Enrichment
    // =========================================================================

    _enrichCard(card) {
        const isOwnCard = card.authorId === this._currentUserId;
        return {
            ...card,
            showAuthor: this.showAuthors || isOwnCard,
            canDelete: isOwnCard && this.retroStatus !== 'Completed',
            canCreateActionItem:
                !card.actionItemCardId &&
                (this.retroStatus === 'Reviewing' ||
                    this.retroStatus === 'Completed'),
            cardClass: card.hasVoted
                ? 'retro-card retro-card--voted'
                : 'retro-card',
            voteButtonClass: card.hasVoted
                ? 'retro-card__vote-btn retro-card__vote-btn--voted'
                : 'retro-card__vote-btn',
            voteIcon: card.hasVoted ? 'utility:like' : 'utility:like'
        };
    }

    // =========================================================================
    // Event Handlers
    // =========================================================================

    async handleAddCard(event) {
        const category = event.currentTarget.dataset.category;
        const textarea = this.template.querySelector(
            `textarea[data-category="${category}"]`
        );
        const text = textarea?.value?.trim();
        if (!text) return;

        try {
            const newCard = await createRetroCard({
                retroId: this.recordId,
                category,
                text
            });
            this._cards = [...this._cards, newCard];
            textarea.value = '';
        } catch (e) {
            this._showToast(
                'Error',
                e.body?.message || 'Failed to create card',
                'error'
            );
        }
    }

    handleCardInputKeydown(event) {
        // Ctrl+Enter or Cmd+Enter to submit
        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            const category = event.target.dataset.category;
            const addBtn = this.template.querySelector(
                `button.retro-add-btn[data-category="${category}"]`
            );
            if (addBtn) {
                addBtn.click();
            }
        }
    }

    async handleToggleVote(event) {
        const cardId = event.currentTarget.dataset.cardId;
        try {
            const updatedCard = await toggleVote({ cardId });
            this._cards = this._cards.map((c) =>
                c.Id === cardId ? updatedCard : c
            );
            // Update vote count
            this._currentUserVoteCount += updatedCard.hasVoted ? 1 : -1;
        } catch (e) {
            this._showToast(
                'Vote Error',
                e.body?.message || 'Failed to vote',
                'error'
            );
        }
    }

    async handleRevealAuthors() {
        try {
            await revealAuthors({ retroId: this.recordId });
            this._retro = { ...this._retro, revealed: true };
        } catch (e) {
            this._showToast(
                'Error',
                e.body?.message || 'Failed to reveal authors',
                'error'
            );
        }
    }

    handleToggleShowAlways() {
        // This updates the local state only - show always is a facilitator toggle
        // For persistence, we'd need an Apex method but for real-time retros this is fine
        this._retro = {
            ...this._retro,
            showAlways: !this._retro.showAlways
        };
    }

    async handleAdvanceStatus() {
        const idx = STATUS_ORDER.indexOf(this.retroStatus);
        if (idx < 0 || idx >= STATUS_ORDER.length - 1) return;
        const nextStatus = STATUS_ORDER[idx + 1];

        try {
            const updated = await updateRetroStatus({
                retroId: this.recordId,
                status: nextStatus
            });
            this._retro = updated;
        } catch (e) {
            this._showToast(
                'Error',
                e.body?.message || 'Failed to update status',
                'error'
            );
        }
    }

    async handleDeleteCard(event) {
        const cardId = event.currentTarget.dataset.cardId;
        try {
            await deleteRetroCard({ cardId });
            this._cards = this._cards.filter((c) => c.Id !== cardId);
        } catch (e) {
            this._showToast(
                'Error',
                e.body?.message || 'Failed to delete card',
                'error'
            );
        }
    }

    async handleRefresh() {
        this._isRefreshing = true;
        try {
            await this.loadRetroData();
        } finally {
            // eslint-disable-next-line @lwc/lwc/no-async-operation
            setTimeout(() => {
                this._isRefreshing = false;
            }, 600);
        }
    }

    // =========================================================================
    // Action Item Modal
    // =========================================================================

    async handleOpenActionItemModal(event) {
        const cardId = event.currentTarget.dataset.cardId;
        this._actionItemCardId = cardId;
        this._actionItemBoardId = this._retro?.boardId || null;
        this._actionItemDestination = 'first_column';
        this._actionItemAssigneeId = null;
        this.selectedAssigneeName = '';
        this.assigneeSearchTerm = '';
        this.assigneeResults = [];

        // Load boards if not already loaded
        if (this._availableBoards.length === 0) {
            try {
                this._availableBoards = await getBoards();
            } catch (e) {
                this._showToast('Error', 'Failed to load boards', 'error');
            }
        }

        this.showActionItemModal = true;
    }

    handleCloseActionItemModal() {
        this.showActionItemModal = false;
        this._actionItemCardId = null;
    }

    handleActionItemBoardChange(event) {
        this._actionItemBoardId = event.target.value;
    }

    handleActionItemDestinationChange(event) {
        this._actionItemDestination = event.target.value;
    }

    async handleAssigneeSearch(event) {
        const term = event.target.value;
        this.assigneeSearchTerm = term;

        if (this._searchDebounce) {
            clearTimeout(this._searchDebounce);
        }

        if (!term || term.length < 2) {
            this.assigneeResults = [];
            return;
        }

        // eslint-disable-next-line @lwc/lwc/no-async-operation
        this._searchDebounce = setTimeout(async () => {
            try {
                this.assigneeResults = await searchUsers({
                    searchTerm: term
                });
            } catch (e) {
                this.assigneeResults = [];
            }
        }, 300);
    }

    handleSelectAssignee(event) {
        const userId = event.currentTarget.dataset.userId;
        const user = this.assigneeResults.find((u) => u.Id === userId);
        if (user) {
            this._actionItemAssigneeId = user.Id;
            this.selectedAssigneeName = user.Name;
            this.assigneeResults = [];
            this.assigneeSearchTerm = '';
        }
    }

    async handleCreateActionItem() {
        if (!this._actionItemBoardId || !this._actionItemCardId) return;

        try {
            const updated = await createActionItem({
                retroCardId: this._actionItemCardId,
                boardId: this._actionItemBoardId,
                assigneeId: this._actionItemAssigneeId,
                destination: this._actionItemDestination
            });

            this._cards = this._cards.map((c) =>
                c.Id === this._actionItemCardId ? updated : c
            );

            this.showActionItemModal = false;
            this._showToast(
                'Success',
                `Action item ${updated.actionItemCardName} created`,
                'success'
            );
        } catch (e) {
            this._showToast(
                'Error',
                e.body?.message || 'Failed to create action item',
                'error'
            );
        }
    }

    // =========================================================================
    // Real-time Event Handling
    // =========================================================================

    handleRetroEvent(event) {
        const { payload } = event.detail;
        if (!payload) return;

        const retroId =
            payload.OpenSF__RetroId__c || payload.RetroId__c;

        // Only process events for this retrospective
        if (retroId !== this.recordId) return;

        // Reload data on any retro event
        this.loadRetroData();
    }

    handleSubscriptionStatusChange(event) {
        const { status } = event.detail;
        this._subscriptionStatus = status;
    }

    // =========================================================================
    // Toast Helper
    // =========================================================================

    _showToast(title, message, variant) {
        if (this._toastManager) {
            switch (variant) {
                case 'success':
                    this._toastManager.showSuccess(title, message);
                    break;
                case 'error':
                    this._toastManager.showError(title, message);
                    break;
                default:
                    this._toastManager.showInfo(title, message);
            }
        }
    }
}
