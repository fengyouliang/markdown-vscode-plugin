# 任务清单：CI 基于 tag 自动同步版本号（免手改 package.json/package-lock）

Directory: `helloagents/history/2026-01/202601211524_ci_auto_version_from_tag/`

---

## 1. Workflow 调整
- [√] 1.1 更新 `.github/workflows/publish.yml`：从 tag（`vX.Y.Z`）解析版本号，CI 中执行 `npm version` 自动同步 `package.json` 与 `package-lock.json`，无需用户手动改版本

## 2. 文档更新
- [√] 2.1 更新 `README.md`：发布步骤改为“打 tag 即发布”，删除“先手动改 version 并提交”的要求，并解释版本同步策略

## 3. 知识库同步
- [√] 3.1 更新 `helloagents/project.md`：补充版本策略（版本以 tag 为准，CI 自动写入打包环境）
- [√] 3.2 更新 `helloagents/CHANGELOG.md`（Unreleased）与 `helloagents/history/index.md`

## 4. 验证
- [√] 4.1 本地验证：`npm run compile`
