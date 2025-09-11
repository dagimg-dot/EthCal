import Clutter from "gi://Clutter";
import type Gio from "gi://Gio";
import Pango from "gi://Pango";
import St from "gi://St";
import type { Extension } from "resource:///org/gnome/shell/extensions/extension.js";
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";
import Kenat from "kenat";
import { Component, StateManager } from "stignite";
import { createDayInfoService } from "../services/dayInfoService.js";
import { MonthGridService } from "../services/monthGrid.js";
import type {
    CalendarPopupProps,
    CalendarPopupState,
    Language,
} from "../types/index.js";
import { logger } from "../utils/logger.js";

export class CalendarPopup extends Component<
    CalendarPopupState,
    CalendarPopupProps
> {
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

    private svc: MonthGridService | undefined;
    private dayInfoService: ReturnType<typeof createDayInfoService> | undefined;
    private stateManager: StateManager;

    constructor(props: CalendarPopupProps) {
        const settings = props.settings as Gio.Settings;
        const initialState: CalendarPopupState = {
            language: "amharic",
            currentMonth: "",
            selectedDate: null,
            useGeezNumerals: settings.get_boolean("use-geez-numerals"),
        };

        super(initialState, props);
        this.stateManager = new StateManager();

        // Initialize the component to set up state subscriptions and mount
        this.initialize();
    }

    protected setupStateSubscriptions(): void {
        // Create reactive state for language
        const settings = this.props.settings as Gio.Settings;
        const languageState = this.stateManager.createState(
            "language",
            (settings.get_string("calendar-language") as Language) || "amharic",
        );

        // Create reactive state for Geez numerals
        const geezNumeralsState = this.stateManager.createState(
            "useGeezNumerals",
            settings.get_boolean("use-geez-numerals"),
        );

        // Subscribe to language changes
        this.subscribeToState(languageState, (language) => {
            this.state.language = language;
            this.updateLanguage();
        });

        // Subscribe to Geez numerals changes
        this.subscribeToState(geezNumeralsState, (useGeezNumerals) => {
            this.state.useGeezNumerals = useGeezNumerals;
            this.updateGeezNumerals();
        });

        // Connect to settings changes
        this.connectSignal(settings, "changed::calendar-language", () => {
            const newLanguage =
                (settings.get_string("calendar-language") as Language) ||
                "amharic";
            languageState.set(newLanguage);
        });

        // Connect to Geez numerals setting changes
        this.connectSignal(settings, "changed::use-geez-numerals", () => {
            const newUseGeezNumerals =
                settings.get_boolean("use-geez-numerals");
            geezNumeralsState.set(newUseGeezNumerals);
        });
    }

    onMount(): void {
        this.createUI();
        this.setupServices();
        this.setupNavigation();
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
            (this.props.extension as Extension).openPreferences();
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
        this.gridLayout = new Clutter.GridLayout();
        this.grid = new St.Widget({
            layout_manager: this.gridLayout,
            style_class: "calendar-grid",
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
            weekdayLang: this.state.language,
            useGeez: this.state.useGeezNumerals,
        });
        this.dayInfoService = createDayInfoService(this.state.language);
    }

    public resetToCurrentMonth(): void {
        if (!this.svc) return;
        this.svc.resetToCurrentMonth();
        this.render();
        this.updateTodayEvents();
    }

    private updateLanguage(): void {
        if (!this.svc || !this.dayInfoService) return;

        // Update services with new language
        this.svc = new MonthGridService({
            weekStart: 1,
            weekdayLang: this.state.language,
            useGeez: this.state.useGeezNumerals,
        });
        this.dayInfoService = createDayInfoService(this.state.language);

        // Re-render with new language
        this.render();
        this.updateTodayEvents();
    }

    private updateGeezNumerals(): void {
        if (!this.svc) return;

        // Update service with new Geez numerals setting
        this.svc = new MonthGridService({
            weekStart: 1,
            weekdayLang: this.state.language,
            useGeez: this.state.useGeezNumerals,
        });

        // Re-render with new numerals
        this.render();
    }

    private formatDate(day: number, month: number, year: number): string {
        if (this.state.useGeezNumerals) {
            // Convert to Geez numerals using Kenat library
            const kenat = new Kenat();
            const ethiopianDate = kenat.getEthiopian();
            ethiopianDate.day = day;
            ethiopianDate.month = month;
            ethiopianDate.year = year;

            // Use Kenat's formatting with Geez numerals
            return kenat.format({
                lang: this.state.language,
                useGeez: true,
            });
        } else {
            // Use Arabic numerals
            return `${day}/${month}/${year}`;
        }
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
        const dayEvents = this.dayInfoService.getDayEvents(today);

        if (dayEvents.hasEvents) {
            dayEvents.events.forEach((event) => {
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
                this.eventsList?.add_child(eventRow);
            });
        } else {
            const empty = new St.Label({
                text: "ምንም ማስታወሻ አልተገኘም",
                style_class: "calendar-event-empty",
            });
            this.eventsList?.add_child(empty);
        }
    }

    private render(): void {
        if (!this.svc || !this.titleLabel || !this.eventsTitle) return;

        const data = this.svc.generate();
        this.titleLabel.text = `${data.monthName} ${data.year}`;
        this.state.currentMonth = `${data.monthName} ${data.year}`;

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
                const e = day.ethiopian;

                // Update selected date state using original numeric values
                this.state.selectedDate = day.ethiopianNumeric;

                // Show day information in Today section
                if (
                    this.dayInfoService &&
                    this.eventsTitle &&
                    this.eventsList
                ) {
                    const dayEvents = this.dayInfoService.getDayEvents(
                        this.state.selectedDate,
                    );

                    this.eventsTitle.text = this.formatDate(
                        e.day as number,
                        e.month as number,
                        e.year as number,
                    );

                    this.eventsList.get_children().forEach((c) => c.destroy());

                    if (dayEvents.hasEvents) {
                        dayEvents.events.forEach((event) => {
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
                            this.eventsList?.add_child(eventRow);
                        });
                    } else {
                        const empty = new St.Label({
                            text: "ምንም ማስታወሻ አልተገኘም",
                            style_class: "calendar-event-empty",
                        });
                        this.eventsList?.add_child(empty);
                    }
                }
            });

            this.setCell(row, col, btn);
            col += 1;
        });
    }

    private setupNavigation(): void {
        if (!this.prevBtn || !this.nextBtn || !this.eventsTitle) return;

        this.prevBtn.connect("clicked", () => {
            if (this.svc) {
                this.svc.down();
                this.render();
                // Reset Today section when navigating
                if (this.eventsTitle) {
                    this.eventsTitle.text = "ዛሬ";
                }
                this.updateTodayEvents();
            }
        });

        this.nextBtn.connect("clicked", () => {
            if (this.svc) {
                this.svc.up();
                this.render();
                // Reset Today section when navigating
                if (this.eventsTitle) {
                    this.eventsTitle.text = "ዛሬ";
                }
                this.updateTodayEvents();
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

    onDestroy(): void {
        // Clean up event handlers and resources
        this.stateManager.destroy();

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
    }
}
