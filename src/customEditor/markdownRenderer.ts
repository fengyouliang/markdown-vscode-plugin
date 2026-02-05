/*
 * 模块职责：将 Markdown 文本渲染为可在 Webview 中展示的 HTML（基于 markdown-it）。
 */

import * as path from "path";
import * as vscode from "vscode";
import MarkdownIt from "markdown-it";

type RenderEnv = {
  webview?: vscode.Webview;
  documentUri?: vscode.Uri;
};

const md = new MarkdownIt({
  // 安全默认值：不允许原始 HTML，避免注入风险
  html: false,
  linkify: true,
  typographer: true
});

const defaultImageRule =
  md.renderer.rules.image ??
  ((tokens, idx, options, _env, self) => {
    return self.renderToken(tokens, idx, options);
  });

md.renderer.rules.image = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  const attrs = token.attrs ?? [];
  const srcIndex = attrs.findIndex(([name]) => name === "src");
  if (srcIndex >= 0) {
    const rawSrc = attrs[srcIndex][1] ?? "";
    const nextSrc = resolveImageSrc(rawSrc, env as RenderEnv);
    if (nextSrc) {
      attrs[srcIndex][1] = nextSrc;
      token.attrs = attrs;
    }
  }
  return defaultImageRule(tokens, idx, options, env, self);
};

function isRemoteLikeUrl(src: string): boolean {
  return /^(https?:|data:|vscode-webview-resource:|vscode-resource:)/i.test(src);
}

function resolveImageSrc(src: string, env: RenderEnv): string | undefined {
  const raw = (src ?? "").trim();
  if (!raw) {
    return undefined;
  }
  if (isRemoteLikeUrl(raw) || raw.startsWith("#")) {
    return undefined;
  }

  const webview = env.webview;
  const documentUri = env.documentUri;
  if (!webview || !documentUri) {
    return undefined;
  }

  // 只对本地文件做相对路径解析（Remote/Untitled 首版不强行支持）
  if (documentUri.scheme !== "file") {
    return undefined;
  }

  try {
    const baseDir = path.dirname(documentUri.fsPath);
    const resolvedFsPath = path.resolve(baseDir, raw);
    const resolvedUri = vscode.Uri.file(resolvedFsPath);
    return webview.asWebviewUri(resolvedUri).toString();
  } catch {
    return undefined;
  }
}

export function renderMarkdownToHtml(markdownText: string, params: { webview: vscode.Webview; documentUri: vscode.Uri }): string {
  const text = markdownText ?? "";
  const env: RenderEnv = { webview: params.webview, documentUri: params.documentUri };
  return md.render(text, env);
}

