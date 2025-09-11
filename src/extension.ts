import { StatusBarIndicator } from "./components/StatusBarIndicator.js";
import { ExtensionBase } from "./stignite/ExtensionBase.js";
import { logger } from "./utils/logger.js";

export default class EthCal extends ExtensionBase {
    #statusBarIndicator: StatusBarIndicator | undefined;

    protected initialize(): void {
        logger("EthCal extension enabled");
        this.#statusBarIndicator = new StatusBarIndicator(this);
        this.addComponent(this.#statusBarIndicator);
    }
}
