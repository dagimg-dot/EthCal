import type Adw from "gi://Adw";
import type Gio from "gi://Gio";
import type Gtk from "gi://Gtk";
import type { ExtensionBase } from "../stignite/ExtensionBase.js";

export type PanelPosition = "left" | "center" | "right";

export type TextFormat =
    | "full"
    | "compact"
    | "medium"
    | "time-only"
    | "date-only";
export type Language = "amharic" | "english";

// Component configuration interfaces (no longer using complex reactive state)
export interface StatusBarConfig {
    position?: PanelPosition;
    format?: TextFormat;
    showIcon?: boolean;
}

export interface CalendarConfig {
    language?: Language;
    showHolidays?: boolean;
    weekStartsOn?: number;
}

export interface CalendarPopupProps {
    extension: ExtensionBase; // GNOME Extension object
    settings: Gio.Settings; // GNOME Settings object
}

// Type guards for EthCal-specific types
export const isPanelPosition = (value: unknown): value is PanelPosition => {
    return (
        typeof value === "string" &&
        (value === "left" || value === "center" || value === "right")
    );
};

export const isTextFormat = (value: unknown): value is TextFormat => {
    return (
        typeof value === "string" &&
        (value === "full" ||
            value === "compact" ||
            value === "medium" ||
            value === "time-only" ||
            value === "date-only")
    );
};

export const isLanguage = (value: unknown): value is Language => {
    return (
        typeof value === "string" &&
        (value === "amharic" || value === "english")
    );
};

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

// Utility types
export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
