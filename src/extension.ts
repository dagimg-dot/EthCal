import { StatusBarIndicator } from "./components/StatusBarIndicator.js";
import { ExtensionBase } from "./stignite/ExtensionBase.js";
import { logger } from "./utils/logger.js";

export default class EthCal extends ExtensionBase {
    private _statusBarIndicator: StatusBarIndicator | undefined;

    protected initialize(): void {
        logger("EthCal extension enabled");
        this._statusBarIndicator = new StatusBarIndicator(this);
        this.addComponent(this._statusBarIndicator);
    }
}
