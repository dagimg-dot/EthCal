import { test } from "../lib/harness.js";
import { ExtensionState, extension } from "../lib/shell.js";

test("disable makes the extension inactive and enable restores it", () => {
    extension.disable();
    extension.waitForState(ExtensionState.INACTIVE);
    extension.enable();
    extension.waitForState(ExtensionState.ACTIVE);
});

test("rapid disable/enable toggling leaves the extension active", () => {
    for (let i = 0; i < 5; i++) {
        extension.disable();
        extension.enable();
    }
    extension.waitForState(ExtensionState.ACTIVE);
});
