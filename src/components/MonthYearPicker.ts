import Clutter from "gi://Clutter";
import type Gio from "gi://Gio";
import St from "gi://St";
import { toGeez } from "kenat";
import { ComponentBase, ReactiveComponent } from "stignite";
import { createDayInfoService } from "../services/dayInfoService.js";
import type { LanguageOption } from "../types/index.js";
import { SETTINGS } from "../types/index.js";

@ReactiveComponent({
    dependencies: {
        [SETTINGS.KEYS.CALENDAR_LANGUAGE]: ["month-names", "year-display"],
        [SETTINGS.KEYS.USE_GEEZ_NUMERALS]: ["year-display"],
    },
    priority: 1, // High priority for user interaction
    id: "month-year-picker",
})
export class MonthYearPicker extends ComponentBase {
    private outer: St.BoxLayout | undefined;
    private monthSlider: St.BoxLayout | undefined;
    private yearSlider: St.BoxLayout | undefined;
    private monthContainer: St.ScrollView | undefined;
    private yearContainer: St.ScrollView | undefined;
    private dayInfoService: ReturnType<typeof createDayInfoService> | undefined;

    private currentMonth: number = 1;
    private currentYear: number = 2016; // Ethiopian year
    private onDateSelected?: (month: number, year: number) => void;

    constructor(
        settings: Gio.Settings,
        initialMonth: number,
        initialYear: number,
        onDateSelected?: (month: number, year: number) => void,
    ) {
        super(settings);
        this.currentMonth = initialMonth;
        this.currentYear = initialYear;
        this.onDateSelected = onDateSelected;

        // Initial render
        this.render({ force: true });
    }

    /**
     * Initial render - called once during construction
     */
    protected renderInitial(): void {
        this.withErrorHandling(() => {
            // Create main container - floating style
            this.outer = new St.BoxLayout({
                vertical: false,
                style_class: "floating-picker-container",
                x_align: Clutter.ActorAlign.CENTER,
                y_align: Clutter.ActorAlign.CENTER,
            });

            // Initialize services
            this.dayInfoService = createDayInfoService(
                this.settings.get_string(
                    SETTINGS.KEYS.CALENDAR_LANGUAGE,
                ) as LanguageOption,
            );

            this.createMonthSlider();
            this.createYearSlider();
        }, "Failed to render MonthYearPicker initially");
    }

    /**
     * Smart partial updates - called when settings change
     */
    protected renderUpdates(
        changes: Record<string, unknown>,
        affectedParts: string[],
    ): void {
        this.withErrorHandling(() => {
            if (
                affectedParts.includes("month-names") ||
                affectedParts.includes("year-display")
            ) {
                // Update dayInfoService language when language changes
                if (
                    changes[SETTINGS.KEYS.CALENDAR_LANGUAGE] &&
                    this.dayInfoService
                ) {
                    const newLanguage = changes[
                        SETTINGS.KEYS.CALENDAR_LANGUAGE
                    ] as LanguageOption;
                    this.dayInfoService.updateLanguage(newLanguage);

                    // Re-render sliders with new language
                    this.updateMonthSlider();
                    this.updateYearSlider();
                }
            }
        }, "Failed to update MonthYearPicker");
    }

    private createMonthSlider(): void {
        if (!this.outer) return;

        // Create month slider container - floating style
        this.monthContainer = new St.ScrollView({
            style_class: "floating-month-slider-container",
            hscrollbar_policy: St.PolicyType.NEVER,
            vscrollbar_policy: St.PolicyType.NEVER,
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
        });

        this.monthSlider = new St.BoxLayout({
            vertical: true,
            style_class: "floating-month-slider",
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
        });

        this.monthContainer.add_child(this.monthSlider);
        this.outer.add_child(this.monthContainer);

        this.updateMonthSlider();
    }

    private createYearSlider(): void {
        if (!this.outer) return;

        // Create year slider container - floating style
        this.yearContainer = new St.ScrollView({
            style_class: "floating-year-slider-container",
            hscrollbar_policy: St.PolicyType.NEVER,
            vscrollbar_policy: St.PolicyType.NEVER,
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
        });

        this.yearSlider = new St.BoxLayout({
            vertical: true,
            style_class: "floating-year-slider",
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
        });

        this.yearContainer.add_child(this.yearSlider);
        this.outer.add_child(this.yearContainer);

        this.updateYearSlider();
    }

    private updateMonthSlider(): void {
        if (!this.monthSlider || !this.dayInfoService) return;

        // Clear existing months
        this.monthSlider.get_children().forEach((child) => child.destroy());

        // Create month items (1-13 for Ethiopian calendar)
        for (let month = 1; month <= 13; month++) {
            const monthItem = this.createMonthItem(month);
            this.monthSlider.add_child(monthItem);
        }

        // Scroll to current month
        this.scrollToCurrentMonth();
    }

    private updateYearSlider(): void {
        if (!this.yearSlider || !this.dayInfoService) return;

        // Clear existing years
        this.yearSlider.get_children().forEach((child) => child.destroy());

        // Create year items (range around current year)
        const startYear = this.currentYear - 10;
        const endYear = this.currentYear + 10;

        for (let year = startYear; year <= endYear; year++) {
            const yearItem = this.createYearItem(year);
            this.yearSlider.add_child(yearItem);
        }

        // Scroll to current year
        this.scrollToCurrentYear();
    }

