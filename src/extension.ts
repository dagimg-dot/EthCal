import Clutter from "gi://Clutter";
import St from "gi://St";
import Kenat from "kenat";
import formatWithTime from "kenat";

const Mainloop = imports.mainloop;

import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";
import { logger } from "./utils/logger.js";

const getCurrentDateAndTime = () => {
    const ethDate = new Kenat();
    const date = ethDate.ethiopian;
    const time = ethDate.getCurrentTime();
    const formattedTime = new formatWithTime(date, time);

    return { formattedTime };
};

export default class EthCal extends Extension {
    #indicator: PanelMenu.Button | undefined;
    timeout = 1.0;

    enable() {
        logger("enabled");

        this.#indicator = new PanelMenu.Button(0, "Ethiopian Calendar");

        const label = new St.Label({
            y_align: Clutter.ActorAlign.CENTER,
        });

        this.#indicator.add_child(label);

        this.#indicator.connect("button-press-event", () => {
            logger("Hello EthCal");
            return Clutter.EVENT_STOP;
        });

        Mainloop.timeout_add_seconds(this.timeout, () => {
            const { formattedTime } = getCurrentDateAndTime();
            label.text = formattedTime.toString();
            return true;
        });

        Main.panel.addToStatusArea(
            "ethiopian-calendar",
            this.#indicator,
            0,
            "center",
        );
    }

    disable() {
        if (!this.#indicator) return;

        this.#indicator.destroy();
        this.#indicator = undefined;
        Mainloop.source_remove(this.timeout);
    }
}
