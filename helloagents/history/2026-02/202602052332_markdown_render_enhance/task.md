# Task List: Markdown 渲染增强（KaTeX / 高亮 / 常用插件）

Directory: `helloagents/plan/202602052332_markdown_render_enhance/`

---

## 1. customEditor（渲染侧：markdown-it 插件）
- [√] 1.1 在 `package.json` / `package-lock.json` 增加依赖（katex、markdown-it-texmath、markdown-it-footnote、markdown-it-task-lists、markdown-it-emoji、markdown-it-container、highlight.js），verify why.md#requirement-数学公式渲染katex
  > Note: `markdown-it-katex` 存在高危 XSS advisory（且无修复版本），已替换为 `markdown-it-texmath` 并通过 `npm audit --omit=dev` 校验为 0 vulnerabilities。
- [√] 1.2 在 `src/customEditor/markdownRenderer.ts` 注册 markdown-it 插件并实现 admonition 容器渲染，verify why.md#requirement-容器块admonition
- [√] 1.3 验证 Mermaid fence 与 `data-md-line` 锚点规则不回退（含 code fence 锚点），verify why.md#requirement-代码高亮highlightjs

## 2. customEditor（Webview：CSP / 样式 / 高亮增强）
- [√] 2.1 在 `src/customEditor/webviewHtml.ts` 增加 KaTeX CSS 引入，并更新 CSP 允许字体（`font-src ${webview.cspSource}`），verify why.md#requirement-数学公式渲染katex
- [√] 2.2 在 Extension Host 侧使用 `highlight.js` 做 fenced code block 语法高亮，Webview 侧仅加载 light/dark 主题 CSS 并随主题切换，verify why.md#requirement-代码高亮highlightjs
- [√] 2.3 增加 admonition/footnote/task list 的基础样式并确保与 VS Code 主题变量兼容，verify why.md#requirement-脚注footnote 与 why.md#requirement-任务列表task-lists

## 3. Security Check
- [√] 3.1 执行安全检查（CSP、`html: false`、禁止远程脚本/字体、openExternal 白名单行为），并确认无 EHRB 风险

## 4. Documentation Update（SSOT 同步）
- [√] 4.1 更新 `README.md`：补充“渲染增强能力”说明与语法示例（简要），verify why.md#change-content
- [√] 4.2 更新 `helloagents/wiki/modules/customEditor.md`：补充渲染增强（KaTeX/highlight/插件列表）与 CSP 变更，verify why.md#impact-scope
- [√] 4.3 更新 `helloagents/CHANGELOG.md`：记录新增特性，verify why.md#change-content
- [√] 4.4 更新 `helloagents/history/index.md`：登记本次变更条目

## 5. Testing（手工验收）
- [?] 5.1 在 Extension Host 中打开样例 Markdown：验证 KaTeX、代码高亮、脚注、任务列表、emoji、admonition 渲染正确
  > Note: 需要在 VS Code Extension Host 环境手工验收（本次仅完成编译与静态检查）。
- [?] 5.2 切换 light/dark/high-contrast：验证样式可读性与高亮主题切换
  > Note: 需要手工切换 VS Code 主题验证；已实现基于 `body` class 的高亮 CSS 切换逻辑。
- [?] 5.3 断网验证：确认不依赖 CDN（KaTeX/highlight.js/Mermaid 均来自扩展包内本地资源）
  > Note: 代码实现为本地资源加载（`webview.asWebviewUri`）；建议断网后打开含 Mermaid/公式/高亮的文档进行确认。
