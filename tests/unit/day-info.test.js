import { describe, expect, test } from "bun:test";
import { DayInfoService } from "../../src/services/dayInfoService.ts";

const english = new DayInfoService("english");

describe("getDayEvents", () => {
    test("lists the holiday on its day", () => {
        expect(english.getDayEvents({ year: 2018, month: 5, day: 11 })).toEqual(
            [
                {
                    title: "Ethiopian Epiphany (Timket)",
                    description:
                        "Commemorates the baptism of Jesus in the Jordan River.",
                },
            ],
        );
    });

    test("counts the days into each fast the date falls in", () => {
        const titles = english
            .getDayEvents({ year: 2018, month: 7, day: 1 })
            .map((event) => event.title);
        expect(titles).toEqual([
            "Day 23 / 54 - Great Lent (Abiy Tsome)",
            "Day 22 / 30 - Ramadan",
        ]);
    });

    test("follows the language", () => {
        const service = new DayInfoService("english");
        service.updateLanguage("amharic");
        expect(
            service.getDayEvents({ year: 2018, month: 1, day: 1 })[0].title,
        ).toBe("እንቁጣጣሽ");
    });
});
