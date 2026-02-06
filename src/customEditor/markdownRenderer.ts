/*
 * 模块职责：将 Markdown 文本渲染为可在 Webview 中展示的 HTML（基于 markdown-it）。
 */

import * as path from "path";
import * as vscode from "vscode";
import MarkdownIt from "markdown-it";
import hljs from "highlight.js/lib/common";
import texmath from "markdown-it-texmath";
import katex from "katex";
import markdownItFootnote from "markdown-it-footnote";
import markdownItTaskLists from "markdown-it-task-lists";
import markdownItEmoji from "markdown-it-emoji";
import markdownItContainer from "markdown-it-container";

type RenderEnv = {
  webview?: vscode.Webview;
  documentUri?: vscode.Uri;
};

type TaskListState = "todo" | "done" | "skipped" | "unknown";

const md = new MarkdownIt({
  // 安全默认值：不允许原始 HTML，避免注入风险
  html: false,
  linkify: true,
  typographer: true
});

const maxHighlightChars = 50_000;
md.options.highlight = (code: string, lang: string): string => {
  const language = (lang ?? "").trim().toLowerCase();
  if (!language || language === "mermaid") {
    return "";
  }
  if (code.length > maxHighlightChars) {
    return "";
  }
  if (!hljs.getLanguage(language)) {
    return "";
  }
  try {
    return hljs.highlight(code, { language, ignoreIllegals: true }).value;
  } catch {
    return "";
  }
};

md.use(texmath, {
  engine: katex,
  delimiters: "dollars",
  katexOptions: {
    throwOnError: false,
    errorColor: "#cc0000"
  }
});
md.use(markdownItFootnote);
md.use(markdownItEmoji);
md.use(markdownItTaskLists, { enabled: false });

const leadingTaskMarkerRe = /^\[([ xXvV√\-\?])\][\t \u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]+/;

function mapTaskMarkerToState(marker: string): { normalizedMarker: " " | "x"; state: TaskListState } | undefined {
  switch (marker) {
    case " ":
      return { normalizedMarker: " ", state: "todo" };
    case "x":
    case "X":
    case "√":
    case "v":
    case "V":
      return { normalizedMarker: "x", state: "done" };
    case "-":
      return { normalizedMarker: " ", state: "skipped" };
    case "?":
      return { normalizedMarker: " ", state: "unknown" };
    default:
      return undefined;
  }
}

function addClass(token: any, cls: string): void {
  if (!token || typeof token.attrIndex !== "function" || typeof token.attrPush !== "function") {
    return;
  }
  const index = token.attrIndex("class");
  if (index < 0) {
    token.attrPush(["class", cls]);
    return;
  }
  const attrs = token.attrs ?? [];
  const current = String(attrs[index]?.[1] ?? "");
  const parts = current.split(/\s+/g).filter(Boolean);
  if (!parts.includes(cls)) {
    parts.push(cls);
    attrs[index][1] = parts.join(" ");
    token.attrs = attrs;
  }
}

function withTaskState(token: any, state: TaskListState, rawMarker: string): void {
  token.meta = { ...(token.meta ?? {}), helloagentsTaskState: state, helloagentsRawTaskMarker: rawMarker };
}

function getTaskState(token: any): TaskListState | undefined {
  const raw = token?.meta?.helloagentsTaskState;
  return raw === "todo" || raw === "done" || raw === "skipped" || raw === "unknown" ? raw : undefined;
}

