/*
 * 模块职责：注册 Markdown 自定义编辑器（Editor / Split / Preview 三态），并提供工作区级视图模式记忆。
 */

import * as vscode from "vscode";
import { MarkdownEditorProvider } from "./customEditor/MarkdownEditorProvider";
import { CUSTOM_EDITOR_VIEW_TYPE } from "./customEditor/protocol";

function isMarkdownDocument(document: vscode.TextDocument): boolean {
  if (document.languageId === "markdown") {
    return true;
  }
  const fileName = (document.fileName || "").toLowerCase();
  return fileName.endsWith(".md") || fileName.endsWith(".markdown");
}

function isActiveDiffTabForUri(uri: vscode.Uri): boolean {
  const activeTab = vscode.window.tabGroups.activeTabGroup.activeTab;
  const input = activeTab?.input;
  if (!(input instanceof vscode.TabInputTextDiff)) {
    return false;
  }
  const key = uri.toString();
  return input.original.toString() === key || input.modified.toString() === key;
}

function isActiveCustomTabForUri(uri: vscode.Uri): boolean {
  const activeTab = vscode.window.tabGroups.activeTabGroup.activeTab;
  const input = activeTab?.input;
  if (!(input instanceof vscode.TabInputCustom)) {
    return false;
  }
  return input.viewType === CUSTOM_EDITOR_VIEW_TYPE && input.uri.toString() === uri.toString();
}

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(MarkdownEditorProvider.register(context));

  const reopening = new Set<string>();

  const maybeAutoOpen = async (editor: vscode.TextEditor | undefined): Promise<void> => {
    if (!editor) {
      return;
    }
    const document = editor.document;
    if (!isMarkdownDocument(document)) {
      return;
    }
    if (document.uri.scheme === "git") {
      return;
    }
    if (isActiveDiffTabForUri(document.uri)) {
      return;
    }
    if (isActiveCustomTabForUri(document.uri)) {
      return;
    }

    const activeTab = vscode.window.tabGroups.activeTabGroup.activeTab;
    if (!activeTab || !(activeTab.input instanceof vscode.TabInputText)) {
      return;
    }
    const uriKey = document.uri.toString();
    if (activeTab.input.uri.toString() !== uriKey) {
      return;
    }
    if (activeTab.isDirty) {
      return;
    }
    if (reopening.has(uriKey)) {
      return;
    }

    reopening.add(uriKey);
    const originTab = activeTab;
    try {
      await vscode.commands.executeCommand("vscode.openWith", document.uri, CUSTOM_EDITOR_VIEW_TYPE, editor.viewColumn);
      if (originTab.input instanceof vscode.TabInputText && originTab.input.uri.toString() === uriKey && !originTab.isDirty) {
        await vscode.window.tabGroups.close(originTab, true);
      }
    } catch {
      // ignore
    } finally {
      setTimeout(() => {
        reopening.delete(uriKey);
      }, 1000);
    }
  };

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      setTimeout(() => {
        void maybeAutoOpen(editor);
      }, 0);
    })
  );

  setTimeout(() => {
    void maybeAutoOpen(vscode.window.activeTextEditor);
  }, 0);
}

export function deactivate(): void {
  // VS Code 会自动清理 subscriptions，这里保持空实现即可
}
