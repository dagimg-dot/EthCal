import type Gio from "gi://Gio";
import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";
import { StatusBarIndicator } from "./components/StatusBarIndicator.js";
import {
    deinitializeLogger,
    initializeLogger,
    logger,
} from "./utils/logger.js";

export default class EthCal extends Extension {
    private settings: Gio.Settings | null = null;
    private indicator: StatusBarIndicator | null = null;

    enable(): void {
        this.settings = this.getSettings();
        initializeLogger(this.settings);
        logger.info("Enabling EthCal extension");

        this.indicator = new StatusBarIndicator(this.settings, () =>
            this.openPreferences(),
        );
    }

    disable(): void {
        logger.info("Disabling EthCal extension");

        this.indicator?.destroy();
        this.indicator = null;

        if (this.settings) deinitializeLogger(this.settings);
        this.settings = null;
    }
}