// Task list 兼容层：
// - markdown-it-task-lists 仅识别 `[ ] ` / `[x] ` / `[X] `（且要求是一个 ASCII 空格）
// - HelloAGENTS 的 task.md 使用 `[√]` / `[-]` / `[?]` 等标记
// 因此在 core 阶段把“行首标记”归一化，再由 task-lists 插件生成 checkbox。
md.core.ruler.after("inline", "helloagents-task-marker-normalize", (state: any) => {
  const tokens = state.tokens as any[];
  for (let i = 2; i < tokens.length; i++) {
    const inline = tokens[i];
    const paragraphOpen = tokens[i - 1];
    const listItemOpen = tokens[i - 2];
    if (!inline || inline.type !== "inline") {
      continue;
    }
    if (!paragraphOpen || paragraphOpen.type !== "paragraph_open") {
      continue;
    }
    if (!listItemOpen || listItemOpen.type !== "list_item_open") {
      continue;
    }

    const rawContent = String(inline.content ?? "");
    const m = rawContent.match(leadingTaskMarkerRe);
    if (!m) {
      continue;
    }
    const rawMarker = m[1];
    const mapped = mapTaskMarkerToState(rawMarker);
    if (!mapped) {
      continue;
    }

    const rest = rawContent.slice(m[0].length);
    const normalized = `[${mapped.normalizedMarker}] ${rest}`;
    if (normalized !== rawContent) {
      inline.content = normalized;
    }
    // 同步归一化到首个 text child，避免由于 NBSP/多空格导致的“正文起始缩进异常”
    const firstChild = inline.children?.[0];
    if (firstChild && firstChild.type === "text" && typeof firstChild.content === "string") {
      const childRaw = firstChild.content;
      const childMatch = childRaw.match(leadingTaskMarkerRe);
      if (childMatch) {
        const childRest = childRaw.slice(childMatch[0].length);
        const nextChild = `[${mapped.normalizedMarker}] ${childRest}`;
        if (nextChild !== childRaw) {
          firstChild.content = nextChild;
        }
      }
    }

    // 记录状态，供后续在 HTML 中做样式/交互补丁（如 indeterminate）
    withTaskState(listItemOpen, mapped.state, rawMarker);
  }
});

// 在 task-lists 插件运行完成后，补充 class / data-attr，方便 Webview 做进一步渲染（如 indeterminate）
md.core.ruler.push("helloagents-task-state-annotate", (state: any) => {
  const tokens = state.tokens as any[];
  for (let i = 2; i < tokens.length; i++) {
    const inline = tokens[i];
    const paragraphOpen = tokens[i - 1];
    const listItemOpen = tokens[i - 2];
    if (!inline || inline.type !== "inline") {
      continue;
    }
    if (!paragraphOpen || paragraphOpen.type !== "paragraph_open") {
      continue;
    }
    if (!listItemOpen || listItemOpen.type !== "list_item_open") {
      continue;
    }

    const taskState = getTaskState(listItemOpen);
    if (!taskState) {
      continue;
    }

    addClass(listItemOpen, `task-state-${taskState}`);

    const checkbox = inline.children?.[0];
    if (!checkbox || checkbox.type !== "html_inline" || typeof checkbox.content !== "string") {
      continue;
    }
    if (!checkbox.content.includes("task-list-item-checkbox")) {
      continue;
    }
    if (checkbox.content.includes("data-task-state=")) {
      continue;
    }

    checkbox.content = checkbox.content.replace("<input ", `<input data-task-state="${taskState}" `);
  }
});

const admonitionTypes = ["note", "tip", "warning", "important", "danger"] as const;
type AdmonitionType = (typeof admonitionTypes)[number];

function defaultAdmonitionTitle(type: AdmonitionType): string {
  switch (type) {
    case "note":
      return "NOTE";
    case "tip":
      return "TIP";
    case "warning":
      return "WARNING";
    case "important":
      return "IMPORTANT";
    case "danger":
      return "DANGER";
    default:
      return "NOTE";
  }
}

function getLineAttr(map?: [number, number] | null): string {
  const startLine = map?.[0];
  if (typeof startLine === "number" && Number.isFinite(startLine) && startLine >= 0) {
    return ` data-md-line="${startLine + 1}"`;
  }
  return "";
}

function registerAdmonition(type: AdmonitionType): void {
  const validateRe = new RegExp(`^${type}(\\s+.*)?$`, "i");
  const titleRe = new RegExp(`^${type}\\s*(.*)$`, "i");

  md.use(markdownItContainer, type, {
    validate(params: string): boolean {
      return validateRe.test((params ?? "").trim());
    },
    render(tokens: any[], idx: number): string {
      const token = tokens[idx] as unknown as { nesting: number; info?: string; map?: [number, number] | null };
      if (token.nesting !== 1) {
        return "</div>\n";
      }

      const info = (token.info ?? "").trim();
      const m = info.match(titleRe);
      const rawTitle = (m?.[1] ?? "").trim();
      const titleText = rawTitle || defaultAdmonitionTitle(type);
      const titleHtml = `<p class="admonition-title">${md.utils.escapeHtml(titleText)}</p>\n`;

      return `<div class="admonition admonition-${type}"${getLineAttr(token.map)}>\n${titleHtml}`;
    }
  });
}

