/*
 * 模块职责：生成 Markdown Custom Editor 的 Webview HTML（包含 Editor / Split / Preview 三态 UI）。
 */

import * as vscode from "vscode";

function getNonce(): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let nonce = "";
  for (let i = 0; i < 32; i++) {
    nonce += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return nonce;
}

export function getWebviewHtml(webview: vscode.Webview, extensionUri: vscode.Uri): string {
  const nonce = getNonce();

  const mermaidScriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "node_modules", "mermaid", "dist", "mermaid.min.js")
  );

  const csp = [
    "default-src 'none'",
    // 图片：允许 webview 资源 + https + data（远程图片/徽章常见）
    `img-src ${webview.cspSource} https: data:`,
    // 样式：允许内联（用于轻量 UI），不引入外部资源
    `style-src ${webview.cspSource} 'unsafe-inline'`,
    // 脚本：仅允许带 nonce 的脚本（含本地脚本 src + 内联脚本）
    `script-src 'nonce-${nonce}'`
  ].join("; ");

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="${csp}" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Markdown</title>
    <style>
      :root {
        --toolbar-height: 34px;
        --split-gap: 0px;
      }

      html, body {
        height: 100%;
        padding: 0;
        margin: 0;
      }

      body {
        background: var(--vscode-editor-background);
        color: var(--vscode-editor-foreground);
        font-family: var(--vscode-font-family);
      }

      .toolbar {
        height: var(--toolbar-height);
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 0 8px;
        box-sizing: border-box;
        border-bottom: 1px solid var(--vscode-editorWidget-border);
        background: var(--vscode-editorGroupHeader-tabsBackground);
      }

      .toolbar .spacer {
        flex: 1;
      }

      .btn {
        height: 24px;
        padding: 0 10px;
        border-radius: 4px;
        border: 1px solid transparent;
        background: transparent;
        color: var(--vscode-foreground);
        cursor: pointer;
        user-select: none;
      }

      .btn:hover {
        background: var(--vscode-toolbar-hoverBackground);
      }

      .btn.active {
        background: var(--vscode-button-secondaryBackground);
        border-color: var(--vscode-button-secondaryHoverBackground);
      }

      .btn.danger:hover {
        background: var(--vscode-inputValidation-warningBackground);
      }

      .root {
        height: calc(100% - var(--toolbar-height));
        display: flex;
        flex-direction: row;
        gap: var(--split-gap);
      }

      .pane {
        flex: 1;
        min-width: 0;
        height: 100%;
        overflow: auto;
      }

      textarea#editor {
        width: 100%;
        height: 100%;
        resize: none;
        border: none;
        outline: none;
        box-sizing: border-box;
        padding: 10px 12px;
        background: var(--vscode-editor-background);
        color: var(--vscode-editor-foreground);
        font-family: var(--vscode-editor-font-family, var(--vscode-font-family));
        font-size: var(--vscode-editor-font-size, 13px);
        line-height: 1.5;
        white-space: pre;
        tab-size: 2;
      }

      .preview {
        position: relative;
        box-sizing: border-box;
        padding: 10px 16px;
      }

      .preview :is(h1,h2,h3) {
        margin: 18px 0 10px;
      }
      .preview p {
        margin: 10px 0;
      }
      .preview code {
        font-family: var(--vscode-editor-font-family, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace);
      }
      .preview pre {
        padding: 10px 12px;
        overflow: auto;
        border-radius: 6px;
        background: var(--vscode-textCodeBlock-background);
      }
      /* Mermaid 渲染后会在该节点内插入 SVG，这里避免套用 code block 样式 */
      .preview pre.mermaid {
        padding: 0;
        background: transparent;
        border-radius: 0;
      }
      .preview pre.mermaid svg {
        max-width: 100%;
        height: auto;
      }
      .preview a {
        color: var(--vscode-textLink-foreground);
        text-decoration: none;
      }
      .preview a:hover {
        text-decoration: underline;
      }

      body[data-mode="editor"] #previewPane { display: none; }
      body[data-mode="preview"] #editorPane { display: none; }
    </style>
  </head>
  <body data-mode="split">
    <div class="toolbar">
      <button class="btn" data-mode="editor" type="button">Editor</button>
      <button class="btn active" data-mode="split" type="button">Split</button>
      <button class="btn" data-mode="preview" type="button">Preview</button>
      <div class="spacer"></div>
      <button class="btn" id="reopenWith" type="button" title="Reopen With...">⋯</button>
    </div>

    <div class="root">
      <div class="pane" id="editorPane">
        <textarea id="editor" spellcheck="false"></textarea>
      </div>
      <div class="pane preview" id="previewPane"></div>
    </div>

    <script nonce="${nonce}" src="${mermaidScriptUri}"></script>
    <script nonce="${nonce}">
      (function () {
        const vscode = acquireVsCodeApi();

        /** @type {"editor" | "split" | "preview"} */
        let currentMode = "split";
        let currentVersion = 0;
        let applyingRemote = false;
        let debounceTimer = undefined;

        const editorEl = /** @type {HTMLTextAreaElement} */ (document.getElementById("editor"));
        const previewEl = /** @type {HTMLDivElement} */ (document.getElementById("previewPane"));
        const reopenWithBtn = /** @type {HTMLButtonElement} */ (document.getElementById("reopenWith"));
        const modeButtons = Array.from(document.querySelectorAll("button[data-mode]"));

        // Split 模式滚动同步：基于渲染锚点（data-md-line）的“按段落/标题”联动
        let syncingScroll = false;
        let lastScrollSource = "editor";

        /** @type {HTMLElement[]} */
        let anchorEls = [];
        /** @type {number[]} */
        let anchorLines = [];
        /** @type {number[]} */
        let anchorOffsets = [];
        let anchorOffsetsDirty = true;
        let recomputeOffsetsRaf = 0;

        let mermaidRenderRaf = 0;
        let mermaidRenderSeq = 0;

        function getScrollRatio(el) {
          const max = el.scrollHeight - el.clientHeight;
          return max > 0 ? el.scrollTop / max : 0;
        }

        function setScrollRatio(el, ratio) {
          const max = el.scrollHeight - el.clientHeight;
          if (max <= 0) {
            return;
          }
          el.scrollTop = Math.max(0, Math.min(max, ratio * max));
        }

        function upperBound(arr, value) {
          let lo = 0;
          let hi = arr.length;
          while (lo < hi) {
            const mid = (lo + hi) >>> 1;
            if (arr[mid] <= value) {
              lo = mid + 1;
            } else {
              hi = mid;
            }
          }
          return lo;
        }

        function getEditorLineHeightPx() {
          const style = window.getComputedStyle(editorEl);
          const fontSize = Number.parseFloat(style.fontSize || "13");
          const lineHeightRaw = style.lineHeight || "";
          const lineHeight = Number.parseFloat(lineHeightRaw);
          if (Number.isFinite(lineHeight) && lineHeight > 0) {
            return lineHeight;
          }
          // line-height: normal 时做一个保守估计（CSS 中我们设的是 1.5）
          return Math.max(1, fontSize * 1.5);
        }

        function decodeBase64Utf8(base64) {
          try {
            const bin = atob(base64 || "");
            const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
            return new TextDecoder("utf-8").decode(bytes);
          } catch {
            return "";
          }
        }

        function getMermaidTheme() {
          const cls = document.body.classList;
          if (cls.contains("vscode-dark") || cls.contains("vscode-high-contrast")) {
            return "dark";
          }
          return "default";
        }

        function prepareMermaidBlocks() {
          const blocks = Array.from(previewEl.querySelectorAll("pre.mermaid[data-mermaid]"));
          for (const el of blocks) {
            if (!(el instanceof HTMLElement)) {
              continue;
            }
            const encoded = el.getAttribute("data-mermaid") || "";
            if (!encoded) {
              continue;
            }
            const src = decodeBase64Utf8(encoded);
            if (src) {
              // Mermaid 会读取节点文本作为源码；使用 textContent 避免 HTML 转义歧义
              el.textContent = src;
            }
          }
          return blocks;
        }

        async function renderMermaidIfNeeded() {
          const mermaidApi = /** @type {any} */ (window.mermaid);
          if (!mermaidApi) {
            return;
          }

          const blocks = prepareMermaidBlocks();
          if (blocks.length === 0) {
            return;
          }

          try {
            mermaidApi.initialize({
              startOnLoad: false,
              securityLevel: "strict",
              theme: getMermaidTheme()
            });
          } catch {
            // ignore
          }

          try {
            if (typeof mermaidApi.run === "function") {
              await mermaidApi.run({ nodes: blocks });
            } else if (typeof mermaidApi.init === "function") {
              mermaidApi.init(undefined, blocks);
            }
          } catch (err) {
            console.warn("Mermaid render failed", err);
          } finally {
            // Mermaid 渲染会改变布局高度，需要刷新锚点 offset，以保证滚动同步准确
            anchorOffsetsDirty = true;
            scheduleRecomputeAnchorOffsets();
            if (currentMode === "split") {
              if (lastScrollSource === "preview") {
                syncFromPreviewToEditor();
              } else {
                syncFromEditorToPreview();
              }
            }
          }
        }

        function scheduleRenderMermaid() {
          mermaidRenderSeq++;
          const seq = mermaidRenderSeq;
          if (mermaidRenderRaf) {
            cancelAnimationFrame(mermaidRenderRaf);
          }
          mermaidRenderRaf = requestAnimationFrame(() => {
            mermaidRenderRaf = 0;
            if (seq !== mermaidRenderSeq) {
              return;
            }
            void renderMermaidIfNeeded();
          });
        }

        function rebuildAnchors() {
          const els = Array.from(previewEl.querySelectorAll("[data-md-line]"));
          /** @type {{ line: number; el: HTMLElement }[]} */
          const items = [];
          for (const el of els) {
            if (!(el instanceof HTMLElement)) {
              continue;
            }
            const raw = el.getAttribute("data-md-line") || "";
            const line = Number.parseInt(raw, 10);
            if (!Number.isFinite(line) || line <= 0) {
              continue;
            }
            items.push({ line, el });
          }
          items.sort((a, b) => a.line - b.line);
          anchorEls = [];
          anchorLines = [];
          let lastLine = -1;
          for (const it of items) {
            if (it.line === lastLine) {
              continue;
            }
            anchorEls.push(it.el);
            anchorLines.push(it.line);
            lastLine = it.line;
          }
          anchorOffsets = [];
          anchorOffsetsDirty = true;
          scheduleRecomputeAnchorOffsets();
        }

        function recomputeAnchorOffsets() {
          if (anchorEls.length === 0) {
            anchorOffsets = [];
            anchorOffsetsDirty = false;
            return;
          }
          anchorOffsets = anchorEls.map((el) => el.offsetTop);
          anchorOffsetsDirty = false;
        }

        function scheduleRecomputeAnchorOffsets() {
          if (recomputeOffsetsRaf) {
            return;
          }
          recomputeOffsetsRaf = requestAnimationFrame(() => {
            recomputeOffsetsRaf = 0;
            recomputeAnchorOffsets();
          });
        }

        function ensureAnchorOffsetsReady() {
          if (anchorOffsetsDirty) {
            recomputeAnchorOffsets();
          }
        }

        function syncFromEditorToPreview() {
          if (currentMode !== "split" || syncingScroll) {
            return;
          }
          if (anchorLines.length === 0) {
            // 兜底：没有锚点时退化为比例同步
            syncingScroll = true;
            setScrollRatio(previewEl, getScrollRatio(editorEl));
            requestAnimationFrame(() => {
              syncingScroll = false;
            });
            return;
          }

          ensureAnchorOffsetsReady();
          const lineHeight = getEditorLineHeightPx();
          const editorTop = Math.max(0, editorEl.scrollTop);
          const editorMax = Math.max(0, editorEl.scrollHeight - editorEl.clientHeight);
          const previewMax = Math.max(0, previewEl.scrollHeight - previewEl.clientHeight);

          const firstLine = anchorLines[0] ?? 1;
          const lastLine = anchorLines[anchorLines.length - 1] ?? firstLine;
          const firstOffset = anchorOffsets[0] ?? 0;
          const lastOffset = anchorOffsets[anchorOffsets.length - 1] ?? firstOffset;
          const firstEditorPos = Math.max(0, Math.min(editorMax, (firstLine - 1) * lineHeight));
          const lastEditorPos = Math.max(0, Math.min(editorMax, (lastLine - 1) * lineHeight));

          let aEditorPos = 0;
          let bEditorPos = editorMax;
          let aPreviewPos = 0;
          let bPreviewPos = previewMax;

          if (editorTop <= firstEditorPos) {
            aEditorPos = 0;
            bEditorPos = firstEditorPos;
            aPreviewPos = 0;
            bPreviewPos = firstOffset;
          } else if (editorTop >= lastEditorPos) {
            aEditorPos = lastEditorPos;
            bEditorPos = editorMax;
            aPreviewPos = lastOffset;
            bPreviewPos = previewMax;
          } else {
            const topLine = Math.max(1, Math.floor(editorTop / lineHeight) + 1);
            const idx = Math.max(0, Math.min(anchorLines.length - 1, upperBound(anchorLines, topLine) - 1));
            const nextIdx = Math.min(anchorLines.length - 1, idx + 1);
            const aLine = anchorLines[idx] ?? 1;
            const bLine = anchorLines[nextIdx] ?? aLine;
            aEditorPos = Math.max(0, Math.min(editorMax, (aLine - 1) * lineHeight));
            bEditorPos = Math.max(0, Math.min(editorMax, (bLine - 1) * lineHeight));
            aPreviewPos = anchorOffsets[idx] ?? 0;
            bPreviewPos = anchorOffsets[nextIdx] ?? aPreviewPos;
          }

          const denom = bEditorPos - aEditorPos;
          const t = denom > 0 ? (editorTop - aEditorPos) / denom : 0;
          const clamped = Math.max(0, Math.min(1, t));
          const target = aPreviewPos + clamped * (bPreviewPos - aPreviewPos);

          syncingScroll = true;
          previewEl.scrollTop = Math.max(0, Math.min(previewMax, target));
          requestAnimationFrame(() => {
            syncingScroll = false;
          });
        }

        function syncFromPreviewToEditor() {
          if (currentMode !== "split" || syncingScroll) {
            return;
          }
          if (anchorEls.length === 0) {
            // 兜底：没有锚点时退化为比例同步
            syncingScroll = true;
            setScrollRatio(editorEl, getScrollRatio(previewEl));
            requestAnimationFrame(() => {
              syncingScroll = false;
            });
            return;
          }

          ensureAnchorOffsetsReady();
          const lineHeight = getEditorLineHeightPx();
          const previewTop = Math.max(0, previewEl.scrollTop);
          const previewMax = Math.max(0, previewEl.scrollHeight - previewEl.clientHeight);
          const editorMax = Math.max(0, editorEl.scrollHeight - editorEl.clientHeight);

          const firstLine = anchorLines[0] ?? 1;
          const lastLine = anchorLines[anchorLines.length - 1] ?? firstLine;
          const firstOffset = anchorOffsets[0] ?? 0;
          const lastOffset = anchorOffsets[anchorOffsets.length - 1] ?? firstOffset;
          const firstEditorPos = Math.max(0, Math.min(editorMax, (firstLine - 1) * lineHeight));
          const lastEditorPos = Math.max(0, Math.min(editorMax, (lastLine - 1) * lineHeight));

          let aPreviewPos = 0;
          let bPreviewPos = previewMax;
          let aEditorPos = 0;
          let bEditorPos = editorMax;

          if (previewTop <= firstOffset) {
            aPreviewPos = 0;
            bPreviewPos = firstOffset;
            aEditorPos = 0;
            bEditorPos = firstEditorPos;
          } else if (previewTop >= lastOffset) {
            aPreviewPos = lastOffset;
            bPreviewPos = previewMax;
            aEditorPos = lastEditorPos;
            bEditorPos = editorMax;
          } else {
            const idx = Math.max(0, Math.min(anchorOffsets.length - 1, upperBound(anchorOffsets, previewTop) - 1));
            const nextIdx = Math.min(anchorOffsets.length - 1, idx + 1);
            const aOffset = anchorOffsets[idx] ?? 0;
            const bOffset = anchorOffsets[nextIdx] ?? aOffset;
            const aLine = anchorLines[idx] ?? 1;
            const bLine = anchorLines[nextIdx] ?? aLine;
            aPreviewPos = aOffset;
            bPreviewPos = bOffset;
            aEditorPos = Math.max(0, Math.min(editorMax, (aLine - 1) * lineHeight));
            bEditorPos = Math.max(0, Math.min(editorMax, (bLine - 1) * lineHeight));
          }

          const denom = bPreviewPos - aPreviewPos;
          const t = denom > 0 ? (previewTop - aPreviewPos) / denom : 0;
          const clamped = Math.max(0, Math.min(1, t));
          const target = aEditorPos + clamped * (bEditorPos - aEditorPos);
          syncingScroll = true;
          editorEl.scrollTop = Math.max(0, Math.min(editorMax, target));
          requestAnimationFrame(() => {
            syncingScroll = false;
          });
        }

        function setActiveButton(mode) {
          for (const btn of modeButtons) {
            btn.classList.toggle("active", btn.dataset.mode === mode);
          }
        }

        function applyMode(mode, fromExtension) {
          currentMode = mode;
          document.body.dataset.mode = mode;
          setActiveButton(mode);
          if (mode === "split") {
            if (lastScrollSource === "preview") {
              syncFromPreviewToEditor();
            } else {
              syncFromEditorToPreview();
            }
          }
          if (!fromExtension) {
            vscode.postMessage({ type: "setViewMode", viewMode: mode });
          }
        }

        for (const btn of modeButtons) {
          btn.addEventListener("click", () => {
            const mode = btn.dataset.mode;
            if (mode === "editor" || mode === "split" || mode === "preview") {
              applyMode(mode, false);
            }
          });
        }

        reopenWithBtn.addEventListener("click", () => {
          vscode.postMessage({ type: "reopenWith" });
        });

        // Webview 内拦截链接点击，交给扩展侧决定如何打开（避免在 webview 内部导航）
        document.addEventListener(
          "click",
          (e) => {
            const target = /** @type {HTMLElement} */ (e.target);
            const link = target?.closest?.("a");
            if (!link || !(link instanceof HTMLAnchorElement)) {
              return;
            }
            const href = link.getAttribute("href") || "";
            if (!href) {
              return;
            }
            e.preventDefault();
            vscode.postMessage({ type: "openExternal", href });
          },
          { capture: true }
        );

        editorEl.addEventListener("input", () => {
          if (applyingRemote) {
            return;
          }
          if (debounceTimer !== undefined) {
            clearTimeout(debounceTimer);
          }
          debounceTimer = setTimeout(() => {
            vscode.postMessage({ type: "edit", text: editorEl.value });
          }, 250);
        });

        editorEl.addEventListener("scroll", () => {
          if (syncingScroll) {
            return;
          }
          lastScrollSource = "editor";
          syncFromEditorToPreview();
        });

        previewEl.addEventListener("scroll", () => {
          if (syncingScroll) {
            return;
          }
          lastScrollSource = "preview";
          syncFromPreviewToEditor();
        });

        // 预览区域的布局会受图片加载、窗口尺寸变化影响，需重新计算锚点 offset
        previewEl.addEventListener(
          "load",
          (e) => {
            if (e.target instanceof HTMLImageElement) {
              anchorOffsetsDirty = true;
              scheduleRecomputeAnchorOffsets();
            }
          },
          true
        );

        window.addEventListener("resize", () => {
          anchorOffsetsDirty = true;
          scheduleRecomputeAnchorOffsets();
        });

        window.addEventListener("message", (event) => {
          const msg = event.data;
          if (!msg || typeof msg !== "object") {
            return;
          }

          switch (msg.type) {
            case "init": {
              currentVersion = msg.version || 0;
              applyingRemote = true;
              editorEl.value = msg.text || "";
              applyingRemote = false;
              previewEl.innerHTML = msg.html || "";
              rebuildAnchors();
              scheduleRenderMermaid();
              if (msg.viewMode === "editor" || msg.viewMode === "split" || msg.viewMode === "preview") {
                applyMode(msg.viewMode, true);
              }
              return;
            }
            case "update": {
              const nextVersion = msg.version || 0;
              if (nextVersion && nextVersion <= currentVersion) {
                return;
              }
              currentVersion = nextVersion;

              const nextText = msg.text || "";
              if (nextText !== editorEl.value) {
                const start = editorEl.selectionStart;
                const end = editorEl.selectionEnd;
                applyingRemote = true;
                editorEl.value = nextText;
                applyingRemote = false;
                try {
                  editorEl.setSelectionRange(start, end);
                } catch {
                  // 忽略：某些情况下 selection 范围不合法
                }
              }

              previewEl.innerHTML = msg.html || "";
              rebuildAnchors();
              scheduleRenderMermaid();
              // 内容更新后保持两侧滚动对齐（按最后滚动侧为基准）
              if (currentMode === "split") {
                if (lastScrollSource === "preview") {
                  syncFromPreviewToEditor();
                } else {
                  syncFromEditorToPreview();
                }
              }
              return;
            }
            case "setViewMode": {
              if (msg.viewMode === "editor" || msg.viewMode === "split" || msg.viewMode === "preview") {
                applyMode(msg.viewMode, true);
              }
              return;
            }
            case "error": {
              // 首版不做复杂 UI，避免打断编辑；可在未来迭代做 toast
              console.warn(msg.message || "Unknown error");
              return;
            }
            default:
              return;
          }
        });

        vscode.postMessage({ type: "ready" });
      })();
    </script>
  </body>
</html>`;
}
