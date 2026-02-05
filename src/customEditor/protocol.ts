/*
 * 模块职责：定义 Markdown Custom Editor 的 viewType、视图模式与 Webview 消息协议。
 */

export const CUSTOM_EDITOR_VIEW_TYPE = "mdAutoPreview.markdownEditor";

// 需求：按工作区维度记住上次视图选择（Editor / Split / Preview）
export const WORKSPACE_VIEW_MODE_STATE_KEY = "mdAutoPreview.workspace.viewMode";

export type ViewMode = "editor" | "split" | "preview";

export type WebviewToExtensionMessage =
  | { type: "ready" }
  | { type: "edit"; text: string }
  | { type: "setViewMode"; viewMode: ViewMode }
  | { type: "reopenWith" }
  | { type: "openExternal"; href: string };

export type ExtensionToWebviewMessage =
  | { type: "init"; text: string; html: string; version: number; viewMode: ViewMode }
  | { type: "update"; text: string; html: string; version: number }
  | { type: "setViewMode"; viewMode: ViewMode }
  | { type: "error"; message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

export function isViewMode(value: unknown): value is ViewMode {
  return value === "editor" || value === "split" || value === "preview";
}

export function isWebviewToExtensionMessage(value: unknown): value is WebviewToExtensionMessage {
  if (!isRecord(value)) {
    return false;
  }
  const type = value["type"];
  if (typeof type !== "string") {
    return false;
  }

  switch (type) {
    case "ready":
    case "reopenWith":
      return true;
    case "edit":
      return typeof value["text"] === "string";
    case "setViewMode":
      return isViewMode(value["viewMode"]);
    case "openExternal":
      return typeof value["href"] === "string";
    default:
      return false;
  }
}

