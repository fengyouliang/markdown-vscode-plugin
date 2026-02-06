# Change Proposal: Markdown 渲染增强（KaTeX / 高亮 / 常用插件）

## Requirement Background
当前扩展的 Markdown 预览基于 `markdown-it` 在 Extension Host 侧渲染 HTML，并在 Webview 中展示（已支持 Mermaid 围栏代码块渲染）。在日常写作/文档场景中，仍缺少一些“高频但基础”的 Markdown 预览能力：
- 数学公式（KaTeX / MathJax）无法渲染，影响技术文档、课程笔记、论文草稿等内容的可读性。
- 代码块缺少语法高亮，影响代码示例的阅读体验。
- 脚注、任务列表、emoji、容器块（admonition）等常见扩展语法缺失，导致与 GitHub/常见 Markdown 工具链存在体验落差。

本次变更目标是在不引入 CDN、保持当前安全默认（`html: false`）与 CSP 策略的前提下，为预览渲染补齐这些常用能力，并与现有的滚动同步/复制代码块能力兼容。

## Product Analysis

### Target Users and Scenarios
- **User Groups:**
  - 技术文档作者（README / 设计文档 / API 文档）
  - 学生/研究者（数学/工程类笔记、论文草稿）
  - 团队协作写作者（需要在 VS Code 内快速预览而非切换到浏览器）
- **Usage Scenarios:**
  - 在 Split 模式边写边看预览，包含公式与代码示例
  - 用任务列表跟踪 TODO/检查项
  - 用 admonition（提示/警告块）突出关键内容
- **Core Pain Points:**
  - 公式无法渲染导致大量内容呈现为“纯文本符号”
  - 无高亮导致代码块不易读且难以快速定位关键语法
  - 常用扩展语法缺失造成迁移成本与一致性问题

### Value Proposition and Success Metrics
- **Value Proposition:** 在同一标签页内提供更接近主流 Markdown 生态的预览体验，提升写作效率与可读性。
- **Success Metrics:**
  - KaTeX 数学公式在 Preview/Split 中正确渲染（离线可用）
  - fenced code block 在 Preview/Split 中具有语法高亮，并随 VS Code 主题明暗切换
  - 脚注/任务列表/emoji/admonition 语法渲染正确
  - 不引入远程脚本与 CDN，不降低 Workspace Trust 安全描述

### Humanistic Care
保持离线可用与安全默认，避免在受限/不受信任工作区中引入外部依赖访问；同时尽量与 VS Code 主题一致，提升可读性与视觉舒适度。

## Change Content
1. 在 Extension Host 侧为 `markdown-it` 增加常见插件：
   - KaTeX 数学公式
   - 脚注（footnote）
   - 任务列表（task lists）
   - emoji
   - admonition 容器块（基于 container）
2. 在 Webview 侧增加渲染增强与样式：
   - 引入 KaTeX CSS 与字体加载所需 CSP（本地资源）
   - 引入 highlight.js（本地脚本）并在 `init/update` 后对代码块执行高亮
   - 增加 admonition/footnote/task list 的基础样式（尽量贴近 VS Code 主题）
3. 保持并验证：
   - `html: false` 默认不变
   - 既有 Mermaid 渲染、Copy Code Button、滚动同步行为不回退

## Impact Scope
- **Modules:** `customEditor`（渲染与 Webview UI）
- **Files (expected):**
  - `package.json` / `package-lock.json`（新增依赖）
  - `src/customEditor/markdownRenderer.ts`（markdown-it 插件接入、admonition 渲染规则）
  - `src/customEditor/webviewHtml.ts`（CSP、样式、highlight.js 集成）
  - `README.md`（功能说明）
  - `helloagents/wiki/modules/customEditor.md`（模块文档同步）
  - `helloagents/CHANGELOG.md`、`helloagents/history/index.md`（变更记录）
- **APIs:** 无新增 VS Code 命令/对外 API
- **Data:** 无数据结构变更

## Core Scenarios

### Requirement: 数学公式渲染（KaTeX）
**Module:** customEditor
在 Markdown 中书写数学公式并在 Preview/Split 中正确显示。

#### Scenario: 行内公式
在段落中使用 `$E=mc^2$`。
- 预览渲染为 KaTeX 行内公式，布局与文字对齐合理。

#### Scenario: 块级公式
使用 `$$ ... $$` 包裹多行公式。
- 预览渲染为独立公式块，居中/换行正常。

### Requirement: 代码高亮（highlight.js）
**Module:** customEditor
fenced code block 根据语言进行语法高亮，并随主题明暗切换。

#### Scenario: 指定语言的代码块
使用 ```ts / ```js 等围栏代码块。
- 预览出现语法高亮；Copy 按钮仍可用。

### Requirement: 脚注（footnote）
**Module:** customEditor
支持脚注引用与脚注列表渲染。

#### Scenario: 基础脚注
使用 `[^1]` 与 `[^1]: ...`。
- 文中引用可跳转；脚注区展示正确，样式可读。

### Requirement: 任务列表（task lists）
**Module:** customEditor
支持 `- [ ]` / `- [x]` 任务列表渲染。

#### Scenario: 只读任务列表
渲染为 checkbox 列表。
- checkbox 显示正确，默认不可编辑（避免误操作改变文档语义）。

### Requirement: Emoji
**Module:** customEditor
支持 `:smile:` 等简码替换为 emoji。

#### Scenario: emoji 简码
在段落中写 `:rocket:`。
- 预览显示对应 emoji。

### Requirement: 容器块（admonition）
**Module:** customEditor
支持 `::: tip` / `::: warning` 等容器块语法，渲染为提示/警告块。

#### Scenario: Tip/Warn 容器
使用 `::: tip 标题 ... :::`。
- 预览显示带标题的容器块，并有基础配色与边框区分。

## Risk Assessment
- **Risk:** 增加第三方依赖与 Webview 资源加载后，可能引入 CSP/离线加载问题或预览性能回退。  
  **Mitigation:** 全部依赖使用扩展包内本地资源；CSP 仅放开必要的 `font-src`；高亮与重排使用节流/限额策略；保留当前 `html: false` 安全默认。
- **Risk:** 插件渲染产生的 HTML 可能影响滚动同步锚点计算。  
  **Mitigation:** 高亮/KaTeX/容器块渲染后统一标记 offsets dirty 并重算；必要时在 Split 模式触发一次对齐同步。

