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

import { DEFAULT_SETTINGS } from '../../types/Settings';
import { syncWidgetHooks } from '../hooks';

const ORIGINAL_CLAUDE_CONFIG_DIR = process.env.CLAUDE_CONFIG_DIR;
let testCodexConfigDir = '';

function getCodexSettingsPath(): string {
    return path.join(testCodexConfigDir, 'settings.json');
}

describe('syncWidgetHooks', () => {
    beforeEach(() => {
        testCodexConfigDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codexstatusline-hooks-'));
        process.env.CLAUDE_CONFIG_DIR = testCodexConfigDir;
    });

    afterEach(() => {
        if (testCodexConfigDir) {
            fs.rmSync(testCodexConfigDir, { recursive: true, force: true });
        }
    });

    afterAll(() => {
        if (ORIGINAL_CLAUDE_CONFIG_DIR === undefined) {
            delete process.env.CLAUDE_CONFIG_DIR;
        } else {
            process.env.CLAUDE_CONFIG_DIR = ORIGINAL_CLAUDE_CONFIG_DIR;
        }
    });

    it('removes managed hooks and persists cleanup when status line is unset', async () => {
        const settingsPath = getCodexSettingsPath();
        fs.writeFileSync(settingsPath, JSON.stringify({
            hooks: {
                PreToolUse: [
                    {
                        _tag: 'codexstatusline-managed',
                        matcher: 'Skill',
                        hooks: [{ type: 'command', command: 'old-command --hook' }]
                    },
                    {
                        matcher: 'Other',
                        hooks: [{ type: 'command', command: 'keep-command' }]
                    }
                ],
                UserPromptSubmit: [
                    {
                        _tag: 'codexstatusline-managed',
                        hooks: [{ type: 'command', command: 'old-command --hook' }]
                    }
                ]
            }
        }, null, 2), 'utf-8');

        await syncWidgetHooks(DEFAULT_SETTINGS);

        const saved = JSON.parse(fs.readFileSync(settingsPath, 'utf-8')) as { hooks?: Record<string, unknown[]> };
        expect(saved.hooks).toEqual({
            PreToolUse: [
                {
                    matcher: 'Other',
                    hooks: [{ type: 'command', command: 'keep-command' }]
                }
            ]
        });
    });
});
