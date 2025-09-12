import Clutter from "gi://Clutter";
import St from "gi://St";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";
import type * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";
import Kenat from "kenat";
import {
    ComponentBase,
    type ExtensionBase,
    type ReactiveComputed,
    type ReactiveSetting,
} from "stignite";
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

// Type for time display settings
interface TimeDisplaySettings {
    format: FormatOption;
    customFormat: string;
    useGeezNumerals: boolean;
    language: LanguageOption;
}

export class StatusBarIndicator extends ComponentBase {
    private _indicator: PanelMenu.Button | undefined;
    private _label: St.Label | undefined;
    private _calendarPopup: CalendarPopup | undefined;
    private readonly timeout = 1.0;
    private extension: ExtensionBase;

    // Reactive settings - unified API
    private indicatorPosition!: ReactiveSetting<PositionOption>;
    private timeDisplaySettings!: ReactiveComputed<TimeDisplaySettings>;

    // Services
    private dateFormatter: DateFormatterService | undefined;

    constructor(extension: ExtensionBase) {
        super(extension.getSettings());

        this.extension = extension;

        // Enforced lifecycle order
        this.initSettings();
        this.initUI();
        this.initConnections();
        this.initLogic();
    }

    private initSettings(): void {
        this.withErrorHandling(() => {
            this.indicatorPosition = this.addReactiveSetting(
                "position",
                SETTINGS.KEYS.STATUS_BAR_POSITION,
                SETTINGS.DEFAULTS.POSITION,
                (newPosition) => this.onIndicatorPositionChange(newPosition),
            ) as ReactiveSetting<PositionOption>;

            this.timeDisplaySettings = this.addReactiveSetting(
                "timeDisplay",
                [
                    SETTINGS.KEYS.STATUS_BAR_FORMAT,
                    SETTINGS.KEYS.STATUS_BAR_CUSTOM_FORMAT,
                    SETTINGS.KEYS.USE_GEEZ_NUMERALS,
                    SETTINGS.KEYS.CALENDAR_LANGUAGE,
                ],
                {
                    format: SETTINGS.DEFAULTS.FORMAT,
                    customFormat: SETTINGS.DEFAULTS.CUSTOM_FORMAT,
                    useGeezNumerals: SETTINGS.DEFAULTS.GEEZ_NUMERALS,
                    language: SETTINGS.DEFAULTS.LANGUAGE,
                },
                (settings) => this.onTimeDisplayChange(settings),
            ) as ReactiveComputed<TimeDisplaySettings>;
        }, "Failed to initialize reactive settings");
    }

    private initLogic(): void {
        this.withErrorHandling(() => {
            this.dateFormatter = createDateFormatterService({
                language: this.timeDisplaySettings.value.language,
                useGeezNumerals: this.timeDisplaySettings.value.useGeezNumerals,
            });

            // Initial position, time display and timer
            this.onIndicatorPositionChange(this.indicatorPosition.value);

            this.onTimeDisplayChange(this.timeDisplaySettings.value);

            this.addTimer(() => {
                this.onTimeDisplayChange(this.timeDisplaySettings.value);
            }, this.timeout * 1000);
        }, "Failed to initialize logic");
    }

    private initUI(): void {
        this.withErrorHandling(() => {
            this._indicator = new PanelMenu.Button(
                0.5,
                "Ethiopian Calendar",
                false,
            );

            this._label = new St.Label({
                y_align: Clutter.ActorAlign.CENTER,
            });

            this._indicator.add_child(this._label);

            // Initialize child components (CalendarPopup)
            this.initChildren();
        }, "Failed to initialize UI");
    }

    private initChildren(): void {
        this.withErrorHandling(() => {
            if (!this._indicator) return;

            // Create CalendarPopup component
            this._calendarPopup = new CalendarPopup(this.extension);

            const popupMenu = this._indicator.menu as PopupMenu.PopupMenu;
            popupMenu.addMenuItem(this._calendarPopup.getItem());

            // Register the menu with GNOME Shell's popup menu manager for proper focus handling
            (
                Main.panel as unknown as MainPanelWithManager
            ).menuManager?.addMenu(popupMenu, 1);
        }, "Failed to initialize children");
    }

    /**
     * Initialize signal connections and event handlers
     */
    private initConnections(): void {
        this.withErrorHandling(() => {
            if (!this._indicator || !this._calendarPopup) return;

            // Connect reset function to popup show event
            const menu = this._indicator.menu as PopupMenu.PopupMenu;
            menu.actor.connect("show", () => {
                this._calendarPopup?.resetToCurrentMonth();
            });
        }, "Failed to initialize connections");
    }

    /**
     * Handle indicator position changes
     */
    private onIndicatorPositionChange(newPosition: PositionOption): void {
        this.withErrorHandling(() => {
            if (!this._indicator) return;
            // Remove from current position first
            this.removeFromAllPanelPositions();

            const methodMap = {
                left: "_leftBox",
                center: "_centerBox",
                right: "_rightBox",
            } as const;

            const method = methodMap[newPosition];

            if (method) {
                (Main.panel as unknown as MainPanel)[
                    method as keyof MainPanel
                ]?.insert_child_at_index(this._indicator.container, 1);
            }
        }, "Failed to update indicator position");
    }

    /**
     * Handle time display settings changes
     */
    private onTimeDisplayChange(settings: TimeDisplaySettings): void {
        this.withErrorHandling(() => {
            if (!this._label || !this.dateFormatter) return;
            // Update date formatter options with new settings
            this.dateFormatter.updateOptions({
                language: settings.language,
                useGeezNumerals: settings.useGeezNumerals,
            });

            const formattedTime = this.getCurrentDateAndTime(settings);
            this._label.text = formattedTime;
        }, "Failed to update time display");
    }

    private getCurrentDateAndTime(settings: TimeDisplaySettings): string {
        return this.withErrorHandling(() => {
            if (!this.dateFormatter) return "";

            const kenat = new Kenat();

            // Use custom format if selected, otherwise use predefined formats
            if (settings.format === "custom") {
                return this.dateFormatter.format(settings.customFormat, kenat);
            }

            // Map predefined formats to custom format strings
            const formatMap: Record<Exclude<FormatOption, "custom">, string> = {
                full: "dday mnam dd year hh:mm tp",
                compact: "mnam dd hh:mm",
                "time-only": "hh:mm tp",
                "date-only": "dday mnam dd year",
            };

            const formatString =
                formatMap[settings.format as Exclude<FormatOption, "custom">];
            return this.dateFormatter.format(formatString, kenat);
        }, "Failed to get current date and time");
    }

    private removeFromAllPanelPositions() {
        this.withErrorHandling(() => {
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
        }, "Failed to remove from all panel positions");
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
