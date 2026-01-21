/*
 * 模块职责：在用户打开/切换 Markdown 文件时，自动调用 VS Code 内置命令打开 Markdown 预览（支持单栏或右侧预览）。
 * 设计目标：避免循环触发与闪烁、尽量不打断编辑体验、保持实现轻量可维护。
 */

import * as path from "path";
import * as vscode from "vscode";
import { minimatch } from "minimatch";
import { MarkdownSplitEditorProvider } from "./customEditor/MarkdownSplitEditorProvider";

type PreviewMode = "follow" | "locked";
type ReopenPolicy = "always" | "respectClosedInSession";
type OpenLocation = "same" | "side";

interface ExtensionConfig {
  enabled: boolean;
  openLocation: OpenLocation;
  mode: PreviewMode;
  keepFocus: boolean;
  reopenPolicy: ReopenPolicy;
  allowedSchemes: string[];
  excludeGlobs: string[];
  onlyExtensions: string[];
  showStatusBar: boolean;
  notifyOnError: boolean;
}

const CONFIG_SECTION = "mdAutoPreview";

const CMD_ENABLE = "mdAutoPreview.enable";
const CMD_DISABLE = "mdAutoPreview.disable";
const CMD_TOGGLE = "mdAutoPreview.toggle";
const CMD_OPEN_FOLLOW = "mdAutoPreview.openPreviewFollow";
const CMD_OPEN_LOCKED = "mdAutoPreview.openPreviewLocked";
const CMD_TOGGLE_OPEN_LOCATION = "mdAutoPreview.toggleOpenLocation";

let statusBarItem: vscode.StatusBarItem | undefined;

// 防止打开预览 → 焦点切回 → 事件再次触发导致循环
let suppressAutoOpen = false;
let ignoreNextActiveTextEditorUri: string | undefined;

// reopenPolicy=respectClosedInSession：同一文件本次会话只自动打开一次
const autoOpenedInSession = new Set<string>();

// notifyOnError=true：只弹一次错误提示，避免刷屏
let errorNotifiedOnce = false;

// 记录最近一次处理过的 Markdown 文档，用于在 Preview（非 TextEditor）激活时仍能执行“切换视图”等命令。
let lastMarkdownUri: vscode.Uri | undefined;

function getConfig(): ExtensionConfig {
  const cfg = vscode.workspace.getConfiguration(CONFIG_SECTION);
  return {
    enabled: cfg.get<boolean>("enabled", true),
    openLocation: cfg.get<OpenLocation>("openLocation", "same"),
    mode: cfg.get<PreviewMode>("mode", "follow"),
    keepFocus: cfg.get<boolean>("keepFocus", true),
    reopenPolicy: cfg.get<ReopenPolicy>("reopenPolicy", "always"),
    allowedSchemes: cfg.get<string[]>("allowedSchemes", ["file", "untitled", "vscode-remote"]),
    excludeGlobs: cfg.get<string[]>("excludeGlobs", ["**/node_modules/**", "**/.git/**"]),
    onlyExtensions: cfg.get<string[]>("onlyExtensions", []),
    showStatusBar: cfg.get<boolean>("showStatusBar", true),
    notifyOnError: cfg.get<boolean>("notifyOnError", true)
  };
}

function normalizeExtensions(exts: string[]): string[] {
  return exts
    .map((e) => e.trim())
    .filter(Boolean)
    .map((e) => (e.startsWith(".") ? e : `.${e}`))
    .map((e) => e.toLowerCase());
}

function isMarkdownDocument(doc: vscode.TextDocument): boolean {
  return doc.languageId === "markdown";
}

function isAllowedByScheme(doc: vscode.TextDocument, cfg: ExtensionConfig): boolean {
  return cfg.allowedSchemes.includes(doc.uri.scheme);
}

function isAllowedByExtension(doc: vscode.TextDocument, cfg: ExtensionConfig): boolean {
  const only = normalizeExtensions(cfg.onlyExtensions);
  if (only.length === 0) {
    return true;
  }
  const ext = path.extname(doc.uri.fsPath).toLowerCase();
  return only.includes(ext);
}

