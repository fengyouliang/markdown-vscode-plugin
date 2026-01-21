# Change Proposal: Markdown 单击自动预览（VS Code Extension）

## Requirement Background
在 VS Code 中阅读/编辑 Markdown 时，用户希望获得类似 JetBrains/IDEA 的体验：打开 `.md` 文件后自动呈现“左侧源码编辑 + 右侧渲染预览”的双栏视图，并且在编辑时预览实时更新、切换文件时预览自动跟随，无需每次手动点击“打开预览”。

## Product Analysis

### Target Users and Scenarios
- **User Groups:** 频繁阅读/维护 README、文档、笔记的开发者；从 JetBrains IDE 迁移到 VS Code 的用户
- **Usage Scenarios:** 打开/切换 Markdown 文件进行阅读与边写边看
- **Core Pain Points:** 需要重复手动打开预览；打开预览容易抢焦点影响编辑节奏

### Value Proposition and Success Metrics
- **Value Proposition:** “打开即预览”的默认体验 + 不打断编辑（保持焦点）
- **Success Metrics:** 打开 Markdown 后 1 次内自动出现预览；切换文件无需手动操作；无明显闪烁/循环触发

### Humanistic Care
- 默认不采集任何遥测数据，不处理用户隐私内容。

## Change Content
1. 自动检测用户激活的 Markdown 编辑器并打开右侧预览
2. 支持跟随/锁定两种预览模式与焦点保持策略
3. 提供命令与状态栏开关，支持排除路径与 scheme 白名单

## Impact Scope
- **Modules:** extension
- **Files:** `src/extension.ts`, `package.json`, `README.md`
- **APIs:** 无外部 API；仅使用 VS Code 内置命令与配置
- **Data:** 仅 VS Code Settings（`mdAutoPreview.*`）

## Core Scenarios

### Requirement: 打开 Markdown 文件自动预览
**Module:** extension
当用户在资源管理器中单击/打开任意 Markdown 文件时，自动在右侧打开渲染预览。

#### Scenario: 用户单击打开 README.md
在激活 Markdown 编辑器后：
- 自动打开右侧预览面板
- 保持焦点在左侧源码编辑器（默认 keepFocus=true）

### Requirement: 预览跟随当前激活 Markdown（默认）
**Module:** extension
用户切换到另一个 Markdown 文件时，右侧预览同步显示当前激活文件内容。

#### Scenario: 在多个 Markdown 文件之间切换
- 预览内容随当前激活文件变化
- 避免循环触发与闪烁

### Requirement: 支持锁定预览模式（可选）
**Module:** extension
当 mode=locked 时，为每个 Markdown 文件打开锁定预览。

#### Scenario: 打开两个不同 Markdown
- 每个文件可拥有独立预览标签页（可能产生多个预览 tab）

### Requirement: 可配置排除与允许规则
**Module:** extension
支持 scheme 白名单与排除 glob，避免对不希望处理的文档生效。

#### Scenario: node_modules 下的 Markdown 不自动预览
- 命中 excludeGlobs 时不触发自动预览

## Risk Assessment
- **Risk:** 自动打开预览可能引发循环触发、闪烁或焦点抖动
- **Mitigation:** 增加 suppress 标志与 debounce；默认 keepFocus=true；错误提示仅一次

