import Clutter from "gi://Clutter";
import type Gio from "gi://Gio";
import St from "gi://St";
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";
import Kenat from "../lib/kenat.js";
import type { KenatDate } from "../services/dayInfoService.js";
import { MonthGridService } from "../services/monthGrid.js";
import { readLanguage, readUseGeez } from "../utils/settings.js";
import { CalendarEventsSection } from "./CalendarEventsSection.js";
import { CalendarGrid } from "./CalendarGrid.js";
import { CalendarMonthHeader } from "./CalendarMonthHeader.js";
import { CalendarTopHeader } from "./CalendarTopHeader.js";
import { MonthYearPicker } from "./MonthYearPicker.js";

export class CalendarPopup {
    readonly item: PopupMenu.PopupBaseMenuItem;
    private readonly outer: St.BoxLayout;

    private readonly topHeader: CalendarTopHeader;
    private readonly monthHeader: CalendarMonthHeader;
    private readonly grid: CalendarGrid;
    private readonly eventsSection: CalendarEventsSection;
    private monthYearPicker: MonthYearPicker | null = null;

    private readonly monthService: MonthGridService;

    private selectedDate: KenatDate | null = null;
    private isPickerVisible = false;

    constructor(
        private readonly settings: Gio.Settings,
        openPreferences: () => void,
    ) {
        this.item = new PopupMenu.PopupBaseMenuItem({
            reactive: false,
            can_focus: false,
        });
        this.outer = new St.BoxLayout({
            orientation: Clutter.Orientation.VERTICAL,
            style_class: "calendar-popup",
        });
        this.item.add_child(this.outer);

        this.monthService = new MonthGridService({
            weekdayLang: readLanguage(this.settings),
            useGeez: readUseGeez(this.settings),
        });

        this.topHeader = new CalendarTopHeader(settings, openPreferences);
        this.monthHeader = new CalendarMonthHeader(
            () => this.onPrevMonth(),
            () => this.onNextMonth(),
            () => this.toggleMonthYearPicker(),
        );
        this.grid = new CalendarGrid(this.monthService, (date) =>
            this.onDateSelected(date),
        );
        this.eventsSection = new CalendarEventsSection(settings);

        this.outer.add_child(this.topHeader.widget);
        this.outer.add_child(this.monthHeader.widget);
        this.outer.add_child(this.grid.widget);
        this.outer.add_child(this.eventsSection.widget);

        this.refresh();
    }

    /** Re-render every part from the current settings and navigation state. */
    refresh(): void {
        this.monthService.weekdayLang = readLanguage(this.settings);
        this.monthService.useGeez = readUseGeez(this.settings);

        this.topHeader.refresh();

        const data = this.monthService.generate();
        this.monthHeader.setTitle(`${data.monthName} ${data.year}`);
        this.grid.refresh();

        this.eventsSection.updateEvents(
            this.selectedDate ?? new Kenat().getEthiopian(),
        );

        if (this.isPickerVisible) {
            this.monthYearPicker?.setCurrentDate(
                this.monthService.month,
                this.monthService.year,
            );
        }
    }

    resetToCurrentMonth(): void {
        this.monthService.resetToCurrentMonth();
        this.selectedDate = null;
        this.refresh();
    }

    hidePickerIfVisible(): void {
        if (this.isPickerVisible) this.hideMonthYearPicker();
    }

    private onDateSelected(date: KenatDate): void {
        this.selectedDate = date;
        this.eventsSection.updateEvents(date);
    }

    private onPrevMonth(): void {
        this.monthService.down();
        this.refresh();
    }

    private onNextMonth(): void {
        this.monthService.up();
        this.refresh();
    }

    private toggleMonthYearPicker(): void {
        if (this.isPickerVisible) {
            this.hideMonthYearPicker();
        } else {
            this.showMonthYearPicker();
        }
    }

    private showMonthYearPicker(): void {
        const { month, year } = this.monthService;
        if (this.monthYearPicker) {
            this.monthYearPicker.setCurrentDate(month, year);
        } else {
            this.monthYearPicker = new MonthYearPicker(
                this.settings,
                month,
                year,
                (pickedMonth, pickedYear) =>
                    this.onDateSelectedFromPicker(pickedMonth, pickedYear),
            );
        }

        const index = this.outer
            .get_children()
            .indexOf(this.monthHeader.widget);
        this.outer.insert_child_at_index(
            this.monthYearPicker.widget,
            index + 1,
        );
        this.isPickerVisible = true;
    }

    private hideMonthYearPicker(): void {
        const picker = this.monthYearPicker?.widget;
        if (picker && this.outer.get_children().includes(picker)) {
            this.outer.remove_child(picker);
        }
        this.isPickerVisible = false;
    }

    private onDateSelectedFromPicker(month: number, year: number): void {
        this.monthService.setDate(month, year);
        this.refresh();
        this.hideMonthYearPicker();
    }

    destroy(): void {
        // The picker is detached while hidden, so the menu item would not take it down
        this.monthYearPicker?.destroy();
        this.monthYearPicker = null;
    }
}
