import Adw from "gi://Adw";
import Gio from "gi://Gio";
import GLib from "gi://GLib";
import GObject from "gi://GObject";
import type { ExtensionMetadata } from "@girs/gnome-shell/extensions/extension";
import type { AboutPageChildren } from "../types/index.js";
import { getTemplate } from "../utils/getTemplate.js";

const LICENSE = "You can check out the LICENSE in the github page 🙂";

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
