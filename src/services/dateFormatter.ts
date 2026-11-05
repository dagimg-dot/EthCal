import Kenat, { toGeez } from "../lib/kenat.js";
import type { LanguageOption } from "../types/index.js";

export interface DateFormatterOptions {
    language: LanguageOption;
    useGeezNumerals: boolean;
}

export interface TokenValue {
    dnum: number | string; // weekday number (0-6) or Geez numeral
    dday: string; // weekday name
    dd: number | string; // day of month (1-30/31) or Geez numeral
    mnum: number | string; // month number (1-13) or Geez numeral
    mnam: string; // month name
    year: number | string; // year number or Geez numeral
    tp: string; // time period (day/night)
    hh: number | string; // hour (24h format) or Geez numeral
    h: number | string; // hour (24h format, same as hh) or Geez numeral
    mm: number | string; // minute or Geez numeral
    m: number | string; // minute, same as mm or Geez numeral
}

const isTokenKey = (
    token: string,
    values: TokenValue,
): token is keyof TokenValue => token in values;

export class DateFormatterService {
    constructor(private options: DateFormatterOptions) {}

    /** Format a date string using custom tokens */
    format(formatString: string, date: Kenat): string {
        if (!formatString) return "";
        return this.replaceTokens(formatString, this.getTokenValues(date));
    }

    /** Get all available token values for a given date */
    private getTokenValues(kenat: Kenat): TokenValue {
        const ethiopian = kenat.getEthiopian();

        const weekday = this.getWeekdayNumber(ethiopian);

        const weekdayName = this.getWeekdayName(weekday);

        const monthName = this.getMonthName(ethiopian.month);

        const timePeriod = this.getTimePeriod(
            kenat.time.hour,
            kenat.time.period,
        );

        return {
            dnum: this.options.useGeezNumerals ? toGeez(weekday) : weekday,
            dday: weekdayName,
            dd: this.options.useGeezNumerals
                ? toGeez(ethiopian.day)
                : ethiopian.day,
            mnum: this.options.useGeezNumerals
                ? toGeez(ethiopian.month)
                : ethiopian.month,
            mnam: monthName,
            year: this.options.useGeezNumerals
                ? toGeez(ethiopian.year)
                : ethiopian.year,
            tp: timePeriod,
            hh: this.options.useGeezNumerals
                ? toGeez(kenat.time.hour)
                : kenat.time.hour.toString().padStart(2, "0"),
            h: this.options.useGeezNumerals
                ? toGeez(kenat.time.hour)
                : kenat.time.hour.toString().padStart(2, "0"),
            mm: this.options.useGeezNumerals
                ? toGeez(kenat.time.minute)
                : kenat.time.minute.toString().padStart(2, "0"),
            m: this.options.useGeezNumerals
                ? toGeez(kenat.time.minute)
                : kenat.time.minute.toString().padStart(2, "0"),
        };
    }

    /** Replace tokens in format string with actual values */
    private replaceTokens(
        formatString: string,
        tokenValues: TokenValue,
    ): string {
        return formatString.replace(
            /\b(dnum|dday|dd|mnum|mnam|year|tp|hh|h|mm|m)\b/g,
            (token) =>
                isTokenKey(token, tokenValues)
                    ? String(tokenValues[token])
                    : token,
        );
    }

    /** Get weekday number (0 = Sunday, 1 = Monday, etc.) */
    private getWeekdayNumber(ethiopian: {
        year: number;
        month: number;
        day: number;
    }): number {
        const kenat = new Kenat(
            `${ethiopian.year}/${ethiopian.month}/${ethiopian.day}`,
        );
        const gregorian = kenat.getGregorian();
        const jsDate = new Date(
            gregorian.year,
            gregorian.month - 1,
            gregorian.day,
        );
        return jsDate.getDay();
    }

    /** Get localized weekday name */
    private getWeekdayName(weekday: number): string {
        const weekdays = {
            amharic: ["እሑድ", "ሰኞ", "ማክሰኞ", "ረቡዕ", "ሐሙስ", "ዓርብ", "ቅዳሜ"],
            english: [
                "Sunday",
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday",
            ],
        };
        return weekdays[this.options.language][weekday] || "";
    }

    /** Get localized month name */
    private getMonthName(month: number): string {
        const kenat = new Kenat(`2024/${month}/1`);

        return kenat
            .format({
                lang: this.options.language,
                useGeez: this.options.useGeezNumerals,
            })
            .split(" ")[0];
    }

    /** Get time period (day/night) */
    private getTimePeriod(hour: number, period: string): string {
        if (this.options.language === "amharic") {
            if (hour >= 1 && hour < 6 && period === "day") return "ጠዋት";
            if (hour >= 6 && hour < 12 && period === "day") return "ከሰዓት";
            if (hour >= 1 && hour < 6 && period === "night") return "ምሽት";
            if (hour >= 12 && period === "night") return "ምሽት";
            if (hour >= 12 && period === "day") return "ጠዋት";
            return "ሌሊት";
        } else {
            if (hour >= 1 && hour < 6 && period === "day") return "Morning";
            if (hour >= 6 && hour < 12 && period === "day") return "Afternoon";
            if (hour >= 1 && hour < 6 && period === "night") return "Evening";
            if (hour >= 12 && period === "night") return "Evening";
            if (hour >= 12 && period === "day") return "Morning";
            return "Night";
        }
    }

    /** Update options (useful when settings change) */
    updateOptions(options: Partial<DateFormatterOptions>): void {
        this.options = { ...this.options, ...options };
    }
}
