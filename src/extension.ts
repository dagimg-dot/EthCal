import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
const Mainloop = imports.mainloop;

import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import { logger } from './utils/logger.js';

const getCurrentDateAndTime = () => {
    const now = GLib.DateTime.new_now_local();
    const date = now.format('%Y-%m-%d');
    const time = now.format('%H:%M:%S');

    return { date, time };
};

export default class EthCal extends Extension {
    #indicator: PanelMenu.Button | undefined;
    timeout = 1.0; // seconds

    enable() {
        logger('enabled');

        this.#indicator = new PanelMenu.Button(0, 'Ethiopian Calendar');

        const label = new St.Label({
            y_align: Clutter.ActorAlign.CENTER,
        });

        this.#indicator.add_child(label);

        Mainloop.timeout_add_seconds(this.timeout, () => {
            const { date, time } = getCurrentDateAndTime();
            label.text = `${date} ${time}`;
            return true;
        });

        const menu = new PopupMenu.PopupMenu(
            this.#indicator,
            0.5,
            St.Side.BOTTOM,
        );
        menu.addMenuItem(new PopupMenu.PopupMenuItem('Main Window'));
        this.#indicator.setMenu(menu);

        Main.panel.addToStatusArea(
            'ethiopian-calendar',
            this.#indicator,
            0,
            'center',
        );
    }

    disable() {
        if (!this.#indicator) return;

        this.#indicator.destroy();
        this.#indicator = undefined;
        Mainloop.source_remove(this.timeout);
    }
}
