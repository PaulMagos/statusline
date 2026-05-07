import { execFileSync } from 'child_process';
import * as fs from 'fs';
import type { Mock } from 'vitest';
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi
} from 'vitest';

import * as codexSettings from '../codex-settings';
import {
    getUsageToken,
    parseMacKeychainCredentialCandidates
} from '../usage-fetch';

vi.mock('child_process', () => ({
    execSync: vi.fn(),
    execFileSync: vi.fn(),
    spawnSync: vi.fn()
}));

const CREDENTIALS_FILE = '/fake/codex/.credentials.json';
const mockedExecFileSync = execFileSync as unknown as Mock;

function makeTokenPayload(token: string): string {
    return JSON.stringify({ codexAiOauth: { accessToken: token } });
}

function encodeAsciiAsHex(value: string): string {
    return Buffer.from(value, 'utf8').toString('hex');
}

function makeKeychainBlock(service: string, modifiedAt?: { raw?: string; quoted?: string }): string {
    const lines = [
        'keychain: "/Users/example/Library/Keychains/login.keychain-db"',
        'version: 512',
        'class: "genp"',
        'attributes:',
        `    "svce"<blob>="${service}"`
    ];

    if (modifiedAt?.raw && modifiedAt.quoted) {
        lines.push(`    "mdat"<timedate>=0x${modifiedAt.raw}    "${modifiedAt.quoted}"`);
    } else if (modifiedAt?.raw) {
        lines.push(`    "mdat"<timedate>=0x${modifiedAt.raw}`);
    } else if (modifiedAt?.quoted) {
        lines.push(`    "mdat"<timedate>="${modifiedAt.quoted}"`);
    }

    return lines.join('\n');
}

function getSecurityCallLog(): string[] {
    return mockedExecFileSync.mock.calls.map((call) => {
        const [command, args]: [string, string[] | undefined] = call as [string, string[] | undefined];

        expect(command).toBe('security');
        return Array.isArray(args) ? args.join(' ') : '';
    });
}

function mockCredentialsFile(payload?: string): void {
    vi.spyOn(fs, 'readFileSync').mockImplementation((filePath, options) => {
        if (filePath === CREDENTIALS_FILE) {
            if (payload === undefined) {
                throw new Error('credentials file missing');
            }

            expect(options).toBe('utf8');
            return payload;
        }

        throw new Error(`Unexpected file read: ${String(filePath)}`);
    });
}

describe('parseMacKeychainCredentialCandidates', () => {
    it('returns hashed macOS credential candidates sorted newest-first and excludes the exact service', () => {
        const dump = [
            makeKeychainBlock('Codex-credentials', { quoted: '20240101010101Z' }),
            makeKeychainBlock('Codex-credentials-old', { quoted: '20240201010101Z' }),
            makeKeychainBlock('Codex-credentials-new', { quoted: '20240301010101Z' })
        ].join('\n');

        expect(parseMacKeychainCredentialCandidates(dump)).toEqual([
            'Codex-credentials-new',
            'Codex-credentials-old'
        ]);
    });

    it('uses discovered order when modified times are unavailable and parses hex-only timestamps when present', () => {
        const dump = [
            makeKeychainBlock('Codex-credentials-first'),
            makeKeychainBlock('Codex-credentials-second', { raw: encodeAsciiAsHex('20240401010101Z\0') }),
            makeKeychainBlock('Codex-credentials-third')
        ].join('\n');

        expect(parseMacKeychainCredentialCandidates(dump)).toEqual([
            'Codex-credentials-second',
            'Codex-credentials-first',
            'Codex-credentials-third'
        ]);
    });
});

