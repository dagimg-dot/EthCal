import Kenat, { getFastingInfo, getHolidaysInMonth } from "kenat";

// Define FastingKeys locally since it's not exported from the main package
const FastingKeys = {
    ABIY_TSOME: "ABIY_TSOME",
    TSOME_HAWARYAT: "TSOME_HAWARYAT",
    TSOME_NEBIYAT: "TSOME_NEBIYAT",
    NINEVEH: "NINEVEH",
    RAMADAN: "RAMADAN",
    FILSETA: "FILSETA",
    TSOME_DIHENET: "TSOME_DIHENET",
} as const;

export type Language = "amharic" | "english";

export type KenatDate = { year: number; month: number; day: number };

export interface DayHoliday {
    key: string;
    name: string; // localized
    description: string; // localized
    tags: string[];
    movable: boolean;
    ethiopian: KenatDate;
    gregorian?: { year: number; month: number; day: number };
}

export interface FastingContext {
    key: string;
    name: string; // localized
    description: string; // localized
    currentDay: number; // which day of the fast (1st, 2nd, etc.)
    totalDays: number;
    isActive: boolean;
    period: {
        start: KenatDate;
        end: KenatDate;
    } | null;
    tags?: string[];
}

export interface DayInformation {
    ethiopian: KenatDate;
    gregorian: KenatDate;
    holidays: DayHoliday[];
    fastingPeriods: FastingContext[];
    isToday: boolean;
    weekday: number;
    weekdayName: string;
}

export class DayInfoService {
    private language: Language;

    constructor(language: Language = "amharic") {
        this.language = language;
    }

    /**
     * Update the language setting
     */
    updateLanguage(language: Language): void {
        this.language = language;
    }

    /**
     * Get comprehensive information for a specific Ethiopian date
     */
    getDayInformation(ethiopianDate: KenatDate): DayInformation {
        const kenat = new Kenat(
            `${ethiopianDate.year}/${ethiopianDate.month}/${ethiopianDate.day}`,
        );
        const gregorian = kenat.getGregorian();
        const today = Kenat.now().getEthiopian();

        const isToday =
            ethiopianDate.year === today.year &&
            ethiopianDate.month === today.month &&
            ethiopianDate.day === today.day;

        const weekday = this.getWeekday(ethiopianDate);
        const weekdayName = this.getWeekdayName(weekday);

        const holidays = this.getDayHolidays(ethiopianDate);
        const fastingPeriods = this.getDayFastingContext(ethiopianDate);

        return {
            ethiopian: ethiopianDate,
            gregorian,
            holidays,
            fastingPeriods,
            isToday,
            weekday,
            weekdayName,
        };
    }

    /**
     * Get holidays for a specific date
     */
    private getDayHolidays(ethiopianDate: KenatDate): DayHoliday[] {
        try {
            const monthHolidays = getHolidaysInMonth(
                ethiopianDate.year,
                ethiopianDate.month,
                {
                    lang: this.language,
                },
            );

            return monthHolidays.filter(
                (holiday) => holiday.ethiopian.day === ethiopianDate.day,
            );
        } catch (error) {
            console.error("Error getting holidays:", error);
            return [];
        }
    }

    /**
     * Get fasting context for a specific date
     */
    private getDayFastingContext(ethiopianDate: KenatDate): FastingContext[] {
        const fastingPeriods: FastingContext[] = [];

        // Check each fasting period
        Object.values(FastingKeys).forEach((fastKey) => {
            try {
                const fastingInfo = getFastingInfo(
                    fastKey as
                        | "ABIY_TSOME"
                        | "TSOME_HAWARYAT"
                        | "TSOME_NEBIYAT"
                        | "NINEVEH"
                        | "RAMADAN",
                    ethiopianDate.year,
                    {
                        lang: this.language,
                    },
                );

                if (!fastingInfo || !fastingInfo.period) {
                    // Handle weekly fasts (Tsome Dihnet)
                    if (fastKey === FastingKeys.TSOME_DIHENET) {
                        const isFastingDay =
                            this.isTsomeDihnetFastDay(ethiopianDate);
                        if (isFastingDay) {
                            fastingPeriods.push({
                                key: fastKey as string,
                                name: fastingInfo?.name || "Fast of Salvation",
                                description:
                                    fastingInfo?.description ||
                                    "Weekly fast on Wednesdays and Fridays",
                                currentDay: 1, // Weekly fasts don't have day counts
                                totalDays: 1,
                                isActive: true,
                                period: null,
                            });
                        }
                    }
                    return;
                }

                const { period } = fastingInfo;

                // Type assertion for period start and end
                const periodStart = period.start as {
                    year: number;
                    month: number;
                    day: number;
                };
                const periodEnd = period.end as {
                    year: number;
                    month: number;
                    day: number;
                };

                const isInPeriod = this.isDateInRange(
                    ethiopianDate,
                    periodStart,
                    periodEnd,
                );

                if (isInPeriod) {
                    const currentDay = this.calculateDayInPeriod(
                        ethiopianDate,
                        periodStart,
                    );
                    const totalDays = this.calculateTotalDays(
                        periodStart,
                        periodEnd,
                    );

                    fastingPeriods.push({
                        key: fastKey as string,
                        name: fastingInfo.name,
                        description: fastingInfo.description,
                        currentDay,
                        totalDays,
                        isActive: true,
                        period: {
                            start: periodStart,
                            end: periodEnd,
                        },
                    });
                }
            } catch (error) {
                console.error(
                    `Error getting fasting info for ${fastKey}:`,
                    error,
                );
            }
        });

        return fastingPeriods;
    }

