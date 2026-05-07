import {
    Box,
    Text,
    useInput
} from 'ink';
import React from 'react';

import { getCodexSettingsPath } from '../../utils/codex-settings';

import { List } from './List';

export interface InstallMenuProps {
    existingStatusLine: string | null;
    onInstall: () => void;
    onCancel: () => void;
    initialSelection?: number;
}

export const InstallMenu: React.FC<InstallMenuProps> = ({
    existingStatusLine,
    onInstall,
    onCancel,
    initialSelection = 0
}) => {
    useInput((_, key) => {
        if (key.escape) {
            onCancel();
        }
    });

    function onSelect(value: string) {
        switch (value) {
            case 'install':
                onInstall();
                break;
            case 'back':
                onCancel();
                break;
        }
    }

    const listItems = [
        {
            label: 'Write Codex status line',
            value: 'install'
        }
    ];

    return (
        <Box flexDirection='column'>
            <Text bold>Configure Codex native footer</Text>

            {existingStatusLine && (
                <Box marginBottom={1}>
                    <Text color='yellow'>
                        ⚠ Current status line: "
                        {existingStatusLine}
                        "
                    </Text>
                </Box>
            )}

            <Box>
                <Text dimColor>Map supported widgets to plain Codex built-in footer items.</Text>
            </Box>

            <Box marginTop={1}>
                <Text dimColor>
                    Codex will not render preview colors, labels, separators, or powerline styling.
                </Text>
            </Box>

            <List
                color='blue'
                marginTop={1}
                items={listItems}
                onSelect={(line) => {
                    if (line === 'back') {
                        onCancel();
                        return;
                    }

                    onSelect(line);
                }}
                initialSelection={initialSelection}
                showBackButton={true}
            />

            <Box marginTop={2}>
                <Text dimColor>
                    The generated `tui.status_line` array will be written to
                    {' '}
                    {getCodexSettingsPath()}
                </Text>
            </Box>

            <Box marginTop={1}>
                <Text dimColor>Press Enter to select, ESC to cancel</Text>
            </Box>
        </Box>
    );
};
