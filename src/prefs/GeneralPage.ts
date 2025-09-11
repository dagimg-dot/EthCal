import Adw from "gi://Adw";
import Gio from "gi://Gio";
import GObject from "gi://GObject";
import type { GeneralPageChildren } from "../types/index.js";
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

            // Status bar position binding
            const _positionMapping = { left: 0, center: 1, right: 2 };
            const reversePositionMapping = ["left", "center", "right"];

            settings.bind(
                "status-bar-position",
                children._statusBarPosition,
                "selected",
                Gio.SettingsBindFlags.DEFAULT,
            );
            children._statusBarPosition.connect("notify::selected", () => {
                const selectedIndex = children._statusBarPosition.selected;
                const value = reversePositionMapping[selectedIndex] || "left";
                settings.set_string("status-bar-position", value);
            });

            // Status bar format binding
            const _formatMapping = {
                full: 0,
                compact: 1,
                medium: 2,
                "time-only": 3,
                "date-only": 4,
            };
            const reverseFormatMapping = [
                "full",
                "compact",
                "medium",
                "time-only",
                "date-only",
            ];

            settings.bind(
                "status-bar-format",
                children._statusBarFormat,
                "selected",
                Gio.SettingsBindFlags.DEFAULT,
            );
            children._statusBarFormat.connect("notify::selected", () => {
                const selectedIndex = children._statusBarFormat.selected;
                const value = reverseFormatMapping[selectedIndex] || "full";
                settings.set_string("status-bar-format", value);
            });

            // Calendar language binding
            const _languageMapping = { amharic: 0, english: 1 };
            const reverseLanguageMapping = ["amharic", "english"];

            settings.bind(
                "calendar-language",
                children._calendarLanguage,
                "selected",
                Gio.SettingsBindFlags.DEFAULT,
            );
            children._calendarLanguage.connect("notify::selected", () => {
                const selectedIndex = children._calendarLanguage.selected;
                const value =
                    reverseLanguageMapping[selectedIndex] || "amharic";
                settings.set_string("calendar-language", value);
                this._updateGeezNumeralsSwitch(settings, children);
            });

            // Geez numerals setting
            settings.bind(
                "use-geez-numerals",
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
            // Status bar position
            const positionValue = settings.get_string("status-bar-position");
            const positionIndex =
                { left: 0, center: 1, right: 2 }[positionValue] || 0;
            children._statusBarPosition.selected = positionIndex;

            // Status bar format
            const formatValue = settings.get_string("status-bar-format");
            const formatIndex =
                {
                    full: 0,
                    compact: 1,
                    medium: 2,
                    "time-only": 3,
                    "date-only": 4,
                }[formatValue] || 0;
            children._statusBarFormat.selected = formatIndex;

            // Calendar language
            const languageValue = settings.get_string("calendar-language");
            const languageIndex =
                { amharic: 0, english: 1 }[languageValue] || 0;
            children._calendarLanguage.selected = languageIndex;
        }

        private _updateGeezNumeralsSwitch(
            settings: Gio.Settings,
            children: GeneralPageChildren,
        ) {
            const languageValue = settings.get_string("calendar-language");
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
