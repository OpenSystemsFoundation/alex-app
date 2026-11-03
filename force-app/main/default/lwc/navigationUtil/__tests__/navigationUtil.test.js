import { createElement } from 'lwc';
import NavigationUtil from 'c/navigationUtil';
import {
    IsConsoleNavigation,
    openTab,
    getFocusedTabInfo
} from 'lightning/platformWorkspaceApi';

const mockNavigate = jest.fn();

jest.mock('lightning/navigation', () => {
    const Navigate = Symbol('Navigate');
    const NavigationMixin = (Base) =>
        class extends Base {
            [Navigate](pageReference) {
                mockNavigate(pageReference);
            }
        };
    NavigationMixin.Navigate = Navigate;
    return { NavigationMixin };
});

jest.mock('lightning/platformWorkspaceApi', () => ({
    IsConsoleNavigation: jest.fn(),
    openTab: jest.fn(),
    getFocusedTabInfo: jest.fn()
}));

const RECORD_REF = {
    type: 'standard__recordPage',
    attributes: {
        recordId: 'a01000000000001',
        objectApiName: 'OpenSF__Card__c',
        actionName: 'view'
    }
};

const PAGE_REF = {
    type: 'standard__navItemPage',
    attributes: { apiName: 'Alex' }
};

function createUtil() {
    const element = createElement('c-navigation-util', { is: NavigationUtil });
    document.body.appendChild(element);
    return element;
}

describe('c-navigation-util', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
        jest.clearAllMocks();
    });

    describe.each([
        [
            'navigateToRecord',
            (el) => el.navigateToRecord('a01000000000001', 'OpenSF__Card__c'),
            (el) => el.navigateToRecord(null, 'OpenSF__Card__c'),
            RECORD_REF
        ],
        [
            'navigateToPage',
            (el) => el.navigateToPage(PAGE_REF),
            (el) => el.navigateToPage(undefined),
            PAGE_REF
        ]
    ])('%s', (_name, invoke, invokeEmpty, expectedRef) => {
        it('is a no-op without a target', async () => {
            const element = createUtil();
            await invokeEmpty(element);
            expect(IsConsoleNavigation).not.toHaveBeenCalled();
            expect(mockNavigate).not.toHaveBeenCalled();
            expect(openTab).not.toHaveBeenCalled();
        });

        it('uses standard navigation outside the console', async () => {
            IsConsoleNavigation.mockResolvedValue(false);
            const element = createUtil();

            await invoke(element);

            expect(mockNavigate).toHaveBeenCalledWith(expectedRef);
            expect(openTab).not.toHaveBeenCalled();
        });

        it('opens a sub-tab of the focused tab in the console', async () => {
            IsConsoleNavigation.mockResolvedValue(true);
            getFocusedTabInfo.mockResolvedValue({ tabId: 'tab42' });
            openTab.mockResolvedValue('newTab');
            const element = createUtil();

            await invoke(element);

            expect(openTab).toHaveBeenCalledTimes(1);
            expect(openTab).toHaveBeenCalledWith({
                pageReference: expectedRef,
                focus: true,
                parentTabId: 'tab42'
            });
            expect(mockNavigate).not.toHaveBeenCalled();
        });

        it('falls back to a top-level tab when focused tab lookup fails', async () => {
            IsConsoleNavigation.mockResolvedValue(true);
            getFocusedTabInfo.mockRejectedValue(new Error('no focus'));
            openTab.mockResolvedValue('newTab');
            const element = createUtil();

            await invoke(element);

            expect(openTab).toHaveBeenCalledTimes(1);
            expect(openTab).toHaveBeenCalledWith({
                pageReference: expectedRef,
                focus: true
            });
            expect(mockNavigate).not.toHaveBeenCalled();
        });

        it('falls back to standard navigation when the console API fails', async () => {
            IsConsoleNavigation.mockRejectedValue(new Error('not available'));
            const element = createUtil();

            await invoke(element);

            expect(mockNavigate).toHaveBeenCalledWith(expectedRef);
            expect(openTab).not.toHaveBeenCalled();
        });

        it('falls back to standard navigation when both openTab attempts fail', async () => {
            IsConsoleNavigation.mockResolvedValue(true);
            getFocusedTabInfo.mockResolvedValue({ tabId: 'tab1' });
            openTab.mockRejectedValue(new Error('tab error'));
            const element = createUtil();

            await invoke(element);

            expect(openTab).toHaveBeenCalledTimes(2);
            expect(mockNavigate).toHaveBeenCalledWith(expectedRef);
        });
    });
});
