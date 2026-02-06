# Technical Design: Markdown 渲染增强（KaTeX / 代码高亮 / 常用插件）

## Technical Solution

### Core Technologies
- Markdown 渲染：`markdown-it`（Extension Host 侧渲染 HTML）
- 数学公式：`markdown-it-texmath` + `katex`（Extension Host 侧渲染为 KaTeX HTML，Webview 侧加载 KaTeX CSS/字体）
- 常用扩展语法：
  - `markdown-it-footnote`（脚注）
  - `markdown-it-task-lists`（任务列表）
  - `markdown-it-emoji`（emoji）
  - `markdown-it-container`（admonition 容器块）
- 代码高亮：`highlight.js`（Extension Host 侧渲染为带 token class 的 HTML，Webview 侧仅加载主题 CSS）

### Implementation Key Points
1. **markdown-it 插件接入（Extension Host）：**在 `src/customEditor/markdownRenderer.ts` 中对 `MarkdownIt` 实例注册常用插件，保持 `html: false` 不变。
2. **KaTeX 样式加载（Webview）：**在 `src/customEditor/webviewHtml.ts` 中通过 `webview.asWebviewUri` 引入 `katex.min.css`，并补齐 `font-src ${webview.cspSource}` 以允许 KaTeX 字体加载（仍不允许远程字体）。
3. **代码高亮（Extension Host）：**在 `markdown-it` 的 `highlight` 回调中调用 `highlight.js` 对 fenced code block 做语法高亮，并给 `<code>` 增加 `hljs` class；Webview 侧仅加载 light/dark 主题 CSS，并通过监听 `body` class 变化实现主题切换。
4. **主题适配：**根据 Webview `body` 的 `vscode-dark/vscode-high-contrast` class 切换高亮 CSS（light/dark）与 KaTeX 配色兼容（KaTeX 主要由字体/布局决定）。
5. **滚动同步兼容：**高亮与 KaTeX/容器块可能改变布局高度，需要在增强完成后刷新锚点 offsets，并在 Split 模式触发一次对齐同步（复用现有 Mermaid 渲染后的逻辑）。

## Architecture Decision ADR

### ADR-006: KaTeX render in Extension Host + highlight.js in Extension Host
**Context:** 当前架构为“Extension Host 渲染 Markdown → Webview 展示并做局部增强（Mermaid/Copy 按钮）”。数学公式与高亮都需要额外渲染逻辑，同时必须离线可用并受 CSP 限制。  
**Decision:** 数学公式在 Extension Host 侧通过 `markdown-it-texmath` 渲染为 HTML；代码高亮也在 Extension Host 侧通过 `highlight.js` 在渲染阶段生成 token HTML，Webview 侧仅负责加载本地主题 CSS 并随主题切换。  
**Rationale:** 避免在 Webview 内引入高亮脚本与额外 CSP 风险；渲染链路更简单（HTML 一次生成），仅需补齐 CSS；资源均来自扩展包内本地文件，满足离线与 Workspace Trust 要求。  
**Alternatives:**
- MathJax（拒绝原因：体积与运行成本更高，且复杂度/兼容点更多）
- markdown-it-katex（拒绝原因：存在高危 XSS advisory 且无修复版本）
- Shiki（拒绝原因：实现与主题同步成本更高、依赖更重）
- Webview 侧做高亮（拒绝原因：需要引入可在 CSP 下可靠加载的浏览器脚本与更多实现复杂度）  
**Impact:** Extension Host 渲染阶段会增加一定 CPU 开销；通过“仅在指定语言/小于阈值的 code block 执行高亮”控制性能风险。

## Security and Performance
- **Security:**
  - 保持 `markdown-it` 禁用原始 HTML（`html: false`），不接受 Markdown 输入中的 `<script>` 等原始标签。
  - Webview 仅加载本地脚本（nonce + `webview.asWebviewUri`），不使用 CDN。
  - CSP 仅新增必要的 `font-src ${webview.cspSource}`，不放开 `https:` 字体来源。
  - 任务列表 checkbox 默认只读（disabled/不可编辑），避免交互造成“看起来改了内容但实际没改文件”的误解。
- **Performance:**
  - 代码高亮在 Extension Host 渲染阶段执行，仅对“指定语言且 code 长度小于阈值”的 fenced code block 启用，以避免大文档卡顿。
  - Webview 侧仅切换高亮主题 CSS（light/dark），不额外执行高亮脚本，降低重排与 CPU 开销。

## Testing and Deployment
- **Testing (manual):**
  - 使用包含 KaTeX、代码块、脚注、任务列表、emoji、admonition 的 Markdown 样例验证 Preview/Split。
  - 切换 VS Code 主题（light/dark/high-contrast）验证高亮与样式可读性。
  - 断网验证：KaTeX、highlight.js、Mermaid 均可用且无外部资源请求。
  - 验证 Copy Code Button 仍可用、Mermaid 仍可渲染、滚动同步无明显漂移。
- **Deployment:**
  - 依赖全部为 `dependencies`，确保 `.vsix` 打包包含所需运行时文件（脚本/CSS/字体）。
