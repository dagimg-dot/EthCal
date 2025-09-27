import type { ExtensionMetadata } from "resource:///org/gnome/shell/extensions/extension.js";
import { ExtensionBase } from "stignite";
import { StatusBarIndicator } from "./components/StatusBarIndicator.js";
import { SETTINGS } from "./types/index.js";

export default class EthCal extends ExtensionBase {
    private _statusBarIndicator: StatusBarIndicator | undefined;

    constructor(metadata: ExtensionMetadata) {
        // Define the setting schema for this extension
        const settingSchema = {
            [SETTINGS.KEYS.STATUS_BAR_POSITION]: {
                type: "string" as const,
                default: SETTINGS.DEFAULTS.POSITION,
            },
            [SETTINGS.KEYS.STATUS_BAR_FORMAT]: {
                type: "string" as const,
                default: SETTINGS.DEFAULTS.FORMAT,
            },
            [SETTINGS.KEYS.STATUS_BAR_CUSTOM_FORMAT]: {
                type: "string" as const,
                default: SETTINGS.DEFAULTS.CUSTOM_FORMAT,
            },
            [SETTINGS.KEYS.CALENDAR_LANGUAGE]: {
                type: "string" as const,
                default: SETTINGS.DEFAULTS.LANGUAGE,
            },
            [SETTINGS.KEYS.USE_GEEZ_NUMERALS]: {
                type: "boolean" as const,
                default: SETTINGS.DEFAULTS.GEEZ_NUMERALS,
            },
        };

        super(metadata, { settingSchema });
    }

    enable(): void {
        this._statusBarIndicator = new StatusBarIndicator(this);
        this.addComponent(this._statusBarIndicator);
    }

    disable(): void {
        super.destroy();
    }
}
