import { ExtensionBase } from "stignite";
import { StatusBarIndicator } from "./components/StatusBarIndicator.js";
import { logger } from "./utils/logger.js";

export default class EthCal extends ExtensionBase {
    private _statusBarIndicator: StatusBarIndicator | undefined;

    enable(): void {
        logger("EthCal extension enabled");
        this._statusBarIndicator = new StatusBarIndicator(this);
        this.addComponent(this._statusBarIndicator);
    }

    disable(): void {
        logger("EthCal extension disabled");
        super.destroy();
    }
}
