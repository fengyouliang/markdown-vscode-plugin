# 任务清单：Markdown 自定义编辑器（同页 Split 预览）

Directory: `helloagents/history/2026-01/202601211231_markdown_custom_editor_split/`

---

## 1. 扩展声明与入口
- [√] 1.1 在 `package.json` 增加 `contributes.customEditors`，为 `*.md` 注册自定义编辑器并设为默认打开方式，验证 why.md#核心场景
- [√] 1.2 在 `package.json` 增加自定义编辑器相关配置项（默认视图、是否实时预览等），验证 why.md#核心场景
- [√] 1.3 在 `src/extension.ts` 注册 `CustomTextEditorProvider`，验证 why.md#核心场景

## 2. 自定义编辑器实现
- [√] 2.1 新增 `src/customEditor/MarkdownSplitEditorProvider.ts`：实现 Webview UI（Editor/Split/Preview 三态）与消息通信，验证 why.md#核心场景
- [√] 2.2 新增 Markdown 渲染与资源路径转换逻辑（`markdown-it` + 相对链接/图片处理），验证 why.md#核心场景

## 3. 安全检查
- [√] 3.1 执行安全检查（CSP、禁用原始 HTML、链接 scheme 校验、避免敏感信息硬编码）

## 4. 文档与知识库同步
- [√] 4.1 更新 `README.md`：补充自定义编辑器使用方式与“Reopen With”回退说明
- [√] 4.2 更新 `helloagents/wiki/modules/extension.md`：补充 Custom Editor 架构与关键入口
- [√] 4.3 更新 `helloagents/CHANGELOG.md` 并维护 `helloagents/history/index.md`

## 5. 构建与验证
- [√] 5.1 执行 `npm run compile`，确保 TypeScript 编译通过
- [?] 5.2 手动验证：Explorer 单击 `.md` 默认进入自定义编辑器；切换 Editor/Split/Preview 正常；编辑实时刷新预览
  > Note: 已完成编译通过，但 Extension Development Host 的交互验证需要你在 VS Code 中手动点开 `.md` 进行确认。
