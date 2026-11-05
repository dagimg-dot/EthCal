import Clutter from "gi://Clutter";
import type Gio from "gi://Gio";
import Pango from "gi://Pango";
import St from "gi://St";
import Kenat from "../lib/kenat.js";
import {
    type DayEvent,
    DayInfoService,
    type KenatDate,
} from "../services/dayInfoService.js";
import type { LanguageOption } from "../types/index.js";
import { readLanguage, readUseGeez } from "../utils/settings.js";

const TEXTS = {
    today: { amharic: "ዛሬ", english: "Today" },
    noEvents: { amharic: "ምንም ማስታወሻ አልተገኘም", english: "No events found" },
} as const satisfies Record<string, Record<LanguageOption, string>>;

export class CalendarEventsSection {
    readonly widget: St.BoxLayout;
    private readonly titleLabel: St.Label;
    private readonly eventsList: St.BoxLayout;
    private readonly dayInfoService: DayInfoService;

    constructor(private readonly settings: Gio.Settings) {
        this.widget = new St.BoxLayout({
            orientation: Clutter.Orientation.VERTICAL,
            style_class: "calendar-events",
        });

        this.titleLabel = new St.Label({
            text: this.getLocalizedText("today"),
            style_class: "calendar-events-title",
        });
        this.widget.add_child(this.titleLabel);

        this.eventsList = new St.BoxLayout({
            orientation: Clutter.Orientation.VERTICAL,
            style_class: "calendar-events-list",
        });
        this.widget.add_child(this.eventsList);

        this.dayInfoService = new DayInfoService(readLanguage(this.settings));
    }

    updateEvents(date: KenatDate): void {
        this.dayInfoService.updateLanguage(readLanguage(this.settings));
        this.updateTitle(date);
        this.updateEventsList(date);
    }

    private updateTitle(date: KenatDate): void {
        this.titleLabel.text = this.formatDate(date.day, date.month, date.year);
    }

    private updateEventsList(date: KenatDate): void {
        for (const child of this.eventsList.get_children()) child.destroy();
        this.renderEventList(
            this.dayInfoService.getDayEvents(date),
            this.eventsList,
        );
    }

    private formatDate(day: number, month: number, year: number): string {
        const dateString = `${year}-${month}-${day}`;
        const kenat = new Kenat(dateString);

        const formattedDate = kenat.format({
            lang: readLanguage(this.settings),
            useGeez: readUseGeez(this.settings),
        });

        return `${month} - ${formattedDate}`;
    }

    private renderEventList(events: DayEvent[], container: St.BoxLayout): void {
        if (events.length > 0) {
            events.forEach((event) => {
                const eventRow = new St.BoxLayout({
                    orientation: Clutter.Orientation.HORIZONTAL,
                    style_class: "calendar-event",
                });

                const dot = new St.Label({
                    text: "•",
                    style_class: "calendar-event-dot",
                });

                const eventContent = new St.BoxLayout({
                    orientation: Clutter.Orientation.VERTICAL,
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

    private getLocalizedText(key: keyof typeof TEXTS): string {
        return TEXTS[key][readLanguage(this.settings)];
    }
}
