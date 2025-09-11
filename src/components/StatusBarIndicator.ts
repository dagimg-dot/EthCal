import Clutter from "gi://Clutter";
import type Gio from "gi://Gio";
import type GObject from "gi://GObject";
import St from "gi://St";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";
import type * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";
import Kenat from "kenat";
import { ComponentBase } from "../stignite/ComponentBase.js";
import type { ExtensionBase } from "../stignite/ExtensionBase.js";
import type { PanelPosition, TextFormat } from "../types/index.js";
import { CalendarPopup } from "./CalendarPopup.js";

interface MainPanel {
    _leftBox?: St.BoxLayout;
    _rightBox?: St.BoxLayout;
    _centerBox?: St.BoxLayout;
    menuManager?: PopupMenu.PopupMenuManager;
}

export class StatusBarIndicator extends ComponentBase {
    #indicator: PanelMenu.Button | undefined;
    #label: St.Label | undefined;
    #calendarPopup: CalendarPopup | undefined;
    private readonly timeout = 1.0;
    private extension: ExtensionBase;
    private settings: Gio.Settings;

    // Simple state - no reactive framework needed
    private position: PanelPosition;
    private format: TextFormat;
    private useGeezNumerals: boolean;

    constructor(extension: ExtensionBase) {
        super();

        this.extension = extension;
        this.settings = extension.getSettings();

        // Initialize state from settings
        this.position =
            (this.settings.get_string(
                "status-bar-position",
            ) as PanelPosition) || "left";
        this.format =
            (this.settings.get_string("status-bar-format") as TextFormat) ||
            "full";
        this.useGeezNumerals =
            this.settings.get_boolean("use-geez-numerals") || false;

        this.initialize();
    }

    private setupSettingsObservers(): void {
        // Observe position changes
        this.connectSignal(
            this.settings as unknown as GObject.Object,
            "changed::status-bar-position",
            () => {
                this.position = this.settings.get_string(
                    "status-bar-position",
                ) as PanelPosition;
                this.updateIndicatorPosition();
            },
        );

        // Observe format changes
        this.connectSignal(
            this.settings as unknown as GObject.Object,
            "changed::status-bar-format",
            () => {
                this.format = this.settings.get_string(
                    "status-bar-format",
                ) as TextFormat;
                this.updateTimeDisplay();
            },
        );

        // Observe Geez numerals changes
        this.connectSignal(
            this.settings as unknown as GObject.Object,
            "changed::use-geez-numerals",
            () => {
                this.useGeezNumerals =
                    this.settings.get_boolean("use-geez-numerals");
                this.updateTimeDisplay();
            },
        );
    }

    private initialize(): void {
        this.setupSettingsObservers();
        this.createUI();
        this.updateTimeDisplay(); // Update immediately
        this.startTimeUpdate();
    }

    private createUI() {
        this.#indicator = new PanelMenu.Button(0, "Ethiopian Calendar", false);

        this.#label = new St.Label({
            y_align: Clutter.ActorAlign.CENTER,
        });

        this.#indicator.add_child(this.#label);

        // Position indicator in panel (this will add it to the correct position)
        this.updateIndicatorPosition();

        // Setup calendar popup
        this.setupCalendarPopup();
    }

    private setupCalendarPopup(): void {
        if (!this.#indicator) return;

        // Create CalendarPopup component
        this.#calendarPopup = new CalendarPopup({
            extension: this.extension,
            settings: this.settings,
        });

        const popupMenu = this.#indicator.menu as PopupMenu.PopupMenu;
        popupMenu.addMenuItem(this.#calendarPopup.getItem());

        // Register the menu with GNOME Shell's popup menu manager for proper focus handling
        (Main.panel as unknown as MainPanel).menuManager?.addMenu(popupMenu, 1);

        // Connect reset function to popup show event
        popupMenu.actor.connect("show", () => {
            this.#calendarPopup?.resetToCurrentMonth();
        });
    }

    private updateIndicatorPosition() {
        if (!this.#indicator) return;

        // Remove from current position first
        this.removeFromAllPanelPositions();

        // Add to new position based on position using panel boxes
        const panel = Main.panel as unknown as MainPanel;
        switch (this.position) {
            case "center":
                if (panel._centerBox) {
                    panel._centerBox.insert_child_at_index(
                        this.#indicator.container,
                        1,
                    );
                }
                break;
            case "left":
                if (panel._leftBox) {
                    panel._leftBox.insert_child_at_index(
                        this.#indicator.container,
                        1,
                    );
                }
                break;
            default: // right
                if (panel._rightBox) {
                    panel._rightBox.insert_child_at_index(
                        this.#indicator.container,
                        1,
                    );
                }
                break;
        }
    }

    private startTimeUpdate() {
        this.addTimer(() => {
            this.updateTimeDisplay();
        }, this.timeout * 1000);
    }

    private updateTimeDisplay() {
        if (!this.#label) return;

        const formattedTime = this.getCurrentDateAndTime();
        this.#label.text = formattedTime;
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
        if (!this.#indicator) return;

        (Main.panel as unknown as MainPanel)._leftBox?.remove_child(
            this.#indicator.container,
        );
        (Main.panel as unknown as MainPanel)._rightBox?.remove_child(
            this.#indicator.container,
        );
        (Main.panel as unknown as MainPanel)._centerBox?.remove_child(
            this.#indicator.container,
        );
    }

    destroy(): void {
        // Clean up calendar popup
        if (this.#calendarPopup) {
            this.#calendarPopup.destroy();
            this.#calendarPopup = undefined;
        }

        // Clean up indicator
        if (this.#indicator) {
            this.removeFromAllPanelPositions();
            this.#indicator.destroy();
            this.#indicator = undefined;
        }

        // Clean up references
        this.#label = undefined;

        // Call parent destroy to clean up all registered cleanups
        super.destroy();
    }
}
