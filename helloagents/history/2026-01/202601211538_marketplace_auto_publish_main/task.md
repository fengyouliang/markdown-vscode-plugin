# 任务清单：主分支变更自动发布到 VS Code Marketplace（版本自动递增）

Directory: `helloagents/history/2026-01/202601211538_marketplace_auto_publish_main/`

---

## 1. 发布工作流改造
- [√] 1.1 更新 `.github/workflows/publish.yml`：改为 `main` 分支 push 触发；版本号在 CI 中自动生成并写入打包环境（不要求手动改 `package.json.version`）
- [√] 1.2 增加并发控制（concurrency），避免多次 push 导致发布流程互相打断

## 2. 文档与知识库同步
- [√] 2.1 更新 `README.md`：发布步骤改为“推送到 main 即自动发布”，并说明版本递增策略
- [√] 2.2 更新 `helloagents/project.md`：补充持续发布（CD）约定
- [√] 2.3 更新 `helloagents/CHANGELOG.md`（Unreleased）与 `helloagents/history/index.md`

## 3. 验证
- [√] 3.1 本地验证：`npm run compile`