for (const type of admonitionTypes) {
  registerAdmonition(type);
}

function applySourceLineAttr(token: { map?: [number, number] | null; attrSet: (name: string, value: string) => void }): void {
  const startLine = token.map?.[0];
  if (typeof startLine === "number" && Number.isFinite(startLine) && startLine >= 0) {
    // Markdown-it 的行号是 0-based，这里转为 1-based 方便前端计算
    token.attrSet("data-md-line", String(startLine + 1));
  }
}

function wrapOpenRuleWithLineAttr(ruleName: string): void {
  const defaultRule =
    md.renderer.rules[ruleName] ??
    ((tokens, idx, options, env, self) => {
      return self.renderToken(tokens, idx, options);
    });
  md.renderer.rules[ruleName] = (tokens, idx, options, env, self) => {
    const token = tokens[idx] as unknown as { map?: [number, number] | null; attrSet: (name: string, value: string) => void };
    applySourceLineAttr(token);
    return defaultRule(tokens, idx, options, env, self);
  };
}

// 为滚动同步提供锚点：在常见块级元素上打 data-md-line
wrapOpenRuleWithLineAttr("heading_open");
wrapOpenRuleWithLineAttr("paragraph_open");
wrapOpenRuleWithLineAttr("list_item_open");

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

const defaultFenceRule =
  md.renderer.rules.fence ??
  ((tokens, idx, options, env, self) => {
    return self.renderToken(tokens, idx, options);
  });

function escapeHtml(text: string): string {
  const raw = text ?? "";
  return raw
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function encodeBase64Utf8(text: string): string {
  try {
    return Buffer.from(text ?? "", "utf8").toString("base64");
  } catch {
    return "";
  }
}

function ensureHljsClassOnCode(html: string): string {
  const codeAt = html.indexOf("<code");
  if (codeAt < 0) {
    return html;
  }

  const tagEnd = html.indexOf(">", codeAt);
  if (tagEnd < 0) {
    return html;
  }

  const classAt = html.indexOf('class="', codeAt);
  if (classAt >= 0 && classAt < tagEnd) {
    const valueStart = classAt + 'class="'.length;
    const valueEnd = html.indexOf('"', valueStart);
    if (valueEnd > valueStart && valueEnd < tagEnd) {
      const classes = html.slice(valueStart, valueEnd);
      if (/\bhljs\b/.test(classes)) {
        return html;
      }
      return `${html.slice(0, valueStart)}hljs ${html.slice(valueStart)}`;
    }
    return html;
  }

  const insertAt = codeAt + "<code".length;
  return `${html.slice(0, insertAt)} class="hljs"${html.slice(insertAt)}`;
}

md.renderer.rules.fence = (tokens, idx, options, env, self) => {
  const token = tokens[idx] as unknown as { map?: [number, number] | null; info?: string; content?: string };
  const startLine = token.map?.[0];
  const info = (token.info ?? "").trim();
  const lang = (info.split(/\s+/g)[0] ?? "").toLowerCase();

  if (lang === "mermaid") {
    const line = typeof startLine === "number" && Number.isFinite(startLine) && startLine >= 0 ? startLine + 1 : undefined;
    const source = token.content ?? "";
    const encoded = encodeBase64Utf8(source);
    const escaped = escapeHtml(source);
    const lineAttr = line ? ` data-md-line="${line}"` : "";
    const dataAttr = encoded ? ` data-mermaid="${encoded}"` : "";
    // Mermaid 渲染在 Webview 侧完成，这里只输出占位节点；同时保留文本作为 fallback（渲染失败时可读）。
    return `<pre class="mermaid"${lineAttr}${dataAttr}>${escaped}</pre>`;
  }

  let html = defaultFenceRule(tokens, idx, options, env, self);
  html = ensureHljsClassOnCode(html);
  if (typeof startLine !== "number" || !Number.isFinite(startLine) || startLine < 0) {
    return html;
  }

  // 默认 fence 渲染通常以 <pre><code...> 开始，这里只做一次轻量替换
  const marker = "<pre";
  const at = html.indexOf(marker);
  if (at < 0) {
    return html;
  }
  const insertAt = at + marker.length;
  return `${html.slice(0, insertAt)} data-md-line="${startLine + 1}"${html.slice(insertAt)}`;
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
