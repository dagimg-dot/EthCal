import Clutter from "gi://Clutter";
import Pango from "gi://Pango";
import St from "gi://St";
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";
import Kenat from "kenat";
import type { KenatDate } from "../services/dayInfoService.js";
import { createDayInfoService } from "../services/dayInfoService.js";
import { MonthGridService } from "../services/monthGrid.js";
import { ComponentBase } from "../stignite/ComponentBase.js";
import type { ExtensionBase } from "../stignite/ExtensionBase.js";
import type { LanguageOption } from "../types/index.js";
import { SETTINGS } from "../types/index.js";
import { logger } from "../utils/logger.js";

export class CalendarPopup extends ComponentBase {
    private item: PopupMenu.PopupBaseMenuItem | undefined;
    private outer: St.BoxLayout | undefined;
    private header: St.BoxLayout | undefined;
    private grid: St.Widget | undefined;
    private gridLayout: Clutter.GridLayout | undefined;
    private titleLabel: St.Label | undefined;
    private prevBtn: St.Button | undefined;
    private nextBtn: St.Button | undefined;
    private eventsBox: St.BoxLayout | undefined;
    private eventsTitle: St.Label | undefined;
    private eventsList: St.BoxLayout | undefined;
    private settingsBtn: St.Button | undefined;
    private weekdayTitle: St.Label | undefined;
    private fullDateTitle: St.Label | undefined;
    private extension: ExtensionBase;

    // services
    private svc: MonthGridService | undefined;
    private dayInfoService: ReturnType<typeof createDayInfoService> | undefined;

    // settings
    private language: LanguageOption;
    private selectedDate: KenatDate | null = null;
    private useGeezNumerals: boolean;

    constructor(extension: ExtensionBase) {
        super(extension.getSettings());

        this.extension = extension;

        this.language = this.extension.getSetting(
            SETTINGS.KEYS.CALENDAR_LANGUAGE,
            SETTINGS.DEFAULTS.LANGUAGE,
        );

        this.useGeezNumerals = this.extension.getSetting(
            SETTINGS.KEYS.USE_GEEZ_NUMERALS,
            SETTINGS.DEFAULTS.GEEZ_NUMERALS,
        );

        this.initialize();
    }

    private setupSettingsObservers(): void {
        this.connectSettingSignal(SETTINGS.KEYS.CALENDAR_LANGUAGE, () =>
            this.updateLanguage(),
        );
        this.connectSettingSignal(SETTINGS.KEYS.USE_GEEZ_NUMERALS, () =>
            this.updateGeezNumerals(),
        );
    }

    private initialize(): void {
        this.setupSettingsObservers();
        this.createUI();
        this.setupServices();
        this.setupNavigation();
        this.refresh();
    }

    /**
     * Refresh both calendar grid and today events section
     */
    private refresh(): void {
        this.render();
        this.updateTodayEvents();
    }

    private createUI(): void {
        // Create main popup item
        this.item = new PopupMenu.PopupBaseMenuItem({
            reactive: false,
            can_focus: false,
        });

        // Create main container
        this.outer = new St.BoxLayout({
            vertical: true,
            style_class: "calendar-popup",
        });

        this.item.add_child(this.outer);

        this.createTopHeader();
        this.createNavigationHeader();
        this.createGrid();
        this.createEventsSection();
    }

    private createTopHeader(): void {
        if (!this.outer) return;

        const topHeader = new St.BoxLayout({
            vertical: true,
            style_class: "calendar-top",
        });

        // Top row: weekday and settings icon
        const topRow = new St.BoxLayout({
            vertical: false,
            style_class: "calendar-top-row",
        });

        const today = new Kenat();

        // Top header format
        // {weekdayName}                    [settings icon]
        // {monthName} {day} {year}
        this.weekdayTitle = new St.Label({
            text: today.formatWithWeekday("amharic", false).split(",")[0],
            style_class: "calendar-top-weekday",
        });

        // Settings button
        this.settingsBtn = new St.Button({
            style_class: "calendar-settings-button",
            can_focus: true,
        });
        this.settingsBtn.set_child(
            new St.Icon({
                icon_name: "preferences-system-symbolic",
                style_class: "popup-menu-icon",
            }),
        );

        // Connect settings button to open preferences
        this.settingsBtn.connect("clicked", () => {
            logger("Opening EthCal settings");
            this.extension.openPreferences();
        });

        topRow.add_child(this.weekdayTitle);
        topRow.add_child(new St.Widget({ x_expand: true })); // Spacer
        topRow.add_child(this.settingsBtn);

        this.fullDateTitle = new St.Label({
            text: today.format({ lang: "amharic" }),
            style_class: "calendar-top-date",
        });

        topHeader.add_child(topRow);
        topHeader.add_child(this.fullDateTitle);
        this.outer.add_child(topHeader);
    }

