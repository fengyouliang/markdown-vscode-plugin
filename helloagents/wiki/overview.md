# Markdown Editor（VS Code Extension）

> 项目级核心信息。模块细节见 `modules/`。

---

## 1. Project Overview

### Goals and Background
在 VS Code 中阅读/编辑 Markdown 时，提供更贴近 JetBrains 的 `Editor / Split / Preview` 三态体验：将 Markdown 以 **Custom Editor（Webview）** 打开，并在**同一标签页**内完成编辑与预览切换，同时按**工作区**记住上次选择的视图模式，减少分栏/标签管理成本。

### Scope
- **In scope:**
  - `.md` 默认以 Custom Editor 打开（同 tab 三态 UI）
  - `Editor / Split / Preview` 三态切换（Split 为左编辑 + 右预览）
  - 按工作区记住上次视图模式（跨重启持久化）
  - 预览使用 `markdown-it` 本地渲染（默认禁用原始 HTML）
- **Out of scope:**
  - 100% 复刻 VS Code 原生编辑器能力与快捷键生态
  - 100% 对齐 VS Code 内置 Markdown Preview 的渲染生态（各种渲染扩展）
  - 滚动严格同步、光标定位同步等高级体验

### Stakeholders
- **Owner:** 本仓库维护者/使用者

---

## 2. Module Index

| Module Name | Responsibility | Status | Documentation |
|-------------|----------------|--------|---------------|
| extension | 注册 Markdown Custom Editor，并负责基础集成与状态持久化 | In Development | [modules/extension.md](modules/extension.md) |
| customEditor | CustomTextEditorProvider + Webview UI（三态切换/编辑/预览渲染） | In Development | [modules/customEditor.md](modules/customEditor.md) |

---

## 3. Quick Links
- [Technical Conventions](../project.md)
- [Architecture Design](arch.md)
- [API Manual](api.md)
- [Data Models](data.md)
- [Change History](../history/index.md)
