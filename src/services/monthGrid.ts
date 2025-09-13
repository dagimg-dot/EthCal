import Kenat, {
    getHolidaysInMonth,
    HolidayTags,
    monthNames,
    toGeez,
} from "kenat";

export type WeekdayLanguage = "amharic" | "english";

export interface MonthGridOptions {
    year?: number;
    month?: number; // 1..13
    useGeez?: boolean;
    weekStart?: number; // 0..6, where 0=Sunday, 1=Monday
    weekdayLang?: WeekdayLanguage;
    holidayFilter?: string[] | null; // array of HolidayTags keys
    mode?: "christian" | "muslim" | "public" | null;
    showAllSaints?: boolean; // reserved for parity; not implemented
}

export interface EthiopianDateLabel {
    year: number | string;
    month: number | string; // number or localized month label
    day: number | string;
}

export interface GregorianDateLabel {
    year: number;
    month: number; // 1..12
    day: number; // 1..31
}

export interface HolidayNameDesc {
    amharic?: string;
    english?: string;
}

export interface Holiday {
    key: string;
    name: HolidayNameDesc | string;
    description?: HolidayNameDesc | string;
    tags: string[];
    ethiopian: { year: number; month: number; day: number };
    gregorian?: { year: number; month: number; day: number };
    [key: string]: unknown;
}

export interface DayCell {
    ethiopian: EthiopianDateLabel;
    ethiopianNumeric: { year: number; month: number; day: number }; // Original numeric values
    gregorian: GregorianDateLabel;
    weekday: number; // 0..6 where 0=Sunday
    weekdayName: string;
    isToday: boolean;
    holidayTags: string[]; // tags for quick filtering
    holidays: Holiday[]; // raw holiday objects from kenat
}

export interface MonthGridResult {
    headers: string[]; // seven labels starting from weekStart
    days: Array<DayCell | null>; // left-padded with nulls to align first weekday
    year: number | string; // potentially Geez
    month: number; // 1..13
    monthName: string;
    up: () => MonthGridResult;
    down: () => MonthGridResult;
}