function isExcludedByGlob(doc: vscode.TextDocument, cfg: ExtensionConfig): boolean {
  if (cfg.excludeGlobs.length === 0) {
    return false;
  }
  // 优先使用工作区相对路径匹配；没有工作区时退化为 fsPath 匹配
  const rel = vscode.workspace.asRelativePath(doc.uri, false);
  const candidatePaths = new Set<string>([rel, doc.uri.fsPath]);
  for (const pattern of cfg.excludeGlobs) {
    const p = (pattern ?? "").trim();
    if (!p) {
      continue;
    }
    for (const candidate of candidatePaths) {
      if (minimatch(candidate, p, { dot: true, nocase: true })) {
        return true;
      }
    }
  }
  return false;
}

function shouldAutoOpen(editor: vscode.TextEditor | undefined, cfg: ExtensionConfig): editor is vscode.TextEditor {
  if (!cfg.enabled) {
    return false;
  }
  if (!editor) {
    return false;
  }
  const doc = editor.document;
  if (!isMarkdownDocument(doc)) {
    return false;
  }
  if (!isAllowedByScheme(doc, cfg)) {
    return false;
  }
  if (!isAllowedByExtension(doc, cfg)) {
    return false;
  }
  if (isExcludedByGlob(doc, cfg)) {
    return false;
  }
  return true;
}

async function openPreview(
  editor: vscode.TextEditor,
  cfg: ExtensionConfig,
  mode: PreviewMode,
  openLocationOverride?: OpenLocation
): Promise<void> {
  const openLocation = openLocationOverride ?? cfg.openLocation;
  const commandId =
    openLocation === "side"
      ? mode === "locked"
        ? "markdown.showLockedPreviewToSide"
        : "markdown.showPreviewToSide"
      : mode === "locked"
        ? "markdown.showLockedPreview"
        : "markdown.showPreview";
  const viewColumn = editor.viewColumn;

  await vscode.commands.executeCommand(commandId, editor.document.uri);

  // keepFocus 的语义是“保持源码编辑器焦点”，这只在双栏（side）模式下有意义；
  // 单栏（same）模式如果切回源码，会导致预览不再可见，违背“单栏预览”的目标。
  if (cfg.keepFocus && openLocation === "side" && viewColumn !== undefined) {
    ignoreNextActiveTextEditorUri = editor.document.uri.toString();
    // 预览会抢焦点，这里强制切回源码编辑器，同时通过 debounce 抑制循环触发
    await vscode.window.showTextDocument(editor.document, { viewColumn, preserveFocus: false });
  }
}

async function openPreviewWithErrorHandling(
  editor: vscode.TextEditor,
  cfg: ExtensionConfig,
  mode: PreviewMode,
  openLocationOverride?: OpenLocation
): Promise<void> {
  try {
    await openPreview(editor, cfg, mode, openLocationOverride);
  } catch (err) {
    if (!cfg.notifyOnError) {
      return;
    }
    if (errorNotifiedOnce) {
      return;
    }
    errorNotifiedOnce = true;
    const msg = err instanceof Error ? err.message : String(err);
    void vscode.window.showWarningMessage(
      `Markdown Auto Preview：打开预览失败。请确认已启用 VS Code 内置 Markdown 预览功能。错误：${msg}`
    );
  }
}

async function maybeAutoOpenPreview(editor: vscode.TextEditor | undefined): Promise<void> {
  const cfg = getConfig();
  if (editor && ignoreNextActiveTextEditorUri === editor.document.uri.toString()) {
    ignoreNextActiveTextEditorUri = undefined;
    refreshStatusBar(cfg, editor);
    return;
  }
  if (!shouldAutoOpen(editor, cfg)) {
    refreshStatusBar(cfg, editor);
    return;
  }

  lastMarkdownUri = editor.document.uri;
  refreshStatusBar(cfg, editor);

  if (suppressAutoOpen) {
    return;
  }

  const uriKey = editor.document.uri.toString();
  if (cfg.reopenPolicy === "respectClosedInSession" && autoOpenedInSession.has(uriKey)) {
    return;
  }

  suppressAutoOpen = true;
  try {
    autoOpenedInSession.add(uriKey);
    await openPreviewWithErrorHandling(editor, cfg, cfg.mode);
  } finally {
    suppressAutoOpen = false;
  }
}

