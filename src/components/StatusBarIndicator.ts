import Clutter from "gi://Clutter";
import St from "gi://St";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";
import type * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";
import Kenat from "kenat";
import { ComponentBase, type ExtensionBase } from "stignite";
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
import { CalendarPopup } from "./CalendarPopup.js";

interface MainPanel {
    _leftBox?: St.BoxLayout;
    _rightBox?: St.BoxLayout;
    _centerBox?: St.BoxLayout;
}

interface MainPanelWithManager extends MainPanel {
    menuManager?: PopupMenu.PopupMenuManager;
}

export class StatusBarIndicator extends ComponentBase {
    private _indicator: PanelMenu.Button | undefined;
    private _label: St.Label | undefined;
    private _calendarPopup: CalendarPopup | undefined;
    private readonly timeout = 1.0;
    private extension: ExtensionBase;

    // services
    private dateFormatter: DateFormatterService | undefined;

    // settings
    private position: PositionOption;
    private format: FormatOption;
    private customFormat: string;
    private useGeezNumerals: boolean;
    private language: LanguageOption;

    constructor(extension: ExtensionBase) {
        super(extension.getSettings());

        this.extension = extension;

        this.position = this.extension.getSetting(
            SETTINGS.KEYS.STATUS_BAR_POSITION,
            SETTINGS.DEFAULTS.POSITION,
        );
        this.format = this.extension.getSetting(
            SETTINGS.KEYS.STATUS_BAR_FORMAT,
            SETTINGS.DEFAULTS.FORMAT,
        );
        this.customFormat = this.extension.getSetting(
            SETTINGS.KEYS.STATUS_BAR_CUSTOM_FORMAT,
            SETTINGS.DEFAULTS.CUSTOM_FORMAT,
        );
        this.useGeezNumerals = this.extension.getSetting(
            SETTINGS.KEYS.USE_GEEZ_NUMERALS,
            SETTINGS.DEFAULTS.GEEZ_NUMERALS,
        );
        this.language = this.extension.getSetting(
            SETTINGS.KEYS.CALENDAR_LANGUAGE,
            SETTINGS.DEFAULTS.LANGUAGE,
        );

        // Initialize date formatter service
        this.dateFormatter = createDateFormatterService({
            language: this.language,
            useGeezNumerals: this.useGeezNumerals,
        });

        this.initialize();
    }

    private setupSettingsObservers(): void {
        this.connectSettingSignal(SETTINGS.KEYS.STATUS_BAR_POSITION, () =>
            this.updateIndicatorPosition(),
        );

        this.connectSettingSignal(SETTINGS.KEYS.STATUS_BAR_FORMAT, () =>
            this.updateTimeDisplay(),
        );

        this.connectSettingSignal(SETTINGS.KEYS.STATUS_BAR_CUSTOM_FORMAT, () =>
            this.updateTimeDisplay(),
        );

        this.connectSettingSignal(SETTINGS.KEYS.USE_GEEZ_NUMERALS, () =>
            this.updateTimeDisplay(),
        );

        this.connectSettingSignal(SETTINGS.KEYS.CALENDAR_LANGUAGE, () =>
            this.updateTimeDisplay(),
        );
    }

    private initialize(): void {
        this.setupSettingsObservers();
        this.createUI();
        this.updateTimeDisplay(); // Update immediately
        this.startTimeUpdate();
    }

    private createUI() {
        this._indicator = new PanelMenu.Button(0, "Ethiopian Calendar", false);

        this._label = new St.Label({
            y_align: Clutter.ActorAlign.CENTER,
        });

        this._indicator.add_child(this._label);

        // Position indicator in panel (this will add it to the correct position)
        this.updateIndicatorPosition();

        // Setup calendar popup
        this.setupCalendarPopup();
    }

