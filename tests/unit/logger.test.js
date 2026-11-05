import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import {
    deinitializeLogger,
    getVerbosity,
    initializeLogger,
    logger,
} from "../../src/utils/logger.ts";

/** Gio.Settings with a `logging-level` that can be changed like the prefs window does. */
function fakeSettings(level) {
    const handlers = {};
    return {
        get_string: () => level,
        connectObject: (signal, handler) => {
            handlers[signal] = handler;
        },
        disconnectObject: () => {},
        change(newLevel) {
            level = newLevel;
            handlers["changed::logging-level"]();
        },
    };
}

let printed;
let consoleLog;

beforeEach(() => {
    consoleLog = spyOn(console, "log").mockImplementation(() => {});
    printed = () => consoleLog.mock.calls.map(([text]) => text).join("\n");
});

afterEach(() => {
    const settings = fakeSettings("info");
    initializeLogger(settings);
    deinitializeLogger(settings);
    consoleLog.mockRestore();
});

describe("getVerbosity", () => {
    for (const [level, verbosity] of [
        ["error", 0],
        ["warn", 1],
        ["info", 2],
        ["debug", 3],
        ["DEBUG", 3],
        ["verbose", 2],
        ["", 2],
    ]) {
        test(`${JSON.stringify(level)} is ${verbosity}`, () => {
            expect(getVerbosity(level)).toBe(verbosity);
        });
    }
});

describe("logger", () => {
    test("prints only messages at or above the configured level", () => {
        initializeLogger(fakeSettings("warn"));
        consoleLog.mockClear();

        logger.debug("debug message");
        logger.info("info message");
        logger.warn("warn message");
        logger.error("error message");

        expect(printed()).not.toContain("debug message");
        expect(printed()).not.toContain("info message");
        expect(printed()).toContain("WARN: warn message");
        expect(printed()).toContain("ERROR: error message");
    });

    test("follows logging-level changes from the settings", () => {
        const settings = fakeSettings("info");
        initializeLogger(settings);

        logger.debug("before");
        settings.change("debug");
        logger.debug("after");

        expect(printed()).not.toContain("before");
        expect(printed()).toContain("DEBUG: after");
    });

    test("prints an error's message and stack indented under its entry", () => {
        initializeLogger(fakeSettings("info"));
        consoleLog.mockClear();

        logger.error("Failed to export", new Error("name taken"));

        const [entry, message, stack] = printed().split("\n");
        expect(entry).toMatch(/ERROR: Failed to export$/);
        expect(message).toMatch(/ERROR: {3}Error: name taken$/);
        expect(stack).toMatch(/ERROR: {3}\S/);
    });

    test("prints object details as indented key-value lines", () => {
        initializeLogger(fakeSettings("info"));
        consoleLog.mockClear();

        logger.info("Window", { id: 42, title: "Files" });

        expect(printed().split("\n").slice(1)).toEqual([
            expect.stringMatching(/INFO: {3}id: 42$/),
            expect.stringMatching(/INFO: {3}title: Files$/),
        ]);
    });
});
