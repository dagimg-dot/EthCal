import GObject from 'gi://GObject';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';

import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import type { ExtensionMetadata } from '@girs/gnome-shell/extensions/extension';

const LICENSE = `Copyright (c) 2024 Dagim G. Astatkie <workflow.jd@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;

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
    _sayHello: Adw.SwitchRow;
}

const GeneralPage = GObject.registerClass(
    {
        GTypeName: 'TypescriptTemplateGeneralPage',
        Template: getTemplate('GeneralPage'),
        InternalChildren: ['sayHello'],
    },
    class TypescriptTemplateGeneralPage extends Adw.PreferencesPage {
        constructor(settings: Gio.Settings) {
            super();

            const children = this as unknown as GeneralPageChildren;
            settings.bind(
                'say-hello',
                children._sayHello,
                'active',
                Gio.SettingsBindFlags.DEFAULT,
            );
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
        GTypeName: 'TypescriptTemplateAboutPage',
        Template: getTemplate('AboutPage'),
        InternalChildren: [
            'extensionName',
            'extensionDescription',
            'linkGithub',
            'linkIssues',
            'extensionLicense',
        ],
    },
    class TypescriptTemplateAboutPage extends Adw.PreferencesPage {
        constructor(metadata: ExtensionMetadata) {
            super();
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
    override fillPreferencesWindow(
        window: Adw.PreferencesWindow & {
            _settings: Gio.Settings;
        },
    ): void {
        // Create a settings object and bind the row to our key.
        // Attach the settings object to the window to keep it alive while the window is alive.
        window._settings = this.getSettings();
        window.add(new GeneralPage(window._settings));
        window.add(new AboutPage(this.metadata));
    }
}