    private createNavigationHeader(): void {
        if (!this.outer) return;

        this.header = new St.BoxLayout({
            vertical: false,
            style_class: "calendar-month-header",
        });

        this.prevBtn = new St.Button({
            style_class: "calendar-nav-button",
            can_focus: true,
        });
        this.prevBtn.set_child(
            new St.Icon({
                icon_name: "go-previous-symbolic",
                style_class: "popup-menu-icon",
            }),
        );

        this.titleLabel = new St.Label({
            text: "",
            style_class: "calendar-title",
        });

        this.nextBtn = new St.Button({
            style_class: "calendar-nav-button",
            can_focus: true,
        });
        this.nextBtn.set_child(
            new St.Icon({
                icon_name: "go-next-symbolic",
                style_class: "popup-menu-icon",
            }),
        );

        this.header.add_child(this.prevBtn);
        this.header.add_child(new St.Widget({ x_expand: true }));
        this.header.add_child(this.titleLabel);
        this.header.add_child(new St.Widget({ x_expand: true }));
        this.header.add_child(this.nextBtn);
        this.outer.add_child(this.header);
    }

    private createGrid(): void {
        if (!this.outer) return;

        // Grid container (7 columns: headers + days)
        this.gridLayout = new Clutter.GridLayout({
            column_homogeneous: true,
            row_homogeneous: true,
        });
        this.grid = new St.Widget({
            layout_manager: this.gridLayout,
            style_class: "calendar-grid",
            x_expand: true,
        });
        this.outer.add_child(this.grid);
    }

    private createEventsSection(): void {
        if (!this.outer) return;

        this.eventsBox = new St.BoxLayout({
            vertical: true,
            style_class: "calendar-events",
        });

        this.eventsTitle = new St.Label({
            text: "ዛሬ",
            style_class: "calendar-events-title",
        });

        this.eventsList = new St.BoxLayout({
            vertical: true,
            style_class: "calendar-events-list",
        });

        this.eventsBox.add_child(this.eventsTitle);
        this.eventsBox.add_child(this.eventsList);
        this.outer.add_child(this.eventsBox);
    }

    private setupServices(): void {
        this.svc = new MonthGridService({
            weekStart: 1,
            weekdayLang: this.language,
            useGeez: this.useGeezNumerals,
        });
        this.dayInfoService = createDayInfoService(this.language);
    }

    public resetToCurrentMonth(): void {
        if (!this.svc) return;
        this.svc.resetToCurrentMonth();
        this.refresh();
    }

    private updateLanguage(): void {
        if (!this.svc || !this.dayInfoService) return;

        this.language = this.extension.getSetting(
            SETTINGS.KEYS.CALENDAR_LANGUAGE,
            SETTINGS.DEFAULTS.LANGUAGE,
        );

        this.svc = new MonthGridService({
            weekStart: 1,
            weekdayLang: this.language,
            useGeez: this.useGeezNumerals,
        });
        this.dayInfoService = createDayInfoService(this.language);

        this.refresh();
    }

    private updateGeezNumerals(): void {
        if (!this.svc) return;

        this.useGeezNumerals = this.extension.getSetting(
            SETTINGS.KEYS.USE_GEEZ_NUMERALS,
            SETTINGS.DEFAULTS.GEEZ_NUMERALS,
        );

        this.svc = new MonthGridService({
            weekStart: 1,
            weekdayLang: this.language,
            useGeez: this.useGeezNumerals,
        });
        this.dayInfoService = createDayInfoService(this.language);

        this.refresh();
    }

    private formatDate(day: number, month: number, year: number): string {
        const dateString = `${year}-${month}-${day}`;
        const kenat = new Kenat(dateString);

        const formattedDate = kenat.format({
            lang: this.language,
            useGeez: this.useGeezNumerals,
        });

        return `${month} - ${formattedDate}`;
    }

    private clearGrid(): void {
        if (!this.grid) return;
        this.grid.get_children().forEach((child) => child.destroy());
    }

    private setCell(row: number, col: number, actor: St.Widget): void {
        if (!this.gridLayout) return;
        this.gridLayout.attach(actor, col, row, 1, 1);
    }

    private updateTodayEvents(): void {
        if (!this.eventsList || !this.eventsTitle || !this.dayInfoService)
            return;

        this.eventsList.get_children().forEach((c) => c.destroy());

        const today = Kenat.now().getEthiopian();

        // Update the title with today's date using current formatting settings
        this.eventsTitle.text = this.formatDate(
            today.day,
            today.month,
            today.year,
        );

        const dayEvents = this.dayInfoService.getDayEvents(today);
        this.renderEventList(dayEvents.events, this.eventsList);
    }

