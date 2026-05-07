import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import type { Settings } from '../types/Settings';

const readFile = fs.promises.readFile;
const writeFile = fs.promises.writeFile;
const mkdir = fs.promises.mkdir;

const DEFAULT_CODEX_STATUS_LINE = [
    'model-with-reasoning',
    'current-dir',
    'git-branch',
    'run-state',
    'context-remaining',
    'five-hour-limit',
    'weekly-limit'
];

const CODEX_STATUS_LINE_ITEMS = new Set([
    'app-name',
    'project',
    'project-name',
    'current-dir',
    'activity',
    'status',
    'run-state',
    'thread-title',
    'git-branch',
    'context-remaining',
    'context-used',
    'five-hour-limit',
    'weekly-limit',
    'codex-version',
    'used-tokens',
    'total-input-tokens',
    'total-output-tokens',
    'session-id',
    'fast-mode',
    'model',
    'model-with-reasoning',
    'task-progress',
    'context-window-size'
]);

const WIDGET_TO_CODEX_ITEM = new Map<string, string>([
    ['model', 'model'],
    ['thinking-effort', 'model-with-reasoning'],
    ['current-working-dir', 'current-dir'],
    ['git-branch', 'git-branch'],
    ['git-worktree-branch', 'git-branch'],
    ['context-percentage', 'context-used'],
    ['context-percentage-usable', 'context-used'],
    ['context-window', 'context-window-size'],
    ['context-length', 'context-window-size'],
    ['tokens-input', 'total-input-tokens'],
    ['tokens-output', 'total-output-tokens'],
    ['tokens-total', 'used-tokens'],
    ['block-reset-timer', 'five-hour-limit'],
    ['block-timer', 'five-hour-limit'],
    ['weekly-reset-timer', 'weekly-limit'],
    ['weekly-usage', 'weekly-limit'],
    ['version', 'codex-version'],
    ['session-name', 'thread-title'],
    ['codex-session-id', 'session-id']
]);

export function getCodexConfigDir(): string {
    const envConfigDir = process.env.CODEX_HOME ?? process.env.CLAUDE_CONFIG_DIR;
    if (envConfigDir) {
        return path.resolve(envConfigDir);
    }

    return path.join(os.homedir(), '.codex');
}

export function getCodexConfigPath(): string {
    return path.join(getCodexConfigDir(), 'config.toml');
}

export function getCodexJsonPath(): string {
    return path.join(getCodexConfigDir(), 'auth.json');
}

export function getLegacyCodexJsonPath(): string {
    const envConfigDir = process.env.CODEX_HOME ?? process.env.CLAUDE_CONFIG_DIR;
    if (envConfigDir) {
        return path.join(path.resolve(envConfigDir), '.codex.json');
    }

    return path.join(os.homedir(), '.codex.json');
}

export interface CodexSettingsSnapshot { effortLevel?: string }

export function loadCodexSettingsSync(_options: { logErrors?: boolean } = {}): CodexSettingsSnapshot {
    try {
        const content = fs.readFileSync(getCodexConfigPath(), 'utf-8');
        const match = /^model_reasoning_effort\s*=\s*"([^"]+)"/m.exec(content);
        return match ? { effortLevel: match[1] } : {};
    } catch {
        return {};
    }
}

export function getCodexSettingsPath(): string {
    return getCodexConfigPath();
}

async function backupCodexConfig(suffix = '.bak'): Promise<string | null> {
    const configPath = getCodexConfigPath();
    const backupPath = configPath + suffix;
    try {
        if (fs.existsSync(configPath)) {
            const content = await readFile(configPath, 'utf-8');
            await writeFile(backupPath, content, 'utf-8');
            return backupPath;
        }
    } catch (error) {
        console.error('Failed to backup Codex config:', error);
    }

    return null;
}

function parseTomlStringArray(value: string): string[] | null {
    const trimmed = value.trim();
    if (trimmed === 'null') {
        return null;
    }

    try {
        return JSON.parse(trimmed) as string[];
    } catch {
        return [];
    }
}

function serializeTomlStringArray(items: string[] | null): string {
    if (items === null) {
        return 'null';
    }

    return `[${items.map(item => JSON.stringify(item)).join(', ')}]`;
}

