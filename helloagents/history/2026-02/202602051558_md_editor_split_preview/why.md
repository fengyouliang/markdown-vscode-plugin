# Change Proposal: Markdown 自定义编辑器三态视图（Editor / Split / Preview）

## Requirement Background
当前扩展的核心能力是“保留 VS Code 原生 Markdown Text Editor，并在打开/切换 Markdown 时自动打开内置 Preview”。但目标体验已变化：希望在 VS Code 中获得接近 JetBrains 的 Markdown 体验——在**同一个标签页**内部提供 `Editor / Split / Preview` 三态切换，并且默认视图能够“记住上次选择”（按工作区维度）。

该变化属于交互形态与打开方式的重构：从“Text Editor + Preview Editor（两个编辑器）”转向“Custom Editor（一个 Webview UI，内部自带编辑与预览）”。

## Product Analysis

### Target Users and Scenarios
- **User Groups:** 需要频繁阅读/编写 Markdown 的开发者与文档作者；从 JetBrains 系列 IDE 迁移到 VS Code 的用户。
- **Usage Scenarios:** 阅读 README/设计文档时希望快速切换到 Preview；写文档时希望 Split（左编辑右预览）且预览实时更新；偶尔需要纯 Editor 专注编辑。
- **Core Pain Points:**
  - VS Code 原生预览通常会产生“两个编辑器/两个标签”的心智负担，不像 JetBrains 是一个标签里的三态切换。
  - 用户希望“打开 `.md` 就进入这种三态界面”，并自动记住工作区内上次使用的视图。

### Value Proposition and Success Metrics
- **Value Proposition:** 将 Markdown 的阅读与编辑收敛为一个自定义编辑器，提供 JetBrains 风格三态切换与工作区记忆，减少窗口/标签管理成本。
- **Success Metrics:**
  - ✅ 打开任意 `.md`，默认进入自定义编辑器界面（无需手动 Reopen With）。
  - ✅ `Editor / Split / Preview` 三态切换 < 200ms（以 UI 切换为主）。
  - ✅ Split 下编辑内容变更后预览在 200ms~500ms 内更新（与文件大小相关，需节流）。
  - ✅ 同一工作区重启 VS Code 后仍能恢复上次视图选择。

### Humanistic Care
- 隐私：不上传任何 Markdown 内容；渲染仅在本地完成。
- 可访问性：按钮/标签具有可读文本与基础键盘可达性（Tab/Enter）。
- 可回退：保留 “Reopen With… → Text Editor” 的路径，避免用户被锁死在自定义界面。

## Change Content
1. 注册 Markdown Custom Editor（Webview），成为 `.md` 默认打开方式。
2. 在 Webview 内实现 `Editor / Split / Preview` 三态切换，并将视图选择按工作区持久化。
3. 提供轻量编辑能力（满足编辑/保存/外部变更同步），Split/Preview 使用 `markdown-it` 渲染预览。
4. 更新文档与知识库，反映从“自动预览”到“自定义编辑器三态”的产品定位变化。

## Impact Scope
- **Modules:** VS Code 扩展入口（activate）、Custom Editor Provider、Webview UI（脚本与样式）
- **Files:** `src/extension.ts`、`src/customEditor/*`、`package.json`、`README.md`、`docs/PRD.md`、`helloagents/wiki/*`、`helloagents/CHANGELOG.md`
- **APIs:** VS Code `CustomTextEditorProvider` / `registerCustomEditorProvider` / `Webview` 消息通道
- **Data:** `workspaceState` 保存工作区级视图模式（无业务数据结构变更）

## Core Scenarios

### Requirement: Custom Editor as Default for Markdown
**Module:** VS Code Extension / Contributions
打开 `.md` 文件默认进入自定义编辑器（而不是原生 Text Editor）。

#### Scenario: Open md in custom editor by default
用户在资源管理器中单击打开 `README.md`：
- 期望：直接进入自定义编辑器 UI（顶部可切换 Editor/Split/Preview）。
- 期望：不再依赖 `markdown.showPreviewToSide` 产生额外 Preview 标签页。

### Requirement: Editor / Split / Preview view switching
**Module:** Webview UI
在同一标签页内完成三态切换，不新增额外 editor tab。

#### Scenario: Switch to Editor
- 期望：只显示编辑区。

#### Scenario: Switch to Split
- 期望：左右两栏（编辑 + 预览）同时可见。

#### Scenario: Switch to Preview
- 期望：只显示预览区。

### Requirement: Workspace-level view mode memory
**Module:** Extension State
记住工作区内用户上次选择的视图模式。

#### Scenario: Persist last view in workspace
用户在 A 工作区选择 `Preview`，重启 VS Code 再打开 `.md`：
- 期望：默认显示 `Preview`（直到用户切换）。

### Requirement: Lightweight editing and save
**Module:** CustomTextEditorProvider
Webview 内编辑内容能写回 `TextDocument`，并与 VS Code 保存/撤销机制兼容到“可用”水平。

#### Scenario: Edit markdown and save
- 期望：在 Editor/Split 中修改内容，文件进入 dirty 状态，可 `Ctrl+S` 保存。
- 期望：外部修改（例如 git checkout / 文件被其他扩展改动）能同步到 Webview。

### Requirement: Markdown preview rendering via markdown-it
**Module:** Rendering
预览渲染由 `markdown-it` 完成，并在文本变化时增量刷新（节流）。

#### Scenario: Render on change
- 期望：编辑时预览刷新及时且不明显卡顿。

## Risk Assessment
- **Risk:** 将 `.md` 默认打开方式切换为 Custom Editor，可能影响用户对“原生编辑器能力/快捷键/其他扩展”的预期。
  - **Mitigation:** 提供清晰的文档说明与回退路径（Reopen With → Text Editor）；保持实现轻量、可配置/可禁用。
- **Risk:** Webview 渲染 HTML 存在 XSS/注入风险（Markdown 允许原始 HTML）。
  - **Mitigation:** 使用严格 CSP（禁用远程脚本）；仅允许本地脚本；避免在扩展侧执行用户注入脚本。
- **Risk:** 大文件频繁全量渲染导致卡顿。
  - **Mitigation:** Webview 侧编辑消息节流；扩展侧渲染节流与去重；必要时设置最大刷新频率。