const WEEKDAY_LABELS: Record<WeekdayLanguage, string[]> = {
    // Sunday-first ordering to align with JS Date.getDay()
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
    weekStart: number;
    useGeez: boolean;
    weekdayLang: WeekdayLanguage;
    holidayFilter: string[] | null;
    mode: "christian" | "muslim" | "public" | null;
    showAllSaints: boolean;

    constructor(config: MonthGridOptions = {}) {
        this._validateConfig(config);
        const current = Kenat.now().getEthiopian();
        this.year = config.year ?? current.year;
        this.month = config.month ?? current.month;
        this.weekStart = config.weekStart ?? 1; // Monday by default
        this.useGeez = config.useGeez ?? false;
        this.weekdayLang = config.weekdayLang ?? "amharic";
        this.holidayFilter = config.holidayFilter ?? null;
        this.mode = config.mode ?? null;
        this.showAllSaints = config.showAllSaints ?? false;
    }

    private _validateConfig(config: MonthGridOptions) {
        const { year, month, weekStart, weekdayLang } = config;
        if (
            (year !== undefined && month === undefined) ||
            (year === undefined && month !== undefined)
        ) {
            throw new Error(
                "If providing year or month, both must be provided.",
            );
        }
        if (weekStart !== undefined && (weekStart < 0 || weekStart > 6)) {
            throw new Error(
                `Invalid weekStart value: ${weekStart}. Must be between 0 and 6.`,
            );
        }
        if (
            weekdayLang !== undefined &&
            !["amharic", "english"].includes(weekdayLang)
        ) {
            throw new Error(
                `Invalid weekdayLang: "${weekdayLang}". Must be 'amharic' or 'english'.`,
            );
        }
    }

    generate(): MonthGridResult {
        const rawDays = this._getRawDays();
        const holidays = this._getHolidays();
        const paddedDays = this._mergeDays(rawDays, holidays);
        const headers = this._getWeekdayHeaders();
        const monthName = this._getLocalizedMonthName();
        const yearLabel = this._getLocalizedYear();

        return {
            headers,
            days: paddedDays,
            year: yearLabel,
            month: this.month,
            monthName,
            up: () => this.up().generate(),
            down: () => this.down().generate(),
        };
    }

    private _getRawDays(): Array<{
        ethiopian: { year: number; month: number; day: number };
        gregorian: GregorianDateLabel;
    }> {
        const base = new Kenat(`${this.year}/${this.month}/1`);
        return base.getMonthCalendar(this.year, this.month, false);
    }

    private _getHolidays(): Holiday[] {
        let typedFilter: string[] | undefined = this.holidayFilter ?? undefined;
        if (this.mode === "christian") typedFilter = [HolidayTags.CHRISTIAN];
        if (this.mode === "muslim") typedFilter = [HolidayTags.MUSLIM];
        if (this.mode === "public") typedFilter = [HolidayTags.PUBLIC];
        return getHolidaysInMonth(this.year, this.month, {
            lang: this.weekdayLang,
            filter: typedFilter,
        }) as unknown as Holiday[];
    }

    private _mergeDays(
        rawDays: Array<{
            ethiopian: { year: number; month: number; day: number };
            gregorian: GregorianDateLabel;
        }>,
        holidaysList: Holiday[],
    ): Array<DayCell | null> {
        const today = Kenat.now().getEthiopian();
        const labels = WEEKDAY_LABELS[this.weekdayLang];
        const monthLabels =
            (monthNames as Record<WeekdayLanguage, string[]>)[
                this.weekdayLang
            ] || monthNames.amharic;

        const holidayMap: Record<string, Holiday[]> = {};
        for (const h of holidaysList) {
            const key = `${h.ethiopian.year}-${h.ethiopian.month}-${h.ethiopian.day}`;
            if (!holidayMap[key]) holidayMap[key] = [];
            holidayMap[key].push(h);
        }

        const mapped: DayCell[] = rawDays.map((day) => {
            const eth = day.ethiopian;
            const greg = day.gregorian;
            const jsWeekday = new Date(
                greg.year,
                greg.month - 1,
                greg.day,
            ).getDay(); // 0=Sun..6=Sat
            const key = `${eth.year}-${eth.month}-${eth.day}`;
            const holidays = holidayMap[key] || [];
            const holidayTags: string[] = ([] as string[]).concat(
                ...holidays.map((h: Holiday) => h.tags ?? []),
            );

            const isToday =
                eth.year === today.year &&
                eth.month === today.month &&
                eth.day === today.day;

            const result = {
                ethiopian: {
                    year: this.useGeez ? toGeez(eth.year) : eth.year,
                    month: this.useGeez
                        ? monthLabels[eth.month - 1]
                        : eth.month,
                    day: this.useGeez ? toGeez(eth.day) : eth.day,
                },
                ethiopianNumeric: {
                    year: eth.year,
                    month: eth.month,
                    day: eth.day,
                },
                gregorian: greg,
                weekday: jsWeekday,
                weekdayName: labels[jsWeekday],
                isToday,
                holidayTags,
                holidays,
            };

            return result;
        });

        // Compute left-padding nulls to align first day under headers
        let offset: number;
        if (mapped.length > 0) {
            offset = (mapped[0].weekday - this.weekStart + 7) % 7;
        } else {
            const jsDate = new Date(this.year, this.month - 1, 1);
            offset = (jsDate.getDay() - this.weekStart + 7) % 7;
        }
        return Array(offset).fill(null).concat(mapped);
    }

    private _getWeekdayHeaders(): string[] {
        const labels = WEEKDAY_LABELS[this.weekdayLang];
        return labels
            .slice(this.weekStart)
            .concat(labels.slice(0, this.weekStart));
    }

    private _getLocalizedMonthName(): string {
        const labels =
            (monthNames as Record<WeekdayLanguage, string[]>)[
                this.weekdayLang
            ] || monthNames.amharic;
        return labels[this.month - 1];
    }

    private _getLocalizedYear(): number | string {
        return this.useGeez ? toGeez(this.year) : this.year;
    }

    up(): this {
        if (this.month === 13) {
            this.month = 1;
            this.year++;
        } else {
            this.month++;
        }
        return this;
    }

    down(): this {
        if (this.month === 1) {
            this.month = 13;
            this.year--;
        } else {
            this.month--;
        }
        return this;
    }

    resetToCurrentMonth(): this {
        const current = Kenat.now().getEthiopian();
        this.year = current.year;
        this.month = current.month;
        return this;
    }

    setDate(month: number, year: number): this {
        this.month = month;
        this.year = year;
        return this;
    }
}

export function createMonthGrid(
    config: MonthGridOptions = {},
): MonthGridResult {
    const instance = new MonthGridService(config);
    return instance.generate();
}
