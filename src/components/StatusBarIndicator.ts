import Clutter from "gi://Clutter";
import St from "gi://St";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";
import type * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";
import Kenat from "kenat";
import { ComponentBase, type ExtensionBase, ReactiveComponent } from "stignite";
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

@ReactiveComponent({
    dependencies: {
        [SETTINGS.KEYS.STATUS_BAR_POSITION]: ["panel-position"],
        [SETTINGS.KEYS.STATUS_BAR_FORMAT]: ["time-display"],
        [SETTINGS.KEYS.STATUS_BAR_CUSTOM_FORMAT]: ["time-display"],
        [SETTINGS.KEYS.CALENDAR_LANGUAGE]: ["date-formatter", "calendar-popup"],
        [SETTINGS.KEYS.USE_GEEZ_NUMERALS]: ["date-formatter", "calendar-popup"],
    },
    priority: 10, // High priority as it's the main UI component
    id: "status-bar-indicator",
})
export class StatusBarIndicator extends ComponentBase {
    private _indicator: PanelMenu.Button | undefined;
    private _label: St.Label | undefined;
    private _calendarPopup: CalendarPopup | undefined;
    private readonly timeout = 1.0;
    private extension: ExtensionBase;

    // Services
    private dateFormatter: DateFormatterService | undefined;

    constructor(extension: ExtensionBase) {
        super(extension.getSettings());

        this.extension = extension;

        // Initial render
        this.render({ force: true });
    }

    /**
     * Initial render - called once during construction
     */
    protected renderInitial(): void {
        this.withErrorHandling(() => {
            // Create UI components
            this._indicator = new PanelMenu.Button(
                0.5,
                "Ethiopian Calendar",
                false,
            );

            this._label = new St.Label({
                y_align: Clutter.ActorAlign.CENTER,
            });

            this._indicator.add_child(this._label);

            // Create child components
            this._calendarPopup = new CalendarPopup(this.extension);

            const popupMenu = this._indicator.menu as PopupMenu.PopupMenu;
            popupMenu.addMenuItem(this._calendarPopup.getItem());

            // Register the menu with GNOME Shell
            (
                Main.panel as unknown as MainPanelWithManager
            ).menuManager?.addMenu(popupMenu, 1);

            // Connect popup show event
            popupMenu.actor.connect("show", () => {
                this._calendarPopup?.resetToCurrentMonth();
            });

            // Initialize services
            this.dateFormatter = createDateFormatterService({
                language: this.settings.get_string(
                    SETTINGS.KEYS.CALENDAR_LANGUAGE,
                ) as LanguageOption,
                useGeezNumerals: this.settings.get_boolean(
                    SETTINGS.KEYS.USE_GEEZ_NUMERALS,
                ),
            });

            // Set initial state
            this.updatePanelPosition();
            this.updateTimeDisplay();

            // Start time update timer
            this.addTimer(() => {
                this.updateTimeDisplay();
            }, this.timeout * 1000);
        }, "Failed to render StatusBarIndicator initially");
    }

    /**
     * Smart partial updates - called when settings change
     */
    protected renderUpdates(
        changes: Record<string, unknown>,
        affectedParts: string[],
    ): void {
        this.withErrorHandling(() => {
            if (affectedParts.includes("panel-position")) {
                this.updatePanelPosition();
            }

            if (
                affectedParts.includes("time-display") ||
                affectedParts.includes("date-formatter")
            ) {
                this.updateTimeDisplay();
            }

            if (affectedParts.includes("calendar-popup")) {
                // CalendarPopup will handle its own updates
                this._calendarPopup?.render({ changes, affectedParts });
            }
        }, "Failed to update StatusBarIndicator");
    }

    /**
     * Update panel position in GNOME Shell
     */
    private updatePanelPosition(): void {
        this.withErrorHandling(() => {
            if (!this._indicator) return;

            // Remove from current position first
            this.removeFromAllPanelPositions();

            const methodMap = {
                left: "_leftBox",
                center: "_centerBox",
                right: "_rightBox",
            } as const;

            const position = this.settings.get_string(
                SETTINGS.KEYS.STATUS_BAR_POSITION,
            ) as PositionOption;
            const method = methodMap[position];

            if (method) {
                (Main.panel as unknown as MainPanel)[
                    method as keyof MainPanel
                ]?.insert_child_at_index(this._indicator.container, 1);
            }
        }, "Failed to update panel position");
    }

    /**
     * Update time display in status bar
     */
    private updateTimeDisplay(): void {
        this.withErrorHandling(() => {
            if (!this._label || !this.dateFormatter) return;

            // Update date formatter options with new settings
            this.dateFormatter.updateOptions({
                language: this.settings.get_string(
                    SETTINGS.KEYS.CALENDAR_LANGUAGE,
                ) as LanguageOption,
                useGeezNumerals: this.settings.get_boolean(
                    SETTINGS.KEYS.USE_GEEZ_NUMERALS,
                ),
            });

            const formattedTime = this.getCurrentDateAndTime();
            this._label.text = formattedTime;
        }, "Failed to update time display");
    }

    /**
     * Get current date and time formatted
     */
    private getCurrentDateAndTime(): string {
        return this.withErrorHandling(() => {
            if (!this.dateFormatter) return "";

            const kenat = new Kenat();
            const format = this.settings.get_string(
                SETTINGS.KEYS.STATUS_BAR_FORMAT,
            ) as FormatOption;
            const customFormat = this.settings.get_string(
                SETTINGS.KEYS.STATUS_BAR_CUSTOM_FORMAT,
            );

            // Use custom format if selected, otherwise use predefined formats
            if (format === "custom") {
                return this.dateFormatter.format(customFormat, kenat);
            }

            // Map predefined formats to custom format strings
            const formatMap: Record<Exclude<FormatOption, "custom">, string> = {
                full: "dday mnam dd year hh:mm tp",
                compact: "mnam dd hh:mm",
                "time-only": "hh:mm tp",
                "date-only": "dday mnam dd year",
            };

            const formatString =
                formatMap[format as Exclude<FormatOption, "custom">];
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
