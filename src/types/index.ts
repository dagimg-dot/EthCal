// EthCal-specific types and interfaces
import type { ComponentProps } from "stignite";

// GNOME-specific types for EthCal
export type PanelPosition = "left" | "center" | "right";
export type TextFormat =
    | "full"
    | "compact"
    | "medium"
    | "time-only"
    | "date-only";
export type Language = "amharic" | "english";

// Component state interfaces
export interface StatusBarState {
    position: PanelPosition;
    format: TextFormat;
    text: string;
    useGeezNumerals: boolean;
}

export interface CalendarPopupState {
    language: Language;
    currentMonth: string;
    selectedDate: {
        year: number;
        month: number;
        day: number;
    } | null;
    useGeezNumerals: boolean;
}

// Component props interfaces
export interface StatusBarProps extends ComponentProps {
    position?: PanelPosition;
    format?: TextFormat;
    showIcon?: boolean;
}

export interface CalendarProps extends ComponentProps {
    language?: Language;
    showHolidays?: boolean;
    weekStartsOn?: number;
}

export interface CalendarPopupProps {
    extension: unknown; // GNOME Extension object
    settings: unknown; // GNOME Settings object
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

// Utility types
export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
