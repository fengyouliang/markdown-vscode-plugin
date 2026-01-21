# 技术设计：Markdown 自定义编辑器（同页 Split 预览）

## 技术方案

### 核心技术
- VS Code Extension API：`CustomTextEditorProvider`
- Webview：HTML + CSS + 原生 JS（不引入前端构建工具，保持轻量）
- Markdown 渲染：`markdown-it`（Extension 侧渲染，Webview 侧仅展示 HTML）

### 实现要点
1. **注册 Custom Editor**
   - 在 `package.json` 的 `contributes.customEditors` 中声明 `viewType` 与 `.md` selector，并设置 `priority: "default"`，确保 Explorer 打开 `.md` 时默认进入自定义编辑器。
   - 在 `activate()` 中调用 `registerCustomEditorProvider` 注册 Provider。

2. **Webview UI（Editor / Split / Preview）**
   - 顶部工具条（分段按钮或按钮组）用于切换视图。
   - 视图切换用 CSS 控制布局：
     - Editor：仅显示 textarea
     - Split：左右（或上下）双栏，左 textarea，右 preview
     - Preview：仅显示 preview

3. **文档同步（Webview ↔ TextDocument）**
   - Webview `input` 事件 → `postMessage({ type: "edit", text })`
   - Extension 收到 edit：
     - 使用 `WorkspaceEdit` 对全文做 replace（从 `0,0` 到 `document.lineCount` 末尾）
     - 增加防抖与“自更新”标记，避免 onDidChangeTextDocument 回推引起循环
   - `workspace.onDidChangeTextDocument` 监听到 document 变化 → `postMessage({ type: "update", text, html })`

4. **Markdown 渲染**
   - Extension 侧使用 `markdown-it` 渲染为 HTML。
   - 相对链接/图片：
     - 对 `src/href` 为相对路径的资源，基于当前文档目录解析成 `vscode.Uri`
     - 转换为 `webview.asWebviewUri`，以便 Webview 正确加载本地资源

## 架构决策 ADR

### ADR-003: 引入 Custom Editor 实现同页 Split 预览
**Context:** VS Code 内置 Markdown Preview 只能作为独立预览编辑器/分栏展示，无法实现 JetBrains 那种“同一页面内部一半源码一半预览”的布局与三态切换体验。

**Decision:** 为 `*.md` 注册 `mdAutoPreview.markdownSplit` 自定义编辑器，使用 Webview 在同一编辑器页面内提供 `Editor / Split / Preview` 三态，并在 Extension 侧用 `markdown-it` 完成预览渲染。

**Rationale:** 自定义编辑器是 VS Code 官方提供的扩展点，能稳定接管“点击文件默认打开形态”，同时实现同页 Split；在不引入前端构建链路的前提下，用原生 Webview UI + Extension 侧渲染即可快速落地并可持续迭代。

**Alternatives:**
- 继续复用内置 Preview 命令 → 拒绝原因：无法实现同页 Split。
- Webview + Monaco 双栏编辑 → 拒绝原因：引入依赖与构建复杂度较高，首期不优先。

**Impact:** `.md` 默认打开方式变为自定义编辑器；与内置 Preview 的体验存在差异（主题/插件生态/高级渲染），后续可按需补齐。

## 安全与性能

### 安全
- CSP：`default-src 'none'`，仅允许当前 webview source 的 style/img/script
- 禁用 Markdown 原始 HTML：`markdown-it({ html: false })`
- 链接校验：拒绝 `javascript:` 等危险 scheme；外链可按需使用 `vscode.env.openExternal`（本期先不强制接管点击行为）

### 性能
- 输入事件 debounce（例如 100~200ms）
- 渲染在 Extension 侧执行，避免 Webview 引入复杂依赖；后续如需更快可做增量渲染/scroll sync

## 测试与发布
- 本期以功能验证为主：
  - F5 启动 `Extension Development Host`
  - Explorer 点击 `.md` 应默认打开自定义编辑器并显示 Split/Preview
  - 编辑内容应自动同步并刷新预览
- 发布流程维持现有（`vsce package/publish`），并在 README 与知识库补充说明
