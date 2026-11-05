import Clutter from "gi://Clutter";
import type Gio from "gi://Gio";
import GLib from "gi://GLib";
import St from "gi://St";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";
import type * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";
import Kenat from "../lib/kenat.js";
import {
    createDateFormatterService,
    type DateFormatterService,
} from "../services/dateFormatter.js";
import type {
    FormatOption,
    LanguageOption,
    PositionOption,
} from "../types/index.js";
import { SETTINGS } from "../types/index.js";
import { logger } from "../utils/logger.js";
import { CalendarPopup } from "./CalendarPopup.js";

/** The panel's private position boxes, which the typings leave out. */
interface PanelBoxes {
    _leftBox: St.BoxLayout;
    _centerBox: St.BoxLayout;
    _rightBox: St.BoxLayout;
}

const PANEL_BOX = {
    left: "_leftBox",
    center: "_centerBox",
    right: "_rightBox",
} as const satisfies Record<PositionOption, keyof PanelBoxes>;

const FORMAT_STRINGS: Record<Exclude<FormatOption, "custom">, string> = {
    full: "dday mnam dd year hh:mm tp",
    compact: "mnam dd hh:mm",
    "time-only": "hh:mm tp",
    "date-only": "dday mnam dd year",
};

const CLOCK_INTERVAL_MS = 1000;

export class StatusBarIndicator {
    private readonly indicator: PanelMenu.Button;
    private readonly label: St.Label;
    private readonly popup: CalendarPopup;
    private readonly dateFormatter: DateFormatterService;
    private readonly settingsChangedId: number;
    private clockId = 0;

    constructor(
        private readonly settings: Gio.Settings,
        openPreferences: () => void,
    ) {
        this.indicator = new PanelMenu.Button(0.5, "Ethiopian Calendar", false);
        this.label = new St.Label({ y_align: Clutter.ActorAlign.CENTER });
        this.indicator.add_child(this.label);

        this.popup = new CalendarPopup(settings, openPreferences);
        const menu = this.indicator.menu as PopupMenu.PopupMenu;
        menu.addMenuItem(this.popup.item);
        Main.panel.menuManager.addMenu(menu, 1);

        // Every open starts from the current month with the picker closed
        menu.actor.connect("show", () => {
            this.popup.resetToCurrentMonth();
            this.popup.hidePickerIfVisible();
        });

        this.dateFormatter = createDateFormatterService({
            language: this.language(),
            useGeezNumerals: this.useGeez(),
        });

        // Any setting change refreshes everything it can affect; only the position moves the indicator
        this.settingsChangedId = settings.connect(
            "changed",
            (_settings, key) => {
                if (key === SETTINGS.KEYS.STATUS_BAR_POSITION) {
                    this.applyPosition();
                } else {
                    this.refresh();
                }
            },
        );

        this.applyPosition();
        this.updateLabel();

        this.clockId = GLib.timeout_add(
            GLib.PRIORITY_DEFAULT,
            CLOCK_INTERVAL_MS,
            () => {
                this.updateLabel();
                return GLib.SOURCE_CONTINUE;
            },
        );
    }

    private refresh(): void {
        this.updateLabel();
        this.popup.refresh();
    }

    private applyPosition(): void {
        const position = this.settings.get_string(
            SETTINGS.KEYS.STATUS_BAR_POSITION,
        ) as PositionOption;
        const box = (Main.panel as unknown as PanelBoxes)[PANEL_BOX[position]];
        if (!box) return;

        const container = this.indicator.container;
        container.get_parent()?.remove_child(container);
        box.insert_child_at_index(container, 1);
        logger.debug(`Status bar position updated to: ${position}`);
    }

    private updateLabel(): void {
        this.dateFormatter.updateOptions({
            language: this.language(),
            useGeezNumerals: this.useGeez(),
        });

        const format = this.settings.get_string(
            SETTINGS.KEYS.STATUS_BAR_FORMAT,
        ) as FormatOption;
        const formatString =
            format === "custom"
                ? this.settings.get_string(
                      SETTINGS.KEYS.STATUS_BAR_CUSTOM_FORMAT,
                  )
                : FORMAT_STRINGS[format];

        this.label.text = this.dateFormatter.format(formatString, new Kenat());
    }

    private language(): LanguageOption {
        return this.settings.get_string(
            SETTINGS.KEYS.CALENDAR_LANGUAGE,
        ) as LanguageOption;
    }

    private useGeez(): boolean {
        return this.settings.get_boolean(SETTINGS.KEYS.USE_GEEZ_NUMERALS);
    }

    destroy(): void {
        if (this.clockId) GLib.source_remove(this.clockId);
        this.clockId = 0;

        this.settings.disconnect(this.settingsChangedId);
        this.popup.destroy();
        this.indicator.destroy();
    }
}
