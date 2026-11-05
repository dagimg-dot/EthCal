import Gio from "gi://Gio";
import { afterAll, sleep, test, waitFor } from "../lib/harness.js";
import {
    ExtensionState,
    extension,
    extensionSettings,
    loggedPositions,
} from "../lib/shell.js";

const settings = extensionSettings();
const KEYS = [
    "logging-level",
    "status-bar-position",
    "status-bar-format",
    "status-bar-custom-format",
    "calendar-language",
    "use-geez-numerals",
];
afterAll(() => {
    for (const key of KEYS) settings.reset(key);
});

const apply = (write) => {
    write();
    Gio.Settings.sync();
    sleep(300);
};

const moveTo = (position) => {
    apply(() => settings.set_string("status-bar-position", position));
    waitFor(
        `indicator to move ${position}`,
        () => loggedPositions().at(-1) === position,
    );
};

settings.set_string("logging-level", "debug");

test("changing the position moves the indicator", () => {
    moveTo("right");
});

test("every format, language and numeral setting applies without errors", () => {
    for (const format of [
        "full",
        "compact",
        "time-only",
        "date-only",
        "custom",
    ])
        apply(() => settings.set_string("status-bar-format", format));
    apply(() => settings.set_string("status-bar-custom-format", "dday hh:mm"));
    apply(() => settings.set_string("calendar-language", "english"));
    apply(() => settings.set_string("calendar-language", "amharic"));
    apply(() => settings.set_boolean("use-geez-numerals", true));
    apply(() => settings.set_boolean("use-geez-numerals", false));
});

test("settings still apply after disable and enable", () => {
    extension.disable();
    extension.waitForState(ExtensionState.INACTIVE);
    extension.enable();
    extension.waitForState(ExtensionState.ACTIVE);
    moveTo("center");
});

test("settings still apply after rapid toggling", () => {
    for (let i = 0; i < 5; i++) {
        extension.disable();
        extension.enable();
    }
    extension.waitForState(ExtensionState.ACTIVE);
    moveTo("left");
});
