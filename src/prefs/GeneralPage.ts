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
            bindComboBox(
                SETTINGS.KEYS.CALENDAR_LANGUAGE,
                children._calendarLanguage,
                SETTINGS.OPTIONS.LANGUAGE,
                SETTINGS.DEFAULTS.LANGUAGE,
            );

            // Special handling for calendar language to update Geez numerals switch
            children._calendarLanguage.connect("notify::selected", () => {
                const selectedIndex = children._calendarLanguage.selected;
                const value =
                    SETTINGS.OPTIONS.LANGUAGE[selectedIndex] ||
                    SETTINGS.DEFAULTS.LANGUAGE;
                settings.set_string(SETTINGS.KEYS.CALENDAR_LANGUAGE, value);
                this._updateGeezNumeralsSwitch(settings, children);
            });

            // Geez numerals setting
            settings.bind(
                SETTINGS.KEYS.USE_GEEZ_NUMERALS,
                children._useGeezNumerals,
                "active",
                Gio.SettingsBindFlags.DEFAULT,
            );

            // Initialize combo boxes and switches with current values
            this._updateComboBoxes(settings, children);
            this._updateGeezNumeralsSwitch(settings, children);
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
    },
);
