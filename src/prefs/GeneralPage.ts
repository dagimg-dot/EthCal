import Adw from "gi://Adw";
import Gio from "gi://Gio";
import GObject from "gi://GObject";
import type { GeneralPageChildren } from "../types/index.js";
import { SETTINGS } from "../types/index.js";
import { getTemplate } from "../utils/getTemplate.js";
import { logger } from "../utils/logger.js";

export const GeneralPage = GObject.registerClass(
    {
        GTypeName: "EthCalGeneralPage",
        Template: getTemplate("GeneralPage"),
        InternalChildren: [
            "statusBarPosition",
            "statusBarFormat",
            "statusBarCustomFormat",
            "calendarLanguage",
            "useGeezNumerals",
        ],
    },
    class GeneralPage extends Adw.PreferencesPage {
        bindSettings(settings: Gio.Settings) {
            logger("This is from prefs");
            const children = this as unknown as GeneralPageChildren;

            // Helper function to bind combo box with string setting
            const bindComboBox = <T extends readonly string[]>(
                settingKey: string,
                comboBox: Adw.ComboRow,
                options: T,
                defaultValue: T[number],
            ) => {
                if (!comboBox) {
                    logger(`Warning: ComboBox for ${settingKey} is null`);
                    return;
                }
                settings.bind(
                    settingKey,
                    comboBox,
                    "selected",
                    Gio.SettingsBindFlags.DEFAULT,
                );
                comboBox.connect("notify::selected", () => {
                    const selectedIndex = comboBox.selected;
                    const value = options[selectedIndex] || defaultValue;
                    settings.set_string(settingKey, value);
                });
            };

            // Bind all combo boxes
            bindComboBox(
                SETTINGS.KEYS.STATUS_BAR_POSITION,
                children._statusBarPosition,
                SETTINGS.OPTIONS.POSITION,
                SETTINGS.DEFAULTS.POSITION,
            );
            bindComboBox(
                SETTINGS.KEYS.STATUS_BAR_FORMAT,
                children._statusBarFormat,
                SETTINGS.OPTIONS.FORMAT,
                SETTINGS.DEFAULTS.FORMAT,
            );

            // Special handling for status bar format to show/hide custom format entry
            if (children._statusBarFormat) {
                children._statusBarFormat.connect("notify::selected", () => {
                    const selectedIndex = children._statusBarFormat.selected;
                    const value =
                        SETTINGS.OPTIONS.FORMAT[selectedIndex] ||
                        SETTINGS.DEFAULTS.FORMAT;
                    this._updateCustomFormatVisibility(children, value);
                });
            } else {
                logger("Warning: Status bar format combo box is null");
            }

            bindComboBox(
                SETTINGS.KEYS.CALENDAR_LANGUAGE,
                children._calendarLanguage,
                SETTINGS.OPTIONS.LANGUAGE,
                SETTINGS.DEFAULTS.LANGUAGE,
            );

            // Special handling for calendar language to update Geez numerals switch
            if (children._calendarLanguage) {
                children._calendarLanguage.connect("notify::selected", () => {
                    const selectedIndex = children._calendarLanguage.selected;
                    const value =
                        SETTINGS.OPTIONS.LANGUAGE[selectedIndex] ||
                        SETTINGS.DEFAULTS.LANGUAGE;
                    settings.set_string(SETTINGS.KEYS.CALENDAR_LANGUAGE, value);
                    this._updateGeezNumeralsSwitch(settings, children);
                });
            } else {
                logger("Warning: Calendar language combo box is null");
            }

            // Geez numerals setting
            if (children._useGeezNumerals) {
                settings.bind(
                    SETTINGS.KEYS.USE_GEEZ_NUMERALS,
                    children._useGeezNumerals,
                    "active",
                    Gio.SettingsBindFlags.DEFAULT,
                );
            } else {
                logger("Warning: Geez numerals switch is null");
            }

            // Custom format setting
            if (children._statusBarCustomFormat) {
                settings.bind(
                    SETTINGS.KEYS.STATUS_BAR_CUSTOM_FORMAT,
                    children._statusBarCustomFormat,
                    "text",
                    Gio.SettingsBindFlags.DEFAULT,
                );
            } else {
                logger("Warning: Custom format entry is null");
            }

            // Initialize combo boxes and switches with current values
            this._updateComboBoxes(settings, children);
            this._updateGeezNumeralsSwitch(settings, children);
            this._updateCustomFormatVisibility(
                children,
                settings.get_string(SETTINGS.KEYS.STATUS_BAR_FORMAT),
            );
        }

        private _updateComboBoxes(
            settings: Gio.Settings,
            children: GeneralPageChildren,
        ) {
            // Helper function to set combo box selection from string value
            const setComboBoxSelection = <T extends readonly string[]>(
                settingKey: string,
                comboBox: Adw.ComboRow,
                options: T,
            ) => {
                if (!comboBox) {
                    logger(
                        `Warning: ComboBox for ${settingKey} is null, skipping update`,
                    );
                    return;
                }
                const value = settings.get_string(settingKey);
                const index = options.indexOf(value as T[number]);
                comboBox.selected = index >= 0 ? index : 0;
            };

            // Update all combo boxes with current settings
            setComboBoxSelection(
                SETTINGS.KEYS.STATUS_BAR_POSITION,
                children._statusBarPosition,
                SETTINGS.OPTIONS.POSITION,
            );
            setComboBoxSelection(
                SETTINGS.KEYS.STATUS_BAR_FORMAT,
                children._statusBarFormat,
                SETTINGS.OPTIONS.FORMAT,
            );
            setComboBoxSelection(
                SETTINGS.KEYS.CALENDAR_LANGUAGE,
                children._calendarLanguage,
                SETTINGS.OPTIONS.LANGUAGE,
            );
        }

        private _updateGeezNumeralsSwitch(
            settings: Gio.Settings,
            children: GeneralPageChildren,
        ) {
            if (!children._useGeezNumerals) {
                logger(
                    "Warning: Geez numerals switch is null, skipping update",
                );
                return;
            }

            const languageValue = settings.get_string(
                SETTINGS.KEYS.CALENDAR_LANGUAGE,
            );
            const isEnglish = languageValue === "english";

            // Disable Geez numerals switch when English is selected
            children._useGeezNumerals.sensitive = !isEnglish;

            // If switching to English, also turn off Geez numerals
            if (isEnglish && children._useGeezNumerals.active) {
                children._useGeezNumerals.active = false;
            }
        }

        private _updateCustomFormatVisibility(
            children: GeneralPageChildren,
            formatValue: string,
        ) {
            if (!children._statusBarCustomFormat) {
                logger(
                    "Warning: Custom format entry is null, skipping visibility update",
                );
                return;
            }

            // Show custom format entry only when "custom" format is selected
            const isCustomFormat = formatValue === "custom";
            children._statusBarCustomFormat.visible = isCustomFormat;
        }
    },
);
