import Clutter from "gi://Clutter";
import St from "gi://St";
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";
import Kenat from "kenat";
import { createDayInfoService } from "../services/dayInfoService.js";
import { MonthGridService } from "../services/monthGrid.js";
import { logger } from "../utils/logger.js";

export const CalendarPopup = () => {
    const item = new PopupMenu.PopupBaseMenuItem({
        reactive: false,
        can_focus: false,
    });

    const outer = new St.BoxLayout({
        vertical: true,
        style_class: "calendar-popup",
    });

    item.add_child(outer);

    // Top date header (weekday + full date)
    const topHeader = new St.BoxLayout({
        vertical: true,
        style_class: "calendar-top",
    });

    const today = new Kenat();

    // Top header format
    // {weekdayName}
    // {monthName} {day} {year}

    const weekdayTitle = new St.Label({
        text: today.formatWithWeekday("amharic", false).split(",")[0],
        style_class: "calendar-top-weekday",
    });

    const fullDateTitle = new St.Label({
        text: today.format({ lang: "amharic" }),
        style_class: "calendar-top-date",
    });

    topHeader.add_child(weekdayTitle);
    topHeader.add_child(fullDateTitle);
    outer.add_child(topHeader);

    // Header with navigation
    const header = new St.BoxLayout({
        vertical: false,
        style_class: "calendar-month-header",
    });
    const prevBtn = new St.Button({
        style_class: "calendar-nav-button",
        can_focus: true,
    });
    prevBtn.set_child(
        new St.Icon({
            icon_name: "go-previous-symbolic",
            style_class: "popup-menu-icon",
        }),
    );
    const titleLabel = new St.Label({
        text: "",
        style_class: "calendar-title",
    });
    const nextBtn = new St.Button({
        style_class: "calendar-nav-button",
        can_focus: true,
    });
    nextBtn.set_child(
        new St.Icon({
            icon_name: "go-next-symbolic",
            style_class: "popup-menu-icon",
        }),
    );

    header.add_child(prevBtn);
    header.add_child(new St.Widget({ x_expand: true }));
    header.add_child(titleLabel);
    header.add_child(new St.Widget({ x_expand: true }));
    header.add_child(nextBtn);
    outer.add_child(header);

    // Grid container (7 columns: headers + days)
    const gridLayout = new Clutter.GridLayout();
    const grid = new St.Widget({
        layout_manager: gridLayout,
        style_class: "calendar-grid",
    });
    outer.add_child(grid);

    // Instance state
    const svc = new MonthGridService({ weekStart: 1, weekdayLang: "amharic" });
    const dayInfoService = createDayInfoService("amharic");

    const clearGrid = () => {
        grid.get_children().forEach((child) => child.destroy());
    };

    const setCell = (row: number, col: number, actor: St.Widget) => {
        gridLayout.attach(actor, col, row, 1, 1);
    };

    // Today events section
    const eventsBox = new St.BoxLayout({
        vertical: true,
        style_class: "calendar-events",
    });
    const eventsTitle = new St.Label({
        text: "Today",
        style_class: "calendar-events-title",
    });
    const eventsList = new St.BoxLayout({
        vertical: true,
        style_class: "calendar-events-list",
    });
    eventsBox.add_child(eventsTitle);
    eventsBox.add_child(eventsList);
    outer.add_child(eventsBox);

    // Function to update Today events section
    const updateTodayEvents = () => {
        eventsList.get_children().forEach((c) => c.destroy());

        const today = Kenat.now().getEthiopian();
        const dayEvents = dayInfoService.getDayEvents(today);

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
                    y_expand: false,
                    x_align: Clutter.ActorAlign.START,
                });

                eventContent.add_child(title);
                eventContent.add_child(description);

                eventRow.add_child(dot);
                eventRow.add_child(eventContent);
                eventsList.add_child(eventRow);
            });
        } else {
            const empty = new St.Label({
                text: "No Events",
                style_class: "calendar-event-empty",
            });
            eventsList.add_child(empty);
        }
    };

    const render = () => {
        const data = svc.generate();
        titleLabel.text = `${data.monthName} ${data.year}`;

        clearGrid();

        // Headers in row 0
        data.headers.forEach((h, idx) => {
            const lbl = new St.Label({
                text: h.slice(0, 3),
                style_class: "calendar-header",
            });
            setCell(0, idx, lbl);
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
                setCell(row, col, new St.Label({ text: "" }));
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
                logger(`Selected EC: ${e.year}/${e.month}/${e.day}`);

                // Show day information in Today section
                const dayEvents = dayInfoService.getDayEvents({
                    year:
                        typeof e.year === "string" ? parseInt(e.year) : e.year,
                    month:
                        typeof e.month === "string"
                            ? parseInt(e.month)
                            : e.month,
                    day: typeof e.day === "string" ? parseInt(e.day) : e.day,
                });
                eventsTitle.text = `${e.day}/${e.month}/${e.year}`;

                eventsList.get_children().forEach((c) => c.destroy());

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
                            y_expand: false,
                            x_align: Clutter.ActorAlign.START,
                        });

                        eventContent.add_child(title);
                        eventContent.add_child(description);

                        eventRow.add_child(dot);
                        eventRow.add_child(eventContent);
                        eventsList.add_child(eventRow);
                    });
                } else {
                    const empty = new St.Label({
                        text: "No Events",
                        style_class: "calendar-event-empty",
                    });
                    eventsList.add_child(empty);
                }
            });

            setCell(row, col, btn);
            col += 1;
        });

        // Keep the top header values as initialized; do not override here
        // Keep the top header values as initialized; do not override here
    };

    // Navigation
    prevBtn.connect("clicked", () => {
        svc.down();
        render();
        // Reset Today section when navigating
        eventsTitle.text = "Today";
        updateTodayEvents();
    });
    nextBtn.connect("clicked", () => {
        svc.up();
        render();
        // Reset Today section when navigating
        eventsTitle.text = "Today";
        updateTodayEvents();
    });

    render();
    updateTodayEvents();

    return item;
};
