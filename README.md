# Markdown Editor (Editor / Split / Preview)

在 VS Code 中将 Markdown 以 **Custom Editor（Webview）** 打开，在**同一标签页**内提供 `Editor / Split / Preview` 三态切换，并且会按**工作区**记住你上次使用的视图（下次打开 `.md` 自动使用上次选择）。

> 说明：这是“JetBrains 风格三态”的交互形态，因此不会再使用 VS Code 内置 Markdown Preview 的“另开一个预览编辑器标签页”的方式。

## 功能
- `Editor`：仅编辑区（轻量编辑器）
- `Split`：左编辑 + 右预览
- `Preview`：仅预览
- 视图选择记忆：同一工作区内“记住上次选择”，重启 VS Code 仍生效
- 预览渲染：基于 `markdown-it` 本地渲染（默认禁用原始 HTML，降低注入风险）
- Mermaid：支持 ` ```mermaid ` 围栏代码块渲染为图表（本地脚本渲染，不依赖 CDN）
- 渲染增强：
  - 数学公式（KaTeX，支持 `$...$` / `$$...$$`）
  - 代码高亮（highlight.js，随 VS Code 主题明暗切换）
  - 脚注 / 任务列表 / emoji / admonition 容器块（`::: note|tip|warning|important|danger`）

## 使用方式
安装后直接打开任意 `.md`：
- 默认进入自定义编辑器界面
- 顶部按钮切换 `Editor / Split / Preview`

## 回退到原生 Text Editor（重要）
本扩展会把 `.md` 默认关联到自定义编辑器。如果你希望临时/永久回到原生编辑器：

1) 临时回退：在当前 `.md` 标签页点击工具栏右侧 `⋯`（或执行 VS Code 的 `Reopen With...`）→ 选择 `Text Editor`  
2) 永久回退：在 VS Code 设置中为 `workbench.editorAssociations` 添加一条规则（示例）：

```json
{
  "workbench.editorAssociations": [
    { "viewType": "default", "filenamePattern": "*.md" }
  ]
}
```

## 已知限制
- 编辑区为 Webview 内的轻量编辑器（`textarea`），不追求与 VS Code 原生编辑器完全等价（例如：部分编辑扩展能力、复杂快捷键生态）。
- 预览基于 `markdown-it`，与 VS Code 内置 Markdown Preview 的渲染效果可能存在差异（尤其是依赖其它 Markdown 扩展时）。
- Mermaid 渲染当前仅覆盖 ` ```mermaid ` 围栏代码块；渲染失败时会回退为文本显示。

## 开发与调试
1. `npm install`
2. `npm run compile`
3. 按 `F5` 运行 “Run Extension” 启动 Extension Host
4. 在 Extension Host 中用 Explorer 打开任意 `.md`，应默认进入自定义编辑器并可三态切换

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
