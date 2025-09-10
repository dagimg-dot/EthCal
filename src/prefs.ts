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
    _sayHello: Adw.SwitchRow;
}

const GeneralPage = GObject.registerClass(
    {
        GTypeName: "TypescriptTemplateGeneralPage",
        Template: getTemplate("GeneralPage"),
        InternalChildren: [
            "statusBarPosition",
            "statusBarFormat",
            "calendarLanguage",
            "sayHello",
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
            });

            // Legacy setting
            settings.bind(
                "say-hello",
                children._sayHello,
                "active",
                Gio.SettingsBindFlags.DEFAULT,
            );

            // Initialize combo boxes with current values
            this._updateComboBoxes(settings, children);
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
    },
);

interface AboutPageChildren {
    _extensionName: Gtk.Label;
    _extensionDescription: Gtk.Label;
    _linkGithub: Gtk.LinkButton;
    _linkIssues: Gtk.LinkButton;
    _extensionLicense: Gtk.TextView;
}

const AboutPage = GObject.registerClass(
    {
        GTypeName: "TypescriptTemplateAboutPage",
        Template: getTemplate("AboutPage"),
        InternalChildren: [
            "extensionName",
            "extensionDescription",
            "linkGithub",
            "linkIssues",
            "extensionLicense",
        ],
    },
    class AboutPage extends Adw.PreferencesPage {
        setMetadata(metadata: ExtensionMetadata) {
            const children = this as unknown as AboutPageChildren;
            children._extensionName.set_text(metadata.name);
            children._extensionDescription.set_text(metadata.description);
            if (metadata.url) {
                children._linkGithub.set_uri(metadata.url);
                children._linkIssues.set_uri(`${metadata.url}/issues`);
            } else {
                children._linkGithub.visible = false;
                children._linkIssues.visible = false;
            }
            children._extensionLicense.buffer.set_text(LICENSE, -1);
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
