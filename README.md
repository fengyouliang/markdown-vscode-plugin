# Markdown Auto Preview

在 VS Code 中查看 Markdown 的两种形态：

1) **自定义编辑器（推荐 / JetBrains 风格）**：Explorer 点击 `.md` 后，默认在**同一页面**内显示 `Editor / Split / Preview`，其中 Split 是“左侧源码 + 右侧预览”。

2) **内置 Preview 自动打开（兼容模式）**：继续使用 VS Code 内置 Markdown Preview，通过本扩展在打开/切换 Markdown 文件时自动执行预览命令（支持单栏或右侧）。

## 功能
### 自定义编辑器（Custom Editor）
- Explorer 单击打开 `.md`：默认进入自定义编辑器（同页 Split/Preview）
- 支持三态切换：`Editor / Split / Preview`
- 支持编辑内容后预览实时刷新（可配置防抖/开关）

### 内置 Preview 自动打开（Legacy）
- 打开或切换到 Markdown 文件时自动预览（默认：单栏预览）
- 可选双栏：`openLocation=side` 时为“左侧源码 + 右侧预览”
- 双栏模式下默认不打断编辑：预览打开后焦点回到源码编辑器（`keepFocus=true`）
- 支持“跟随 / 锁定”两种预览模式
- 提供启用/禁用/切换命令 + 状态栏开关
- 支持 scheme 白名单、glob 排除、后缀名限制

## 配置（Settings）
在 VS Code 设置中搜索 `mdAutoPreview`：

### 自定义编辑器
- `mdAutoPreview.customEditor.defaultView`：`split | preview | editor`（默认 `split`）
- `mdAutoPreview.customEditor.livePreview`：是否实时刷新预览（默认 `true`）
- `mdAutoPreview.customEditor.debounceMs`：输入更新防抖毫秒数（默认 `150`）

> 说明：自定义编辑器是默认打开方式；如需回到普通文本编辑器，可在编辑器右上角或 Tab 上使用 “Reopen With...” 选择 `Text Editor`。

### 内置 Preview 自动打开（Legacy）
- `mdAutoPreview.enabled`：是否启用（默认 `true`）
- `mdAutoPreview.openLocation`：`same | side`（默认 `same`）
  - `same`：单栏预览（在当前编辑组打开 Preview）
  - `side`：双栏预览（在右侧打开 Preview）
- `mdAutoPreview.mode`：`follow | locked`（默认 `follow`）
- `mdAutoPreview.keepFocus`：是否保持编辑焦点（默认 `true`，仅 `openLocation=side` 时生效）
- `mdAutoPreview.reopenPolicy`：`always | respectClosedInSession`
  - `respectClosedInSession`：同一文件本次会话只会自动打开一次（适合“我关掉就别再弹”）
- `mdAutoPreview.allowedSchemes`：允许的 URI scheme（默认 `file/untitled/vscode-remote`）
- `mdAutoPreview.excludeGlobs`：排除路径 glob（默认排除 `node_modules/.git`）
- `mdAutoPreview.onlyExtensions`：仅对特定后缀生效（默认不限制）
- `mdAutoPreview.showStatusBar`：是否显示状态栏开关
- `mdAutoPreview.notifyOnError`：预览命令失败是否提示一次

## 命令（Commands）
- `Markdown Auto Preview: Enable`
- `Markdown Auto Preview: Disable`
- `Markdown Auto Preview: Toggle`
- `Markdown Auto Preview: Open Preview to Side (Follow)`
- `Markdown Auto Preview: Open Preview to Side (Locked)`
- `Markdown Auto Preview: Toggle View (Preview Only / Split)`

## 开发与调试
1. `npm install`
2. `npm run compile`
3. 按 `F5` 运行 “Run Extension” 启动 Extension Host
4. 在 Extension Host 中用 Explorer 打开任意 `.md`，应默认进入自定义编辑器并可切换 `Editor/Split/Preview`

## 发布到 VS Code Marketplace（无 PAT 也可用）

> 如果你暂时无法创建 Azure DevOps PAT（例如注册流程要求绑定信用卡），也仍然可以发布：让 CI 自动打包 `.vsix`，然后你在 Marketplace 网页后台手动上传。

### 1) 准备 Marketplace Publisher
在 Visual Studio Marketplace 创建 Publisher（得到 `publisherId`，例如 `feng`）。

### 2) 配置 GitHub Repo 变量（必需）
在 GitHub 仓库：
- `Settings → Secrets and variables → Actions → Variables` 新增：
  - `VSCE_PUBLISHER` = 你的 `publisherId`

### 3) 主分支自动打包（无需 PAT）
发布规则：只要 push 到 `main`，GitHub Actions 会自动构建并打包 `.vsix`（Artifacts 中可下载）。

版本策略（自动递增 / 默认 patch）：
- CI 会根据 `git rev-list --count HEAD` 生成一个递增的 patch 数字
- 最终打包版本为：`<major>.<minor>.<patch>`（其中 `<major>.<minor>` 取自 `package.json.version`，`<patch>` 由 CI 自动生成）
- 版本号仅在 CI 打包环境里写入（不会回写提交），因此你无需手动修改 `package.json.version` 和 `package-lock.json`

手动上传步骤：
1. 打开 GitHub Actions，进入 `Package VS Code Extension (VSIX, main)` 这条 workflow 的某次运行
2. 下载 `vsix` artifact（里面是 `.vsix`）
3. 打开 Visual Studio Marketplace 的 Publisher 管理后台，上传该 `.vsix` 作为新版本

### 4) 可选：开启自动发布（需要 PAT）
如果你后续能创建 Azure DevOps PAT，则可以开启自动发布到 Marketplace：
- `Settings → Secrets and variables → Actions → Secrets` 新增：
  - `VSCE_PAT` = Azure DevOps PAT
- `Settings → Secrets and variables → Actions → Variables` 新增：
  - `VSCE_PUBLISH_ENABLED` = `true`

开启后，`Publish VS Code Extension (Marketplace, main, opt-in)` workflow 会在每次 `main` push 时自动发布。

> 说明：`publisher` 字段在 CI 中会从 `VSCE_PUBLISHER` 注入，因此仓库里可以保留开发用的 `publisher`；但如果你想本地打包发布，请先把 `package.json.publisher` 设置为真实的 `publisherId`。
