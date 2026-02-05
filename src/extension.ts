/*
 * 模块职责：注册 Markdown 自定义编辑器（Editor / Split / Preview 三态），并提供工作区级视图模式记忆。
 */

import * as vscode from "vscode";
import { MarkdownEditorProvider } from "./customEditor/MarkdownEditorProvider";

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(MarkdownEditorProvider.register(context));
}

export function deactivate(): void {
  // VS Code 会自动清理 subscriptions，这里保持空实现即可
}