function findTuiStatusLine(content: string): string[] | null {
    const lines = content.split(/\r?\n/);
    let inTui = false;

    for (const line of lines) {
        const trimmed = line.trim();
        const section = /^\[([^\]]+)]$/.exec(trimmed);
        if (section) {
            inTui = section[1] === 'tui';
            continue;
        }

        if (!inTui) {
            continue;
        }

        const match = /^status_line\s*=\s*(.+)$/.exec(trimmed);
        if (match) {
            return parseTomlStringArray(match[1] ?? '');
        }
    }

    return null;
}

function upsertTuiStatusLine(content: string, statusLine: string[] | null): string {
    const lines = content.length > 0 ? content.split(/\r?\n/) : [];
    const statusLineEntry = `status_line = ${serializeTomlStringArray(statusLine)}`;
    let tuiStart = -1;
    let tuiEnd = lines.length;

    for (let i = 0; i < lines.length; i++) {
        const section = /^\[([^\]]+)]$/.exec(lines[i]?.trim() ?? '');
        if (!section) {
            continue;
        }

        if (section[1] === 'tui') {
            tuiStart = i;
            continue;
        }

        if (tuiStart !== -1 && i > tuiStart) {
            tuiEnd = i;
            break;
        }
    }

    if (tuiStart === -1) {
        const prefix = content.trim().length > 0 ? `${content.replace(/\s+$/, '')}\n\n` : '';
        return `${prefix}[tui]\n${statusLineEntry}\n`;
    }

    for (let i = tuiStart + 1; i < tuiEnd; i++) {
        if (/^\s*status_line\s*=/.test(lines[i] ?? '')) {
            lines[i] = statusLineEntry;
            return `${lines.join('\n').replace(/\s+$/, '')}\n`;
        }
    }

    lines.splice(tuiEnd, 0, statusLineEntry);
    return `${lines.join('\n').replace(/\s+$/, '')}\n`;
}

export function mapSettingsToCodexStatusLine(settings: Settings): string[] {
    const mapped: string[] = [];
    const seen = new Set<string>();

    for (const line of settings.lines) {
        for (const item of line) {
            const codexItem = WIDGET_TO_CODEX_ITEM.get(item.type);
            if (!codexItem || !CODEX_STATUS_LINE_ITEMS.has(codexItem) || seen.has(codexItem)) {
                continue;
            }

            seen.add(codexItem);
            mapped.push(codexItem);
        }
    }

    return mapped.length > 0 ? mapped : [...DEFAULT_CODEX_STATUS_LINE];
}

export async function getExistingStatusLine(): Promise<string | null> {
    try {
        const content = await readFile(getCodexConfigPath(), 'utf-8');
        const items = findTuiStatusLine(content);
        return items ? items.join(', ') : null;
    } catch {
        return null;
    }
}

export function isCodexCodeVersionAtLeast(_minVersion: string): boolean {
    return true;
}

export function isBunxAvailable(): boolean {
    return false;
}

export function isKnownCommand(command: string): boolean {
    return command.split(',').some(item => CODEX_STATUS_LINE_ITEMS.has(item.trim()));
}

export async function isInstalled(): Promise<boolean> {
    return (await getExistingStatusLine()) !== null;
}

export async function installStatusLine(settings: Settings): Promise<void> {
    const configPath = getCodexConfigPath();
    await backupCodexConfig('.orig');
    await mkdir(path.dirname(configPath), { recursive: true });

    let content: string;
    try {
        content = await readFile(configPath, 'utf-8');
    } catch {
        content = '';
    }

    const nextContent = upsertTuiStatusLine(content, mapSettingsToCodexStatusLine(settings));
    await writeFile(configPath, nextContent, 'utf-8');
}

export async function uninstallStatusLine(): Promise<void> {
    const configPath = getCodexConfigPath();
    let content: string;
    try {
        content = await readFile(configPath, 'utf-8');
    } catch {
        return;
    }

    await backupCodexConfig('.orig');
    await writeFile(configPath, upsertTuiStatusLine(content, null), 'utf-8');
}