    /**
     * Render a list of events into a container
     */
    private renderEventList(
        events: { title: string; description: string }[],
        container: St.BoxLayout,
    ): void {
        if (events.length > 0) {
            events.forEach((event) => {
                const eventRow = new St.BoxLayout({
                    vertical: false,
                    style_class: "calendar-event",
                });

                const dot = new St.Label({
                    text: "•",
                    style_class: "calendar-event-dot",
                });

                const eventContent = new St.BoxLayout({
                    vertical: true,
                    style_class: "calendar-event-content",
                });

                const title = new St.Label({
                    text: event.title,
                    style_class: "calendar-event-title",
                    x_expand: true,
                    y_expand: false,
                    x_align: Clutter.ActorAlign.START,
                });

                const description = new St.Label({
                    text: event.description,
                    style_class: "calendar-event-description",
                    x_expand: true,
                    y_expand: true,
                    x_align: Clutter.ActorAlign.START,
                });

                // Enable text wrapping on the underlying Clutter.Text actor
                description.clutter_text.line_wrap = true;
                description.clutter_text.line_wrap_mode =
                    Pango.WrapMode.WORD_CHAR;

                eventContent.add_child(title);
                eventContent.add_child(description);

                eventRow.add_child(dot);
                eventRow.add_child(eventContent);
                container.add_child(eventRow);
            });
        } else {
            const empty = new St.Label({
                text: "ምንም ማስታወሻ አልተገኘም",
                style_class: "calendar-event-empty",
            });
            container.add_child(empty);
        }
    }

    private render(): void {
        if (!this.svc || !this.titleLabel || !this.eventsTitle) return;

        const data = this.svc.generate();
        this.titleLabel.text = `${data.monthName} ${data.year}`;

        this.clearGrid();

        // Headers in row 0
        data.headers.forEach((h, idx) => {
            const lbl = new St.Label({
                text: h.slice(0, 3),
                style_class: "calendar-header",
            });
            this.setCell(0, idx, lbl);
        });

        // Days start at row 1
        let row = 1;
        let col = 0;
        data.days.forEach((day) => {
            if (col === 7) {
                row += 1;
                col = 0;
            }

            if (!day) {
                this.setCell(row, col, new St.Label({ text: "" }));
                col += 1;
                return;
            }

            const label =
                typeof day.ethiopian.day === "string"
                    ? day.ethiopian.day
                    : String(day.ethiopian.day);
            const btn = new St.Button({
                style_class: "calendar-day",
                can_focus: true,
            });

            btn.set_child(new St.Label({ text: label }));

            if (day.isToday) {
                btn.add_style_class_name("calendar-today");
            }

            if (day.holidays.length > 0) {
                btn.add_style_class_name("calendar-holiday");

                // Add specific holiday type classes based on tags
                const allTags = day.holidays.flatMap((h) => h.tags);

                if (allTags.includes("public")) {
                    btn.add_style_class_name("public-holiday");
                }

                if (allTags.includes("religious")) {
                    btn.add_style_class_name("religious-holiday");
                }

                if (allTags.includes("cultural")) {
                    btn.add_style_class_name("cultural-holiday");
                }
            }

            btn.connect("clicked", () => {
                // Update selected date state using original numeric values
                this.selectedDate = day.ethiopianNumeric;

                // Show day information in Today section
                if (
                    this.dayInfoService &&
                    this.eventsTitle &&
                    this.eventsList
                ) {
                    const dayEvents = this.dayInfoService.getDayEvents(
                        this.selectedDate,
                    );

                    // Use numeric values for formatting, not Geez display values
                    this.eventsTitle.text = this.formatDate(
                        this.selectedDate.day,
                        this.selectedDate.month,
                        this.selectedDate.year,
                    );

                    this.eventsList.get_children().forEach((c) => c.destroy());
                    this.renderEventList(dayEvents.events, this.eventsList);
                }
            });

            this.setCell(row, col, btn);
            col += 1;
        });
    }

    private setupNavigation(): void {
        if (!this.prevBtn || !this.nextBtn) return;

        this.prevBtn.connect("clicked", () => {
            if (this.svc) {
                this.svc.down();
                this.refresh();
            }
        });

        this.nextBtn.connect("clicked", () => {
            if (this.svc) {
                this.svc.up();
                this.refresh();
            }
        });
    }

    public getItem(): PopupMenu.PopupBaseMenuItem {
        if (!this.item) {
            throw new Error(
                "CalendarPopup item not initialized. Call onMount() first.",
            );
        }
        return this.item;
    }

    destroy(): void {
        // Clean up UI references
        this.item = undefined;
        this.outer = undefined;
        this.header = undefined;
        this.grid = undefined;
        this.gridLayout = undefined;
        this.titleLabel = undefined;
        this.prevBtn = undefined;
        this.nextBtn = undefined;
        this.eventsBox = undefined;
        this.eventsTitle = undefined;
        this.eventsList = undefined;
        this.settingsBtn = undefined;
        this.weekdayTitle = undefined;
        this.fullDateTitle = undefined;

        // Clean up services
        this.svc = undefined;
        this.dayInfoService = undefined;

        // Call parent destroy to clean up all registered cleanups
        super.destroy();
    }
}
