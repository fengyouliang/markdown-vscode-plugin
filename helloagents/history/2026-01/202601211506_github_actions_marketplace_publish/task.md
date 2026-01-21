# 任务清单：GitHub Actions Tag 驱动发布到 VS Code Marketplace

Directory: `helloagents/history/2026-01/202601211506_github_actions_marketplace_publish/`

---

## 1. CI / 发布流程
- [√] 1.1 新增 GitHub Actions workflow：tag（`v*`）触发自动发布到 VS Code Marketplace（使用 repo variable `VSCE_PUBLISHER` + secret `VSCE_PAT`）
- [√] 1.2 新增 `.vscodeignore`，避免将开发/知识库文件打包进 `.vsix`
  > Note: 为避免 `README.md` 与 `readme.md` 在打包/市场展示中发生大小写冲突，已将 PRD 文件迁移到 `docs/PRD.md`。

## 2. 文档更新
- [√] 2.1 更新 `README.md`：补充“如何配置 GitHub Actions 自动发布”的步骤

## 3. 知识库同步
- [√] 3.1 更新 `helloagents/project.md`：补充发布流程约定（tag 驱动）
- [√] 3.2 更新 `helloagents/CHANGELOG.md`（Unreleased）与 `helloagents/history/index.md`

## 4. 验证
- [√] 4.1 本地验证：`npm run compile`
- [√] 4.2 打包验证：`npx @vscode/vsce package`（仅验证流程，不上传）
