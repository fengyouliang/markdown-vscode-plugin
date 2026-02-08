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
  private readonly applyingEdits = new WeakSet<vscode.WebviewPanel>();
  private readonly openPanels = new Set<vscode.WebviewPanel>();
  private readonly renderCache = new Map<string, { version: number; html: string }>();
  private readonly postedVersionByPanel = new WeakMap<vscode.WebviewPanel, number>();
  private readonly readyPanels = new WeakSet<vscode.WebviewPanel>();
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
    const key = document.uri.toString();
    this.readyPanels.delete(webviewPanel);
    webview.options = {
      enableScripts: true,
      localResourceRoots: this.getLocalResourceRoots(document)
    };

    webview.html = getWebviewHtml(webview, this.context.extensionUri);
    webviewPanel.title = path.basename(document.uri.fsPath || document.uri.path || "Markdown");
    this.openPanels.add(webviewPanel);

    let disposed = false;
    let dirtyWhileHidden = false;
    let updateTimer: NodeJS.Timeout | undefined;
    let pendingUpdateSeq = 0;
    let handledUpdateSeq = 0;
    let updateRunning = false;

    const postUpdate = async (): Promise<void> => {
      if (disposed) {
        return;
      }
      if (!this.readyPanels.has(webviewPanel)) {
        return;
      }
      if (!webviewPanel.visible) {
        dirtyWhileHidden = true;
        return;
      }
      const version = document.version;
      if (this.postedVersionByPanel.get(webviewPanel) === version) {
        return;
      }
      const text = document.getText();
      const msg: ExtensionToWebviewMessage = {
        type: "update",
        text,
        html: this.render(document, version, text, webview),
        version
      };
      await webview.postMessage(msg);
      this.postedVersionByPanel.set(webviewPanel, version);
    };

    const runUpdates = async (): Promise<void> => {
      if (disposed || updateRunning) {
        return;
      }
      updateRunning = true;
      try {
        while (!disposed && handledUpdateSeq < pendingUpdateSeq) {
          handledUpdateSeq = pendingUpdateSeq;
          await postUpdate();
        }
      } finally {
        updateRunning = false;
        if (!disposed && handledUpdateSeq < pendingUpdateSeq) {
          void runUpdates();
        }
      }
    };

    const scheduleUpdate = (delayMs: number): void => {
      pendingUpdateSeq++;
      if (disposed) {
        return;
      }
      if (updateRunning) {
        return;
      }
      if (updateTimer) {
        clearTimeout(updateTimer);
      }
      updateTimer = setTimeout(() => {
        updateTimer = undefined;
        void runUpdates();
      }, delayMs);
    };

    const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(async (e) => {
      if (e.document.uri.toString() !== document.uri.toString()) {
        return;
      }
      if (this.applyingEdits.has(webviewPanel)) {
        return;
      }
      scheduleUpdate(120);
    });

    const changeViewStateSubscription = webviewPanel.onDidChangeViewState(async () => {
      // 当 tab 重新可见时，确保预览与文本与文档一致
      if (webviewPanel.visible) {
        if (dirtyWhileHidden) {
          dirtyWhileHidden = false;
          scheduleUpdate(0);
          return;
        }
        scheduleUpdate(0);
      }
    });

    webview.onDidReceiveMessage(async (raw) => {
      if (!isWebviewToExtensionMessage(raw)) {
        return;
      }
      await this.onMessage(raw, document, webviewPanel);
    });

    webviewPanel.onDidDispose(() => {
      disposed = true;
      this.openPanels.delete(webviewPanel);
      this.readyPanels.delete(webviewPanel);
      this.applyingEdits.delete(webviewPanel);
      this.renderCache.delete(key);
      this.postedVersionByPanel.delete(webviewPanel);
      changeDocumentSubscription.dispose();
      changeViewStateSubscription.dispose();
      if (updateTimer) {
        clearTimeout(updateTimer);
        updateTimer = undefined;
      }
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

  private render(document: vscode.TextDocument, version: number, text: string, webview: vscode.Webview): string {
    const key = document.uri.toString();
    const cached = this.renderCache.get(key);
    if (cached && cached.version === version) {
      return cached.html;
    }
    const html = renderMarkdownToHtml(text, { webview, documentUri: document.uri });
    this.renderCache.set(key, { version, html });
    return html;
  }

  private async onMessage(msg: WebviewToExtensionMessage, document: vscode.TextDocument, webviewPanel: vscode.WebviewPanel): Promise<void> {
    switch (msg.type) {
      case "ready": {
        const viewMode = asViewMode(this.context.workspaceState.get(WORKSPACE_VIEW_MODE_STATE_KEY));
        const key = document.uri.toString();
        const version = document.version;
        const text = document.getText();
        const cached = this.renderCache.get(key);

        // Fast init：先尽快把文本回填到 Webview，避免“首屏空白”；预览 HTML 在后台补发 update
        if (!cached || cached.version !== version) {
          const init: ExtensionToWebviewMessage = {
            type: "init",
            text,
            html: `<p style="opacity:0.7">预览渲染中…</p>`,
            version: 0,
            viewMode
          };
          await webviewPanel.webview.postMessage(init);
          this.readyPanels.add(webviewPanel);
          this.postedVersionByPanel.set(webviewPanel, 0);

          setTimeout(() => {
            void (async () => {
              if (!this.readyPanels.has(webviewPanel)) {
                return;
              }
              const snapshotVersion = document.version;
              const snapshotText = document.getText();
              const html = this.render(document, snapshotVersion, snapshotText, webviewPanel.webview);
              const update: ExtensionToWebviewMessage = {
                type: "update",
                text: snapshotText,
                html,
                version: snapshotVersion
              };
              await webviewPanel.webview.postMessage(update);
              this.postedVersionByPanel.set(webviewPanel, snapshotVersion);
            })().catch(() => {
              // ignore
            });
          }, 0);
          return;
        }

        // Cache hit：直接用缓存 HTML 初始化，缩短首屏等待
        const init: ExtensionToWebviewMessage = {
          type: "init",
          text,
          html: cached.html,
          version,
          viewMode
        };
        await webviewPanel.webview.postMessage(init);
        this.readyPanels.add(webviewPanel);
        this.postedVersionByPanel.set(webviewPanel, version);
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
        const appliedVersion = await this.applyEdit(document, msg.text, webviewPanel);
        if (appliedVersion === undefined) {
          return;
        }
        // 编辑来自 webview：通常可以直接复用 msg.text，避免额外 getText；若期间版本发生变化则回退到文档快照
        const currentVersion = document.version;
        const version = currentVersion === appliedVersion ? appliedVersion : currentVersion;
        const text = currentVersion === appliedVersion ? msg.text : document.getText();
        const update: ExtensionToWebviewMessage = {
          type: "update",
          text,
          html: this.render(document, version, text, webviewPanel.webview),
          version
        };
        await webviewPanel.webview.postMessage(update);
        this.postedVersionByPanel.set(webviewPanel, version);
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
      case "copyCode": {
        const text = (msg.text ?? "").toString();
        if (!text) {
          vscode.window.setStatusBarMessage("复制失败：内容为空", 1500);
          return;
        }
        try {
          await vscode.env.clipboard.writeText(text);
          vscode.window.setStatusBarMessage("已复制到剪贴板", 1500);
        } catch {
          vscode.window.setStatusBarMessage("复制到剪贴板失败", 2000);
        }
        return;
      }
      default:
        return;
    }
  }

  private async applyEdit(
    document: vscode.TextDocument,
    nextText: string,
    originPanel: vscode.WebviewPanel
  ): Promise<number | undefined> {
    const currentText = document.getText();
    if (nextText === currentText) {
      return undefined;
    }

    this.applyingEdits.add(originPanel);
    try {
      const edit = new vscode.WorkspaceEdit();
      const replacement = this.computeMinimalReplacement(document, currentText, nextText);
      edit.replace(document.uri, replacement.range, replacement.text);
      const applied = await vscode.workspace.applyEdit(edit);
      if (!applied) {
        return undefined;
      }
      return document.version;
    } finally {
      this.applyingEdits.delete(originPanel);
    }
  }

  private computeMinimalReplacement(
    document: vscode.TextDocument,
    currentText: string,
    nextText: string
  ): { range: vscode.Range; text: string } {
    let start = 0;
    const currentLen = currentText.length;
    const nextLen = nextText.length;
    const minLen = Math.min(currentLen, nextLen);
    while (start < minLen && currentText.charCodeAt(start) === nextText.charCodeAt(start)) {
      start++;
    }

    let endCurrent = currentLen;
    let endNext = nextLen;
    while (
      endCurrent > start &&
      endNext > start &&
      currentText.charCodeAt(endCurrent - 1) === nextText.charCodeAt(endNext - 1)
    ) {
      endCurrent--;
      endNext--;
    }

    const range = new vscode.Range(document.positionAt(start), document.positionAt(endCurrent));
    const text = nextText.slice(start, endNext);
    return { range, text };
  }
}
