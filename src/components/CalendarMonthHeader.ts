import Clutter from "gi://Clutter";
import St from "gi://St";

export class CalendarMonthHeader {
    readonly widget: St.BoxLayout;
    private readonly titleLabel: St.Label;

    constructor(
        onPrevClick: () => void,
        onNextClick: () => void,
        onTitleClick: () => void,
    ) {
        this.widget = new St.BoxLayout({
            orientation: Clutter.Orientation.HORIZONTAL,
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
        prevBtn.connect("clicked", onPrevClick);

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
        nextBtn.connect("clicked", onNextClick);

        this.titleLabel = new St.Label({
            text: "",
            style_class: "calendar-title calendar-title-clickable",
            reactive: true,
            can_focus: true,
        });
        this.titleLabel.connect("button-press-event", () => {
            onTitleClick();
            return Clutter.EVENT_STOP;
        });
        this.titleLabel.connect("enter-event", () => {
            this.titleLabel.add_style_class_name("calendar-title-hover");
        });
        this.titleLabel.connect("leave-event", () => {
            this.titleLabel.remove_style_class_name("calendar-title-hover");
        });

        this.widget.add_child(prevBtn);
        this.widget.add_child(new St.Widget({ x_expand: true }));
        this.widget.add_child(this.titleLabel);
        this.widget.add_child(new St.Widget({ x_expand: true }));
        this.widget.add_child(nextBtn);
    }

    setTitle(title: string): void {
        this.titleLabel.text = title;
    }
}
