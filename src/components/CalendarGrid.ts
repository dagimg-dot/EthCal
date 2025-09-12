import Clutter from "gi://Clutter";
import type Gio from "gi://Gio";
import St from "gi://St";
import { ComponentBase } from "stignite";
import type {
    DayCell,
    MonthGridResult,
    MonthGridService,
} from "../services/monthGrid.js";
import type { LanguageOption } from "../types/index.js";
import { SETTINGS } from "../types/index.js";

export class CalendarGrid extends ComponentBase {
    private outer: St.Widget | undefined;
    private gridLayout: Clutter.GridLayout | undefined;
    private dayButtons: St.Button[] = [];

    // Reactive setting values
    private useGeezNumerals = SETTINGS.DEFAULTS.GEEZ_NUMERALS;
    private monthService: MonthGridService;

    constructor(monthService: MonthGridService, settings: Gio.Settings) {
        super(settings);
        this.monthService = monthService;

        // Follow new lifecycle pattern
        this.initSettings();
        this.initUI();
        this.initConnections();
        this.initLogic();
    }

    /**
     * Initialize reactive settings with enhanced event features
     */
    private initSettings(): void {
        this.withErrorHandling(() => {
            // Reactive language setting for day formatting
            this.addReactiveSetting(
                "language",
                SETTINGS.KEYS.CALENDAR_LANGUAGE,
                SETTINGS.DEFAULTS.LANGUAGE,
                (newLanguage: LanguageOption) => {
                    this.emit("language-changed", newLanguage);
                    this.refresh();
                },
            );

            // Reactive geez numerals setting
            this.addReactiveSetting(
                "useGeezNumerals",
                SETTINGS.KEYS.USE_GEEZ_NUMERALS,
                SETTINGS.DEFAULTS.GEEZ_NUMERALS,
                (useGeez: boolean) => {
                    this.useGeezNumerals = useGeez; // Store reactive value
                    this.emit("geez-numerals-changed", useGeez);
                    this.refresh(); // Refresh UI to show new numerals
                },
            );
        }, "Failed to initialize calendar grid settings");
    }

    /**
     * Initialize UI components
     */
    private initUI(): void {
        this.withErrorHandling(() => {
            // Create grid layout
            this.gridLayout = new Clutter.GridLayout({
                column_homogeneous: true,
                row_homogeneous: true,
            });

            // Create grid container
            this.outer = new St.Widget({
                layout_manager: this.gridLayout,
                style_class: "calendar-grid",
                x_expand: true,
            });
        }, "Failed to initialize calendar grid UI");
    }

    /**
     * Initialize connections
     */
    private initConnections(): void {
        // Connections are created when rendering days
    }

    /**
     * Initialize business logic
     */
    private initLogic(): void {
        this.withErrorHandling(() => {
            // Set initial reactive values
            this.useGeezNumerals =
                this.getReactiveSetting<boolean>("useGeezNumerals").value;

            this.refresh();
        }, "Failed to initialize calendar grid logic");
    }

    public refresh(): void {
        this.withErrorHandling(() => {
            const data = this.monthService.generate();
            this.render(data);
        }, "Failed to refresh calendar grid");
    }

    private render(data: MonthGridResult): void {
        if (!this.gridLayout || !this.outer) return;

        // Clear existing grid
        this.clearGrid();

        // Render headers (weekdays)
        data.headers.forEach((header, idx) => {
            const headerLabel = new St.Label({
                text: header.slice(0, 3), // Short weekday names
                style_class: "calendar-header",
            });
            this.setCell(0, idx, headerLabel);
        });

        // Reset day buttons array
        this.dayButtons = [];

        // Render days
        let row = 1;
        let col = 0;

        data.days.forEach((day) => {
            if (col === 7) {
                row += 1;
                col = 0;
            }

            if (!day) {
                // Empty cell
                this.setCell(row, col, new St.Label({ text: "" }));
            } else {
                // Day button
                const dayButton = this.createDayButton(day);
                this.setCell(row, col, dayButton);
                this.dayButtons.push(dayButton);
            }

            col += 1;
        });
    }

    private createDayButton(day: DayCell): St.Button {
        const label = this.formatDayLabel(day);
        const button = new St.Button({
            style_class: "calendar-day",
            can_focus: true,
        });

        button.set_child(new St.Label({ text: label }));

        // Apply styling based on day properties
        if (day.isToday) {
            button.add_style_class_name("calendar-today");
            if (day.holidays.length > 0) {
                button.add_style_class_name("calendar-today-holiday");
            }
        }

        if (!day.isToday && day.holidays.length > 0) {
            button.add_style_class_name("calendar-holiday");

            // Add specific holiday type classes
            if (day.holidayTags.includes("public")) {
                button.add_style_class_name("public-holiday");
            }
            if (day.holidayTags.includes("religious")) {
                button.add_style_class_name("religious-holiday");
            }
            if (day.holidayTags.includes("cultural")) {
                button.add_style_class_name("cultural-holiday");
            }
        }

        // Connect click event
        button.connect("clicked", () => {
            this.withErrorHandling(() => {
                this.emit("day-selected", day.ethiopianNumeric);
            }, "Failed to handle day selection");
        });

        return button;
    }

    private formatDayLabel(day: DayCell): string {
        // Use reactive Geez numerals setting
        if (this.useGeezNumerals && typeof day.ethiopian.day === "string") {
            return day.ethiopian.day; // Return Geez numeral string
        }

        return String(day.ethiopianNumeric.day); // Return regular number
    }

    private clearGrid(): void {
        if (!this.outer) return;
        this.outer.get_children().forEach((child) => child.destroy());
    }

    private setCell(row: number, col: number, actor: St.Widget): void {
        if (!this.gridLayout) return;
        this.gridLayout.attach(actor, col, row, 1, 1);
    }

    public getWidget(): St.Widget {
        if (!this.outer) {
            throw new Error("CalendarGrid not initialized");
        }
        return this.outer;
    }

    destroy(): void {
        // Clean up UI references
        this.outer = undefined;
        this.gridLayout = undefined;
        this.dayButtons = [];

        // Call parent destroy to clean up events and reactive settings
        super.destroy();
    }
}
