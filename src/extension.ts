import { ExtensionBase } from "stignite";
import { StatusBarIndicator } from "./components/StatusBarIndicator.js";

export default class EthCal extends ExtensionBase {
    private _statusBarIndicator: StatusBarIndicator | undefined;

    enable(): void {
        this._statusBarIndicator = new StatusBarIndicator(this);
        this.addComponent(this._statusBarIndicator);
    }

    disable(): void {
        super.destroy();
    }
}
