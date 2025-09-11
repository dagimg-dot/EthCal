import Clutter from "gi://Clutter";
import St from "gi://St";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";
import type * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";
import Kenat from "kenat";
import { ComponentBase } from "../stignite/ComponentBase.js";
import type { ExtensionBase } from "../stignite/ExtensionBase.js";
import type { PanelPosition, TextFormat } from "../types/index.js";
import { logger } from "../utils/logger.js";
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

    // Simple state - no reactive framework needed
    private position: PanelPosition;
    private format: TextFormat;
    private useGeezNumerals: boolean;

    constructor(extension: ExtensionBase) {
        super(extension.getSettings());

        this.extension = extension;

        // Initialize state from settings
        this.position = this.extension.getSetting(
            "status-bar-position",
            "left",
        ) as PanelPosition;
        this.format = this.extension.getSetting(
            "status-bar-format",
            "full",
        ) as TextFormat;
        this.useGeezNumerals = this.extension.getSetting(
            "use-geez-numerals",
            false,
        );

        this.initialize();
    }

    private setupSettingsObservers(): void {
        this.connectSettingSignal("status-bar-position", () =>
            this.updateIndicatorPosition(),
        );

        this.connectSettingSignal("status-bar-format", () =>
            this.updateTimeDisplay(),
        );

        this.connectSettingSignal("use-geez-numerals", () =>
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
        this._calendarPopup = new CalendarPopup({
            extension: this.extension,
            settings: this.settings,
        });

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
            "status-bar-position",
            "left",
        ) as PanelPosition;

        // Remove from current position first
        this.removeFromAllPanelPositions();

        const methodMap = {
            left: "_leftBox",
            center: "_centerBox",
            right: "_rightBox",
        } as const;

        const method = methodMap[this.position];

        logger(`Inserting at position: ${this.position} and method: ${method}`);

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
        if (!this._label) return;

        // Get current settings
        this.format = this.extension.getSetting(
            "status-bar-format",
            "full",
        ) as TextFormat;
        this.useGeezNumerals = this.extension.getSetting(
            "use-geez-numerals",
            false,
        );

        const formattedTime = this.getCurrentDateAndTime();
        this._label.text = formattedTime;
    }

    private getCurrentDateAndTime(): string {
        const kenat = new Kenat();
        const format = this.format;
        const useGeezNumerals = this.useGeezNumerals || false;

        let formattedString: string;

        switch (format) {
            case "full":
                // እሑድ ፪ ፳፻፺፯ ፲፪:፲፬ ማታ (Weekday Day Year HH:MM TimeDesc)
                formattedString = kenat.toString();
                break;

            case "compact":
                // ጥር ፪ ፲፪:፲፬ (Month Day HH:MM)
                formattedString = `${kenat.format({ lang: "amharic", useGeez: useGeezNumerals })} ${kenat.time.hour}:${String(kenat.time.minute).padStart(2, "0")}`;
                break;

            case "medium":
                // እሑድ ጥር ፪ ፲፪:፲፬ (Weekday Month Day HH:MM)
                formattedString = `${kenat.formatWithWeekday("amharic", useGeezNumerals)} ${kenat.time.hour}:${String(kenat.time.minute).padStart(2, "0")}`;
                break;

            case "time-only":
                // ፲፪:፲፬ ማታ (HH:MM TimeDesc)
                formattedString = `${kenat.time.hour}:${String(kenat.time.minute).padStart(2, "0")} ${kenat.time.period}`;
                break;

            case "date-only":
                // እሑድ ፪ ፳፻፺፯ (Weekday Day Year)
                formattedString = kenat.format({
                    lang: "amharic",
                    useGeez: useGeezNumerals,
                });
                break;

            default:
                formattedString = kenat.toString();
        }

        // Adjust time period labels based on time (for formats that include time)
        if (
            format !== "date-only" &&
            kenat.time.hour >= 6 &&
            kenat.time.minute >= 0
        ) {
            if (kenat.time.period === "night") {
                formattedString = formattedString.replace("ማታ", "ሌሊት");
            } else if (kenat.time.period === "day") {
                formattedString = formattedString.replace("ጠዋት", "ከሰዓት");
            }
        }

        return formattedString;
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