describe('getUsageToken', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        vi.spyOn(codexSettings, 'getCodexConfigDir').mockReturnValue('/fake/codex');
        mockedExecFileSync.mockReset();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        mockedExecFileSync.mockReset();
    });

    it('prefers the exact macOS keychain service over hashed fallbacks and files', () => {
        vi.spyOn(process, 'platform', 'get').mockReturnValue('darwin');
        mockCredentialsFile();
        mockedExecFileSync.mockImplementation((command: string, args?: string[]) => {
            if (command === 'security' && args?.[0] === 'find-generic-password' && args[2] === 'Codex-credentials') {
                return makeTokenPayload('exact-token');
            }

            throw new Error(`Unexpected security args: ${args?.join(' ')}`);
        });

        expect(getUsageToken()).toBe('exact-token');
        expect(getUsageToken()).toBe('exact-token');
        expect(getSecurityCallLog()).toEqual([
            'find-generic-password -s Codex-credentials -w',
            'find-generic-password -s Codex-credentials -w'
        ]);
    });

    it('tries the newest hashed macOS keychain candidate after an exact miss', () => {
        const dump = [
            makeKeychainBlock('Codex-credentials-old', { quoted: '20240201010101Z' }),
            makeKeychainBlock('Codex-credentials-new', { quoted: '20240301010101Z' })
        ].join('\n');

        vi.spyOn(process, 'platform', 'get').mockReturnValue('darwin');
        mockCredentialsFile();
        mockedExecFileSync.mockImplementation((command: string, args?: string[]) => {
            if (command !== 'security' || !args) {
                throw new Error(`Unexpected security args: ${args?.join(' ')}`);
            }

            if (args[0] === 'find-generic-password' && args[2] === 'Codex-credentials') {
                throw new Error('missing exact credential');
            }

            if (args[0] === 'dump-keychain') {
                return dump;
            }

            if (args[0] === 'find-generic-password' && args[2] === 'Codex-credentials-new') {
                return makeTokenPayload('hashed-token');
            }

            throw new Error(`Unexpected security args: ${args.join(' ')}`);
        });

        expect(getUsageToken()).toBe('hashed-token');
        expect(getUsageToken()).toBe('hashed-token');
        expect(getSecurityCallLog()).toEqual([
            'find-generic-password -s Codex-credentials -w',
            'dump-keychain',
            'find-generic-password -s Codex-credentials-new -w',
            'find-generic-password -s Codex-credentials -w',
            'dump-keychain',
            'find-generic-password -s Codex-credentials-new -w'
        ]);
    });

    it('falls back to ~/.codex/.credentials.json on macOS when keychain lookups miss or parse invalid data', () => {
        const dump = makeKeychainBlock('Codex-credentials-hashed', { quoted: '20240301010101Z' });

        vi.spyOn(process, 'platform', 'get').mockReturnValue('darwin');
        mockCredentialsFile(makeTokenPayload('file-token'));
        mockedExecFileSync.mockImplementation((command: string, args?: string[]) => {
            if (command !== 'security' || !args) {
                throw new Error(`Unexpected security args: ${args?.join(' ')}`);
            }

            if (args[0] === 'find-generic-password' && args[2] === 'Codex-credentials') {
                throw new Error('missing exact credential');
            }

            if (args[0] === 'dump-keychain') {
                return dump;
            }

            if (args[0] === 'find-generic-password' && args[2] === 'Codex-credentials-hashed') {
                return 'not-json';
            }

            throw new Error(`Unexpected security args: ${args.join(' ')}`);
        });

        expect(getUsageToken()).toBe('file-token');
        expect(getUsageToken()).toBe('file-token');
        expect(getSecurityCallLog()).toEqual([
            'find-generic-password -s Codex-credentials -w',
            'dump-keychain',
            'find-generic-password -s Codex-credentials-hashed -w',
            'find-generic-password -s Codex-credentials -w',
            'dump-keychain',
            'find-generic-password -s Codex-credentials-hashed -w'
        ]);
    });

    it('uses the credentials file on non-macOS', () => {
        vi.spyOn(process, 'platform', 'get').mockReturnValue('linux');
        mockCredentialsFile(makeTokenPayload('linux-file-token'));

        expect(getUsageToken()).toBe('linux-file-token');
        expect(getUsageToken()).toBe('linux-file-token');
        expect(mockedExecFileSync).not.toHaveBeenCalled();
    });
});
