import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi
} from 'vitest';

import type {
    RenderContext,
    WidgetItem
} from '../../types';
import { DEFAULT_SETTINGS } from '../../types/Settings';
import { CodexAccountEmailWidget } from '../CodexAccountEmail';

const ORIGINAL_HOME = process.env.HOME;
const ORIGINAL_CLAUDE_CONFIG_DIR = process.env.CLAUDE_CONFIG_DIR;

let tempHomeDir: string;

function render(options: {
    rawValue?: boolean;
    isPreview?: boolean;
} = {}): string | null {
    const {
        rawValue = false,
        isPreview = false
    } = options;

    const widget = new CodexAccountEmailWidget();
    const context: RenderContext = { isPreview };
    const item: WidgetItem = {
        id: 'codex-account-email',
        type: 'codex-account-email',
        rawValue
    };

    return widget.render(item, context, DEFAULT_SETTINGS);
}

describe('CodexAccountEmailWidget', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        tempHomeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codexstatusline-codex-account-email-'));
    });

    afterEach(() => {
        fs.rmSync(tempHomeDir, { recursive: true, force: true });

        if (ORIGINAL_HOME === undefined) {
            delete process.env.HOME;
        } else {
            process.env.HOME = ORIGINAL_HOME;
        }

        if (ORIGINAL_CLAUDE_CONFIG_DIR === undefined) {
            delete process.env.CLAUDE_CONFIG_DIR;
        } else {
            process.env.CLAUDE_CONFIG_DIR = ORIGINAL_CLAUDE_CONFIG_DIR;
        }

        vi.restoreAllMocks();
    });

    it('returns labelled preview text in preview mode', () => {
        expect(render({ isPreview: true })).toBe('Account: you@example.com');
    });

    it('returns raw preview text in preview mode when rawValue is enabled', () => {
        expect(render({ isPreview: true, rawValue: true })).toBe('you@example.com');
    });

    it('reads the Codex account email from the default homedir when HOME is unset', () => {
        delete process.env.HOME;
        delete process.env.CLAUDE_CONFIG_DIR;
        vi.spyOn(os, 'homedir').mockReturnValue(tempHomeDir);

        const codexJsonPath = path.join(tempHomeDir, '.codex.json');
        fs.writeFileSync(codexJsonPath, JSON.stringify({ oauthAccount: { emailAddress: 'user@example.com' } }), 'utf-8');

        expect(render()).toBe('Account: user@example.com');
    });

    it('returns the raw email when rawValue is enabled', () => {
        delete process.env.HOME;
        delete process.env.CLAUDE_CONFIG_DIR;
        vi.spyOn(os, 'homedir').mockReturnValue(tempHomeDir);

        const codexJsonPath = path.join(tempHomeDir, '.codex.json');
        fs.writeFileSync(codexJsonPath, JSON.stringify({ oauthAccount: { emailAddress: 'user@example.com' } }), 'utf-8');

        expect(render({ rawValue: true })).toBe('user@example.com');
    });

    it('returns null when the Codex account email is unavailable', () => {
        process.env.CLAUDE_CONFIG_DIR = path.join(tempHomeDir, '.codex');

        expect(render()).toBeNull();
    });

    it('reads from $CLAUDE_CONFIG_DIR/.codex.json when CLAUDE_CONFIG_DIR is set', () => {
        // Regression test for #317: the widget previously read $HOME/.codex.json
        // regardless of CLAUDE_CONFIG_DIR, causing all profiles to show the same email.
        const customConfigDir = path.join(tempHomeDir, '.codex-work');
        fs.mkdirSync(customConfigDir, { recursive: true });
        process.env.CLAUDE_CONFIG_DIR = customConfigDir;

        const codexJsonPath = path.join(customConfigDir, '.codex.json');
        fs.writeFileSync(
            codexJsonPath,
            JSON.stringify({ oauthAccount: { emailAddress: 'work@example.com' } }),
            'utf-8'
        );

        expect(render()).toBe('Account: work@example.com');
    });

    it('does not fall back to $HOME/.codex.json when CLAUDE_CONFIG_DIR points to a dir without one', () => {
        // Verifies the fix for #317 doesn't silently leak the wrong profile's
        // email when the configured profile has no .codex.json yet.
        const customConfigDir = path.join(tempHomeDir, '.codex-empty');
        fs.mkdirSync(customConfigDir, { recursive: true });
        process.env.CLAUDE_CONFIG_DIR = customConfigDir;

        // Plant a .codex.json in $HOME — the widget must NOT pick this up
        vi.spyOn(os, 'homedir').mockReturnValue(tempHomeDir);
        fs.writeFileSync(
            path.join(tempHomeDir, '.codex.json'),
            JSON.stringify({ oauthAccount: { emailAddress: 'leak@example.com' } }),
            'utf-8'
        );

        expect(render()).toBeNull();
    });

    it('returns null when emailAddress is not a string', () => {
        delete process.env.CLAUDE_CONFIG_DIR;
        vi.spyOn(os, 'homedir').mockReturnValue(tempHomeDir);

        const codexJsonPath = path.join(tempHomeDir, '.codex.json');
        fs.writeFileSync(
            codexJsonPath,
            JSON.stringify({ oauthAccount: { emailAddress: 12345 } }),
            'utf-8'
        );

        expect(render()).toBeNull();
    });
});
