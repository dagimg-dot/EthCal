import St from "gi://St";
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";
import Kenat from "kenat";
import { ComponentBase, type ExtensionBase, ReactiveComponent } from "stignite";
import type { KenatDate } from "../services/dayInfoService.js";
import { MonthGridService } from "../services/monthGrid.js";
import type { LanguageOption } from "../types/index.js";
import { SETTINGS } from "../types/index.js";
import { CalendarEventsSection } from "./CalendarEventsSection.js";
import { CalendarGrid } from "./CalendarGrid.js";
import { CalendarMonthHeader } from "./CalendarMonthHeader.js";
import { CalendarTopHeader } from "./CalendarTopHeader.js";

@ReactiveComponent({
    dependencies: {
        [SETTINGS.KEYS.CALENDAR_LANGUAGE]: ["month-service", "all-children"],
        [SETTINGS.KEYS.USE_GEEZ_NUMERALS]: ["month-service", "all-children"],
    },
    priority: 8, // High priority as it coordinates children
    id: "calendar-popup",
})
export class CalendarPopup extends ComponentBase {
    // Main popup structure
    private item: PopupMenu.PopupBaseMenuItem | undefined;
    private outer: St.BoxLayout | undefined;

    // Sub-components
    private topHeader: CalendarTopHeader | undefined;
    private monthHeader: CalendarMonthHeader | undefined;
    private grid: CalendarGrid | undefined;
    private eventsSection: CalendarEventsSection | undefined;

    // Services
    private monthService: MonthGridService | undefined;

    // State
    private selectedDate: KenatDate | null = null;
    private extension: ExtensionBase;

    constructor(extension: ExtensionBase) {
        super(extension.getSettings());
        this.extension = extension;

        // Initial render
        this.render({ force: true });
    }

    /**
     * Initial render - called once during construction
     */
    protected renderInitial(): void {
        this.withErrorHandling(() => {
            // Create UI components (old initUI logic)
            this.item = new PopupMenu.PopupBaseMenuItem({
                reactive: false,
                can_focus: false,
            });

            this.outer = new St.BoxLayout({
                vertical: true,
                style_class: "calendar-popup",
            });

            this.item.add_child(this.outer);

            // Initialize services with current settings
            this.monthService = new MonthGridService({
                weekStart: 1,
                weekdayLang: this.settings.get_string(
                    SETTINGS.KEYS.CALENDAR_LANGUAGE,
                ) as LanguageOption,
                useGeez: this.settings.get_boolean(
                    SETTINGS.KEYS.USE_GEEZ_NUMERALS,
                ),
            });

            // Create sub-components
            this.createSubComponents();

            // Initial refresh
            this.refresh();
        }, "Failed to render CalendarPopup initially");
    }

    /**
     * Smart partial updates - called when settings change
     */
    protected renderUpdates(
        changes: Record<string, unknown>,
        affectedParts: string[],
    ): void {
        this.withErrorHandling(() => {
            if (affectedParts.includes("month-service")) {
                // Update month service with new language/geez settings
                if (changes[SETTINGS.KEYS.CALENDAR_LANGUAGE]) {
                    const newLanguage = changes[
                        SETTINGS.KEYS.CALENDAR_LANGUAGE
                    ] as LanguageOption;
                    if (this.monthService) {
                        this.monthService.weekdayLang = newLanguage;
                        this.refreshMonthHeader();
                    }
                }

                if (changes[SETTINGS.KEYS.USE_GEEZ_NUMERALS]) {
                    const newGeez = changes[
                        SETTINGS.KEYS.USE_GEEZ_NUMERALS
                    ] as boolean;
                    if (this.monthService) {
                        this.monthService.useGeez = newGeez;
                        this.refreshMonthHeader();
                    }
                }
            }

            if (affectedParts.includes("all-children")) {
                // Propagate changes to all child components
                this.topHeader?.render({ changes, affectedParts });
                this.monthHeader?.render({ changes, affectedParts });
                this.grid?.render({ changes, affectedParts });
                this.eventsSection?.render({ changes, affectedParts });
            }
        }, "Failed to update CalendarPopup");
    }

