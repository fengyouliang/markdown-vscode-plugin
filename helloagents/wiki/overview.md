# Markdown Auto Preview（VS Code Extension）

> 项目级核心信息。模块细节见 `modules/`。

---

## 1. Project Overview

### Goals and Background
在 VS Code 中阅读/编辑 Markdown 时，提供更贴近 JetBrains 的“点击即预览”体验：保持 **原生 Markdown 编辑器**不变，并在打开/切换 Markdown 文件时自动打开 VS Code **内置 Preview**（默认右侧双栏：左侧源码 + 右侧预览），减少手动点击“打开预览”的重复操作。

### Scope
- **In scope:**
  - 打开或切换到 Markdown 文件时自动打开预览（默认右侧双栏，可选单栏预览）
  - 跟随/锁定两种预览模式
  - 通过配置控制启用状态、焦点保持、排除路径、允许 scheme
- **Out of scope:**
  - 与 VS Code 内置 Markdown Preview 100% 功能对齐（主题/插件生态/TOC/高级渲染等）
  - 数学公式/语法增强等高级渲染能力（依赖 VS Code 或其他扩展）

### Stakeholders
- **Owner:** 本仓库维护者/使用者

---

## 2. Module Index

| Module Name | Responsibility | Status | Documentation |
|-------------|----------------|--------|---------------|
| extension | 自动打开 VS Code 内置 Markdown 预览（保持原生编辑器） | In Development | [modules/extension.md](modules/extension.md) |

---

## 3. Quick Links
- [Technical Conventions](../project.md)
- [Architecture Design](arch.md)
- [API Manual](api.md)
- [Data Models](data.md)
- [Change History](../history/index.md)
