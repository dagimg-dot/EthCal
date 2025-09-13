import Kenat, { toGeez } from "kenat";
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

export class DateFormatterService {
    private options: DateFormatterOptions;
    private kenat: Kenat;
    private tokenCache: Map<string, string> = new Map();

    constructor(options: DateFormatterOptions) {
        this.options = options;
        this.kenat = new Kenat();
    }

    /**
     * Format a date string using custom tokens
     * @param formatString - String with tokens like "dday, mnam dd, year"
     * @param date - Optional specific date, defaults to current date
     * @returns Formatted string
     */
    format(formatString: string, date?: Kenat): string {
        if (!formatString || typeof formatString !== "string") {
            return "";
        }

        // Use provided date or current date
        const kenat = date || this.kenat;

        // Get token values for the date
        const tokenValues = this.getTokenValues(kenat);

        // Replace tokens in the format string
        return this.replaceTokens(formatString, tokenValues);
    }

    /**
     * Get all available token values for a given date
     */
    private getTokenValues(kenat: Kenat): TokenValue {
        const ethiopian = kenat.getEthiopian();

        // Get weekday number (0 = Sunday, 1 = Monday, etc.)
        const weekday = this.getWeekdayNumber(ethiopian);

        // Get weekday name
        const weekdayName = this.getWeekdayName(weekday);

        // Get month name
        const monthName = this.getMonthName(ethiopian.month);

        // Get time period
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

    /**
     * Replace tokens in format string with actual values
     */
    private replaceTokens(
        formatString: string,
        tokenValues: TokenValue,
    ): string {
        // Use regex to find all tokens (word characters)
        return formatString.replace(
            /\b(dnum|dday|dd|mnum|mnam|year|tp|hh|h|mm|m)\b/g,
            (token) => {
                const value = tokenValues[token as keyof TokenValue];
                return value !== undefined ? String(value) : token;
            },
        );
    }

    /**
     * Get weekday number (0 = Sunday, 1 = Monday, etc.)
     */
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

    /**
     * Get localized weekday name
     */
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

    /**
     * Get localized month name
     */
    private getMonthName(month: number): string {
        const kenat = new Kenat(`2024/${month}/1`);

        return kenat
            .format({
                lang: this.options.language,
                useGeez: this.options.useGeezNumerals,
            })
            .split(" ")[0]; // Extract just the month name
    }

    /**
     * Get time period (day/night)
     */
    private getTimePeriod(hour: number, period: string): string {
        if (this.options.language === "amharic") {
            if (hour >= 1 && hour < 6 && period === "day") return "ጠዋት";
            if (hour >= 6 && hour < 12 && period === "day") return "ከሰዓት";
            if (hour >= 1 && hour < 6 && period === "night") return "ምሽት";
            return "ሌሊት";
        } else {
            if (hour >= 1 && hour < 6 && period === "day") return "Morning";
            if (hour >= 6 && hour < 12 && period === "day") return "Afternoon";
            if (hour >= 1 && hour < 6 && period === "night") return "Evening";
            return "Night";
        }
    }

    /**
     * Update options (useful when settings change)
     */
    updateOptions(options: Partial<DateFormatterOptions>): void {
        this.options = { ...this.options, ...options };
        // Clear cache when options change
        this.tokenCache.clear();
    }

    /**
     * Get available tokens for documentation/help
     */
    getAvailableTokens(): string[] {
        return [
            "dnum",
            "dday",
            "dd",
            "mnum",
            "mnam",
            "year",
            "tp",
            "hh",
            "h",
            "mm",
            "m",
        ];
    }

    /**
     * Test a format string and return preview with validation
     */
    testFormat(
        formatString: string,
        testDate?: Kenat,
    ): {
        isValid: boolean;
        errors: string[];
        preview: string;
        tokens: string[];
    } {
        const validation = this.validateFormat(formatString);

        let preview = "";
        let tokens: string[] = [];

        if (validation.isValid) {
            try {
                // Extract tokens used in the format
                const tokenRegex =
                    /\b(dnum|dday|dd|mnum|mnam|year|tp|hh|h|mm|m)\b/g;
                const matches = formatString.match(tokenRegex);
                tokens = matches ? [...new Set(matches)] : []; // Remove duplicates

                // Generate preview
                preview = this.format(formatString, testDate);
            } catch (error) {
                validation.errors.push(
                    `Preview error: ${error instanceof Error ? error.message : "Unknown error"}`,
                );
            }
        }

        return {
            isValid: validation.isValid,
            errors: validation.errors,
            preview,
            tokens,
        };
    }

    /**
     * Validate a format string
     */
    validateFormat(formatString: string): {
        isValid: boolean;
        errors: string[];
    } {
        const errors: string[] = [];

        if (!formatString || typeof formatString !== "string") {
            errors.push("Format string must be a non-empty string");
            return { isValid: false, errors };
        }

        // Check for unknown tokens
        const validTokens = new Set([
            "dnum",
            "dday",
            "dd",
            "mnum",
            "mnam",
            "year",
            "tp",
            "hh",
            "h",
            "mm",
            "m",
        ]);
        const allTokens = formatString.match(/\b[a-zA-Z]+\b/g) || [];
        const unknownTokens = allTokens.filter(
            (token) => !validTokens.has(token),
        );

        if (unknownTokens.length > 0) {
            errors.push(`Unknown tokens: ${unknownTokens.join(", ")}`);
        }

        return {
            isValid: errors.length === 0,
            errors,
        };
    }
}

/**
 * Create a DateFormatterService instance
 */
export function createDateFormatterService(
    options: DateFormatterOptions,
): DateFormatterService {
    return new DateFormatterService(options);
}
