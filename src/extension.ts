import * as vscode from 'vscode';

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { outputChannel } from './goStatus';
import { createTestCoverage, generateHtmlCoverage } from './goTest';

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('extension.generateCoverage', async () => {
        try {
            if(vscode.workspace.workspaceFolders !== undefined) {
                const cwd = vscode.workspace.workspaceFolders[0].uri.path;

                outputChannel.clear();

                const tmpPath = path.normalize(path.join(os.tmpdir(), 'go-coverage'));
                outputChannel.appendLine('Generating coverage results...');

                if (!fs.existsSync(`${tmpPath}`)) {
                    fs.mkdirSync(`${tmpPath}`);
                } else {
                    if (fs.existsSync(`${tmpPath}/coverage.html`)) {
                        fs.unlinkSync(`${tmpPath}/coverage.html`);
                    }

                    if (fs.existsSync(`${tmpPath}/c.out`)) {
                        fs.unlinkSync(`${tmpPath}/c.out`);
                    }
                }

                let testFailed = await createTestCoverage('c.out', tmpPath, cwd);

                if (testFailed) {
                    outputChannel.appendLine(testFailed.message.toString());
                    vscode.window.showErrorMessage('Failed to generate test coverage');
                    outputChannel.show();
                    return;
                }

                let coverageFailed = await generateHtmlCoverage(tmpPath, cwd);

                if (coverageFailed) {
                    outputChannel.appendLine(coverageFailed.message.toString());
                    vscode.window.showErrorMessage('Failed to covert test coverage to HTML');
                    outputChannel.show();
                    return;
                }

                outputChannel.appendLine(`Displaying Package Coverage from ${tmpPath}/coverage.html`);
                const coverageHTML = fs.readFileSync(`${tmpPath}/coverage.html`, { encoding: 'utf8' });
                const viewPanel = vscode.window.createWebviewPanel('goCoverage', `Coverage Results`, vscode.ViewColumn.One, { enableScripts: true });

                viewPanel.webview.html = coverageHTML;
            } else {
                vscode.window.showErrorMessage('No workspace detected, open a folder and try again');
            }
        } catch(error) {
            outputChannel.appendLine(error);
            outputChannel.show();
        }
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}