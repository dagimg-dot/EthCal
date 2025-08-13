import St from "gi://St";
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";
import { logger } from "../utils/logger.js";

export const CurrentDateCard = () => {
    const popupMenu = new PopupMenu.PopupBaseMenuItem();
    const box = new St.BoxLayout({
        vertical: true,
    });

    const day = "13";

    const label = new St.Label({
        text: day,
    });

    box.add_child(label);
    popupMenu.add_child(box);

    // listen for button press
    popupMenu.connect("button-press-event", () => {
        logger("CurrentDateCard button-press-event");
    });

    return popupMenu;
};
