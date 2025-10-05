import { LightningElement, api } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import {
    IsConsoleNavigation,
    openTab,
    getFocusedTabInfo
} from 'lightning/platformWorkspaceApi';

export default class NavigationUtil extends NavigationMixin(LightningElement) {
    @api
    async navigateToRecord(recordId, objectApiName) {
        if (!recordId) {
            return;
        }

        const pageReference = {
            type: 'standard__recordPage',
            attributes: {
                recordId: recordId,
                objectApiName: objectApiName,
                actionName: 'view'
            }
        };

        try {
            const isConsole = await IsConsoleNavigation();

            if (isConsole) {
                try {
                    const focusedTab = await getFocusedTabInfo();
                    await openTab({
                        pageReference: pageReference,
                        focus: true,
                        parentTabId: focusedTab.tabId
                    });
                } catch (error) {
                    await openTab({
                        pageReference: pageReference,
                        focus: true
                    });
                }
            } else {
                this[NavigationMixin.Navigate](pageReference);
            }
        } catch (error) {
            this[NavigationMixin.Navigate](pageReference);
        }
    }

    @api
    async navigateToPage(pageReference) {
        if (!pageReference) {
            return;
        }

        try {
            const isConsole = await IsConsoleNavigation();

            if (isConsole) {
                try {
                    const focusedTab = await getFocusedTabInfo();
                    await openTab({
                        pageReference: pageReference,
                        focus: true,
                        parentTabId: focusedTab.tabId
                    });
                } catch (error) {
                    await openTab({
                        pageReference: pageReference,
                        focus: true
                    });
                }
            } else {
                this[NavigationMixin.Navigate](pageReference);
            }
        } catch (error) {
            this[NavigationMixin.Navigate](pageReference);
        }
    }
}
