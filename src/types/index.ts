export const SETTINGS = {
    KEYS: {
        STATUS_BAR_POSITION: "status-bar-position",
        STATUS_BAR_FORMAT: "status-bar-format",
        STATUS_BAR_CUSTOM_FORMAT: "status-bar-custom-format",
        CALENDAR_LANGUAGE: "calendar-language",
        USE_GEEZ_NUMERALS: "use-geez-numerals",
        LOGGING_LEVEL: "logging-level",
    } as const,

    /** ComboRow order for each string setting; the schema defaults are listed in DEFAULTS. */
    OPTIONS: {
        POSITION: ["left", "center", "right"] as const,
        FORMAT: [
            "full",
            "compact",
            "time-only",
            "date-only",
            "custom",
        ] as const,
        LANGUAGE: ["amharic", "english"] as const,
    } as const,

    DEFAULTS: {
        POSITION: "left",
        FORMAT: "full",
        LANGUAGE: "amharic",
    } as const,
} as const;

export type PositionOption = (typeof SETTINGS.OPTIONS.POSITION)[number];
export type FormatOption = (typeof SETTINGS.OPTIONS.FORMAT)[number];
export type LanguageOption = (typeof SETTINGS.OPTIONS.LANGUAGE)[number];

export interface Credit {
    title: string;
    subtitle: string;
    github?: string;
}
