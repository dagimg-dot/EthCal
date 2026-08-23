import type Gio from "gi://Gio";

const PROJECT_NAME = "EthCal";

export enum LogLevel {
    ERROR = 0,
    WARN = 1,
    INFO = 2,
    DEBUG = 3,
}

const stringToLogLevel = (level: string): LogLevel => {
    switch (level.toLowerCase()) {
        case "error":
            return LogLevel.ERROR;
        case "warn":
            return LogLevel.WARN;
        case "info":
            return LogLevel.INFO;
        case "debug":
            return LogLevel.DEBUG;
        default:
            return LogLevel.INFO;
    }
};

// Global settings reference for logger
let currentLogLevel: LogLevel = LogLevel.INFO;
let settingsRef: Gio.Settings | null = null;
let loggingLevelChangedHandlerId: number | null = null;

export const setLogLevel = (level: string | LogLevel) => {
    const newLogLevel =
        typeof level === "string" ? stringToLogLevel(level) : level;
    if (newLogLevel !== currentLogLevel) {
        currentLogLevel = newLogLevel;
    }
};

// Initialize logger with settings
export const initializeLogger = (settings: Gio.Settings) => {
    if (settingsRef && loggingLevelChangedHandlerId !== null) {
        settingsRef.disconnect(loggingLevelChangedHandlerId);
        loggingLevelChangedHandlerId = null;
    }
    settingsRef = settings;

    // Set initial log level
    const levelString = settings.get_string("logging-level");
    currentLogLevel = stringToLogLevel(levelString);

    // Listen for log level changes
    loggingLevelChangedHandlerId = settingsRef.connect(
        "changed::logging-level",
        (s) => {
            const newLevelString = s.get_string("logging-level");
            const newLogLevel = stringToLogLevel(newLevelString);
            if (newLogLevel !== currentLogLevel) {
                currentLogLevel = newLogLevel;
                log(LogLevel.INFO, `Log level changed to: ${newLevelString}`);
            }
        },
    );

    log(LogLevel.INFO, `Logger initialized with level: ${levelString}`);
};

export const deinitializeLogger = (settings?: Gio.Settings) => {
    const target = settings ?? settingsRef;
    if (target && loggingLevelChangedHandlerId !== null) {
        target.disconnect(loggingLevelChangedHandlerId);
        loggingLevelChangedHandlerId = null;
    }
    settingsRef = null;
};

// Single write function — all console output routes through here
const write = (prefix: string, message: string, data?: unknown) => {
    const lines = [`${prefix}: ${message}`];
    if (data !== undefined) {
        if (typeof data === "object" && data !== null) {
            Object.entries(data).forEach(([key, value]) => {
                lines.push(`${prefix}:   ${key}: ${value}`);
            });
        } else {
            lines.push(`${prefix}: ${data}`);
        }
    }
    console.log(lines.join("\n"));
};

const log = (level: LogLevel, message: string, data?: unknown) => {
    if (level > currentLogLevel) return;

    const timestamp = new Date().toISOString();
    const levelName = LogLevel[level];
    const prefix = `[${PROJECT_NAME}] ${timestamp} ${levelName}`;
    write(prefix, message, data);
};

const debug = (message: string, data?: unknown) => {
    log(LogLevel.DEBUG, message, data);
};

const info = (message: string, data?: unknown) => {
    log(LogLevel.INFO, message, data);
};

const warn = (message: string, data?: unknown) => {
    log(LogLevel.WARN, message, data);
};

const error = (message: string, err?: unknown) => {
    const timestamp = new Date().toISOString();
    const prefix = `[${PROJECT_NAME}] ${timestamp} ERROR`;
    write(prefix, message, err ? String(err) : undefined);
};

export interface LoggerInterface {
    (message: unknown): void;
    debug: (message: string, data?: unknown) => void;
    info: (message: string, data?: unknown) => void;
    warn: (message: string, data?: unknown) => void;
    error: (message: string, err?: unknown) => void;
}

const baseLogger = ((message: unknown) => {
    info(String(message));
}) as LoggerInterface;

baseLogger.debug = debug;
baseLogger.info = info;
baseLogger.warn = warn;
baseLogger.error = error;

export const logger = baseLogger;
