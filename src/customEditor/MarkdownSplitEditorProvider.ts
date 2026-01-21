/*
 * 模块职责：为 Markdown 文档提供自定义编辑器（同页 Split 预览），实现 JetBrains 风格的“源码 + 预览”体验。
 *
 * 设计目标：
 * - Explorer 点击 .md 默认进入自定义编辑器
 * - 在同一页面内支持 Editor / Split / Preview 三态切换
 * - 文档内容与预览实时同步（可配置防抖与开关）
 */

import * as path from "path";
import * as vscode from "vscode";
import MarkdownIt from "markdown-it";

type ViewMode = "editor" | "split" | "preview";

interface CustomEditorConfig {
  defaultView: ViewMode;
  livePreview: boolean;
  debounceMs: number;
}

const CONFIG_SECTION = "mdAutoPreview";

function getCustomEditorConfig(): CustomEditorConfig {
  const cfg = vscode.workspace.getConfiguration(CONFIG_SECTION);
  const rawView = cfg.get<string>("customEditor.defaultView", "split");
  const defaultView: ViewMode = rawView === "editor" || rawView === "preview" || rawView === "split" ? rawView : "split";
  const debounceMs = cfg.get<number>("customEditor.debounceMs", 150);

  return {
    defaultView,
    livePreview: cfg.get<boolean>("customEditor.livePreview", true),
    debounceMs: Number.isFinite(debounceMs) ? Math.max(0, debounceMs) : 150
  };
}

