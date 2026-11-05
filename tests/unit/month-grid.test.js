import { describe, expect, test } from "bun:test";
import { MonthGridService } from "../../src/services/monthGrid.ts";

function gridFor(month, year, options) {
    const service = new MonthGridService(options);
    service.setDate(month, year);
    return service;
}

describe("generate", () => {
    const english = gridFor(1, 2018, {
        weekdayLang: "english",
        useGeez: false,
    });
    const result = english.generate();

    test("starts the week on Monday", () => {
        expect(result.headers).toEqual([
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday",
        ]);
    });

    test("pads the month so Meskerem 1, 2018 falls on Thursday", () => {
        expect(result.days.findIndex(Boolean)).toBe(3);
        expect(result.days.filter(Boolean)).toHaveLength(30);
    });

    test("names the month and year", () => {
        expect(result.monthName).toBe("Meskerem");
        expect(result.year).toBe(2018);
    });

    test("marks Enkutatash on the first day", () => {
        const first = result.days.find(Boolean);
        expect(first.date).toEqual({ year: 2018, month: 1, day: 1 });
        expect(first.label).toBe("1");
        expect(first.holidays.map((h) => h.key)).toEqual(["enkutatash"]);
        expect(first.holidayTags).toEqual(["public", "cultural"]);
    });

    test("uses Amharic names and Geez numerals when asked", () => {
        const amharic = gridFor(1, 2018, {
            weekdayLang: "amharic",
            useGeez: true,
        }).generate();
        expect(amharic.headers[0]).toBe("ሰኞ");
        expect(amharic.monthName).toBe("መስከረም");
        expect(amharic.year).toBe("፳፻፲፰");
        expect(amharic.days.find(Boolean).label).toBe("፩");
    });

    test("gives Pagume its five days", () => {
        const pagume = gridFor(13, 2017, {
            weekdayLang: "english",
            useGeez: false,
        }).generate();
        expect(pagume.days.filter(Boolean)).toHaveLength(5);
    });
});

describe("navigation", () => {
    test("up wraps from Pagume to Meskerem of the next year", () => {
        const service = gridFor(13, 2017, {
            weekdayLang: "english",
            useGeez: false,
        });
        service.up();
        expect([service.month, service.year]).toEqual([1, 2018]);
    });

    test("down wraps from Meskerem to Pagume of the previous year", () => {
        const service = gridFor(1, 2018, {
            weekdayLang: "english",
            useGeez: false,
        });
        service.down();
        expect([service.month, service.year]).toEqual([13, 2017]);
    });
});
