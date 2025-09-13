import type Gio from "gi://Gio";
import St from "gi://St";
import Kenat from "kenat";
import { ComponentBase, ReactiveComponent } from "stignite";
import { type LanguageOption, SETTINGS } from "../types/index.js";

@ReactiveComponent({
    dependencies: {
        [SETTINGS.KEYS.CALENDAR_LANGUAGE]: ["weekday-title", "date-title"],
        [SETTINGS.KEYS.USE_GEEZ_NUMERALS]: ["date-title"],
    },
    priority: 4, // Medium priority
    id: "calendar-top-header",
})
export class CalendarTopHeader extends ComponentBase {
    private outer: St.BoxLayout | undefined;
    private weekdayTitle: St.Label | undefined;
    private fullDateTitle: St.Label | undefined;
    private settingsBtn: St.Button | undefined;

    constructor(settings: Gio.Settings) {
        super(settings);

        // Initial render
        this.render({ force: true });
    }

    /**
     * Initial render - called once during construction
     */
    protected renderInitial(): void {
        this.withErrorHandling(() => {
            // Create main container
            this.outer = new St.BoxLayout({
                vertical: true,
                style_class: "calendar-top",
            });

            this.createTopRow();
            this.createDateRow();

            // Initial display update
            this.updateDisplay();
        }, "Failed to render CalendarTopHeader initially");
    }

    /**
     * Smart partial updates - called when settings change
     */
    protected renderUpdates(
        _changes: Record<string, unknown>,
        affectedParts: string[],
    ): void {
        this.withErrorHandling(() => {
            if (
                affectedParts.includes("weekday-title") ||
                affectedParts.includes("date-title")
            ) {
                this.updateDisplay();
            }
        }, "Failed to update CalendarTopHeader");
    }

    private createTopRow(): void {
        if (!this.outer) return;

        const topRow = new St.BoxLayout({
            vertical: false,
            style_class: "calendar-top-row",
        });

        // Weekday title
        this.weekdayTitle = new St.Label({
            text: "",
            style_class: "calendar-top-weekday",
        });

        // Settings button
        this.settingsBtn = new St.Button({
            style_class: "calendar-settings-button",
            can_focus: true,
        });
        this.settingsBtn.set_child(
            new St.Icon({
                icon_name: "preferences-system-symbolic",
                style_class: "popup-menu-icon",
            }),
        );

        // Connect settings button
        this.settingsBtn.connect("clicked", () => {
            this.emit("settings-clicked");
        });

        topRow.add_child(this.weekdayTitle);
        topRow.add_child(new St.Widget({ x_expand: true })); // Spacer
        topRow.add_child(this.settingsBtn);
        this.outer.add_child(topRow);
    }

    private createDateRow(): void {
        if (!this.outer) return;

        this.fullDateTitle = new St.Label({
            text: "",
            style_class: "calendar-top-date",
        });

        this.outer.add_child(this.fullDateTitle);
    }

    private updateDisplay(): void {
        if (!this.weekdayTitle || !this.fullDateTitle) return;

        const today = new Kenat();
        const language = this.settings.get_string(
            SETTINGS.KEYS.CALENDAR_LANGUAGE,
        ) as LanguageOption;
        const useGeezNumerals = this.settings.get_boolean(
            SETTINGS.KEYS.USE_GEEZ_NUMERALS,
        );

        this.weekdayTitle.text = today
            .formatWithWeekday(language, false)
            .split(",")[0];

        this.fullDateTitle.text = today.format({
            lang: language,
            useGeez: useGeezNumerals,
        });
    }

    public getWidget(): St.BoxLayout {
        if (!this.outer) {
            throw new Error("CalendarTopHeader not initialized");
        }
        return this.outer;
    }

    destroy(): void {
        // Clean up UI references
        this.outer = undefined;
        this.weekdayTitle = undefined;
        this.fullDateTitle = undefined;
        this.settingsBtn = undefined;

        // Call parent destroy to clean up events and reactive settings
        super.destroy();
    }
}
