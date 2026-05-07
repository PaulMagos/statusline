import { getExistingStatusLine } from '../utils/codex-settings';

export interface CodexStatusLineState { existingStatusLine: string | null }

export async function loadCodexStatusLineState(): Promise<CodexStatusLineState> {
    return { existingStatusLine: await getExistingStatusLine() };
}
