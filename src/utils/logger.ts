import type Gio from "gi://Gio";

const PROJECT_NAME = "EthCal";

/** GSettings `logging-level` string values in ComboRow and verbosity order. */
export const LOGGING_LEVELS = ["error", "warn", "info", "debug"] as const;
export type LoggingLevel = (typeof LOGGING_LEVELS)[number];

export const DEFAULT_LOG_LEVEL: LoggingLevel = "info";

/** Index of a `logging-level` value in LOGGING_LEVELS, falling back to the default. */
export const getVerbosity = (level: string): number => {
    const normalized = level.toLowerCase();
    const idx = LOGGING_LEVELS.findIndex((name) => name === normalized);
    return idx >= 0 ? idx : LOGGING_LEVELS.indexOf(DEFAULT_LOG_LEVEL);
};

let currentVerbosity: number = getVerbosity(DEFAULT_LOG_LEVEL);

export const initializeLogger = (settings: Gio.Settings) => {
    const levelString = settings.get_string("logging-level");
    currentVerbosity = getVerbosity(levelString);

    settings.connectObject(
        "changed::logging-level",
        () => {
            const newLevelString = settings.get_string("logging-level");
            currentVerbosity = getVerbosity(newLevelString);
            info(`Log level changed to: ${newLevelString}`);
        },
        logger,
    );

    info(`Logger initialized with level: ${levelString}`);
};

export const deinitializeLogger = (settings: Gio.Settings) => {
    settings.disconnectObject(logger);
};

/** JS Errors and GLib.Error, which is not an Error subclass and keeps its message on the prototype. */
const isErrorLike = (
    data: unknown,
): data is { message: string; stack?: unknown } =>
    data instanceof Error ||
    (typeof data === "object" &&
        data !== null &&
        "message" in data &&
        typeof data.message === "string");

const write = (prefix: string, message: string, data?: unknown) => {
    const lines = [`${prefix}: ${message}`];
    if (data !== undefined && data !== null) {
        if (isErrorLike(data)) {
            // String() keeps the message: SpiderMonkey stacks hold frames only
            lines.push(`${prefix}:   ${String(data)}`);
            if (typeof data.stack === "string" && data.stack) {
                lines.push(`${prefix}:   ${data.stack.trimEnd()}`);
            }
        } else if (typeof data === "object") {
            Object.entries(data).forEach(([key, value]) => {
                lines.push(`${prefix}:   ${key}: ${value}`);
            });
        } else {
            lines.push(`${prefix}: ${data}`);
        }
    }
    console.log(lines.join("\n"));
};

const log = (level: LoggingLevel, message: string, data?: unknown) => {
    if (LOGGING_LEVELS.indexOf(level) > currentVerbosity) return;

    const timestamp = new Date().toISOString();
    const prefix = `[${PROJECT_NAME}] ${timestamp} ${level.toUpperCase()}`;
    write(prefix, message, data);
};

const debug = (message: string, data?: unknown) => {
    log("debug", message, data);
};

const info = (message: string, data?: unknown) => {
    log("info", message, data);
};

const warn = (message: string, data?: unknown) => {
    log("warn", message, data);
};

const error = (message: string, err?: unknown) => {
    log("error", message, err);
};

export const logger = {
    debug,
    info,
    warn,
    error,
};
