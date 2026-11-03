/**
 * Unit tests for clientIdGenerator
 */
import { generateClientId } from '../../helpers/clientIdGenerator';

const UUID_V4 =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('generateClientId', () => {
    const originalCrypto = global.crypto;

    afterEach(() => {
        Object.defineProperty(global, 'crypto', {
            value: originalCrypto,
            configurable: true,
            writable: true
        });
        jest.restoreAllMocks();
    });

    it('uses crypto.randomUUID when available', () => {
        const randomUUID = jest.fn(() => 'native-uuid');
        Object.defineProperty(global, 'crypto', {
            value: { randomUUID },
            configurable: true,
            writable: true
        });

        expect(generateClientId()).toBe('native-uuid');
        expect(randomUUID).toHaveBeenCalledTimes(1);
    });

    it('falls back to a v4 UUID when crypto.randomUUID is missing', () => {
        Object.defineProperty(global, 'crypto', {
            value: {},
            configurable: true,
            writable: true
        });

        const id = generateClientId();
        expect(id).toMatch(UUID_V4);
    });

    it('falls back when crypto is undefined', () => {
        Object.defineProperty(global, 'crypto', {
            value: undefined,
            configurable: true,
            writable: true
        });
        jest.spyOn(Math, 'random').mockReturnValue(0);

        expect(generateClientId()).toBe('00000000-0000-4000-8000-000000000000');
    });

    it('generates distinct ids on the fallback path', () => {
        Object.defineProperty(global, 'crypto', {
            value: {},
            configurable: true,
            writable: true
        });

        expect(generateClientId()).not.toBe(generateClientId());
    });
});
