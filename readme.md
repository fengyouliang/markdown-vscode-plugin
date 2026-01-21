# VS Code 插件需求文档（PRD）：Markdown 单击自动预览（默认单栏预览，可选双栏）

## 1. 背景与问题
在 VS Code 中查看 Markdown 时，用户希望获得更顺滑的阅读体验：在资源管理器中点击打开 `.md` 文件后，能够**自动呈现渲染预览**（默认单栏预览；也可选双栏对照），并且在编辑时预览实时更新、切换文件时预览自动跟随，无需每次手动点击“打开预览”。

## 2. 目标（Goals）
插件需要实现以下核心体验（默认行为）：

1) **打开 Markdown 即自动预览**
- 用户在资源管理器中单击/打开任意 Markdown 文件（如 `README.md`），默认在**当前编辑区（单栏）**直接显示 Markdown 渲染预览（Preview）。
- 可选配置：用户也可以设置为**右侧（双栏）**打开预览，实现“左侧源码 + 右侧预览”的对照阅读。

2) **预览实时更新**
- 预览内容随源码更新自动刷新（依赖 VS Code 内置 Markdown 预览机制）。
- 当启用双栏模式时，用户在左侧编辑，右侧预览应实时更新。

3) **预览跟随当前激活的 Markdown（默认推荐）**
- 用户切换到另一个 `.md` 文件时，预览同步显示当前激活文件的内容。
- 在跟随模式下，应尽量复用同一个预览标签页/面板，避免 tab 爆炸。

4) **不打断编辑（默认保持焦点在左侧）**
- 单栏预览（same）下，默认以“阅读”为主：预览打开后焦点可落在预览。
- 双栏预览（side）下，默认以“编辑”为主：预览打开后焦点保持在左侧源码编辑器（可配置关闭）。

5) **可配置“锁定预览”模式（可选）**
- 支持另一种模式：每个文件打开一个“锁定预览”（右侧预览不自动跟随，类似“为当前文件固定一个预览标签页”）。

## 3. 非目标（Non-goals）
以下内容不在首版范围（可作为后续迭代）：

- 自研 Markdown 渲染引擎/主题（首版复用 VS Code 内置预览）
- 自定义 Markdown 语法扩展、数学公式渲染增强等（交给现有扩展或 VS Code 本身）
- 深度 UI 皮肤化（仅提供必要的命令与设置）
- 在非 Markdown 文档（例如 `.txt`、Notebook 的 markdown cell）上强制启用

## 4. 用户画像与使用场景
### 4.1 目标用户
- 频繁阅读/维护 README、文档、笔记的开发者
- 从 JetBrains 系列 IDE 迁移到 VS Code 的用户
- 需要“边写边看”的文档编写者

### 4.2 典型场景（User Stories）
- US1：作为用户，我单击打开 `README.md`，希望自动出现右侧渲染预览。
- US2：作为用户，我在左侧编辑时，希望右侧即时更新且不抢走焦点。
- US3：作为用户，我切换到 `docs/xxx.md`，希望右侧预览自动切换到当前文件。
- US4：作为用户，我不希望插件对非 Markdown 文件产生任何影响。
- US5：作为用户，我希望可选“锁定预览”，让每个 md 都有固定预览标签页。

## 5. 交互与行为规格（UX/Behavior Spec）
### 5.1 触发时机
当满足以下任一条件时触发“确保预览存在”的逻辑：
- 用户激活一个 Markdown 编辑器（点击编辑器标签、在资源管理器中打开等）
- VS Code 启动后，当前激活编辑器就是 Markdown

> 触发来源：监听 “当前激活文本编辑器变化”。

### 5.2 布局规则（单栏/双栏）
- 默认：对当前激活的 Markdown 文档，在**当前编辑组（same）**打开预览（单栏）。
- 可选：对当前激活的 Markdown 文档，在**右侧（Beside / side）**打开预览（双栏）。
- 当选择双栏模式时：如果当前 Markdown 编辑器已经在某个分栏（Column N），预览应在该分栏的右侧创建/复用（Column N+1），保持空间相邻。

### 5.3 焦点规则（关键体验）
- 单栏模式（same）：预览打开后焦点默认落在预览（便于阅读）。
- 双栏模式（side）：默认保持焦点在左侧源码编辑器（便于编辑），并允许配置关闭（让焦点落在预览）。

### 5.4 跟随预览 vs 锁定预览（两种模式）
- 跟随模式（默认建议）：
  - 右侧存在一个预览面板，内容随“当前激活的 Markdown 文档”变化。
  - 切换 Markdown 文件时，不应不断创建新的预览标签页（避免 tab 爆炸）。
- 锁定模式（可选）：
  - 每次打开/激活一个 Markdown 文件，都会为该文件打开一个“锁定预览”。
  - 切换到另一个 Markdown 文件时，旧的锁定预览不变，新的文件生成新的锁定预览（可能产生多个预览标签页）。

### 5.5 与用户手动操作的协调
- 如果用户手动关闭右侧预览：
  - 默认策略：下次再次激活 Markdown 时仍会自动重新打开（保证“打开即预览”的一致性）。
  - 可配置策略：尊重用户关闭（本次会话不再自动弹出，直到手动开启或重新启用自动预览）。

### 5.6 防抖与防循环
- 自动打开预览会触发编辑器状态变化，必须避免：
  - 重复执行打开预览导致闪烁
  - 打开预览后不断递归触发事件
- 需要在实现中具备：
  - 事件抑制标志（suppress）
  - 对同一文档的短时间重复激活去重（如记录 lastUri + debounce）

