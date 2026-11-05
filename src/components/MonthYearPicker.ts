import Clutter from "gi://Clutter";
import type Gio from "gi://Gio";
import St from "gi://St";
import { toGeez } from "../lib/kenat.js";
import type { LanguageOption } from "../types/index.js";
import { SETTINGS } from "../types/index.js";

export class MonthYearPicker {
    readonly widget: St.BoxLayout;
    private readonly monthSlider: St.BoxLayout;
    private readonly yearSlider: St.BoxLayout;
    private readonly monthContainer: St.ScrollView;
    private readonly yearContainer: St.ScrollView;

    constructor(
        private readonly settings: Gio.Settings,
        private currentMonth: number,
        private currentYear: number,
        private readonly onDateSelected: (month: number, year: number) => void,
    ) {
        this.widget = new St.BoxLayout({
            orientation: Clutter.Orientation.HORIZONTAL,
            style_class: "floating-picker-container",
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
        });

        this.monthContainer = new St.ScrollView({
            style_class: "floating-month-slider-container",
            hscrollbar_policy: St.PolicyType.NEVER,
            vscrollbar_policy: St.PolicyType.NEVER,
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
        });
        this.monthSlider = new St.BoxLayout({
            orientation: Clutter.Orientation.VERTICAL,
            style_class: "floating-month-slider",
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
        });
        this.monthContainer.add_child(this.monthSlider);
        this.widget.add_child(this.monthContainer);

        this.yearContainer = new St.ScrollView({
            style_class: "floating-year-slider-container",
            hscrollbar_policy: St.PolicyType.NEVER,
            vscrollbar_policy: St.PolicyType.NEVER,
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
        });
        this.yearSlider = new St.BoxLayout({
            orientation: Clutter.Orientation.VERTICAL,
            style_class: "floating-year-slider",
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
        });
        this.yearContainer.add_child(this.yearSlider);
        this.widget.add_child(this.yearContainer);

        this.updateMonthSlider();
        this.updateYearSlider();
    }

    private updateMonthSlider(): void {
        for (const child of this.monthSlider.get_children()) child.destroy();

        // Create month items (1-13 for Ethiopian calendar)
        for (let month = 1; month <= 13; month++) {
            const monthItem = this.createMonthItem(month);
            this.monthSlider.add_child(monthItem);
        }

        // Scroll to current month
        this.scrollToCurrentMonth();
    }

    private updateYearSlider(): void {
        for (const child of this.yearSlider.get_children()) child.destroy();

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
        this.onDateSelected(month, this.currentYear);
    }

    private selectYear(year: number): void {
        this.currentYear = year;
        this.updateYearSlider();
        this.onDateSelected(this.currentMonth, year);
    }

    private scrollToCurrentMonth(): void {
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

    setCurrentDate(month: number, year: number): void {
        this.currentMonth = month;
        this.currentYear = year;
        this.updateMonthSlider();
        this.updateYearSlider();
    }

    destroy(): void {
        this.widget.destroy();
    }
}
