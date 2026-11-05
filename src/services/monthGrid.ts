import Kenat, {
    getHolidaysInMonth,
    type Holiday,
    monthNames,
    toGeez,
} from "../lib/kenat.js";
import type { LanguageOption } from "../types/index.js";
import type { KenatDate } from "./dayInfoService.js";

export interface MonthGridOptions {
    weekdayLang: LanguageOption;
    useGeez: boolean;
}

export interface DayCell {
    date: KenatDate;
    /** Day of month as shown in the grid, in Geez numerals when enabled. */
    label: string;
    isToday: boolean;
    holidays: Holiday[];
    holidayTags: string[];
}

export interface MonthGridResult {
    /** Seven weekday names starting from Monday. */
    headers: string[];
    /** Left-padded with nulls so the first day sits under its weekday. */
    days: Array<DayCell | null>;
    /** In Geez numerals when enabled. */
    year: number | string;
    monthName: string;
}

/** Monday-first weeks; 0 would start on Sunday. */
const WEEK_START = 1;

const WEEKDAY_LABELS: Record<LanguageOption, string[]> = {
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

export class MonthGridService {
    year: number;
    month: number;
    weekdayLang: LanguageOption;
    useGeez: boolean;

    constructor({ weekdayLang, useGeez }: MonthGridOptions) {
        const current = Kenat.now().getEthiopian();
        this.year = current.year;
        this.month = current.month;
        this.weekdayLang = weekdayLang;
        this.useGeez = useGeez;
    }

    generate(): MonthGridResult {
        const labels = WEEKDAY_LABELS[this.weekdayLang];
        return {
            headers: labels
                .slice(WEEK_START)
                .concat(labels.slice(0, WEEK_START)),
            days: this.buildDays(),
            year: this.useGeez ? toGeez(this.year) : this.year,
            monthName: monthNames[this.weekdayLang][this.month - 1],
        };
    }

    private buildDays(): Array<DayCell | null> {
        const today = Kenat.now().getEthiopian();
        const rawDays = new Kenat(
            `${this.year}/${this.month}/1`,
        ).getMonthCalendar(this.year, this.month, false);

        const holidaysByDay = new Map<number, Holiday[]>();
        for (const holiday of getHolidaysInMonth(this.year, this.month, {
            lang: this.weekdayLang,
        })) {
            const { day } = holiday.ethiopian;
            holidaysByDay.set(day, [
                ...(holidaysByDay.get(day) ?? []),
                holiday,
            ]);
        }

        const days: DayCell[] = rawDays.map(({ ethiopian }) => {
            const { year, month, day } = ethiopian;
            const holidays = holidaysByDay.get(day) ?? [];
            return {
                date: { year, month, day },
                label: String(this.useGeez ? toGeez(day) : day),
                isToday:
                    year === today.year &&
                    month === today.month &&
                    day === today.day,
                holidays,
                holidayTags: holidays.flatMap((h) => h.tags),
            };
        });

        const first = rawDays[0]?.gregorian;
        const firstWeekday = first
            ? new Date(first.year, first.month - 1, first.day).getDay()
            : WEEK_START;
        const offset = (firstWeekday - WEEK_START + 7) % 7;
        return [...Array<null>(offset).fill(null), ...days];
    }

    up(): void {
        if (this.month === 13) {
            this.month = 1;
            this.year++;
        } else {
            this.month++;
        }
    }

    down(): void {
        if (this.month === 1) {
            this.month = 13;
            this.year--;
        } else {
            this.month--;
        }
    }

    resetToCurrentMonth(): void {
        const current = Kenat.now().getEthiopian();
        this.year = current.year;
        this.month = current.month;
    }

    setDate(month: number, year: number): void {
        this.month = month;
        this.year = year;
    }
}
