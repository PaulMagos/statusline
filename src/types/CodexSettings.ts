import type { TranscriptThinkingEffort } from '../utils/jsonl-metadata';

export interface CodexSettings {
    effortLevel?: TranscriptThinkingEffort;
    tui?: { status_line?: string[] | null };
    [key: string]: unknown;
}
