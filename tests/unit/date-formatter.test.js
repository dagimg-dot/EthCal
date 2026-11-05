import { describe, expect, test } from "bun:test";
import Kenat from "../../src/lib/kenat.ts";
import { DateFormatterService } from "../../src/services/dateFormatter.ts";

const date = new Kenat("2018/1/1").setTime(3, 30, "day");
const format = (options, pattern) =>
    new DateFormatterService(options).format(pattern, date);

describe("format", () => {
    test("replaces every token in English", () => {
        expect(
            format(
                { language: "english", useGeezNumerals: false },
                "dday, mnam dd, year hh:mm tp",
            ),
        ).toBe("Thursday, Meskerem 1, 2018 03:30 Morning");
    });

    test("uses Amharic names and Geez numerals", () => {
        expect(
            format(
                { language: "amharic", useGeezNumerals: true },
                "dday, mnam dd, year",
            ),
        ).toBe("ሐሙስ, መስከረም ፩, ፳፻፲፰");
    });

    test("keeps text that is not a token", () => {
        expect(
            format(
                { language: "english", useGeezNumerals: false },
                "on dd/mnum",
            ),
        ).toBe("on 1/1");
    });

    test("returns an empty string for an empty pattern", () => {
        expect(
            format({ language: "english", useGeezNumerals: false }, ""),
        ).toBe("");
    });

    test("follows updated options", () => {
        const formatter = new DateFormatterService({
            language: "english",
            useGeezNumerals: false,
        });
        formatter.updateOptions({ language: "amharic" });
        expect(formatter.format("mnam", date)).toBe("መስከረም");
    });
});
