# Task List: Markdown 单击自动预览（VS Code Extension）

Directory: `helloagents/plan/202601202226_md_auto_preview/`

---

## 1. Extension Core
- [√] 1.1 初始化 VS Code 扩展工程结构（TypeScript/tsc 输出到 dist），verify why.md#core-scenarios
- [√] 1.2 实现自动预览核心逻辑（onDidChangeActiveTextEditor + follow/locked），verify why.md#requirement-打开-markdown-文件自动预览
- [√] 1.3 增加 keepFocus、防抖/抑制循环策略，verify why.md#requirement-预览跟随当前激活-markdown默认
- [√] 1.4 增加配置项（enabled/mode/reopenPolicy/allowedSchemes/excludeGlobs/onlyExtensions/notifyOnError/showStatusBar），verify why.md#requirement-可配置排除与允许规则
- [√] 1.5 提供命令（enable/disable/toggle/open follow/open locked）与状态栏入口，verify why.md#change-content

## 2. Security Check
- [√] 2.1 执行安全检查（不写入敏感信息/不连接外部服务/不进行高风险命令），verify how.md#security-and-performance

## 3. Documentation Update
- [√] 3.1 创建/同步知识库（helloagents/*），verify wiki/*
- [√] 3.2 更新 README.md（使用方法/配置/命令/开发调试），verify README.md

## 4. Testing
- [√] 4.1 运行 `npm install` 与 `npm run compile`，verify 编译通过
- [?] 4.2 手动验证：打开/切换 Markdown 自动预览、保持焦点、follow/locked、排除规则，verify why.md#core-scenarios
  > Note: 需要在 VS Code Extension Host 中进行人工交互验证（本次自动化仅完成编译验证）。
