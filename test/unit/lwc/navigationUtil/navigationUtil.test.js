/**
 * @jest-environment jsdom
 */

import { createElement } from 'lwc';
import NavigationUtil from 'c/navigationUtil';
import { mockNavigate, getNavigateCalledWith } from 'lightning/navigation';
import {
    IsConsoleNavigation,
    openTab,
    getFocusedTabInfo
} from 'lightning/platformWorkspaceApi';

// Mock the navigation utilities
jest.mock(
    'lightning/platformWorkspaceApi',
    () => {
        return {
            IsConsoleNavigation: jest.fn(),
            openTab: jest.fn(),
            getFocusedTabInfo: jest.fn()
        };
    },
    { virtual: true }
);

describe('c-navigation-util', () => {
    let element;

    beforeEach(() => {
        element = createElement('c-navigation-util', {
            is: NavigationUtil
        });
        document.body.appendChild(element);

        // Reset all mocks
        jest.clearAllMocks();
        mockNavigate.mockClear();
    });

    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
    });

    describe('navigateToRecord', () => {
        it('should not navigate when recordId is not provided', async () => {
            await element.navigateToRecord(null, 'Account');

            expect(IsConsoleNavigation).not.toHaveBeenCalled();
        });

        it('should navigate in standard navigation mode', async () => {
            const recordId = '001XXXXXXXXXXXXXXX';
            const objectApiName = 'Account';

            IsConsoleNavigation.mockResolvedValue(false);

            await element.navigateToRecord(recordId, objectApiName);

            const { pageReference } = getNavigateCalledWith();

            expect(IsConsoleNavigation).toHaveBeenCalled();
            expect(pageReference.type).toBe('standard__recordPage');
            expect(pageReference.attributes.recordId).toBe(recordId);
            expect(pageReference.attributes.objectApiName).toBe(objectApiName);
            expect(pageReference.attributes.actionName).toBe('view');
            expect(openTab).not.toHaveBeenCalled();
        });

        it('should open tab in console navigation mode with parent tab', async () => {
            const recordId = '001XXXXXXXXXXXXXXX';
            const objectApiName = 'Account';
            const parentTabId = 'tab-123';

            IsConsoleNavigation.mockResolvedValue(true);
            getFocusedTabInfo.mockResolvedValue({ tabId: parentTabId });
            openTab.mockResolvedValue(undefined);

            await element.navigateToRecord(recordId, objectApiName);

            expect(IsConsoleNavigation).toHaveBeenCalled();
            expect(getFocusedTabInfo).toHaveBeenCalled();
            expect(openTab).toHaveBeenCalledWith({
                pageReference: {
                    type: 'standard__recordPage',
                    attributes: {
                        recordId: recordId,
                        objectApiName: objectApiName,
                        actionName: 'view'
                    }
                },
                focus: true,
                parentTabId: parentTabId
            });
        });

        it('should open tab in console navigation mode without parent tab on error', async () => {
            const recordId = '001XXXXXXXXXXXXXXX';
            const objectApiName = 'Account';

            IsConsoleNavigation.mockResolvedValue(true);
            getFocusedTabInfo.mockRejectedValue(new Error('No focused tab'));
            openTab.mockResolvedValue(undefined);

            await element.navigateToRecord(recordId, objectApiName);

            expect(IsConsoleNavigation).toHaveBeenCalled();
            expect(getFocusedTabInfo).toHaveBeenCalled();
            expect(openTab).toHaveBeenCalledWith({
                pageReference: {
                    type: 'standard__recordPage',
                    attributes: {
                        recordId: recordId,
                        objectApiName: objectApiName,
                        actionName: 'view'
                    }
                },
                focus: true
            });
        });

        it('should fallback to standard navigation on console check error', async () => {
            const recordId = '001XXXXXXXXXXXXXXX';
            const objectApiName = 'Account';

            IsConsoleNavigation.mockRejectedValue(
                new Error('Console check failed')
            );

            await element.navigateToRecord(recordId, objectApiName);

            const { pageReference } = getNavigateCalledWith();

            expect(pageReference.type).toBe('standard__recordPage');
            expect(pageReference.attributes.recordId).toBe(recordId);
            expect(pageReference.attributes.objectApiName).toBe(objectApiName);
            expect(pageReference.attributes.actionName).toBe('view');
        });
    });

    describe('navigateToPage', () => {
        it('should not navigate when pageReference is not provided', async () => {
            await element.navigateToPage(null);

            expect(IsConsoleNavigation).not.toHaveBeenCalled();
        });

        it('should navigate in standard navigation mode', async () => {
            const pageReference = {
                type: 'standard__objectPage',
                attributes: {
                    objectApiName: 'Account',
                    actionName: 'list'
                }
            };

            IsConsoleNavigation.mockResolvedValue(false);

            await element.navigateToPage(pageReference);

            const nav = getNavigateCalledWith();

            expect(IsConsoleNavigation).toHaveBeenCalled();
            expect(nav.pageReference).toEqual(pageReference);
            expect(openTab).not.toHaveBeenCalled();
        });

        it('should open tab in console navigation mode with parent tab', async () => {
            const pageReference = {
                type: 'standard__objectPage',
                attributes: {
                    objectApiName: 'Account',
                    actionName: 'list'
                }
            };
            const parentTabId = 'tab-456';

            IsConsoleNavigation.mockResolvedValue(true);
            getFocusedTabInfo.mockResolvedValue({ tabId: parentTabId });
            openTab.mockResolvedValue(undefined);

            await element.navigateToPage(pageReference);

            expect(IsConsoleNavigation).toHaveBeenCalled();
            expect(getFocusedTabInfo).toHaveBeenCalled();
            expect(openTab).toHaveBeenCalledWith({
                pageReference: pageReference,
                focus: true,
                parentTabId: parentTabId
            });
        });

        it('should open tab in console navigation mode without parent tab on error', async () => {
            const pageReference = {
                type: 'standard__objectPage',
                attributes: {
                    objectApiName: 'Account',
                    actionName: 'list'
                }
            };

            IsConsoleNavigation.mockResolvedValue(true);
            getFocusedTabInfo.mockRejectedValue(new Error('No focused tab'));
            openTab.mockResolvedValue(undefined);

            await element.navigateToPage(pageReference);

            expect(IsConsoleNavigation).toHaveBeenCalled();
            expect(getFocusedTabInfo).toHaveBeenCalled();
            expect(openTab).toHaveBeenCalledWith({
                pageReference: pageReference,
                focus: true
            });
        });

        it('should fallback to standard navigation on console check error', async () => {
            const pageReference = {
                type: 'standard__objectPage',
                attributes: {
                    objectApiName: 'Account',
                    actionName: 'list'
                }
            };

            IsConsoleNavigation.mockRejectedValue(
                new Error('Console check failed')
            );

            await element.navigateToPage(pageReference);

            const nav = getNavigateCalledWith();
            expect(nav.pageReference).toEqual(pageReference);
        });
    });
});
