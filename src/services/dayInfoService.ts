import Kenat, {
    FastingKeys,
    getFastingInfo,
    getHolidaysInMonth,
} from "../lib/kenat.js";
import type { LanguageOption } from "../types/index.js";
import { logger } from "../utils/logger.js";

export type KenatDate = { year: number; month: number; day: number };

export interface DayEvent {
    title: string;
    description: string;
}

const toKenat = ({ year, month, day }: KenatDate) =>
    new Kenat(`${year}/${month}/${day}`);

const dateValue = ({ year, month, day }: KenatDate) =>
    year * 10000 + month * 100 + day;

/** Days from `from` to `to`, counting both ends. */
const dayCount = (from: KenatDate, to: KenatDate) =>
    Math.max(1, toKenat(to).diffInDays(toKenat(from)) + 1);

/** Check if a date is a Tsome Dihnet fasting day (Wed/Fri). */
const isWednesdayOrFriday = (date: KenatDate) => {
    const { year, month, day } = toKenat(date).getGregorian();
    const weekday = new Date(year, month - 1, day).getDay();
    return weekday === 3 || weekday === 5;
};

export class DayInfoService {
    constructor(private language: LanguageOption) {}

    /** Update the language setting. */
    updateLanguage(language: LanguageOption): void {
        this.language = language;
    }

    /** Get all holidays and fasts for a day. */
    getDayEvents(date: KenatDate): DayEvent[] {
        return [...this.getHolidays(date), ...this.getFasts(date)];
    }

    /** Get holidays for a specific date. */
    private getHolidays(date: KenatDate): DayEvent[] {
        try {
            return getHolidaysInMonth(date.year, date.month, {
                lang: this.language,
            })
                .filter((holiday) => holiday.ethiopian.day === date.day)
                .map((holiday) => ({
                    title: holiday.name || holiday.key,
                    description: holiday.description || "",
                }));
        } catch (error) {
            logger.error("Error getting holidays", error);
            return [];
        }
    }

    private getFasts(date: KenatDate): DayEvent[] {
        return Object.values(FastingKeys).flatMap((fastKey) => {
            try {
                const fast = this.getFast(fastKey, date);
                return fast ? [fast] : [];
            } catch (error) {
                logger.error(
                    `Error getting fasting info for ${fastKey}`,
                    error,
                );
                return [];
            }
        });
    }

    /** Get the fast a date falls in for one fasting key, if any. */
    private getFast(fastKey: string, date: KenatDate): DayEvent | null {
        const info = getFastingInfo(fastKey, date.year, {
            lang: this.language,
        });

        if (!info?.period) {
            if (
                fastKey !== FastingKeys.TSOME_DIHENET ||
                !isWednesdayOrFriday(date)
            ) {
                return null;
            }
            return {
                title: info?.name || "Fast of Salvation",
                description:
                    info?.description ||
                    "Weekly fast on Wednesdays and Fridays",
            };
        }

        const { start, end } = info.period;
        if (
            dateValue(date) < dateValue(start) ||
            dateValue(date) > dateValue(end)
        ) {
            return null;
        }

        const dayWord = this.language === "amharic" ? "ቀን" : "Day";
        return {
            title: `${dayWord} ${dayCount(start, date)} / ${dayCount(start, end)} - ${info.name}`,
            description: info.description,
        };
    }
}
