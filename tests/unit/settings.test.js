import { describe, expect, test } from "bun:test";
import {
    pickOption,
    readFormat,
    readLanguage,
    readPosition,
    readUseGeez,
} from "../../src/utils/settings.ts";

function fakeSettings(values) {
    return {
        get_string: (key) => values[key],
        get_boolean: (key) => values[key],
    };
}

describe("pickOption", () => {
    test("returns a value that is one of the options", () => {
        expect(pickOption("center", ["left", "center"], "left")).toBe("center");
    });

    test("falls back when the value is not an option", () => {
        expect(pickOption("middle", ["left", "center"], "left")).toBe("left");
    });
});

describe("readers", () => {
    test("read valid values as stored", () => {
        const settings = fakeSettings({
            "status-bar-position": "right",
            "status-bar-format": "compact",
            "calendar-language": "english",
            "use-geez-numerals": true,
        });
        expect(readPosition(settings)).toBe("right");
        expect(readFormat(settings)).toBe("compact");
        expect(readLanguage(settings)).toBe("english");
        expect(readUseGeez(settings)).toBe(true);
    });

    test("fall back to the schema defaults for unknown values", () => {
        const settings = fakeSettings({
            "status-bar-position": "top",
            "status-bar-format": "",
            "calendar-language": "french",
        });
        expect(readPosition(settings)).toBe("left");
        expect(readFormat(settings)).toBe("full");
        expect(readLanguage(settings)).toBe("amharic");
    });
});
