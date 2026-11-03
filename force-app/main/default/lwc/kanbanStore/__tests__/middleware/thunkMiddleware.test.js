/**
 * Unit tests for thunkMiddleware.
 */
import { createThunkMiddleware } from '../../middleware/thunkMiddleware';

function createFakeStore(state = { value: 1 }) {
    const store = {
        state,
        getState: jest.fn(function getState() {
            return this.state;
        }),
        dispatch: jest.fn(function dispatch() {
            return this.state;
        })
    };
    return store;
}

describe('thunkMiddleware', () => {
    it('passes plain action objects to next and returns its result', () => {
        const store = createFakeStore();
        const next = jest.fn(() => 'next-result');
        const action = { type: 'PLAIN' };

        const result = createThunkMiddleware(store)(next)(action);

        expect(next).toHaveBeenCalledWith(action);
        expect(result).toBe('next-result');
    });

    it('invokes function actions with bound dispatch and getState instead of next', () => {
        const store = createFakeStore({ value: 42 });
        const next = jest.fn();
        const thunk = jest.fn((dispatch, getState) => {
            dispatch({ type: 'INNER' });
            return getState().value;
        });

        const result = createThunkMiddleware(store)(next)(thunk);

        expect(next).not.toHaveBeenCalled();
        expect(thunk).toHaveBeenCalledTimes(1);
        expect(result).toBe(42);
        expect(store.dispatch).toHaveBeenCalledWith({ type: 'INNER' });
        // bound to the store, so `this` inside resolves correctly
        expect(store.getState.mock.instances[0]).toBe(store);
        expect(store.dispatch.mock.instances[0]).toBe(store);
    });

    it('returns the promise produced by an async thunk', async () => {
        const store = createFakeStore();
        const next = jest.fn();
        const thunk = () => Promise.resolve('async-value');

        await expect(createThunkMiddleware(store)(next)(thunk)).resolves.toBe(
            'async-value'
        );
        expect(next).not.toHaveBeenCalled();
    });

    it('forwards undefined/null actions to next', () => {
        const store = createFakeStore();
        const next = jest.fn(() => 'forwarded');
        const mw = createThunkMiddleware(store)(next);

        expect(mw(undefined)).toBe('forwarded');
        expect(mw(null)).toBe('forwarded');
        expect(next).toHaveBeenCalledTimes(2);
    });
});
