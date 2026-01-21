# 任务清单：CI 自动打包 VSIX（无 PAT）+ 手动上传 Marketplace

Directory: `helloagents/history/2026-01/202601211827_ci_package_vsix_manual_marketplace/`

---

## 1. Workflow（打包）
- [√] 1.1 新增 `.github/workflows/package.yml`：`main` 分支 push 触发自动打包 `.vsix` 并上传为 Actions Artifact

## 2. Workflow（自动发布可选）
- [√] 2.1 调整 `.github/workflows/publish.yml`：默认关闭（需要显式开启变量），避免缺少 PAT 时每次 push 都失败

## 3. 文档更新
- [√] 3.1 更新 `README.md`：补充“无信用卡/无 PAT”的发布路径（CI 打包 + Marketplace 网页手动上传），并保留可选的自动发布开关说明

## 4. 知识库同步
- [√] 4.1 更新 `helloagents/project.md`：补充发布模式（manual vs auto）
- [√] 4.2 更新 `helloagents/CHANGELOG.md`（Unreleased）与 `helloagents/history/index.md`

## 5. 验证
- [√] 5.1 本地验证：`npm run compile`
