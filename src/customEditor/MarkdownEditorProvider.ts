/*
 * 模块职责：实现 Markdown CustomTextEditorProvider，将 `.md` 以 Webview 方式打开，并提供 Editor/Split/Preview 三态切换。
 */

import * as path from "path";
import * as vscode from "vscode";
import { renderMarkdownToHtml } from "./markdownRenderer";
import {
  CUSTOM_EDITOR_VIEW_TYPE,
  ExtensionToWebviewMessage,
  ViewMode,
  WebviewToExtensionMessage,
  WORKSPACE_VIEW_MODE_STATE_KEY,
  isWebviewToExtensionMessage,
  isViewMode
} from "./protocol";
import { getWebviewHtml } from "./webviewHtml";

function getDefaultViewMode(): ViewMode {
  return "split";
}

function asViewMode(value: unknown): ViewMode {
  return isViewMode(value) ? value : getDefaultViewMode();
}

export class MarkdownEditorProvider implements vscode.CustomTextEditorProvider {
  private readonly applyingEdits = new Set<string>();
  private readonly openPanels = new Set<vscode.WebviewPanel>();
  private readonly renderCache = new Map<string, { text: string; html: string }>();
  private static readonly MAX_TEXT_LENGTH = 5_000_000;

  public constructor(private readonly context: vscode.ExtensionContext) {}

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    const provider = new MarkdownEditorProvider(context);
    return vscode.window.registerCustomEditorProvider(CUSTOM_EDITOR_VIEW_TYPE, provider, {
      webviewOptions: {
        retainContextWhenHidden: true
      },
      supportsMultipleEditorsPerDocument: false
    });
  }

  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    const webview = webviewPanel.webview;
    webview.options = {
      enableScripts: true,
      localResourceRoots: this.getLocalResourceRoots(document)
    };

    webview.html = getWebviewHtml(webview, this.context.extensionUri);
    webviewPanel.title = path.basename(document.uri.fsPath || document.uri.path || "Markdown");
    this.openPanels.add(webviewPanel);

    const postUpdate = async (): Promise<void> => {
      const msg: ExtensionToWebviewMessage = {
        type: "update",
        text: document.getText(),
        html: this.render(document, webview),
        version: document.version
      };
      await webview.postMessage(msg);
    };

    const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(async (e) => {
      if (e.document.uri.toString() !== document.uri.toString()) {
        return;
      }
      const key = document.uri.toString();
      if (this.applyingEdits.has(key)) {
        return;
      }
      await postUpdate();
    });

    const changeViewStateSubscription = webviewPanel.onDidChangeViewState(async () => {
      // 当 tab 重新可见时，确保预览与文本与文档一致
      if (webviewPanel.visible) {
        await postUpdate();
      }
    });

    webview.onDidReceiveMessage(async (raw) => {
      if (!isWebviewToExtensionMessage(raw)) {
        return;
      }
      await this.onMessage(raw, document, webviewPanel);
    });

    webviewPanel.onDidDispose(() => {
      this.openPanels.delete(webviewPanel);
      changeDocumentSubscription.dispose();
      changeViewStateSubscription.dispose();
    });

    // init 由 webview 主动发起 ready 后再发送，避免消息在 webview 尚未完成加载时丢失
  }

  private getLocalResourceRoots(document: vscode.TextDocument): vscode.Uri[] {
    const roots: vscode.Uri[] = [this.context.extensionUri];

    // 支持文档目录下的相对路径图片（仅 file scheme）
    if (document.uri.scheme === "file") {
      try {
        roots.push(vscode.Uri.file(path.dirname(document.uri.fsPath)));
      } catch {
        // ignore
      }
    }

    // 允许访问工作区根（便于引用 workspace 内图片）
    for (const folder of vscode.workspace.workspaceFolders ?? []) {
      roots.push(folder.uri);
    }

    return roots;
  }

  private render(document: vscode.TextDocument, webview: vscode.Webview): string {
    const key = document.uri.toString();
    const text = document.getText();
    const cached = this.renderCache.get(key);
    if (cached && cached.text === text) {
      return cached.html;
    }
    const html = renderMarkdownToHtml(text, { webview, documentUri: document.uri });
    this.renderCache.set(key, { text, html });
    return html;
  }

  private async onMessage(msg: WebviewToExtensionMessage, document: vscode.TextDocument, webviewPanel: vscode.WebviewPanel): Promise<void> {
    switch (msg.type) {
      case "ready": {
        const viewMode = asViewMode(this.context.workspaceState.get(WORKSPACE_VIEW_MODE_STATE_KEY));
        const init: ExtensionToWebviewMessage = {
          type: "init",
          text: document.getText(),
          html: this.render(document, webviewPanel.webview),
          version: document.version,
          viewMode
        };
        await webviewPanel.webview.postMessage(init);
        return;
      }
      case "edit": {
        if (msg.text.length > MarkdownEditorProvider.MAX_TEXT_LENGTH) {
          const err: ExtensionToWebviewMessage = {
            type: "error",
            message: `文本过大（>${MarkdownEditorProvider.MAX_TEXT_LENGTH} 字符），已忽略本次编辑同步以避免卡顿。建议拆分文件或暂时用 Text Editor 编辑。`
          };
          await webviewPanel.webview.postMessage(err);
          return;
        }
        await this.applyEdit(document, msg.text);
        // 编辑来自 webview：只需要更新预览（文本已在 webview 本地）
        const update: ExtensionToWebviewMessage = {
          type: "update",
          text: document.getText(),
          html: this.render(document, webviewPanel.webview),
          version: document.version
        };
        await webviewPanel.webview.postMessage(update);
        return;
      }
      case "setViewMode": {
        await this.context.workspaceState.update(WORKSPACE_VIEW_MODE_STATE_KEY, msg.viewMode);
        const broadcast: ExtensionToWebviewMessage = { type: "setViewMode", viewMode: msg.viewMode };
        // 按工作区记忆：对当前窗口内所有打开的 md custom editor 广播
        await Promise.allSettled([...this.openPanels].map((p) => p.webview.postMessage(broadcast)));
        return;
      }
      case "reopenWith": {
        await vscode.commands.executeCommand("workbench.action.reopenWithEditor");
        return;
      }
      case "openExternal": {
        const href = (msg.href ?? "").trim();
        if (!href) {
          return;
        }
        // 仅允许打开 http/https，避免意外触发 vscode 命令 URI 等
        if (/^https?:\/\//i.test(href)) {
          await vscode.env.openExternal(vscode.Uri.parse(href));
        }
        return;
      }
      default:
        return;
    }
  }

  private async applyEdit(document: vscode.TextDocument, nextText: string): Promise<void> {
    const currentText = document.getText();
    if (nextText === currentText) {
      return;
    }

    const key = document.uri.toString();
    this.applyingEdits.add(key);
    try {
      const edit = new vscode.WorkspaceEdit();
      const fullRange = new vscode.Range(0, 0, document.lineCount, 0);
      edit.replace(document.uri, fullRange, nextText);
      await vscode.workspace.applyEdit(edit);
    } finally {
      this.applyingEdits.delete(key);
    }
  }
}
