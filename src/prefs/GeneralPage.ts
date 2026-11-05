import Adw from "gi://Adw";
import Gdk from "gi://Gdk";
import Gio from "gi://Gio";
import GLib from "gi://GLib";
import GObject from "gi://GObject";
import Gtk from "gi://Gtk";
import { type LanguageOption, SETTINGS } from "../types/index.js";
import { getTemplate } from "../utils/getTemplate.js";
import { getVerbosity, LOGGING_LEVELS, logger } from "../utils/logger.js";
import { readFormat, readLanguage, readPosition } from "../utils/settings.js";

const { KEYS, OPTIONS } = SETTINGS;

const LOGS_COMMAND = 'journalctl --user -n 50 -g "EthCal"';

const FORMAT_TOKENS = [
    { token: "dday", description: "Weekday name (e.g., Monday, ሰኞ)" },
    { token: "dd", description: "Day of month (1-30)" },
    {
        token: "dnum",
        description: "Weekday number (0=Sunday, 1=Monday, etc.)",
    },
    { token: "mnam", description: "Month name (e.g., Meskerem, መስከረም)" },
    { token: "mnum", description: "Month number (1-13)" },
    { token: "year", description: "Year number" },
    { token: "hh or h", description: "Hour in 12-hour format (1-12)" },
    { token: "mm or m", description: "Minute (00-59)" },
    {
        token: "tp",
        description: "Time period (Morning/Afternoon/Evening/Night)",
    },
];

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
            "loggingLevel",
            "journalctlRow",
            "copyLogsCommandButton",
        ],
    },
    class GeneralPage extends Adw.PreferencesPage {
        declare _statusBarPosition: Adw.ComboRow;
        declare _statusBarFormat: Adw.ComboRow;
        declare _statusBarCustomFormat: Adw.EntryRow;
        declare _customFormatHelpButton: Gtk.Button;
        declare _calendarLanguage: Adw.ComboRow;
        declare _useGeezNumerals: Adw.SwitchRow;
        declare _loggingLevel: Adw.ComboRow;
        declare _journalctlRow: Adw.ActionRow;
        declare _copyLogsCommandButton: Gtk.Button;

        bindSettings(settings: Gio.Settings) {
            logger.debug("Settings bound to GeneralPage");

            // String keys can't be bound to a ComboRow's `selected` index, so each row maps index ↔ value
            this.bindOptionRow(
                this._statusBarPosition,
                OPTIONS.POSITION,
                readPosition(settings),
                (value) => settings.set_string(KEYS.STATUS_BAR_POSITION, value),
            );
            this.bindOptionRow(
                this._statusBarFormat,
                OPTIONS.FORMAT,
                readFormat(settings),
                (value) => {
                    settings.set_string(KEYS.STATUS_BAR_FORMAT, value);
                    this.updateCustomFormatVisibility(value === "custom");
                },
            );
            this.bindOptionRow(
                this._calendarLanguage,
                OPTIONS.LANGUAGE,
                readLanguage(settings),
                (value) => {
                    settings.set_string(KEYS.CALENDAR_LANGUAGE, value);
                    this.updateGeezNumeralsSwitch(value);
                },
            );
            this.bindOptionRow(
                this._loggingLevel,
                LOGGING_LEVELS,
                LOGGING_LEVELS[
                    getVerbosity(settings.get_string(KEYS.LOGGING_LEVEL))
                ],
                (value) => settings.set_string(KEYS.LOGGING_LEVEL, value),
            );

            settings.bind(
                KEYS.USE_GEEZ_NUMERALS,
                this._useGeezNumerals,
                "active",
                Gio.SettingsBindFlags.DEFAULT,
            );
            settings.bind(
                KEYS.STATUS_BAR_CUSTOM_FORMAT,
                this._statusBarCustomFormat,
                "text",
                Gio.SettingsBindFlags.DEFAULT,
            );

            this._customFormatHelpButton.connect("clicked", () =>
                this.showTokenHelpDialog(),
            );
            this.bindCopyLogsCommand();

            this.updateGeezNumeralsSwitch(readLanguage(settings));
            this.updateCustomFormatVisibility(
                readFormat(settings) === "custom",
            );
        }

        /** Selects `current` in the row, then calls `onSelect` whenever the user picks another option. */
        private bindOptionRow<T extends string>(
            row: Adw.ComboRow,
            options: readonly T[],
            current: T,
            onSelect: (value: T) => void,
        ) {
            row.set_selected(options.indexOf(current));
            row.connect("notify::selected", () => {
                const value = options.at(row.get_selected());
                if (value !== undefined) onSelect(value);
            });
        }

        private bindCopyLogsCommand() {
            const button = this._copyLogsCommandButton;
            let resetIconId = 0;
            const cancelReset = () => {
                if (resetIconId) GLib.source_remove(resetIconId);
                resetIconId = 0;
            };

            button.connect("clicked", () => {
                Gdk.Display.get_default()?.get_clipboard()?.set(LOGS_COMMAND);
                button.set_icon_name("object-select-symbolic");

                cancelReset();
                resetIconId = GLib.timeout_add(
                    GLib.PRIORITY_DEFAULT,
                    1500,
                    () => {
                        resetIconId = 0;
                        button.set_icon_name("edit-copy-symbolic");
                        return GLib.SOURCE_REMOVE;
                    },
                );
            });
            this.connect("destroy", cancelReset);
        }

        /** Geez numerals only apply to Amharic, so English turns them off and locks the switch. */
        private updateGeezNumeralsSwitch(language: LanguageOption) {
            const isEnglish = language === "english";
            this._useGeezNumerals.sensitive = !isEnglish;
            if (isEnglish && this._useGeezNumerals.active) {
                this._useGeezNumerals.active = false;
            }
        }

        private updateCustomFormatVisibility(isCustom: boolean) {
            this._statusBarCustomFormat.visible = isCustom;
        }

        private showTokenHelpDialog() {
            const root = this.get_root();
            const dialog = new Adw.MessageDialog({
                heading: "Available Format Tokens",
                body: "Use these tokens in your custom format string:",
                modal: true,
                transient_for: root instanceof Gtk.Window ? root : null,
            });

            const box = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                spacing: 12,
                margin_start: 12,
                margin_end: 12,
                margin_top: 12,
                margin_bottom: 12,
            });

            for (const { token, description } of FORMAT_TOKENS) {
                box.append(
                    new Gtk.Label({
                        label: `<b>${token}</b> - ${description}`,
                        use_markup: true,
                        xalign: 0,
                        margin_start: 12,
                        wrap: true,
                    }),
                );
            }

            box.append(
                new Gtk.Label({
                    label: "\n<b>Example:</b> dday, mnam dd, year hh:mm tp",
                    use_markup: true,
                    xalign: 0,
                    margin_start: 12,
                    margin_top: 12,
                }),
            );

            dialog.set_extra_child(box);
            dialog.add_response("close", "Close");
            dialog.set_default_response("close");
            dialog.set_close_response("close");
            dialog.present();
        }
    },
);
