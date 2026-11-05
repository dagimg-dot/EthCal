import Clutter from "gi://Clutter";
import St from "gi://St";
import type { KenatDate } from "../services/dayInfoService.js";
import type {
    DayCell,
    MonthGridResult,
    MonthGridService,
} from "../services/monthGrid.js";

export class CalendarGrid {
    readonly widget: St.Widget;
    private readonly gridLayout: Clutter.GridLayout;

    constructor(
        private readonly monthService: MonthGridService,
        private readonly onDaySelected: (date: KenatDate) => void,
    ) {
        this.gridLayout = new Clutter.GridLayout({
            column_homogeneous: true,
            row_homogeneous: true,
        });
        this.widget = new St.Widget({
            layout_manager: this.gridLayout,
            style_class: "calendar-grid",
            x_expand: true,
        });
    }

    refresh(): void {
        this.renderCalendar(this.monthService.generate());
    }

    private renderCalendar(data: MonthGridResult): void {
        for (const child of this.widget.get_children()) child.destroy();

        data.headers.forEach((header, idx) => {
            const headerLabel = new St.Label({
                text: header.slice(0, 3),
                style_class: "calendar-header",
            });
            this.setCell(0, idx, headerLabel);
        });

        let row = 1;
        let col = 0;
        for (const day of data.days) {
            if (col === 7) {
                row += 1;
                col = 0;
            }
            this.setCell(
                row,
                col,
                day ? this.createDayButton(day) : new St.Label(),
            );
            col += 1;
        }
    }

    private createDayButton(day: DayCell): St.Button {
        const button = new St.Button({
            style_class: "calendar-day",
            can_focus: true,
        });
        button.set_child(new St.Label({ text: day.label }));

        if (day.isToday) {
            button.add_style_class_name("calendar-today");
            if (day.holidays.length > 0) {
                button.add_style_class_name("calendar-today-holiday");
            }
        }

        if (!day.isToday && day.holidays.length > 0) {
            button.add_style_class_name("calendar-holiday");

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

        button.connect("clicked", () => this.onDaySelected(day.date));

        return button;
    }

    private setCell(row: number, col: number, actor: St.Widget): void {
        this.gridLayout.attach(actor, col, row, 1, 1);
    }
}
