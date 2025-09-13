import Clutter from "gi://Clutter";
import type Gio from "gi://Gio";
import Pango from "gi://Pango";
import St from "gi://St";
import Kenat from "kenat";
import { ComponentBase, ReactiveComponent } from "stignite";
import type { KenatDate } from "../services/dayInfoService.js";
import { createDayInfoService } from "../services/dayInfoService.js";
import type { LanguageOption } from "../types/index.js";
import { SETTINGS } from "../types/index.js";

@ReactiveComponent({
    dependencies: {
        [SETTINGS.KEYS.CALENDAR_LANGUAGE]: ["event-titles", "holiday-names"],
        [SETTINGS.KEYS.USE_GEEZ_NUMERALS]: ["date-titles"],
    },
    priority: 2, // Lowest priority
    id: "calendar-events-section",
})
export class CalendarEventsSection extends ComponentBase {
    private outer: St.BoxLayout | undefined;
    private titleLabel: St.Label | undefined;
    private eventsList: St.BoxLayout | undefined;
    private dayInfoService: ReturnType<typeof createDayInfoService> | undefined;

    constructor(settings: Gio.Settings) {
        super(settings);

        // Initialize reactive settings first
        this.initSettings();

        // Initial render
        this.render({ force: true });
    }

    /**
     * Initialize reactive settings - unified reactive API
     */
    private initSettings(): void {
        this.withErrorHandling(() => {
            // Reactive language setting for day info service and formatting
            this.addReactiveSetting(
                "calendarLanguage",
                SETTINGS.KEYS.CALENDAR_LANGUAGE,
                SETTINGS.DEFAULTS.LANGUAGE,
                (newLanguage: LanguageOption) => {
                    this.dayInfoService = createDayInfoService(newLanguage);
                    this.emit("language-changed", newLanguage);
                    if (this.titleLabel && this.eventsList) {
                        this.refreshDisplay();
                    }
                },
            );

            // Reactive geez numerals setting for date formatting
            this.addReactiveSetting(
                "useGeezNumerals",
                SETTINGS.KEYS.USE_GEEZ_NUMERALS,
                SETTINGS.DEFAULTS.GEEZ_NUMERALS,
                (useGeez: boolean) => {
                    this.emit("geez-numerals-changed", useGeez);
                    if (this.titleLabel && this.eventsList) {
                        this.refreshDisplay();
                    }
                },
            );
        }, "Failed to initialize events section settings");
    }

    /**
     * Initial render - called once during construction
     */
    protected renderInitial(): void {
        this.withErrorHandling(() => {
            // Create main container
            this.outer = new St.BoxLayout({
                vertical: true,
                style_class: "calendar-events",
            });

            this.createTitleSection();
            this.createEventsList();

            // Initialize services
            const language =
                this.getReactiveSetting<LanguageOption>(
                    "calendarLanguage",
                ).value;
            this.dayInfoService = createDayInfoService(language);
        }, "Failed to render CalendarEventsSection initially");
    }

    /**
     * Smart partial updates - called when settings change
     */
    protected renderUpdates(
        _changes: Record<string, unknown>,
        affectedParts: string[],
    ): void {
        this.withErrorHandling(() => {
            if (
                affectedParts.includes("event-titles") ||
                affectedParts.includes("holiday-names") ||
                affectedParts.includes("date-titles")
            ) {
                // Refresh display when language or geez numerals change
                this.refreshDisplay();
            }
        }, "Failed to update CalendarEventsSection");
    }

    private createTitleSection(): void {
        if (!this.outer) return;

        this.titleLabel = new St.Label({
            text: this.getLocalizedText("today"),
            style_class: "calendar-events-title",
        });

        this.outer.add_child(this.titleLabel);
    }

    private createEventsList(): void {
        if (!this.outer) return;

        this.eventsList = new St.BoxLayout({
            vertical: true,
            style_class: "calendar-events-list",
        });

        this.outer.add_child(this.eventsList);
    }

    public updateEvents(date: KenatDate): void {
        this.withErrorHandling(() => {
            if (!this.titleLabel || !this.eventsList || !this.dayInfoService) {
                return;
            }

            // Update title with selected date (formatted with current language/geez settings)
            this.titleLabel.text = this.formatDate(
                date.day,
                date.month,
                date.year,
            );

            // Clear existing events
            this.eventsList.get_children().forEach((child) => child.destroy());

            // Get and display events for the selected date
            const dayEvents = this.dayInfoService.getDayEvents(date);
            this.renderEventList(dayEvents.events, this.eventsList);
        }, "Failed to update events for selected date");
    }

    private formatDate(day: number, month: number, year: number): string {
        const dateString = `${year}-${month}-${day}`;
        const kenat = new Kenat(dateString);

        const language = this.settings.get_string(
            SETTINGS.KEYS.CALENDAR_LANGUAGE,
        ) as LanguageOption;
        const useGeez = this.settings.get_boolean(
            SETTINGS.KEYS.USE_GEEZ_NUMERALS,
        );

        const formattedDate = kenat.format({
            lang: language,
            useGeez: useGeez,
        });

        return `${month} - ${formattedDate}`;
    }

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

                // Enable text wrapping
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
                text: this.getLocalizedText("noEvents"),
                style_class: "calendar-event-empty",
            });
            container.add_child(empty);
        }
    }

    private getLocalizedText(key: string): string {
        const language = this.settings.get_string(
            SETTINGS.KEYS.CALENDAR_LANGUAGE,
        ) as LanguageOption;

        const texts = {
            today: {
                amharic: "ዛሬ",
                english: "Today",
            },
            noEvents: {
                amharic: "ምንም ማስታወሻ አልተገኘም",
                english: "No events found",
            },
        };

        return (
            texts[key as keyof typeof texts]?.[language] ||
            texts[key as keyof typeof texts]?.amharic ||
            ""
        );
    }

    /**
     * Refresh the display with current settings
     */
    private refreshDisplay(): void {
        this.withErrorHandling(() => {
            // Update title text in current language
            if (this.titleLabel) {
                this.titleLabel.text = this.getLocalizedText("today");
            }

            // Re-render empty state message if needed
            if (this.eventsList) {
                const children = this.eventsList.get_children();
                if (children.length === 1 && children[0] instanceof St.Label) {
                    const label = children[0] as St.Label;
                    if (
                        label.text === "No events found" ||
                        label.text.includes("ማስታወሻ")
                    ) {
                        label.text = this.getLocalizedText("noEvents");
                    }
                }
            }
        }, "Failed to refresh display");
    }

    public getWidget(): St.BoxLayout {
        if (!this.outer) {
            throw new Error("CalendarEventsSection not initialized");
        }
        return this.outer;
    }

    destroy(): void {
        // Clean up UI references
        this.outer = undefined;
        this.titleLabel = undefined;
        this.eventsList = undefined;
        this.dayInfoService = undefined;

        // Call parent destroy to clean up events and reactive settings
        super.destroy();
    }
}