    private createMonthItem(month: number): St.Label {
        const monthName = this.getMonthName(month);
        const isSelected = month === this.currentMonth;

        const monthItem = new St.Label({
            text: monthName,
            style_class: `floating-picker-item ${isSelected ? "floating-picker-item-selected" : ""}`,
            reactive: true,
            can_focus: true,
        });

        // Add click handler
        monthItem.connect("button-press-event", () => {
            this.selectMonth(month);
            return Clutter.EVENT_STOP;
        });

        // Add hover effect
        monthItem.connect("enter-event", () => {
            if (!isSelected) {
                monthItem.add_style_class_name("floating-picker-item-hover");
            }
        });

        monthItem.connect("leave-event", () => {
            monthItem.remove_style_class_name("floating-picker-item-hover");
        });

        return monthItem;
    }

    private createYearItem(year: number): St.Label {
        const yearText = this.formatYear(year);
        const isSelected = year === this.currentYear;

        const yearItem = new St.Label({
            text: yearText,
            style_class: `floating-picker-item ${isSelected ? "floating-picker-item-selected" : ""}`,
            reactive: true,
            can_focus: true,
        });

        // Add click handler
        yearItem.connect("button-press-event", () => {
            this.selectYear(year);
            return Clutter.EVENT_STOP;
        });

        // Add hover effect
        yearItem.connect("enter-event", () => {
            if (!isSelected) {
                yearItem.add_style_class_name("floating-picker-item-hover");
            }
        });

        yearItem.connect("leave-event", () => {
            yearItem.remove_style_class_name("floating-picker-item-hover");
        });

        return yearItem;
    }

    private getMonthName(month: number): string {
        const language = this.settings.get_string(
            SETTINGS.KEYS.CALENDAR_LANGUAGE,
        ) as LanguageOption;

        // Use the same month names as MonthGridService
        const monthNames = {
            amharic: [
                "መስከረም",
                "ጥቅምት",
                "ሕዳር",
                "ታኅሣሥ",
                "ጥር",
                "የካቲት",
                "መጋቢት",
                "ሚያዝያ",
                "ግንቦት",
                "ሰኔ",
                "ሐምሌ",
                "ነሐሴ",
                "ጳጉሜ",
            ],
            english: [
                "Meskerem",
                "Tikimt",
                "Hidar",
                "Tahsas",
                "Tir",
                "Yekatit",
                "Megabit",
                "Miazia",
                "Ginbot",
                "Sene",
                "Hamle",
                "Nehasie",
                "Pagume",
            ],
        };

        const labels = monthNames[language] || monthNames.amharic;
        return labels[month - 1] || `Month ${month}`;
    }

    private formatYear(year: number): string {
        const useGeez = this.settings.get_boolean(
            SETTINGS.KEYS.USE_GEEZ_NUMERALS,
        );

        if (useGeez) {
            return toGeez(year);
        }

        return year.toString();
    }

    private selectMonth(month: number): void {
        this.currentMonth = month;
        this.updateMonthSlider();
        this.onDateSelected?.(month, this.currentYear);
    }

    private selectYear(year: number): void {
        this.currentYear = year;
        this.updateYearSlider();
        this.onDateSelected?.(this.currentMonth, year);
    }

    private scrollToCurrentMonth(): void {
        if (!this.monthContainer || !this.monthSlider) return;

        // Calculate scroll position to center current month
        const itemHeight = 32; // Approximate item height
        const scrollPosition = (this.currentMonth - 1) * itemHeight;

        // Access the scroll adjustment through type assertion
        // biome-ignore lint/suspicious/noExplicitAny: type error bypass
        const scrollView = this.monthContainer as any;
        if (scrollView.vscroll?.adjustment) {
            scrollView.vscroll.adjustment.value = scrollPosition;
        }
    }

    private scrollToCurrentYear(): void {
        if (!this.yearContainer || !this.yearSlider) return;

        // Calculate scroll position to center current year
        const itemHeight = 32; // Approximate item height
        const startYear = this.currentYear - 10;
        const scrollPosition = (this.currentYear - startYear) * itemHeight;

        // Access the scroll adjustment through type assertion
        // biome-ignore lint/suspicious/noExplicitAny: type error bypass
        const scrollView = this.yearContainer as any;
        if (scrollView.vscroll?.adjustment) {
            scrollView.vscroll.adjustment.value = scrollPosition;
        }
    }

    public getWidget(): St.BoxLayout {
        if (!this.outer) {
            throw new Error("MonthYearPicker not initialized");
        }
        return this.outer;
    }

    public setCurrentDate(month: number, year: number): void {
        this.currentMonth = month;
        this.currentYear = year;
        this.updateMonthSlider();
        this.updateYearSlider();
    }

    destroy(): void {
        this.outer = undefined;
        this.monthSlider = undefined;
        this.yearSlider = undefined;
        this.monthContainer = undefined;
        this.yearContainer = undefined;
        this.dayInfoService = undefined;

        super.destroy();
    }
}
