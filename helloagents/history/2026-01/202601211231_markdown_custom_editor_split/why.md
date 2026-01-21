# 变更提案：Markdown 自定义编辑器（同页 Split 预览）

## 需求背景
当前 VS Code 的 Markdown 预览主要是“另开预览标签页/分栏预览”的形态。对于希望像 JetBrains 系列 IDE 一样在**同一编辑器页面内部**实现“源码 + 预览”并可在 **Preview / Split / Editor** 间快速切换的使用习惯，现有方案无法满足：

1. Explorer 点击 `.md` 时，不能稳定做到“默认直接显示预览（或同页 Split）”，多次点击/焦点切换后容易回到源码视图。
2. 内置 Markdown Preview 无法做到“同一个编辑器页面内部一半源码一半预览”的 JetBrains 形态（它是独立的预览编辑器/分栏）。

因此需要采用 VS Code 的 **Custom Editor（CustomTextEditorProvider + Webview）** 路线，实现一个面向 `.md` 的自定义编辑器。

## 变更内容
1. 为 `.md` 注册自定义编辑器（Custom Editor），并设为默认打开方式。
2. 自定义编辑器内提供三种视图：仅源码（Editor）/ 同页分屏（Split）/ 仅预览（Preview）。
3. 源码编辑与预览实时联动：编辑后自动刷新预览内容。
4. 兼容本地图片与相对链接的基础渲染（在 Webview 安全策略下）。

## 影响范围
- **模块：**
  - 扩展主入口模块（激活与注册 Provider）
  - 自定义编辑器模块（Webview UI + 文档同步 + Markdown 渲染）
- **文件：**
  - `package.json`
  - `src/extension.ts`
  - `src/customEditor/*`
  - `README.md`
  - `helloagents/wiki/modules/extension.md`
  - `helloagents/CHANGELOG.md`
  - `helloagents/history/index.md`
- **API：**
  - VS Code `CustomTextEditorProvider`
  - VS Code `Webview` 消息通信
- **数据：**
  - 不新增持久化数据；仅使用 VS Code 文档模型与 Webview state

## 核心场景

### Requirement: Explorer 点击 `.md` 默认进入预览体验
**模块：** 自定义编辑器
当用户在 Explorer 单击打开 `.md` 文件时：
- 默认打开的是本插件的自定义编辑器（而不是普通 Text Editor）
- 默认视图为 **Split（同页一半源码一半预览）**（可配置）

#### Scenario: 仅一次点击即可看到预览
用户点击 `.md` 文件：
- 预期：无需再执行“打开预览”命令，立即看到预览区域内容（Split 或 Preview）

### Requirement: 同页 Split + 视图切换
**模块：** 自定义编辑器 Webview UI
在同一页面内：
- 提供 `Editor / Split / Preview` 三态切换
- 切换不丢失当前文本内容

#### Scenario: 编辑实时更新预览
用户在编辑区输入 Markdown：
- 预期：预览区在短延迟内刷新渲染结果

## 风险评估
- **风险：Webview 安全（XSS/外链）**
  - 缓解：默认禁用 Markdown 原始 HTML；设置 CSP；限制可加载资源域；对链接进行校验与降级处理
- **风险：性能（大文件频繁全量更新）**
  - 缓解：对输入事件做 debounce；先实现全量替换，后续可演进为增量 patch
- **风险：体验差异（与 VS Code 内置 Markdown Preview 功能不完全一致）**
  - 缓解：先满足“同页 Split”核心诉求；后续按需补齐语法高亮/目录/滚动同步等高级体验

