import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";
import { StatusBarIndicator } from "./components/StatusBarIndicator.js";
import { logger } from "./utils/logger.js";

export default class EthCal extends Extension {
    #statusBarIndicator: StatusBarIndicator | undefined;

    enable() {
        logger("EthCal extension enabled");
        this.#statusBarIndicator = new StatusBarIndicator(this);
    }

    disable() {
        logger("EthCal extension disabled");
        if (this.#statusBarIndicator) {
            this.#statusBarIndicator.onDestroy(); // Use Stignite's destroy method
            this.#statusBarIndicator = undefined;
        }
    }
}
