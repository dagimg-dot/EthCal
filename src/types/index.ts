import type Adw from "gi://Adw";
import type Gtk from "gi://Gtk";

export const SETTINGS = {
    KEYS: {
        STATUS_BAR_POSITION: "status-bar-position",
        STATUS_BAR_FORMAT: "status-bar-format",
        CALENDAR_LANGUAGE: "calendar-language",
        USE_GEEZ_NUMERALS: "use-geez-numerals",
    } as const,

    OPTIONS: {
        POSITION: ["left", "center", "right"] as const,
        FORMAT: [
            "full",
            "compact",
            "medium",
            "time-only",
            "date-only",
        ] as const,
        LANGUAGE: ["amharic", "english"] as const,
        GEEZ_NUMERALS: [false, true] as const,
    } as const,

    DEFAULTS: {
        POSITION: "left",
        FORMAT: "full",
        LANGUAGE: "amharic",
        GEEZ_NUMERALS: false as boolean,
    } as const,
} as const;

export type PositionOption = (typeof SETTINGS.OPTIONS.POSITION)[number];
export type FormatOption = (typeof SETTINGS.OPTIONS.FORMAT)[number];
export type LanguageOption = (typeof SETTINGS.OPTIONS.LANGUAGE)[number];

export interface StatusBarConfig {
    position?: PositionOption;
    format?: FormatOption;
    showIcon?: boolean;
}

export interface CalendarConfig {
    language?: LanguageOption;
    showHolidays?: boolean;
    weekStartsOn?: number;
}

export interface GeneralPageChildren {
    _statusBarPosition: Adw.ComboRow;
    _statusBarFormat: Adw.ComboRow;
    _calendarLanguage: Adw.ComboRow;
    _useGeezNumerals: Adw.SwitchRow;
}

export interface AboutPageChildren {
    _extensionIcon: Gtk.Image;
    _extensionName: Gtk.Label;
    _extensionVersion: Gtk.Label;
    _linkWebsite: Gtk.Button;
    _linkIssues: Gtk.Button;
    _creditsRow: Adw.ExpanderRow;
    _legalRow: Adw.ExpanderRow;
    _extensionLicense: Gtk.TextView;
}
