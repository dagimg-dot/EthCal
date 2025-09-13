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
    private currentDate: KenatDate | undefined;

    constructor(settings: Gio.Settings) {
        super(settings);

        // Initial render
        this.render({ force: true });
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
            this.dayInfoService = createDayInfoService(
                this.settings.get_string(
                    SETTINGS.KEYS.CALENDAR_LANGUAGE,
                ) as LanguageOption,
            );
        }, "Failed to render CalendarEventsSection initially");
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
                affectedParts.includes("event-titles") ||
                affectedParts.includes("holiday-names")
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

                    // Re-render current events with new language
                    if (this.currentDate) {
                        this.updateEvents(this.currentDate);
                    }
                }

                console.log("called with language change");
            }

            if (affectedParts.includes("date-titles")) {
                // Update title when geez numerals change
                if (this.currentDate) {
                    this.updateTitle(this.currentDate);
                }
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
    }

    public updateEvents(date: KenatDate): void {
        this.withErrorHandling(() => {
            if (!this.titleLabel || !this.eventsList || !this.dayInfoService) {
                return;
            }

            // Store the current date for reactive updates
            this.currentDate = date;

            // Update title and events
            this.updateTitle(date);
            this.updateEventsList(date);
        }, "Failed to update events for selected date");
    }

    private updateTitle(date: KenatDate): void {
        if (!this.titleLabel) return;

        this.titleLabel.text = this.formatDate(date.day, date.month, date.year);
    }

    private updateEventsList(date: KenatDate): void {
        if (!this.eventsList || !this.dayInfoService) return;

        // Clear existing events
        this.eventsList.get_children().forEach((child) => child.destroy());

        // Get and display events for the selected date
        const dayEvents = this.dayInfoService.getDayEvents(date);
        this.renderEventList(dayEvents.events, this.eventsList);
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
