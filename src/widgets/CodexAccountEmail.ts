import * as fs from 'fs';

import type { RenderContext } from '../types/RenderContext';
import type { Settings } from '../types/Settings';
import type {
    Widget,
    WidgetEditorDisplay,
    WidgetItem
} from '../types/Widget';
import {
    getCodexJsonPath,
    getLegacyCodexJsonPath
} from '../utils/codex-settings';

interface CodexJson { oauthAccount?: { emailAddress?: string } }

export class CodexAccountEmailWidget implements Widget {
    getDefaultColor(): string { return 'blue'; }
    getDescription(): string { return 'Displays the email of the currently logged-in Codex account'; }
    getDisplayName(): string { return 'Codex Account Email'; }
    getCategory(): string { return 'Session'; }
    getEditorDisplay(item: WidgetItem): WidgetEditorDisplay {
        return { displayText: this.getDisplayName() };
    }

    render(item: WidgetItem, context: RenderContext, settings: Settings): string | null {
        if (context.isPreview) {
            return item.rawValue ? 'you@example.com' : 'Account: you@example.com';
        }

        for (const filePath of [getCodexJsonPath(), getLegacyCodexJsonPath()]) {
            try {
                const content = fs.readFileSync(filePath, 'utf-8');
                const data = JSON.parse(content) as CodexJson;
                const email = data.oauthAccount?.emailAddress;

                if (typeof email !== 'string' || email.length === 0) {
                    continue;
                }

                return item.rawValue ? email : `Account: ${email}`;
            } catch {
                continue;
            }
        }

        return null;
    }

    supportsRawValue(): boolean { return true; }
    supportsColors(item: WidgetItem): boolean { return true; }
}
