# Project Technical Conventions

## Tech Stack
- **Runtime:** Node.js
- **Language:** TypeScript
- **VS Code API:** `vscode` Extension API
- **Preview Render:** 复用 VS Code 内置 Markdown Preview（由 `markdown.showPreview*` 命令驱动）

## Development Conventions
- **Build:** `tsc` 编译到 `dist/`，入口为 `dist/extension.js`
- **Main Entry:** `src/extension.ts`
- **Configuration Prefix:** `mdAutoPreview.*`

## Errors and Logging
- 默认不写入日志文件。
- 当内置 Markdown 预览命令执行失败时，仅在 `notifyOnError=true` 时提示一次（避免打扰/刷屏）。

## Testing and Process
- **Smoke Test:** `npm run compile` 确保 TypeScript 编译通过。
- **Manual Test:** 在 Extension Host 中打开 `.md` 文件验证：原生编辑器保持不变，预览按配置自动打开（建议 `openLocation=side`）。
- **Debug Tip:** `Run Extension (F5)` 已配置 `preLaunchTask`，会在启动前自动编译，避免因 `dist/` 缺失导致扩展未加载。

## Release / 发布流程
- **Release Trigger:** GitHub Actions 主分支持续发布（push `main`）
- **Workflow (打包，默认开启):** `.github/workflows/package.yml`
- **Workflow (自动发布，可选):** `.github/workflows/publish.yml`（需开启开关并提供 PAT）
- **GitHub Actions Variables/Secrets:**
  - `VSCE_PUBLISHER`（Variables）：Visual Studio Marketplace 的 `publisherId`
  - `VSCE_PUBLISH_ENABLED`（Variables，可选）：设置为 `true` 启用自动发布（默认不启用）
  - `VSCE_PAT`（Secrets，可选）：Azure DevOps PAT（Marketplace 发布权限，自动发布必需）
- **Version Rule:** patch 版本由 CI 自动递增（`git rev-list --count HEAD`）；workflow 会在 CI 中执行 `npm version <auto版本> --no-git-tag-version` 同步 `package.json` 与 `package-lock.json`（不回写提交）