## 6. 功能需求（Functional Requirements）
### 6.1 兼容性与前置依赖
- 依赖 VS Code 内置 Markdown 预览命令（不自研渲染）。
- 若内置命令不可用（极少数环境/被禁用），插件应：
  - 不崩溃
  - 仅提示一次可读错误信息（可配置关闭提示）

### 6.2 识别 Markdown 的规则
默认仅对以下文档生效：
- `document.languageId === "markdown"`
- `document.uri.scheme` 属于允许列表（默认允许：`file`, `untitled`, `vscode-remote`）
- 可配置允许/排除某些路径（如 `**/node_modules/**` 下的 md 不自动预览）

### 6.3 自动预览执行方式
插件调用 VS Code 命令完成打开：
- 单栏（same）+ 跟随模式：`markdown.showPreview`
- 单栏（same）+ 锁定模式：`markdown.showLockedPreview`
- 双栏（side）+ 跟随模式：`markdown.showPreviewToSide`
- 双栏（side）+ 锁定模式：`markdown.showLockedPreviewToSide`

### 6.4 命令（Commands）
插件至少提供以下命令（用于快捷键/命令面板）：
- `Markdown Auto Preview: Enable`（启用自动预览）
- `Markdown Auto Preview: Disable`（禁用自动预览）
- `Markdown Auto Preview: Toggle`（切换启用/禁用）
- `Markdown Auto Preview: Open Preview to Side (Follow)`（手动按跟随模式打开）
- `Markdown Auto Preview: Open Preview to Side (Locked)`（手动按锁定模式打开）

### 6.5 配置项（Settings）
建议配置键（示例命名，可调整）：

- `mdAutoPreview.enabled`（boolean，默认 `true`）
  - 是否启用自动预览
- `mdAutoPreview.openLocation`（string，`same` | `side`，默认 `same`）
  - 预览打开位置：same=单栏预览；side=右侧双栏预览
- `mdAutoPreview.mode`（string，`follow` | `locked`，默认 `follow`）
  - 预览模式
- `mdAutoPreview.keepFocus`（boolean，默认 `true`）
  - 打开预览后是否把焦点留在源码编辑器（仅在 `openLocation=side` 时有意义）
- `mdAutoPreview.reopenPolicy`（string，`always` | `respectClosedInSession`，默认 `always`）
  - 用户关闭预览后的策略
- `mdAutoPreview.allowedSchemes`（array，默认 `["file","untitled","vscode-remote"]`）
- `mdAutoPreview.excludeGlobs`（array，默认 `["**/node_modules/**","**/.git/**"]`）
- `mdAutoPreview.onlyExtensions`（array，可选，默认空=不限制）
  - 例如只对 `[".md",".markdown"]` 生效（当语言识别不稳定时可作为补充）

### 6.6 状态可见性（可选但推荐）
- 状态栏显示当前状态：`MD Auto Preview: On/Off`（可点击切换）
- 或在编辑器右上角提供一个轻量提示（非强制）

## 7. 非功能需求（Non-functional Requirements）
- 性能：激活 Markdown 后应在 200ms~500ms 内完成预览打开（取决于机器与 VS Code 渲染，插件自身逻辑应尽量轻量）。
- 稳定性：不得造成编辑器频繁闪烁、焦点抖动、无限循环触发。
- 兼容性：支持多工作区（multi-root）、Remote（SSH/WSL/容器）下的 Markdown 文件。
- 隐私：默认不采集任何遥测数据；如未来需要统计，必须 opt-in 并明确说明。

## 8. 边界情况与处理规则（Edge Cases）
- 已经存在预览：
  - 跟随模式：不应重复创建预览；优先复用现有预览标签页/面板。
  - 锁定模式：允许创建多个预览，但应避免同一文件重复创建（可用“是否已为该 URI 打开锁定预览”的简单缓存）。
- 用户把预览拖到其他分栏/其他组：
  - 插件不强制改回；后续只保证“能预览”，不强制布局还原（可作为后续增强选项）。
- Markdown 文件在 diff 视图或只读虚拟文档中：
  - 默认不自动预览（避免影响 review/compare 流程），可后续加配置开关。
- 非 markdown 但内容是 markdown（例如 `.mdx`、`.markdown`）：
  - 默认依赖 VS Code 的 languageId；用户可通过 `onlyExtensions` 或 VS Code 语言关联解决。

## 9. 验收标准（Acceptance Criteria）
满足以下条件即视为达标：

1) 打开任意 `.md` 文件，默认在当前编辑组自动出现渲染预览（单栏预览）。
2) 当 `openLocation=side` 时，右侧自动出现渲染预览，左侧保留源码编辑器。
3) 源码内容变更后，预览自动更新（无需手动刷新）。
4) 在跟随模式下，切换到另一 Markdown 文件，预览随之切换且不会无限新增预览标签页。
5) 插件对非 Markdown 文件不产生影响。
6) 关闭/开启自动预览命令生效，配置项生效且无需重启（或明确说明需重载窗口）。
7) 不出现明显闪烁、循环触发、CPU 占用异常等问题。

## 10. 待确认项（实现前需要你最后拍板）
- 默认策略是否采用：`openLocation=same` + `mode=follow` + `reopenPolicy=always`（更接近“点击即预览（单栏）”的阅读体验）。
- 如果你仍需要双栏对照阅读：是否将 `openLocation=side` 与 `keepFocus=true` 作为推荐组合。
- 是否需要“滚动同步/定位同步”的强保证：
  - VS Code 内置预览通常支持一定程度同步，但如果你要求“严格同步”，可能需要额外能力（后续迭代项）。

如果你确认“默认策略”和“是否严格滚动同步”，我可以继续输出：插件 `package.json`/命令/配置的完整设计稿，以及首版实现的代码结构与关键 API 清单。
