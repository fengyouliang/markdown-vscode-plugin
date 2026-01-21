# Architecture Design

## Overall Architecture
```mermaid
flowchart TD
    A[VS Code Explorer/Editor] --> B{打开 Markdown 的方式?}

    B -->|Custom Editor 默认| C[md-auto-preview CustomTextEditorProvider]
    C --> D[Webview UI: Editor / Split / Preview]
    D <--> E[TextDocument 同步]
    C --> F[markdown-it 渲染 HTML]
    F --> D

    B -->|Text Editor（Legacy）| G[onDidChangeActiveTextEditor]
    G --> H{是否满足触发条件?}
    H -->|否| I[不处理]
    H -->|是| J[执行 VS Code 内置命令]
    J --> K[markdown.showPreview / showLockedPreview 或 showPreviewToSide / showLockedPreviewToSide]
    K --> L[Markdown Preview Webview]
    G --> M[可选：切回焦点到源码编辑器]
```

## Tech Stack
- **Extension:** TypeScript + VS Code Extension API
- **Build:** tsc（CommonJS 输出到 `dist/`）
- **Runtime Dependency:** `minimatch`（用于 excludeGlobs 路径匹配）
- **Runtime Dependency:** `markdown-it`（用于 Custom Editor 预览渲染）

## Core Flow
```mermaid
sequenceDiagram
    participant U as User
    participant VS as VS Code
    participant EX as Extension
    U->>VS: 点击/切换到 README.md
    VS->>EX: 触发 Custom Editor / 或触发 onDidChangeActiveTextEditor（Legacy）
    EX-->>VS: 展示同页 Split/Preview 或打开内置预览面板
```

## Major Architecture Decisions
| adr_id | title | date | status | affected_modules | details |
|--------|-------|------|--------|------------------|---------|
| ADR-001 | 复用 VS Code 内置 Markdown 预览命令而非自研渲染 | 2026-01-20 | ❌Deprecated | extension | history/2026-01/202601202226_md_auto_preview/how.md#adr-001-复用-vs-code-内置-markdown-预览命令 |
| ADR-002 | 使用 onDidChangeActiveTextEditor 触发自动预览（配合防抖/抑制循环） | 2026-01-20 | ✅Adopted | extension | history/2026-01/202601202226_md_auto_preview/how.md#adr-002-以编辑器激活变化作为触发源 |
| ADR-003 | 引入 Custom Editor 实现同页 Split 预览 | 2026-01-21 | ✅Adopted | extension | history/2026-01/202601211231_markdown_custom_editor_split/how.md#adr-003-引入-custom-editor-实现同页-split-预览 |
