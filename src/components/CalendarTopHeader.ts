import St from "gi://St";
import Kenat from "kenat";
import { ComponentBase, type ExtensionBase } from "stignite";
import type { LanguageOption } from "../types/index.js";
import { SETTINGS } from "../types/index.js";

export class CalendarTopHeader extends ComponentBase {
    private outer: St.BoxLayout | undefined;
    private weekdayTitle: St.Label | undefined;
    private fullDateTitle: St.Label | undefined;
    private settingsBtn: St.Button | undefined;
    private extension: ExtensionBase;

    constructor(extension: ExtensionBase) {
        super(extension.getSettings());
        this.extension = extension;

        // Follow new lifecycle pattern
        this.initSettings();
        this.initUI();
        this.initConnections();
        this.initLogic();
    }

    /**
     * Initialize reactive settings
     */
    private initSettings(): void {
        this.withErrorHandling(() => {
            // Reactive language setting
            this.addReactiveSetting(
                "language",
                SETTINGS.KEYS.CALENDAR_LANGUAGE,
                SETTINGS.DEFAULTS.LANGUAGE,
                (newLanguage: LanguageOption) => {
                    this.emit("language-changed", newLanguage);
                    this.updateDisplay();
                },
            );

            // Reactive geez numerals setting
            this.addReactiveSetting(
                "useGeezNumerals",
                SETTINGS.KEYS.USE_GEEZ_NUMERALS,
                SETTINGS.DEFAULTS.GEEZ_NUMERALS,
                (useGeez: boolean) => {
                    this.emit("geez-numerals-changed", useGeez);
                    this.updateDisplay();
                },
            );
        }, "Failed to initialize top header settings");
    }

    /**
     * Initialize UI components
     */
    private initUI(): void {
        this.withErrorHandling(() => {
            // Create main container
            this.outer = new St.BoxLayout({
                vertical: true,
                style_class: "calendar-top",
            });

            this.createTopRow();
            this.createDateRow();
        }, "Failed to initialize top header UI");
    }

    /**
     * Initialize connections
     */
    private initConnections(): void {
        // Settings button connection will be handled in createTopRow
    }

    /**
     * Initialize business logic
     */
    private initLogic(): void {
        this.withErrorHandling(() => {
            this.updateDisplay();
        }, "Failed to initialize top header logic");
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
        const language = this.extension.getSetting(
            SETTINGS.KEYS.CALENDAR_LANGUAGE,
            SETTINGS.DEFAULTS.LANGUAGE,
        );
        const useGeezNumerals = this.extension.getSetting(
            SETTINGS.KEYS.USE_GEEZ_NUMERALS,
            SETTINGS.DEFAULTS.GEEZ_NUMERALS,
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