function getNonce(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function getDocumentDirUri(uri: vscode.Uri): vscode.Uri {
  const dir = path.posix.dirname(uri.path);
  return uri.with({ path: dir });
}

function looksLikeAbsolutePath(p: string): boolean {
  if (p.startsWith("/")) {
    return true;
  }
  // Windows 盘符路径：C:\...
  return /^[a-zA-Z]:[\\/]/.test(p);
}

function isProbablyExternalLink(href: string): boolean {
  return /^(https?:|mailto:)/i.test(href);
}

export class MarkdownSplitEditorProvider implements vscode.CustomTextEditorProvider {
  public static readonly viewType = "mdAutoPreview.markdownSplit";

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    const provider = new MarkdownSplitEditorProvider(context);
    return vscode.window.registerCustomEditorProvider(MarkdownSplitEditorProvider.viewType, provider, {
      supportsMultipleEditorsPerDocument: false,
      webviewOptions: {
        retainContextWhenHidden: true
      }
    });
  }

  private readonly markdownIt: MarkdownIt;
  private readonly panelViewMode = new WeakMap<vscode.WebviewPanel, ViewMode>();
  private readonly panelReady = new WeakSet<vscode.WebviewPanel>();

  constructor(private readonly context: vscode.ExtensionContext) {
    this.markdownIt = new MarkdownIt({
      html: false,
      linkify: true,
      typographer: true
    });

    const defaultValidate = this.markdownIt.validateLink;
    this.markdownIt.validateLink = (link: string): boolean => {
      const trimmed = link.trim().toLowerCase();
      if (trimmed.startsWith("javascript:")) {
        return false;
      }
      return defaultValidate(link);
    };
  }

  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    const cfg = getCustomEditorConfig();
    this.panelViewMode.set(webviewPanel, cfg.defaultView);

    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: this.getLocalResourceRoots(document.uri)
    };

    webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

    const updateWebview = async (forcePreviewUpdate: boolean = false): Promise<void> => {
      if (!this.panelReady.has(webviewPanel)) {
        return;
      }

      const latestCfg = getCustomEditorConfig();
      const text = document.getText();
      const view = this.panelViewMode.get(webviewPanel) ?? latestCfg.defaultView;
      const html =
        latestCfg.livePreview || forcePreviewUpdate ? this.renderMarkdownToHtml(text, document.uri, webviewPanel.webview) : "";

      await webviewPanel.webview.postMessage({
        type: "update",
        text,
        html,
        view,
        livePreview: latestCfg.livePreview,
        debounceMs: latestCfg.debounceMs,
        forcePreviewUpdate
      });
    };

    const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.uri.toString() !== document.uri.toString()) {
        return;
      }
      void updateWebview();
    });

    webviewPanel.onDidDispose(() => {
      changeDocumentSubscription.dispose();
    });

    webviewPanel.webview.onDidReceiveMessage(async (message: unknown) => {
      if (!message || typeof message !== "object") {
        return;
      }
      const msg = message as { type?: unknown; [k: string]: unknown };
      const type = typeof msg.type === "string" ? msg.type : "";

      switch (type) {
        case "ready": {
          const viewFromWebview = msg.view;
          if (viewFromWebview === "editor" || viewFromWebview === "split" || viewFromWebview === "preview") {
            this.panelViewMode.set(webviewPanel, viewFromWebview);
          }
          this.panelReady.add(webviewPanel);
          await updateWebview(true);
          break;
        }
        case "edit": {
          const nextText = typeof msg.text === "string" ? msg.text : "";
          if (nextText === document.getText()) {
            return;
          }
          await this.applyDocumentEdits(document, nextText);
          break;
        }
        case "setView": {
          const nextView = msg.view;
          if (nextView === "editor" || nextView === "split" || nextView === "preview") {
            this.panelViewMode.set(webviewPanel, nextView);
          }
          break;
        }
        case "openLink": {
          const href = typeof msg.href === "string" ? msg.href : "";
          await this.openLinkFromWebview(document.uri, href);
          break;
        }
        case "refreshPreview": {
          // 当 livePreview=false 时，Webview 允许手动刷新预览
          await updateWebview(true);
          break;
        }
        default:
          break;
      }
    });
  }

  private getLocalResourceRoots(documentUri: vscode.Uri): vscode.Uri[] {
    const roots: vscode.Uri[] = [this.context.extensionUri];

    try {
      roots.push(getDocumentDirUri(documentUri));
    } catch {
      // ignore
    }

    for (const folder of vscode.workspace.workspaceFolders ?? []) {
      roots.push(folder.uri);
    }

    return roots;
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
    const nonce = getNonce();

    const csp = [
      `default-src 'none'`,
      `img-src ${webview.cspSource} https: data:`,
      `style-src ${webview.cspSource} 'unsafe-inline'`,
      `script-src ${webview.cspSource} 'nonce-${nonce}'`
    ].join("; ");

    return /* html */ `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Markdown Split Preview</title>
  <style>
    :root {
      --gap: 0px;
      --border: 1px solid var(--vscode-editorGroup-border);
    }
    body {
      padding: 0;
      margin: 0;
      color: var(--vscode-editor-foreground);
      background: var(--vscode-editor-background);
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      line-height: 1.5;
    }
    .toolbar {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 8px;
      border-bottom: var(--border);
      background: var(--vscode-editorGroupHeader-tabsBackground);
    }
    .toolbar .seg {
      display: inline-flex;
      border: var(--border);
      border-radius: 6px;
      overflow: hidden;
    }
    .toolbar button {
      appearance: none;
      border: none;
      background: transparent;
      color: var(--vscode-foreground);
      padding: 4px 10px;
      cursor: pointer;
      font-size: 12px;
    }
    .toolbar button[aria-pressed="true"] {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }
    .toolbar .spacer {
      flex: 1;
    }
    .toolbar .hint {
      opacity: 0.8;
      font-size: 12px;
    }
    .container {
      display: flex;
      width: 100vw;
      height: calc(100vh - 40px);
    }
    .pane {
      min-width: 0;
      height: 100%;
      overflow: auto;
    }
    .editor-pane {
      flex: 1;
      border-right: var(--border);
    }
    .preview-pane {
      flex: 1;
    }
    textarea {
      width: 100%;
      height: 100%;
      box-sizing: border-box;
      border: none;
      outline: none;
      resize: none;
      padding: 12px;
      background: var(--vscode-editor-background);
      color: var(--vscode-editor-foreground);
      font-family: var(--vscode-editor-font-family, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace);
      font-size: var(--vscode-editor-font-size, 13px);
      line-height: 1.6;
    }
    #preview {
      padding: 12px 14px 24px;
    }

    /* 视图控制 */
    body.view-editor .preview-pane { display: none; }
    body.view-preview .editor-pane { display: none; }
    body.view-preview .preview-pane { flex: 1; }
    body.view-editor .editor-pane { flex: 1; border-right: none; }

    /* Markdown 基础样式（保持轻量，后续可按需增强） */
    #preview h1, #preview h2, #preview h3 { line-height: 1.25; }
    #preview code { font-family: var(--vscode-editor-font-family, monospace); }
    #preview pre {
      padding: 10px 12px;
      overflow: auto;
      border-radius: 6px;
      background: var(--vscode-textBlockQuote-background, rgba(127,127,127,0.1));
    }
    #preview a { color: var(--vscode-textLink-foreground); }
    #preview blockquote {
      margin: 0;
      padding: 0 0 0 12px;
      border-left: 3px solid var(--vscode-textBlockQuote-border, rgba(127,127,127,0.35));
      color: var(--vscode-textBlockQuote-foreground);
    }
    #preview img { max-width: 100%; }
    #preview table {
      border-collapse: collapse;
      width: 100%;
    }
    #preview table th, #preview table td {
      border: 1px solid var(--vscode-editorGroup-border);
      padding: 6px 8px;
    }
  </style>
</head>
<body class="view-split">
  <div class="toolbar">
    <div class="seg" role="group" aria-label="Markdown View Mode">
      <button id="btn-editor" type="button" data-view="editor" aria-pressed="false">Editor</button>
      <button id="btn-split" type="button" data-view="split" aria-pressed="true">Split</button>
      <button id="btn-preview" type="button" data-view="preview" aria-pressed="false">Preview</button>
    </div>
    <span class="spacer"></span>
    <button id="btn-refresh" type="button" style="display:none">Refresh</button>
    <span id="hint" class="hint"></span>
  </div>
  <div class="container">
    <div class="pane editor-pane">
      <textarea id="editor" spellcheck="false"></textarea>
    </div>
    <div class="pane preview-pane">
      <div id="preview"></div>
    </div>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();

    const editor = document.getElementById("editor");
    const preview = document.getElementById("preview");
    const hint = document.getElementById("hint");
    const btnRefresh = document.getElementById("btn-refresh");
    const buttons = Array.from(document.querySelectorAll("button[data-view]"));

    /** @type {"editor"|"split"|"preview"} */
    let view = "split";
    let livePreview = true;
    let debounceMs = 150;

    function applyView(nextView, notifyExtension) {
      view = nextView;
      document.body.classList.remove("view-editor", "view-split", "view-preview");
      document.body.classList.add("view-" + nextView);

      for (const btn of buttons) {
        btn.setAttribute("aria-pressed", btn.dataset.view === nextView ? "true" : "false");
      }

      vscode.setState({ view });
      if (notifyExtension) {
        vscode.postMessage({ type: "setView", view });
      }

      btnRefresh.style.display = livePreview ? "none" : "inline-block";
    }

    function setHint() {
      hint.textContent = livePreview ? "Live Preview: On" : "Live Preview: Off";
    }

    function debounce(fn, ms) {
      let timer = undefined;
      return () => {
        if (timer) {
          clearTimeout(timer);
        }
        timer = setTimeout(() => fn(), ms);
      };
    }

    let postEdit = debounce(() => {
      vscode.postMessage({ type: "edit", text: editor.value });
    }, debounceMs);

    function updateDebounce(nextMs) {
      debounceMs = Math.max(0, Number(nextMs) || 0);
      postEdit = debounce(() => {
        vscode.postMessage({ type: "edit", text: editor.value });
      }, debounceMs);
    }

    // UI events
    for (const btn of buttons) {
      btn.addEventListener("click", () => applyView(btn.dataset.view, true));
    }

    editor.addEventListener("input", () => {
      postEdit();
    });

    btnRefresh.addEventListener("click", () => {
      vscode.postMessage({ type: "refreshPreview" });
    });

    // Prevent Webview navigation for links; delegate to extension
    document.addEventListener("click", (e) => {
      const target = e.target;
      if (!target) return;
      const link = target.closest ? target.closest("a") : null;
      if (!link) return;
      const href = link.getAttribute("href") || "";
      if (!href || href.startsWith("#")) return;
      e.preventDefault();
      vscode.postMessage({ type: "openLink", href });
    });

    // Restore state
    const state = vscode.getState();
    if (state && (state.view === "editor" || state.view === "split" || state.view === "preview")) {
      view = state.view;
    }
    applyView(view, false);
    setHint();

    window.addEventListener("message", (event) => {
      const msg = event.data;
      if (!msg || typeof msg !== "object") return;
      if (msg.type !== "update") return;
      const forcePreviewUpdate = msg.forcePreviewUpdate === true;

      if (typeof msg.text === "string" && editor.value !== msg.text) {
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        editor.value = msg.text;
        try {
          editor.setSelectionRange(start, end);
        } catch {
          // ignore
        }
      }

      if (typeof msg.view === "string" && (msg.view === "editor" || msg.view === "split" || msg.view === "preview")) {
        applyView(msg.view, false);
      }

      if (typeof msg.livePreview === "boolean") {
        livePreview = msg.livePreview;
        btnRefresh.style.display = livePreview ? "none" : "inline-block";
        setHint();
      }

      if (typeof msg.debounceMs === "number") {
        updateDebounce(msg.debounceMs);
      }

      if (typeof msg.html === "string" && (livePreview || forcePreviewUpdate)) {
        preview.innerHTML = msg.html;
      }
    });

    // Handshake
    vscode.postMessage({ type: "ready", view });
  </script>
</body>
</html>`;
  }

  private renderMarkdownToHtml(text: string, documentUri: vscode.Uri, webview: vscode.Webview): string {
    const env: Record<string, unknown> = {};
    const tokens = this.markdownIt.parse(text, env);
    const baseDir = getDocumentDirUri(documentUri);

    const visit = (tks: any[]): void => {
      for (const t of tks) {
        if (t.type === "image") {
          const src = typeof t.attrGet === "function" ? (t.attrGet("src") as string | null) : null;
          if (src) {
            const next = this.tryResolveResourceToWebviewUri(baseDir, webview, src);
            if (next) {
              if (typeof t.attrSet === "function") {
                t.attrSet("src", next);
              }
            }
          }
        }

        if (Array.isArray(t.children) && t.children.length > 0) {
          visit(t.children);
        }
      }
    };

    visit(tokens as any[]);
    return this.markdownIt.renderer.render(tokens, this.markdownIt.options, env);
  }

  private tryResolveResourceToWebviewUri(baseDir: vscode.Uri, webview: vscode.Webview, raw: string): string | undefined {
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      return undefined;
    }

    // 外链 / data URI：不做处理
    if (/^(https?:|data:|mailto:)/i.test(trimmed)) {
      return undefined;
    }

    // 绝对路径：尽量解析为 file URI（仅用于 img/src 的场景）
    if (looksLikeAbsolutePath(trimmed)) {
      try {
        const absUri = vscode.Uri.file(trimmed);
        return webview.asWebviewUri(absUri).toString();
      } catch {
        return undefined;
      }
    }

    // 相对路径：基于当前文档目录解析
    try {
      const target = vscode.Uri.joinPath(baseDir, trimmed);
      return webview.asWebviewUri(target).toString();
    } catch {
      return undefined;
    }
  }

  private async applyDocumentEdits(document: vscode.TextDocument, newText: string): Promise<void> {
    const edit = new vscode.WorkspaceEdit();
    const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length));
    edit.replace(document.uri, fullRange, newText);
    await vscode.workspace.applyEdit(edit);
  }

  private async openLinkFromWebview(documentUri: vscode.Uri, href: string): Promise<void> {
    const trimmed = href.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }

    // 禁止从 Webview 触发 command: 链接，避免权限放大
    if (/^command:/i.test(trimmed)) {
      return;
    }

    if (isProbablyExternalLink(trimmed)) {
      try {
        await vscode.env.openExternal(vscode.Uri.parse(trimmed));
      } catch {
        // ignore
      }
      return;
    }

    // 处理带 fragment 的相对链接：path#fragment
    const hashIndex = trimmed.indexOf("#");
    const pathPart = hashIndex >= 0 ? trimmed.slice(0, hashIndex) : trimmed;
    const fragment = hashIndex >= 0 ? trimmed.slice(hashIndex + 1) : "";

    const baseDir = getDocumentDirUri(documentUri);

    let targetUri: vscode.Uri | undefined;
    try {
      if (!pathPart) {
        // 仅 fragment：暂不做跨区滚动，同页点击保持在 Webview 内即可
        return;
      }

      if (looksLikeAbsolutePath(pathPart) && documentUri.scheme === "file") {
        targetUri = vscode.Uri.file(pathPart);
      } else {
        targetUri = vscode.Uri.joinPath(baseDir, pathPart);
      }

      if (fragment) {
        targetUri = targetUri.with({ fragment });
      }
    } catch {
      targetUri = undefined;
    }

    if (!targetUri) {
      return;
    }

    try {
      await vscode.commands.executeCommand("vscode.open", targetUri);
    } catch {
      // ignore
    }
  }
}
