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

import { getCodexConfigPath } from '../../utils/codex-settings';
import { loadCodexStatusLineState } from '../codex-status';

const ORIGINAL_CODEX_HOME = process.env.CODEX_HOME;
let testCodexConfigDir = '';

beforeEach(() => {
    testCodexConfigDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codexstatusline-codex-status-'));
    process.env.CODEX_HOME = testCodexConfigDir;
});

afterEach(() => {
    if (testCodexConfigDir) {
        fs.rmSync(testCodexConfigDir, { recursive: true, force: true });
    }
});

afterAll(() => {
    if (ORIGINAL_CODEX_HOME === undefined) {
        delete process.env.CODEX_HOME;
    } else {
        process.env.CODEX_HOME = ORIGINAL_CODEX_HOME;
    }
});

describe('loadCodexStatusLineState', () => {
    it('loads the configured Codex status line items', async () => {
        fs.writeFileSync(getCodexConfigPath(), '[tui]\nstatus_line = ["model", "git-branch"]\n');

        await expect(loadCodexStatusLineState()).resolves.toEqual({ existingStatusLine: 'model, git-branch' });
    });

    it('returns null when Codex has no status line configured', async () => {
        await expect(loadCodexStatusLineState()).resolves.toEqual({ existingStatusLine: null });
    });
});
