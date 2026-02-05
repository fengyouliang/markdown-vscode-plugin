# Markdown Auto Preview

保持 VS Code **原生 Markdown 编辑器**不变，并在打开/切换 Markdown 文件时自动打开 VS Code **内置 Markdown Preview**（支持单栏或右侧双栏）。

## 功能
### 内置 Preview 自动打开
- 打开或切换到 Markdown 文件时自动预览（默认：右侧双栏预览）
- 可选双栏：`openLocation=side` 时为“左侧源码 + 右侧预览”
- 双栏模式下默认不打断编辑：预览打开后焦点回到源码编辑器（`keepFocus=true`）
- 支持“跟随 / 锁定”两种预览模式
- 提供启用/禁用/切换命令 + 状态栏开关
- 支持 scheme 白名单、glob 排除、后缀名限制

## 配置（Settings）
在 VS Code 设置中搜索 `mdAutoPreview`：

### 内置 Preview 自动打开
- `mdAutoPreview.enabled`：是否启用（默认 `true`）
- `mdAutoPreview.openLocation`：`same | side`（默认 `side`）
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
- `Markdown Auto Preview: Toggle Preview Location (Same / Side)`

## 排障（Troubleshooting）
### 仍然出现旧版 “Editor / Split / Preview” 界面
如果你升级自旧版本，VS Code 可能在设置里残留了旧版 Custom Editor 的打开关联，导致 `.md` 仍会以旧 UI 打开。

建议按以下顺序处理：
1. 在该 Markdown 标签页上执行：`Reopen With...` → 选择 `Text Editor`
2. 检查并清理用户设置中的 `workbench.editorAssociations`（删除 `viewType: "mdAutoPreview.markdownSplit"` 相关项）
3. 执行 `Reload Window`（有时需要重载窗口后关联才会完全生效）

## 开发与调试
1. `npm install`
2. `npm run compile`
3. 按 `F5` 运行 “Run Extension” 启动 Extension Host
4. 在 Extension Host 中用 Explorer 打开任意 `.md`，应保持原生编辑器，并按配置自动打开内置 Markdown 预览（建议 `openLocation=side`）

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
