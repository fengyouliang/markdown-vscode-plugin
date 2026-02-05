# Task List: Markdown 自定义编辑器三态视图（Editor / Split / Preview）

Directory: `helloagents/history/2026-02/202602051558_md_editor_split_preview/`

---

## 1. Custom Editor Provider（核心）
- [√] 1.1 新增 Custom Editor 常量与消息协议定义（viewType、viewMode、message types），落地于 `src/customEditor/*`，verify why.md#requirement-custom-editor-as-default-for-markdown-scenario-open-md-in-custom-editor-by-default
- [√] 1.2 实现 `CustomTextEditorProvider`：文档↔Webview 同步、编辑回写、视图模式广播，落地于 `src/customEditor/*`，verify why.md#requirement-lightweight-editing-and-save-scenario-edit-markdown-and-save
- [√] 1.3 实现 Webview UI（Editor/Split/Preview 三态布局、按钮交互、节流编辑事件），落地于 `src/customEditor/*`，verify why.md#requirement-editor--split--preview-view-switching-scenario-switch-to-split

## 2. 扩展入口与默认打开方式
- [√] 2.1 重构 `src/extension.ts`：注册 custom editor provider；移除旧“自动打开内置预览”逻辑与相关命令，verify why.md#requirement-custom-editor-as-default-for-markdown-scenario-open-md-in-custom-editor-by-default
- [√] 2.2 更新 `package.json`：新增 `contributes.customEditors` 并声明为默认；按需保留/新增命令（切换视图/回退到 Text Editor），verify why.md#requirement-custom-editor-as-default-for-markdown-scenario-open-md-in-custom-editor-by-default
- [√] 2.3 增加工作区级视图记忆（`workspaceState`），并在 Webview 初始化时应用上次视图，verify why.md#requirement-workspace-level-view-mode-memory-scenario-persist-last-view-in-workspace

## 3. 渲染能力
- [√] 3.1 引入 `markdown-it` 依赖并实现扩展侧渲染函数（含节流/去重），verify why.md#requirement-markdown-preview-rendering-via-markdown-it-scenario-render-on-change
- [√] 3.2（可选）实现相对路径图片的基础解析与 `webview.asWebviewUri` 转换，verify why.md#requirement-markdown-preview-rendering-via-markdown-it-scenario-render-on-change

## 4. Security Check
- [√] 4.1 执行安全自检：CSP、消息白名单校验、避免远程脚本加载、异常输入保护（文本大小上限/频率限制），符合 G9 要求

## 5. Documentation Update（知识同步）
- [√] 5.1 更新 `README.md` 与 `docs/PRD.md`：从“自动预览”调整为“Custom Editor 三态视图”，并补充回退路径与注意事项
- [√] 5.2 同步知识库：更新 `helloagents/wiki/overview.md`、`helloagents/wiki/arch.md`（如架构变化）、记录变更到 `helloagents/CHANGELOG.md`

## 6. Testing
- [?] 6.1 本地编译 `npm run compile`，用 `F5` 启动 Extension Host 验证：默认打开 `.md`、三态切换、编辑保存、重启记忆、外部变更同步
  > Note: 已完成 `npm run compile`；Extension Host（F5）验收需要在 VS Code 中手动执行。
