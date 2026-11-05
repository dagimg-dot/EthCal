import type Gio from "gi://Gio";
import {
    type FormatOption,
    type LanguageOption,
    type PositionOption,
    SETTINGS,
} from "../types/index.js";

const { KEYS, OPTIONS, DEFAULTS } = SETTINGS;

/** The value if it is one of the options, otherwise the fallback (e.g. after a hand-edited dconf value). */
export const pickOption = <T extends string>(
    value: string,
    options: readonly T[],
    fallback: T,
): T => options.find((option) => option === value) ?? fallback;

export const readPosition = (settings: Gio.Settings): PositionOption =>
    pickOption(
        settings.get_string(KEYS.STATUS_BAR_POSITION),
        OPTIONS.POSITION,
        DEFAULTS.POSITION,
    );

export const readFormat = (settings: Gio.Settings): FormatOption =>
    pickOption(
        settings.get_string(KEYS.STATUS_BAR_FORMAT),
        OPTIONS.FORMAT,
        DEFAULTS.FORMAT,
    );

export const readLanguage = (settings: Gio.Settings): LanguageOption =>
    pickOption(
        settings.get_string(KEYS.CALENDAR_LANGUAGE),
        OPTIONS.LANGUAGE,
        DEFAULTS.LANGUAGE,
    );

export const readCustomFormat = (settings: Gio.Settings): string =>
    settings.get_string(KEYS.STATUS_BAR_CUSTOM_FORMAT);

export const readUseGeez = (settings: Gio.Settings): boolean =>
    settings.get_boolean(KEYS.USE_GEEZ_NUMERALS);
