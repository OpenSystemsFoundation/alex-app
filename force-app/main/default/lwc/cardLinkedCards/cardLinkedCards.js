import { LightningElement, api, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { NavigationMixin } from 'lightning/navigation';
import getCardLinks from '@salesforce/apex/KanbanBoardController.getCardLinks';
import createCardLink from '@salesforce/apex/KanbanBoardController.createCardLink';
import deleteCardLink from '@salesforce/apex/KanbanBoardController.deleteCardLink';
import searchCardsForLinking from '@salesforce/apex/KanbanBoardController.searchCardsForLinking';

/**
 * @typedef {Object} CardLinkDTO
 * @property {string} Id
 * @property {string} sourceCardId
 * @property {string} targetCardId
 * @property {string} targetCardName
 * @property {string} targetCardSubject
 * @property {string} targetCardStatus
 * @property {string} targetCardType
 * @property {string} linkType
 */

/**
 * @typedef {Object} CardSearchResult
 * @property {string} Id
 * @property {string} Name
 * @property {string} subject
 * @property {string} status
 * @property {string} cardType
 */

const LINK_TYPE_OPTIONS = [
    { label: 'Blocks', value: 'Blocks' },
    { label: 'Is Blocked By', value: 'Is Blocked By' },
    { label: 'Relates To', value: 'Relates To' },
    { label: 'Duplicates', value: 'Duplicates' },
    { label: 'Is Duplicated By', value: 'Is Duplicated By' }
];

const LINK_TYPE_ICONS = {
    Blocks: 'utility:block_visitor',
    'Is Blocked By': 'utility:block_visitor',
    'Relates To': 'utility:link',
    Duplicates: 'utility:copy',
    'Is Duplicated By': 'utility:copy'
};

const LINK_TYPE_VARIANTS = {
    Blocks: 'error',
    'Is Blocked By': 'warning',
    'Relates To': 'default',
    Duplicates: 'default',
    'Is Duplicated By': 'default'
};

export default class CardLinkedCards extends NavigationMixin(LightningElement) {
    /** @type {string} Card record ID — set by record page or parent component */
    @api recordId;

    /** @type {CardLinkDTO[]} */
    @track links = [];
    /** @type {boolean} */
    @track isLoading = false;
    /** @type {boolean} */
    @track showAddForm = false;
    /** @type {string} */
    @track searchTerm = '';
    /** @type {CardSearchResult[]} */
    @track searchResults = [];
    /** @type {boolean} */
    @track isSearching = false;
    /** @type {string} */
    @track selectedLinkType = 'Relates To';
    /** @type {string|null} */
    @track confirmDeleteId = null;

    _searchTimeout;

    get linkTypeOptions() {
        return LINK_TYPE_OPTIONS;
    }

    get hasLinks() {
        return this.links.length > 0;
    }

    get linkCount() {
        return this.links.length;
    }

    get hasSearchResults() {
        return this.searchResults.length > 0;
    }

    get showSearchResults() {
        return this.searchTerm.length >= 2 && !this.isSearching;
    }

    get showEmptyState() {
        return !this.isLoading && !this.hasLinks;
    }

    get addButtonIcon() {
        return this.showAddForm ? 'utility:close' : 'utility:add';
    }

    get deleteIcon() {
        return 'utility:close';
    }

    get deleteButtonClass() {
        return 'delete-link-btn';
    }

    get deleteTitle() {
        return 'Remove link (click twice to confirm)';
    }

    get displayLinks() {
        return this.links.map((link) => ({
            ...link,
            icon: LINK_TYPE_ICONS[link.linkType] || 'utility:link',
            badgeVariant: LINK_TYPE_VARIANTS[link.linkType] || 'default',
            isConfirmingDelete: this.confirmDeleteId === link.Id,
            cardUrl: `/lightning/r/OpenSF__Card__c/${link.targetCardId}/view`
        }));
    }

    connectedCallback() {
        this.loadLinks();
    }

    async loadLinks() {
        if (!this.recordId) {
            return;
        }
        this.isLoading = true;
        try {
            this.links = await getCardLinks({ cardId: this.recordId });
        } catch (error) {
            this.showToast(
                'Error',
                error.body?.message || 'Failed to load linked cards',
                'error'
            );
        } finally {
            this.isLoading = false;
        }
    }

    handleToggleAddForm() {
        this.showAddForm = !this.showAddForm;
        if (!this.showAddForm) {
            this.resetForm();
        }
    }

    handleLinkTypeChange(event) {
        this.selectedLinkType = event.detail.value;
    }

    handleSearchInput(event) {
        this.searchTerm = event.target.value;
        if (this._searchTimeout) {
            // eslint-disable-next-line @lwc/lwc/no-async-operation
            clearTimeout(this._searchTimeout);
        }
        if (this.searchTerm.length >= 2) {
            // eslint-disable-next-line @lwc/lwc/no-async-operation
            this._searchTimeout = setTimeout(() => {
                this.performSearch();
            }, 300);
        } else {
            this.searchResults = [];
        }
    }

    async performSearch() {
        this.isSearching = true;
        try {
            this.searchResults = await searchCardsForLinking({
                cardId: this.recordId,
                searchTerm: this.searchTerm
            });
        } catch (error) {
            this.showToast(
                'Error',
                error.body?.message || 'Search failed',
                'error'
            );
        } finally {
            this.isSearching = false;
        }
    }

    async handleSelectCard(event) {
        const targetCardId = event.currentTarget.dataset.cardId;
        try {
            await createCardLink({
                sourceCardId: this.recordId,
                targetCardId,
                linkType: this.selectedLinkType
            });
            this.showToast('Success', 'Card linked successfully', 'success');
            this.resetForm();
            await this.loadLinks();
        } catch (error) {
            this.showToast(
                'Error',
                error.body?.message || 'Failed to create link',
                'error'
            );
        }
    }

    handleDeleteClick(event) {
        const linkId = event.currentTarget.dataset.linkId;
        if (this.confirmDeleteId === linkId) {
            this.performDelete(linkId);
        } else {
            this.confirmDeleteId = linkId;
            // eslint-disable-next-line @lwc/lwc/no-async-operation
            setTimeout(() => {
                this.confirmDeleteId = null;
            }, 3000);
        }
    }

    async performDelete(linkId) {
        try {
            await deleteCardLink({ cardLinkId: linkId });
            this.showToast('Success', 'Link removed', 'success');
            this.confirmDeleteId = null;
            await this.loadLinks();
        } catch (error) {
            this.showToast(
                'Error',
                error.body?.message || 'Failed to remove link',
                'error'
            );
        }
    }

    handleNavigateToCard(event) {
        event.preventDefault();
        const cardId = event.currentTarget.dataset.cardId;
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: cardId,
                objectApiName: 'OpenSF__Card__c',
                actionName: 'view'
            }
        });
    }

    resetForm() {
        this.showAddForm = false;
        this.searchTerm = '';
        this.searchResults = [];
        this.selectedLinkType = 'Relates To';
    }

    showToast(title, message, variant) {
        this.dispatchEvent(
            new ShowToastEvent({ title, message, variant })
        );
    }

    disconnectedCallback() {
        if (this._searchTimeout) {
            clearTimeout(this._searchTimeout);
        }
    }
}
