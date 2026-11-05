import Clutter from "gi://Clutter";
import type Gio from "gi://Gio";
import St from "gi://St";
import Kenat from "../lib/kenat.js";
import { readLanguage, readUseGeez } from "../utils/settings.js";

export class CalendarTopHeader {
    readonly widget: St.BoxLayout;
    private readonly weekdayTitle: St.Label;
    private readonly fullDateTitle: St.Label;

    constructor(
        private readonly settings: Gio.Settings,
        onSettingsClicked: () => void,
    ) {
        this.widget = new St.BoxLayout({
            orientation: Clutter.Orientation.VERTICAL,
            style_class: "calendar-top",
        });

        const topRow = new St.BoxLayout({
            orientation: Clutter.Orientation.HORIZONTAL,
            style_class: "calendar-top-row",
        });

        this.weekdayTitle = new St.Label({
            text: "",
            style_class: "calendar-top-weekday",
        });

        const settingsBtn = new St.Button({
            style_class: "calendar-settings-button",
            can_focus: true,
        });
        settingsBtn.set_child(
            new St.Icon({
                icon_name: "preferences-system-symbolic",
                style_class: "popup-menu-icon",
            }),
        );
        settingsBtn.connect("clicked", onSettingsClicked);

        topRow.add_child(this.weekdayTitle);
        topRow.add_child(new St.Widget({ x_expand: true }));
        topRow.add_child(settingsBtn);
        this.widget.add_child(topRow);

        this.fullDateTitle = new St.Label({
            text: "",
            style_class: "calendar-top-date",
        });
        this.widget.add_child(this.fullDateTitle);
    }

    refresh(): void {
        const today = new Kenat();
        const language = readLanguage(this.settings);
        const useGeezNumerals = readUseGeez(this.settings);

        this.weekdayTitle.text = today
            .formatWithWeekday(language, false)
            .split(",")[0];

        this.fullDateTitle.text = today.format({
            lang: language,
            useGeez: useGeezNumerals,
        });
    }
}