    /**
     * Check if a date falls within a range
     */
    private isDateInRange(
        date: KenatDate,
        start: KenatDate,
        end: KenatDate,
    ): boolean {
        const dateValue = date.year * 10000 + date.month * 100 + date.day;
        const startValue = start.year * 10000 + start.month * 100 + start.day;
        const endValue = end.year * 10000 + end.month * 100 + end.day;

        return dateValue >= startValue && dateValue <= endValue;
    }

    /**
     * Calculate which day of the fasting period a date represents
     */
    private calculateDayInPeriod(date: KenatDate, start: KenatDate): number {
        const kenat = new Kenat(`${date.year}/${date.month}/${date.day}`);
        const startKenat = new Kenat(
            `${start.year}/${start.month}/${start.day}`,
        );

        // Calculate days difference using Kenat's diffInDays method
        const daysDiff = kenat.diffInDays(startKenat);
        return Math.max(1, daysDiff + 1);
    }

    /**
     * Calculate total days in a fasting period
     */
    private calculateTotalDays(start: KenatDate, end: KenatDate): number {
        const startKenat = new Kenat(
            `${start.year}/${start.month}/${start.day}`,
        );
        const endKenat = new Kenat(`${end.year}/${end.month}/${end.day}`);

        // Calculate days difference using Kenat's diffInDays method
        const daysDiff = endKenat.diffInDays(startKenat);
        return Math.max(1, daysDiff + 1);
    }

    /**
     * Check if a date is a Tsome Dihnet fasting day (Wed/Fri)
     */
    private isTsomeDihnetFastDay(ethiopianDate: KenatDate): boolean {
        const weekday = this.getWeekday(ethiopianDate);
        // Wednesday = 3, Friday = 5 (0-indexed)
        return weekday === 3 || weekday === 5;
    }

    /**
     * Get weekday number (0 = Sunday, 1 = Monday, etc.)
     */
    private getWeekday(ethiopianDate: KenatDate): number {
        const kenat = new Kenat(
            `${ethiopianDate.year}/${ethiopianDate.month}/${ethiopianDate.day}`,
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
        return weekdays[this.language][weekday] || "";
    }

    /**
     * Format fasting context for display
     */
    formatFastingContext(fasting: FastingContext): string {
        if (fasting.key === FastingKeys.TSOME_DIHENET) {
            return fasting.name;
        }

        const fastingString = `${fasting.currentDay} / ${fasting.totalDays} - ${fasting.name}`;

        return `${this.language === "amharic" ? "ቀን" : "Day"} ${fastingString}`;
    }

    /**
     * Get all events for a day in a structured format
     */
    getDayEvents(ethiopianDate: KenatDate) {
        const dayInfo = this.getDayInformation(ethiopianDate);

        const events = [
            ...dayInfo.holidays.map((h) => ({
                type: "holiday" as const,
                title: h.name,
                description: h.description,
                tags: h.tags,
            })),
            ...dayInfo.fastingPeriods.map((f) => ({
                type: "fasting" as const,
                title: this.formatFastingContext(f),
                description: f.description,
                tags: f.tags || [],
            })),
        ];

        return {
            dayInfo,
            events,
            hasEvents: events.length > 0,
        };
    }
}

// Convenience function
export function createDayInfoService(
    language: Language = "amharic",
): DayInfoService {
    return new DayInfoService(language);
}
