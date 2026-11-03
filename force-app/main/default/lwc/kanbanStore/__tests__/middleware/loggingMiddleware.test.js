/**
 * Unit tests for loggingMiddleware.
 */
import { createLoggingMiddleware } from '../../middleware/loggingMiddleware';

describe('loggingMiddleware', () => {
    let groupSpy;
    let logSpy;
    let groupEndSpy;

    beforeEach(() => {
        groupSpy = jest.spyOn(console, 'group').mockImplementation(() => {});
        logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        groupEndSpy = jest
            .spyOn(console, 'groupEnd')
            .mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('defaults to disabled and passes actions through silently', () => {
        const store = { getState: jest.fn(() => ({})) };
        const next = jest.fn(() => 'result');

        const result = createLoggingMiddleware()(store)(next)({ type: 'X' });

        expect(result).toBe('result');
        expect(next).toHaveBeenCalledWith({ type: 'X' });
        expect(groupSpy).not.toHaveBeenCalled();
        expect(logSpy).not.toHaveBeenCalled();
        expect(store.getState).not.toHaveBeenCalled();
    });

    it('logs previous state, action and next state when enabled', () => {
        let state = { count: 0 };
        const store = { getState: jest.fn(() => state) };
        const next = jest.fn(() => {
            state = { count: 1 };
            return 'done';
        });
        const action = { type: 'INCREMENT' };

        const result = createLoggingMiddleware(true)(store)(next)(action);

        expect(result).toBe('done');
        expect(groupSpy).toHaveBeenCalledWith('Action: INCREMENT');
        expect(logSpy).toHaveBeenCalledWith('Previous State:', { count: 0 });
        expect(logSpy).toHaveBeenCalledWith('Action:', action);
        expect(logSpy).toHaveBeenCalledWith('Next State:', { count: 1 });
        expect(groupEndSpy).toHaveBeenCalledTimes(1);
    });

    it('labels actions without a type as THUNK', () => {
        const store = { getState: () => ({}) };
        const next = jest.fn();
        const thunk = () => {};

        createLoggingMiddleware(true)(store)(next)(thunk);
        createLoggingMiddleware(true)(store)(next)(null);

        expect(groupSpy).toHaveBeenNthCalledWith(1, 'Action: THUNK');
        expect(groupSpy).toHaveBeenNthCalledWith(2, 'Action: THUNK');
        expect(next).toHaveBeenCalledTimes(2);
    });
});
