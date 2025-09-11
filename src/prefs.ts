import Adw from "gi://Adw";
import Gio from "gi://Gio";
import GLib from "gi://GLib";
import GObject from "gi://GObject";
import type Gtk from "gi://Gtk";

import { ExtensionPreferences } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";

import type { ExtensionMetadata } from "@girs/gnome-shell/extensions/extension";
import { logger } from "./utils/logger.js";

const LICENSE = "You can check out the LICENSE in the github page 🙂";

const getTemplate = (name: string): string => {
    const uri = GLib.uri_resolve_relative(
        import.meta.url,
        `ui/${name}.ui`,
        GLib.UriFlags.NONE,
    );
    if (uri === null) {
        throw new Error(`Failed to resolve URI for template ${name}!`);
    }
    return uri;
};

interface GeneralPageChildren {
    _statusBarPosition: Adw.ComboRow;
    _statusBarFormat: Adw.ComboRow;
    _calendarLanguage: Adw.ComboRow;
    _useGeezNumerals: Adw.SwitchRow;
}

const GeneralPage = GObject.registerClass(
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

interface AboutPageChildren {
    _extensionIcon: Gtk.Image;
    _extensionName: Gtk.Label;
    _extensionVersion: Gtk.Label;
    _linkWebsite: Gtk.Button;
    _linkIssues: Gtk.Button;
    _creditsRow: Adw.ExpanderRow;
    _legalRow: Adw.ExpanderRow;
    _extensionLicense: Gtk.TextView;
}

const AboutPage = GObject.registerClass(
    {
        GTypeName: "EthCalAboutPage",
        Template: getTemplate("AboutPage"),
        InternalChildren: [
            "extensionIcon",
            "extensionName",
            "extensionVersion",
            "linkWebsite",
            "linkIssues",
            "creditsRow",
            "legalRow",
            "extensionLicense",
        ],
    },
    class AboutPage extends Adw.PreferencesPage {
        setMetadata(metadata: ExtensionMetadata) {
            const children = this as unknown as AboutPageChildren;

            // Set the icon from the project's assets
            const iconPath = GLib.uri_resolve_relative(
                import.meta.url,
                "assets/icons/ethcal.svg",
                GLib.UriFlags.NONE,
            );
            if (iconPath) {
                try {
                    const iconFile = Gio.File.new_for_uri(iconPath);
                    children._extensionIcon.set_from_file(iconFile.get_path());
                } catch (_error) {
                    // Fallback to a generic icon if the custom icon fails to load
                    children._extensionIcon.set_from_icon_name(
                        "application-x-executable",
                    );
                }
            }

            // Set extension name
            children._extensionName.set_text(metadata.name || "EthCal");

            // Set version (you might want to get this from metadata or package.json)
            children._extensionVersion.set_text(
                metadata["version-name"] || "1.0.0",
            );

            // Set up website link
            if (metadata.url) {
                children._linkWebsite.connect("clicked", () => {
                    Gio.AppInfo.launch_default_for_uri(
                        metadata.url as string,
                        null,
                    );
                });
            } else {
                children._linkWebsite.visible = false;
            }

            // Set up issues link
            if (metadata.url) {
                children._linkIssues.connect("clicked", () => {
                    Gio.AppInfo.launch_default_for_uri(
                        `${metadata.url}/issues`,
                        null,
                    );
                });
            } else {
                children._linkIssues.visible = false;
            }

            // Set license text
            children._extensionLicense.buffer.set_text(LICENSE, -1);

            // You could expand credits/legal sections if needed
            // children._creditsRow.expanded = false;
            // children._legalRow.expanded = false;
        }
    },
);

export default class EthCalPrefs extends ExtensionPreferences {
    override async fillPreferencesWindow(
        window: Adw.PreferencesWindow,
    ): Promise<void> {
        const prefsWindow = window as Adw.PreferencesWindow & {
            _settings: Gio.Settings;
        };

        // Create a settings object and bind the row to our key.
        // Attach the settings object to the window to keep it alive while the window is alive.
        prefsWindow._settings = this.getSettings();

        const generalPage = new GeneralPage();
        generalPage.bindSettings(prefsWindow._settings);
        prefsWindow.add(generalPage);

        const aboutPage = new AboutPage();
        aboutPage.setMetadata(this.metadata);
        prefsWindow.add(aboutPage);
    }
}
