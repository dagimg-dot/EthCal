import Clutter from "gi://Clutter";
import St from "gi://St";
import formatWithTime from "kenat";
import { CalendarPopup } from "./components/CalendarPopup.js";

const Mainloop = imports.mainloop;

import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";
import type * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";
import { logger } from "./utils/logger.js";

const getCurrentDateAndTime = () => {
    const formattedTime = new formatWithTime();

    let formattedString = formattedTime.toString();

    if (formattedTime.time.hour >= 6 && formattedTime.time.minute >= 0) {
        if (formattedTime.time.period === "night") {
            formattedString = formattedString.replace("ማታ", "ሌሊት");
        } else if (formattedTime.time.period === "day") {
            formattedString = formattedString.replace("ጠዋት", "ከሰዓት");
        }
    }

    return { formattedTime: formattedString };
};

export default class EthCal extends Extension {
    #indicator: PanelMenu.Button | undefined;
    timeout = 1.0;

    enable() {
        logger("enabled");

        this.#indicator = new PanelMenu.Button(0, "Ethiopian Calendar", false);

        const label = new St.Label({
            y_align: Clutter.ActorAlign.CENTER,
        });

        this.#indicator.add_child(label);

        Mainloop.timeout_add_seconds(this.timeout, () => {
            const { formattedTime } = getCurrentDateAndTime();
            label.text = formattedTime;
            return true;
        });

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

    disable() {
        if (!this.#indicator) return;

        this.#indicator.destroy();
        this.#indicator = undefined;
        Mainloop.source_remove(this.timeout);
    }
}
