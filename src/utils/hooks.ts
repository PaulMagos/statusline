import * as fs from 'fs';
import * as path from 'path';

import type { Settings } from '../types/Settings';

import { getCodexConfigDir } from './codex-settings';

export interface WidgetHookDef {
    event: string;
    matcher?: string;
}

interface HookEntry { _tag?: string }

function stripManagedHooks(hooks: Record<string, HookEntry[]>): void {
    for (const event of Object.keys(hooks)) {
        hooks[event] = (hooks[event] ?? []).filter(entry => entry._tag !== 'codexstatusline-managed');
        if (hooks[event].length === 0) {
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
            delete hooks[event];
        }
    }
}

export async function syncWidgetHooks(_settings: Settings): Promise<void> {
    const legacySettingsPath = path.join(getCodexConfigDir(), 'settings.json');

    try {
        const content = await fs.promises.readFile(legacySettingsPath, 'utf-8');
        const parsed = JSON.parse(content) as { hooks?: Record<string, HookEntry[]> };
        if (parsed.hooks) {
            stripManagedHooks(parsed.hooks);
            if (Object.keys(parsed.hooks).length === 0) {
                delete parsed.hooks;
            }
            await fs.promises.writeFile(legacySettingsPath, JSON.stringify(parsed, null, 2), 'utf-8');
        }
    } catch {
        return;
    }
}

export function removeManagedHooks(): Promise<void> {
    return syncWidgetHooks({ lines: [] } as unknown as Settings);
}
