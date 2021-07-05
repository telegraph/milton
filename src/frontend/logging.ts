import { externalLogger, logging } from "../config.json";

type InteractionTypes =
  | "toggleResponsive"
  | "changeZoom"
  | "changeBreakpoint"
  | "panPreview"
  | "selectFrame"
  | "setHeadline"
  | "setSubHead"
  | "setSource"
  | "setSourceUrl"
  | "setDestinationUrl"
  | "setPreviewBackgroundColour"
  | "export"
  | "download"
  | "clipboard";

type BaseEvents =
  | "page_view"
  | "session_start"
  | "file_download"
  | "select_content"
  | "click"
  | "app_exception";

export class Logger {
  public event(
    category: BaseEvents,
    action?: InteractionTypes,
    label?: string,
    value?: string | number
  ): void {
    console.log("Milton", category, action, label, value);
  }

  public error(label = "unknown", fatal = false, error?: Error): void {
    console.error("Milton", label, fatal ? "FATAL" : "NON_FATAL", error);
  }
}

async function loadExternalLogger() {
  const { Logger } = await import(externalLogger);
  logger = new Logger();
  logger.event("session_start");
}

if (logging && externalLogger) {
  loadExternalLogger().catch((err) => {
    logger.error("Failed to load external logger", false, err);
  });
}

export let logger = new Logger();