function refreshStatusBar(cfg: ExtensionConfig, editor: vscode.TextEditor | undefined): void {
  if (!statusBarItem) {
    return;
  }

  const show = cfg.showStatusBar;
  if (!show) {
    statusBarItem.hide();
    return;
  }

  const isMd = !!editor && isMarkdownDocument(editor.document);
  statusBarItem.text = cfg.enabled ? "MD Auto Preview: On" : "MD Auto Preview: Off";
  statusBarItem.tooltip = isMd
    ? "点击切换自动预览（当前文件为 Markdown）"
    : "点击切换自动预览（仅对 Markdown 生效）";
  statusBarItem.show();
}

async function updateEnabled(nextEnabled: boolean): Promise<void> {
  const cfg = vscode.workspace.getConfiguration(CONFIG_SECTION);
  await cfg.update("enabled", nextEnabled, vscode.ConfigurationTarget.Global);
}

async function updateOpenLocation(nextOpenLocation: OpenLocation): Promise<void> {
  const cfg = vscode.workspace.getConfiguration(CONFIG_SECTION);
  await cfg.update("openLocation", nextOpenLocation, vscode.ConfigurationTarget.Global);
}

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(MarkdownSplitEditorProvider.register(context));

  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = CMD_TOGGLE;
  context.subscriptions.push(statusBarItem);

  context.subscriptions.push(
    vscode.commands.registerCommand(CMD_ENABLE, async () => {
      await updateEnabled(true);
      await maybeAutoOpenPreview(vscode.window.activeTextEditor);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(CMD_DISABLE, async () => {
      await updateEnabled(false);
      await maybeAutoOpenPreview(vscode.window.activeTextEditor);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(CMD_TOGGLE, async () => {
      const cfg = getConfig();
      await updateEnabled(!cfg.enabled);
      await maybeAutoOpenPreview(vscode.window.activeTextEditor);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(CMD_OPEN_FOLLOW, async () => {
      const editor = vscode.window.activeTextEditor;
      const cfg = getConfig();
      if (!editor) {
        return;
      }
      lastMarkdownUri = editor.document.uri;
      await openPreviewWithErrorHandling(editor, cfg, "follow", "side");
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(CMD_OPEN_LOCKED, async () => {
      const editor = vscode.window.activeTextEditor;
      const cfg = getConfig();
      if (!editor) {
        return;
      }
      lastMarkdownUri = editor.document.uri;
      await openPreviewWithErrorHandling(editor, cfg, "locked", "side");
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(CMD_TOGGLE_OPEN_LOCATION, async () => {
      const cfg = getConfig();
      const nextOpenLocation: OpenLocation = cfg.openLocation === "same" ? "side" : "same";
      await updateOpenLocation(nextOpenLocation);

      const active = vscode.window.activeTextEditor;
      const targetEditor =
        active && isMarkdownDocument(active.document)
          ? active
          : vscode.window.visibleTextEditors.find((e) => isMarkdownDocument(e.document));

      if (targetEditor) {
        lastMarkdownUri = targetEditor.document.uri;
        await openPreviewWithErrorHandling(targetEditor, cfg, cfg.mode, nextOpenLocation);
        return;
      }

      if (!lastMarkdownUri) {
        void vscode.window.showInformationMessage("Markdown Auto Preview：未找到可切换视图的 Markdown 文档。请先打开一个 .md 文件。");
        return;
      }

      const commandId =
        nextOpenLocation === "side"
          ? cfg.mode === "locked"
            ? "markdown.showLockedPreviewToSide"
            : "markdown.showPreviewToSide"
          : cfg.mode === "locked"
            ? "markdown.showLockedPreview"
            : "markdown.showPreview";

      try {
        await vscode.commands.executeCommand(commandId, lastMarkdownUri);
      } catch {
        // 失败时不打断用户；错误提示由 notifyOnError 控制的逻辑只在 openPreviewWithErrorHandling 中统一处理。
      }
    })
  );

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(async (editor) => {
      await maybeAutoOpenPreview(editor);
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(async (e) => {
      if (!e.affectsConfiguration(CONFIG_SECTION)) {
        return;
      }
      const cfg = getConfig();
      // 配置变化后刷新状态栏，并尝试对当前文件应用新策略
      refreshStatusBar(cfg, vscode.window.activeTextEditor);
      await maybeAutoOpenPreview(vscode.window.activeTextEditor);
    })
  );

  // VS Code 启动时如果当前已经处于 Markdown 编辑器，也要触发一次
  void maybeAutoOpenPreview(vscode.window.activeTextEditor);
}

export function deactivate(): void {
  // VS Code 会自动清理 subscriptions，这里保持空实现即可
}
