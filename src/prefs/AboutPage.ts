import Adw from "gi://Adw";
import Gio from "gi://Gio";
import GLib from "gi://GLib";
import GObject from "gi://GObject";
import type { ExtensionMetadata } from "@girs/gnome-shell/extensions/extension";
import type { AboutPageChildren, Credit } from "../types/index.js";
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
        setMetadata(metadata: ExtensionMetadata) {
            const children = this as unknown as AboutPageChildren;

            // Set the icon from the project's assets
            const iconPath = GLib.uri_resolve_relative(
                import.meta.url,
                "../assets/icons/ethcal.svg",
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

            // Set version
            const envSuffix =
                typeof __ETHCAL_ENV_SUFFIX__ !== "undefined"
                    ? __ETHCAL_ENV_SUFFIX__
                    : "";
            children._extensionVersion.set_text(
                `v${metadata["version-name"] || metadata.version || "1.0.0"}${envSuffix}`,
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

            // Render credits
            this.renderCredits(children);
        }

        private renderCredits(children: AboutPageChildren) {
            const creditsExpander = children._creditsRow;

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
