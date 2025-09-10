import Clutter from "gi://Clutter";
import type Gio from "gi://Gio";
import St from "gi://St";
import type { Extension } from "resource:///org/gnome/shell/extensions/extension.js";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";
import type * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";
import Kenat from "kenat";
import { Component, StateManager } from "stignite";
import type {
    PanelPosition,
    StatusBarState,
    TextFormat,
} from "../types/index.js";
import { CalendarPopup } from "./CalendarPopup.js";

const Mainloop = imports.mainloop;

interface MainPanel {
    _leftBox?: St.BoxLayout;
    _rightBox?: St.BoxLayout;
    _centerBox?: St.BoxLayout;
}

export class StatusBarIndicator extends Component<StatusBarState> {
    #indicator: PanelMenu.Button | undefined;
    #label: St.Label | undefined;
    #timeoutId: number | undefined;
    #calendarPopup: CalendarPopup | undefined;
    private readonly timeout = 1.0;
    private extension: Extension;
    private settings: Gio.Settings;
    private stateManager: StateManager;

    constructor(extension: Extension) {
        const initialState: StatusBarState = {
            position: "left",
            format: "full",
            text: "",
        };

        super(initialState);

        this.extension = extension;
        this.settings = extension.getSettings();
        this.stateManager = new StateManager();

        this.initialize();
    }

    protected setupStateSubscriptions(): void {
        // Create reactive state for settings
        const positionState = this.stateManager.createState(
            "position",
            this.settings.get_string("status-bar-position") as PanelPosition,
        );
        const formatState = this.stateManager.createState(
            "format",
            this.settings.get_string("status-bar-format") as TextFormat,
        );

        // Subscribe to position changes
        this.subscribeToState(
            positionState,
            (position) => {
                this.state.position = position;
                this.updateIndicatorPosition();
            },
            "position-subscription",
        );

        // Subscribe to format changes
        this.subscribeToState(
            formatState,
            (format) => {
                this.state.format = format;
                this.updateTimeDisplay();
            },
            "format-subscription",
        );

        // Update settings when state changes
        this.settings.connect("changed::status-bar-position", () => {
            positionState.set(
                this.settings.get_string(
                    "status-bar-position",
                ) as PanelPosition,
            );
        });

        this.settings.connect("changed::status-bar-format", () => {
            formatState.set(
                this.settings.get_string("status-bar-format") as TextFormat,
            );
        });

        // No need to handle calendar language here - CalendarPopup handles it internally
    }

    onMount(): void {
        this.createIndicator();
        this.startTimeUpdate();
    }

    private createIndicator() {
        this.#indicator = new PanelMenu.Button(0, "Ethiopian Calendar", false);

        this.#label = new St.Label({
            y_align: Clutter.ActorAlign.CENTER,
        });

        this.#indicator.add_child(this.#label);

        // Position indicator in panel
        this.updateIndicatorPosition();

        // Setup calendar popup directly
        this.setupCalendarPopup();
    }

    private setupCalendarPopup(): void {
        if (!this.#indicator) return;

        // Create CalendarPopup component
        this.#calendarPopup = new CalendarPopup({
            extension: this.extension,
            settings: this.settings,
        });

        // Add the popup item to the menu
        const popupMenu = this.#indicator
            .menu as unknown as PopupMenu.PopupMenu;
        popupMenu.addMenuItem(this.#calendarPopup.getItem());

        // Connect reset function to popup show event
        popupMenu.actor.connect("show", () => {
            this.#calendarPopup?.resetToCurrentMonth();
        });
    }

    private updateIndicatorPosition() {
        if (!this.#indicator) return;

        // Remove from current position first
        this.removeFromAllPanelPositions();

        // Add to new position based on component state
        switch (this.state.position) {
            case "center":
                Main.panel.addToStatusArea(
                    "ethiopian-calendar",
                    this.#indicator,
                    1,
                    "center",
                );
                break;
            case "left":
                Main.panel.addToStatusArea(
                    "ethiopian-calendar",
                    this.#indicator,
                    1,
                    "left",
                );
                break;
            default:
                Main.panel.addToStatusArea(
                    "ethiopian-calendar",
                    this.#indicator,
                    1,
                    "right",
                );
                break;
        }
    }

    private startTimeUpdate() {
        this.addTimer(
            "time-update",
            () => {
                this.updateTimeDisplay();
            },
            this.timeout * 1000,
        );
    }

    private updateTimeDisplay() {
        if (!this.#label) return;

        const formattedTime = this.getCurrentDateAndTime();
        this.#label.text = formattedTime;
        this.state.text = formattedTime;
    }

    private getCurrentDateAndTime(): string {
        const kenat = new Kenat();
        const format = this.state.format;

        let formattedString: string;

        switch (format) {
            case "full":
                // እሑድ ፪ ፳፻፺፯ ፲፪:፲፬ ማታ (Weekday Day Year HH:MM TimeDesc)
                formattedString = kenat.toString();
                break;

            case "compact":
                // ጥር ፪ ፲፪:፲፬ (Month Day HH:MM)
                formattedString = `${kenat.format({ lang: "amharic", useGeez: true })} ${kenat.time.hour}:${String(kenat.time.minute).padStart(2, "0")}`;
                break;

            case "medium":
                // እሑድ ጥር ፪ ፲፪:፲፬ (Weekday Month Day HH:MM)
                formattedString = `${kenat.formatWithWeekday("amharic", true)} ${kenat.time.hour}:${String(kenat.time.minute).padStart(2, "0")}`;
                break;

            case "time-only":
                // ፲፪:፲፬ ማታ (HH:MM TimeDesc)
                formattedString = `${kenat.time.hour}:${String(kenat.time.minute).padStart(2, "0")} ${kenat.time.period}`;
                break;

            case "date-only":
                // እሑድ ፪ ፳፻፺፯ (Weekday Day Year)
                formattedString = kenat.format({
                    lang: "amharic",
                    useGeez: true,
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

    onDestroy(): void {
        // Stop time updates
        if (this.#timeoutId) {
            Mainloop.source_remove(this.#timeoutId);
            this.#timeoutId = undefined;
        }

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

        // Clean up state manager
        this.stateManager.destroy();
    }
}
