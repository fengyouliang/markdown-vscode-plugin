# VS Code 插件需求文档（PRD）：Markdown Custom Editor 三态视图（Editor / Split / Preview）

## 1. 背景与问题
在 VS Code 中阅读/编辑 Markdown 时，VS Code 原生的 Preview 往往以“另开一个预览编辑器标签页/分栏”的形式存在，交互形态与 JetBrains 的“同一标签页三态切换（Editor/Split/Preview）”不同。目标体验是：在 **同一个 Markdown 标签页**中完成编辑与预览的切换与并排展示，并且能“记住上次选择”。

## 2. 目标（Goals）
插件需要实现以下核心体验（默认行为）：

1) **`.md` 默认用 Custom Editor 打开**
- 用户在资源管理器中单击/打开任意 Markdown 文件（如 `README.md`），直接进入自定义编辑器 UI（同 tab 内三态切换）。

2) **Editor / Split / Preview 三态切换**
- `Editor`：仅编辑区
- `Split`：左编辑 + 右预览
- `Preview`：仅预览区
- 切换在同一标签页内完成，不新增额外预览 editor tab。

3) **工作区级记忆上次视图**
- 默认打开 Markdown 的视图模式使用“该工作区上次选择的模式”。
- 重启 VS Code 后仍生效（持久化于工作区状态）。

4) **轻量编辑可用**
- 支持编辑与保存（`Ctrl+S`）回写到文件。
- 支持外部变更同步（例如 git checkout 改动后能刷新到 UI）。

5) **预览实时更新**
- 编辑发生后预览在可接受延迟内更新（需节流，避免频繁全量渲染导致卡顿）。

## 3. 非目标（Non-goals）
以下内容不在首版范围（可作为后续迭代）：
- 100% 复刻 VS Code 原生编辑器能力（语法高亮、所有快捷键、所有编辑扩展联动）
- 100% 对齐 VS Code 内置 Markdown Preview 渲染生态（各种 Markdown 扩展的渲染插件）
- 滚动严格同步、光标定位同步等高级体验

## 4. 用户画像与使用场景
### 4.1 目标用户
- 频繁阅读/维护 README、文档、笔记的开发者
- 从 JetBrains 系列 IDE 迁移到 VS Code 的用户
- 需要“边写边看”的文档编写者

### 4.2 典型场景（User Stories）
- US1：作为用户，我打开 `README.md`，希望直接出现 Editor/Split/Preview 三态 UI。
- US2：作为用户，我切换到 `Split`，希望边写边看，预览实时更新。
- US3：作为用户，我更偏爱 `Preview`，希望下次在同一工作区打开任意 `.md` 默认就进入 `Preview`。
- US4：作为用户，我想回到原生编辑器时，希望能通过 `Reopen With...` 快速切回 `Text Editor`。

## 5. 交互与行为规格（UX/Behavior Spec）
### 5.1 视图切换
- 编辑器顶部提供 3 个按钮：`Editor` / `Split` / `Preview`
- 点击后立即切换布局并持久化当前选择

### 5.2 预览刷新
- `Editor/Split` 模式下用户输入时触发刷新（节流，例如 150~300ms）
- `Preview` 模式下文本变更仍应更新预览（同样节流）

### 5.3 回退/兼容
- UI 提供入口触发 VS Code `Reopen With...`
- 文档中说明如何通过 `workbench.editorAssociations` 永久回退到 `Text Editor`

## 6. 功能需求（Functional Requirements）
### 6.1 Custom Editor 注册
- 通过 `contributes.customEditors` 声明自定义编辑器：
  - `viewType = mdAutoPreview.markdownEditor`
  - `selector = *.md, *.markdown`
  - `priority = default`

### 6.2 状态持久化
- 使用 `ExtensionContext.workspaceState` 保存 `viewMode`

### 6.3 预览渲染
- 使用 `markdown-it` 在本地渲染 HTML
- 安全默认：禁用原始 HTML（`html: false`）
- 可选支持：相对路径图片（`./assets/x.png`）在 file scheme 下转换为 `webview.asWebviewUri`

## 7. 非功能需求（Non-functional Requirements）
- 性能：大多数 Markdown 文件在输入后 200ms~500ms 内完成预览刷新（取决于文件大小）
- 稳定性：不出现明显卡顿、内存持续增长、消息循环导致的闪烁
- 隐私：不采集遥测；不上传用户内容
- 安全：Webview 严格 CSP；不加载外部脚本；仅处理白名单消息

## 8. 验收标准（Acceptance Criteria）
满足以下条件即视为达标：
1) 打开任意 `.md`，默认进入 Custom Editor 三态 UI（同 tab 内切换）。
2) `Editor / Split / Preview` 切换可用且不新增额外预览 editor tab。
3) Split 下编辑时预览实时刷新；`Ctrl+S` 保存正常。
4) 同一工作区记住上次选择的视图模式，重启后仍生效。
5) 通过 `Reopen With...` 可切回 `Text Editor`。