    private setupCalendarPopup(): void {
        if (!this._indicator) return;

        // Create CalendarPopup component
        this._calendarPopup = new CalendarPopup(this.extension);

        const popupMenu = this._indicator.menu as PopupMenu.PopupMenu;
        popupMenu.addMenuItem(this._calendarPopup.getItem());

        // Register the menu with GNOME Shell's popup menu manager for proper focus handling
        (Main.panel as unknown as MainPanelWithManager).menuManager?.addMenu(
            popupMenu,
            1,
        );

        // Connect reset function to popup show event
        popupMenu.actor.connect("show", () => {
            this._calendarPopup?.resetToCurrentMonth();
        });
    }

    private updateIndicatorPosition() {
        if (!this._indicator) return;

        // Get current position from settings
        this.position = this.extension.getSetting(
            SETTINGS.KEYS.STATUS_BAR_POSITION,
            SETTINGS.DEFAULTS.POSITION,
        );

        // Remove from current position first
        this.removeFromAllPanelPositions();

        const methodMap = {
            left: "_leftBox",
            center: "_centerBox",
            right: "_rightBox",
        } as const;

        const method = methodMap[this.position];

        if (method) {
            (Main.panel as unknown as MainPanel)[
                method as keyof MainPanel
            ]?.insert_child_at_index(this._indicator.container, 1);
        }
    }

    private startTimeUpdate() {
        this.addTimer(() => {
            this.updateTimeDisplay();
        }, this.timeout * 1000);
    }

    private updateTimeDisplay() {
        if (!this._label || !this.dateFormatter) return;

        // Get current settings
        this.format = this.extension.getSetting(
            SETTINGS.KEYS.STATUS_BAR_FORMAT,
            SETTINGS.DEFAULTS.FORMAT,
        );
        this.customFormat = this.extension.getSetting(
            SETTINGS.KEYS.STATUS_BAR_CUSTOM_FORMAT,
            SETTINGS.DEFAULTS.CUSTOM_FORMAT,
        );
        this.useGeezNumerals = this.extension.getSetting(
            SETTINGS.KEYS.USE_GEEZ_NUMERALS,
            SETTINGS.DEFAULTS.GEEZ_NUMERALS,
        );
        this.language = this.extension.getSetting(
            SETTINGS.KEYS.CALENDAR_LANGUAGE,
            SETTINGS.DEFAULTS.LANGUAGE,
        );

        // Update date formatter options
        this.dateFormatter.updateOptions({
            language: this.language,
            useGeezNumerals: this.useGeezNumerals,
        });

        const formattedTime = this.getCurrentDateAndTime();
        this._label.text = formattedTime;
    }

    private getCurrentDateAndTime(): string {
        if (!this.dateFormatter) return "";

        const kenat = new Kenat();

        // Use custom format if selected, otherwise use predefined formats
        if (this.format === "custom") {
            return this.dateFormatter.format(this.customFormat, kenat);
        }

        // Map predefined formats to custom format strings
        const formatMap: Record<Exclude<FormatOption, "custom">, string> = {
            full: "dday mnam dd year hh:mm tp",
            compact: "mnam dd hh:mm",
            "time-only": "hh:mm tp",
            "date-only": "dday mnam dd year",
        };

        const formatString =
            formatMap[this.format as Exclude<FormatOption, "custom">];
        return this.dateFormatter.format(formatString, kenat);
    }

    private removeFromAllPanelPositions() {
        if (!this._indicator) return;

        (Main.panel as unknown as MainPanel)._leftBox?.remove_child(
            this._indicator.container,
        );
        (Main.panel as unknown as MainPanel)._rightBox?.remove_child(
            this._indicator.container,
        );
        (Main.panel as unknown as MainPanel)._centerBox?.remove_child(
            this._indicator.container,
        );
    }

    destroy(): void {
        // Clean up calendar popup
        if (this._calendarPopup) {
            this._calendarPopup.destroy();
            this._calendarPopup = undefined;
        }

        // Clean up date formatter
        this.dateFormatter = undefined;

        // Clean up indicator
        if (this._indicator) {
            this.removeFromAllPanelPositions();
            this._indicator.destroy();
            this._indicator = undefined;
        }

        // Clean up references
        this._label = undefined;

        // Call parent destroy to clean up all registered cleanups
        super.destroy();
    }
}
