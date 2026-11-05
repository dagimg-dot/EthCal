import Adw from "gi://Adw";
import Gio from "gi://Gio";
import GObject from "gi://GObject";
import type Gtk from "gi://Gtk";
import type { ExtensionPreferences } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";
import { Icons } from "../lib/icons.js";
import type { Credit } from "../types/index.js";
import { getTemplate } from "../utils/getTemplate.js";

export const CREDITS: Credit[] = [
    {
        title: "Dagim G. Astatkie",
        subtitle: "Original Author",
        github: "dagimg-dot",
    },
    {
        title: "ashenafidl",
        subtitle: "Contributor",
        github: "ashenafidl",
    },
];

const LICENSE = `MIT License

Copyright (c) 2025 Dagim G. Astatkie

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

export const AboutPage = GObject.registerClass(
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
        declare _extensionIcon: Gtk.Image;
        declare _extensionName: Gtk.Label;
        declare _extensionVersion: Gtk.Label;
        declare _linkWebsite: Gtk.Button;
        declare _linkIssues: Gtk.Button;
        declare _creditsRow: Adw.ExpanderRow;
        declare _legalRow: Adw.ExpanderRow;
        declare _extensionLicense: Gtk.TextView;

        setMetadata(metadata: ExtensionPreferences["metadata"]) {
            Icons.load(metadata.path);
            this._extensionIcon.set_from_gicon(Icons.get("ethcal"));

            this._extensionName.set_text(metadata.name);

            this._extensionVersion.set_text(
                `v${metadata["version-name"] || metadata.version}${__ETHCAL_ENV_SUFFIX__}`,
            );

            const url = metadata.url;
            if (url) {
                this._linkWebsite.connect("clicked", () => {
                    Gio.AppInfo.launch_default_for_uri(url, null);
                });
                this._linkIssues.connect("clicked", () => {
                    Gio.AppInfo.launch_default_for_uri(`${url}/issues`, null);
                });
            } else {
                this._linkWebsite.visible = false;
                this._linkIssues.visible = false;
            }

            this._extensionLicense.buffer.set_text(LICENSE, -1);

            this.renderCredits();
        }

        private renderCredits() {
            const creditsExpander = this._creditsRow;

            CREDITS.forEach((credit) => {
                const creditRow = new Adw.ActionRow({
                    title: credit.title,
                    subtitle: credit.subtitle,
                });

                if (credit.github) {
                    creditRow.set_activatable(true);
                    creditRow.connect("activated", () => {
                        Gio.AppInfo.launch_default_for_uri(
                            `https://github.com/${credit.github}`,
                            null,
                        );
                    });
                }

                creditsExpander.add_row(creditRow);
            });
        }
    },
);