    private createSubComponents(): void {
        this.withErrorHandling(() => {
            if (!this.outer || !this.monthService) return;

            // Create top header
            this.topHeader = new CalendarTopHeader(this.settings);
            this.outer.add_child(this.topHeader.getWidget());

            // Create month header with navigation callbacks and language change callback
            this.monthHeader = new CalendarMonthHeader(
                this.settings,
                () => this.onPrevMonth(),
                () => this.onNextMonth(),
                () => this.refreshMonthHeader(),
            );
            this.outer.add_child(this.monthHeader.getWidget());

            // Create calendar grid
            this.grid = new CalendarGrid(this.monthService, this.settings);
            this.outer.add_child(this.grid.getWidget());

            // Create events section
            this.eventsSection = new CalendarEventsSection(this.settings);
            this.outer.add_child(this.eventsSection.getWidget());

            // Set up event connections between components
            this.setupComponentConnections();
        }, "Failed to create sub-components");
    }

    private setupComponentConnections(): void {
        this.withErrorHandling(() => {
            if (!this.grid || !this.topHeader || !this.monthHeader) return;

            // Connect grid day selection to events update
            this.grid.connect("day-selected", (date) => {
                this.onDateSelected(date as KenatDate);
                this.emit("date-selected", date);
            });

            // Connect top header settings click
            this.topHeader.connect("settings-clicked", () => {
                this.extension.openPreferences();
            });
        }, "Failed to setup component connections");
    }

    private onDateSelected(date: KenatDate): void {
        this.withErrorHandling(() => {
            this.selectedDate = date;

            // Update events section with selected date
            if (this.eventsSection) {
                this.eventsSection.updateEvents(date);
            }
        }, "Failed to handle date selection");
    }

    private onPrevMonth(): void {
        this.withErrorHandling(() => {
            if (this.monthService) {
                this.monthService.down();
                this.refresh();
            }
        }, "Failed to navigate to previous month");
    }

    private onNextMonth(): void {
        this.withErrorHandling(() => {
            if (this.monthService) {
                this.monthService.up();
                this.refresh();
            }
        }, "Failed to navigate to next month");
    }

    /**
     * Reset calendar to current month
     */
    public resetToCurrentMonth(): void {
        this.withErrorHandling(() => {
            if (this.monthService) {
                this.monthService.resetToCurrentMonth();

                // Clear any date selection and reset to today
                this.selectedDate = null;

                this.refresh();

                // Reset events section to show today's events
                if (this.eventsSection) {
                    this.updateTodayEvents();
                }
            }
        }, "Failed to reset to current month");
    }

    /**
     * Refresh the calendar display
     */
    private refresh(): void {
        this.withErrorHandling(() => {
            this.refreshMonthHeader();

            // Refresh grid
            if (this.grid) {
                this.grid.refresh();
            }

            // Update events section based on current state
            if (this.eventsSection) {
                if (this.selectedDate) {
                    // Show events for selected date
                    this.eventsSection.updateEvents(this.selectedDate);
                } else {
                    // Show today's events when no date is selected
                    this.updateTodayEvents();
                }
            }
        }, "Failed to refresh calendar");
    }

    /**
     * Refresh only the month header title (called when language settings change)
     */
    private refreshMonthHeader(): void {
        this.withErrorHandling(() => {
            if (this.monthHeader && this.monthService) {
                const data = this.monthService.generate();
                this.monthHeader.setTitle(`${data.monthName} ${data.year}`);
            }
        }, "Failed to refresh month header");
    }

    /**
     * Update events section with today's events
     */
    private updateTodayEvents(): void {
        this.withErrorHandling(() => {
            if (!this.eventsSection) return;

            const today = new Kenat();
            this.eventsSection.updateEvents(today.getEthiopian());
        }, "Failed to update today events");
    }

    /**
     * Get the popup menu item for integration with GNOME Shell
     */
    public getItem(): PopupMenu.PopupBaseMenuItem {
        if (!this.item) {
            throw new Error("CalendarPopup not initialized");
        }
        return this.item;
    }

    destroy(): void {
        // Clean up sub-components
        if (this.topHeader) {
            this.topHeader.destroy();
            this.topHeader = undefined;
        }

        if (this.monthHeader) {
            this.monthHeader.destroy();
            this.monthHeader = undefined;
        }

        if (this.grid) {
            this.grid.destroy();
            this.grid = undefined;
        }

        if (this.eventsSection) {
            this.eventsSection.destroy();
            this.eventsSection = undefined;
        }

        // Clean up main UI
        this.outer = undefined;
        this.item = undefined;

        // Clean up services
        this.monthService = undefined;
        this.selectedDate = null;

        // Call parent destroy to clean up events and reactive settings
        super.destroy();
    }
}
