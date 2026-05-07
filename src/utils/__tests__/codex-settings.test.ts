import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
    afterAll,
    afterEach,
    beforeEach,
    describe,
    expect,
    it
} from 'vitest';

import {
    SettingsSchema,
    type Settings
} from '../../types/Settings';
import {
    getCodexConfigPath,
    getExistingStatusLine,
    installStatusLine,
    loadCodexSettingsSync,
    mapSettingsToCodexStatusLine,
    uninstallStatusLine
} from '../codex-settings';

const ORIGINAL_CODEX_HOME = process.env.CODEX_HOME;
let testCodexHome = '';

function settingsWithWidgets(types: string[]): Settings {
    return SettingsSchema.parse({
        lines: [types.map((type, index) => ({ id: String(index), type }))],
        compactThreshold: 40,
        colorLevel: 3
    });
}

beforeEach(() => {
    testCodexHome = fs.mkdtempSync(path.join(os.tmpdir(), 'codexstatusline-codex-settings-'));
    process.env.CODEX_HOME = testCodexHome;
});

afterEach(() => {
    fs.rmSync(testCodexHome, { recursive: true, force: true });
});

afterAll(() => {
    if (ORIGINAL_CODEX_HOME === undefined) {
        delete process.env.CODEX_HOME;
    } else {
        process.env.CODEX_HOME = ORIGINAL_CODEX_HOME;
    }
});

describe('Codex settings integration', () => {
    it('maps supported widgets to Codex status line items', () => {
        expect(mapSettingsToCodexStatusLine(settingsWithWidgets([
            'model',
            'current-working-dir',
            'git-branch',
            'tokens-input',
            'tokens-output'
        ]))).toEqual([
            'model',
            'current-dir',
            'git-branch',
            'total-input-tokens',
            'total-output-tokens'
        ]);
    });

    it('writes tui.status_line without replacing other config', async () => {
        fs.mkdirSync(testCodexHome, { recursive: true });
        fs.writeFileSync(getCodexConfigPath(), 'model_reasoning_effort = "high"\n\n[tui]\ntheme = "dark"\n');

        await installStatusLine(settingsWithWidgets(['model', 'git-branch']));

        expect(fs.readFileSync(getCodexConfigPath(), 'utf-8')).toContain('model_reasoning_effort = "high"');
        expect(fs.readFileSync(getCodexConfigPath(), 'utf-8')).toContain('theme = "dark"');
        await expect(getExistingStatusLine()).resolves.toBe('model, git-branch');
    });

    it('sets tui.status_line to null when uninstalling', async () => {
        await installStatusLine(settingsWithWidgets(['model']));
        await uninstallStatusLine();

        expect(fs.readFileSync(getCodexConfigPath(), 'utf-8')).toContain('status_line = null');
    });

    it('reads model_reasoning_effort for the thinking widget fallback', () => {
        fs.mkdirSync(testCodexHome, { recursive: true });
        fs.writeFileSync(getCodexConfigPath(), 'model_reasoning_effort = "xhigh"\n');

        expect(loadCodexSettingsSync()).toEqual({ effortLevel: 'xhigh' });
    });
});
