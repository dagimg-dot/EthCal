import Adw from "gi://Adw";
import Gio from "gi://Gio";
import GObject from "gi://GObject";
import Gtk from "gi://Gtk";
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
            "customFormatHelpButton",
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

            // Help button for custom format tokens
            if (children._customFormatHelpButton) {
                children._customFormatHelpButton.connect("clicked", () => {
                    this._showTokenHelpDialog();
                });
            } else {
                logger("Warning: Custom format help button is null");
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

        private _showTokenHelpDialog() {
            // Create dialog
            const dialog = new Adw.MessageDialog({
                heading: "Available Format Tokens",
                body: "Use these tokens in your custom format string:",
                modal: true,
                transient_for: this.get_root() as Gtk.Window,
            });

            // Create content box for the token list
            const box = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                spacing: 12,
                margin_start: 12,
                margin_end: 12,
                margin_top: 12,
                margin_bottom: 12,
            });

            // Token explanations
            const tokens = [
                {
                    token: "dday",
                    description: "Weekday name (e.g., Monday, ሰኞ)",
                },
                { token: "dd", description: "Day of month (1-30)" },
                {
                    token: "dnum",
                    description: "Weekday number (0=Sunday, 1=Monday, etc.)",
                },
                {
                    token: "mnam",
                    description: "Month name (e.g., Meskerem, መስከረም)",
                },
                { token: "mnum", description: "Month number (1-13)" },
                { token: "year", description: "Year number" },
                {
                    token: "hh or h",
                    description: "Hour in 12-hour format (1-12)",
                },
                { token: "mm or m", description: "Minute (00-59)" },
                {
                    token: "tp",
                    description:
                        "Time period (Morning/Afternoon/Evening/Night)",
                },
            ];

            // Create labels for each token
            for (const { token, description } of tokens) {
                const tokenLabel = new Gtk.Label({
                    label: `<b>${token}</b> - ${description}`,
                    use_markup: true,
                    xalign: 0,
                    margin_start: 12,
                    wrap: true,
                });

                box.append(tokenLabel);
            }

            // Add example
            const exampleLabel = new Gtk.Label({
                label: "\n<b>Example:</b> dday, mnam dd, year hh:mm tp",
                use_markup: true,
                xalign: 0,
                margin_start: 12,
                margin_top: 12,
            });

            box.append(exampleLabel);

            // Set dialog content
            dialog.set_extra_child(box);

            // Add close button
            dialog.add_response("close", "Close");
            dialog.set_default_response("close");
            dialog.set_close_response("close");

            // Show dialog
            dialog.present();
        }
    },
);
