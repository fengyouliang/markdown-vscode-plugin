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

export function getWebviewHtml(webview: vscode.Webview): string {
  const nonce = getNonce();

  const csp = [
    "default-src 'none'",
    // 图片：允许 webview 资源 + https + data（远程图片/徽章常见）
    `img-src ${webview.cspSource} https: data:`,
    // 样式：允许内联（用于轻量 UI），不引入外部资源
    `style-src ${webview.cspSource} 'unsafe-inline'`,
    // 脚本：仅允许带 nonce 的内联脚本
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

        // Split 模式滚动同步：按滚动比例映射（轻量实现，接近 JetBrains 的“左右联动”体验）
        let syncingScroll = false;
        let lastScrollSource = "editor";

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

        function syncScroll(fromEl, toEl) {
          if (currentMode !== "split") {
            return;
          }
          if (syncingScroll) {
            return;
          }
          syncingScroll = true;
          setScrollRatio(toEl, getScrollRatio(fromEl));
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
          syncScroll(editorEl, previewEl);
        });

        previewEl.addEventListener("scroll", () => {
          if (syncingScroll) {
            return;
          }
          lastScrollSource = "preview";
          syncScroll(previewEl, editorEl);
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
              // 内容更新后保持两侧滚动大致对齐（按最后滚动侧为基准）
              if (currentMode === "split") {
                if (lastScrollSource === "preview") {
                  syncScroll(previewEl, editorEl);
                } else {
                  syncScroll(editorEl, previewEl);
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
