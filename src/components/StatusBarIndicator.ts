import Clutter from "gi://Clutter";
import St from "gi://St";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";
import type * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";
import Kenat from "kenat";
import { CalendarPopup } from "./CalendarPopup.js";

const Mainloop = imports.mainloop;

export class StatusBarIndicator {
    #indicator: PanelMenu.Button | undefined;
    #label: St.Label | undefined;
    #timeoutId: number | undefined;
    private readonly timeout = 1.0;

    constructor() {
        this.createIndicator();
        this.startTimeUpdate();
    }

    private createIndicator() {
        this.#indicator = new PanelMenu.Button(0, "Ethiopian Calendar", false);

        this.#label = new St.Label({
            y_align: Clutter.ActorAlign.CENTER,
        });

        this.#indicator.add_child(this.#label);

        Main.panel.addToStatusArea(
            "ethiopian-calendar",
            this.#indicator,
            1,
            "left",
        );

        const calendarPopup = CalendarPopup();
        (this.#indicator.menu as unknown as PopupMenu.PopupMenu).addMenuItem(
            calendarPopup,
        );
    }

    private startTimeUpdate() {
        this.#timeoutId = Mainloop.timeout_add_seconds(this.timeout, () => {
            this.updateTime();
            return true;
        });
    }

    private updateTime() {
        if (!this.#label) return;

        const formattedTime = this.getCurrentDateAndTime();
        this.#label.text = formattedTime;
    }

    private getCurrentDateAndTime(): string {
        const kenat = new Kenat();
        let formattedString = kenat.toString();

        // Adjust time period labels based on time
        if (kenat.time.hour >= 6 && kenat.time.minute >= 0) {
            if (kenat.time.period === "night") {
                formattedString = formattedString.replace("ማታ", "ሌሊት");
            } else if (kenat.time.period === "day") {
                formattedString = formattedString.replace("ጠዋት", "ከሰዓት");
            }
        }

        return formattedString;
    }

    public destroy() {
        if (this.#timeoutId) {
            Mainloop.source_remove(this.#timeoutId);
            this.#timeoutId = undefined;
        }

        if (this.#indicator) {
            this.#indicator.destroy();
            this.#indicator = undefined;
        }

        this.#label = undefined;
    }
}
