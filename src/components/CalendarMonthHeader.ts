import type Gio from "gi://Gio";
import St from "gi://St";
import { ComponentBase } from "stignite";
import { SETTINGS } from "../types/index.js";

export class CalendarMonthHeader extends ComponentBase {
    private outer: St.BoxLayout | undefined;
    private prevBtn: St.Button | undefined;
    private nextBtn: St.Button | undefined;
    private titleLabel: St.Label | undefined;

    private onPrevClick?: () => void;
    private onNextClick?: () => void;
    private onLanguageChange?: () => void;

    constructor(
        settings: Gio.Settings,
        onPrevClick?: () => void,
        onNextClick?: () => void,
        onLanguageChange?: () => void,
    ) {
        super(settings);
        this.onPrevClick = onPrevClick;
        this.onNextClick = onNextClick;
        this.onLanguageChange = onLanguageChange;

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
            // Connect to language setting changes
            this.connectSettingSignal(SETTINGS.KEYS.CALENDAR_LANGUAGE, () => {
                // Notify parent component to refresh the title
                if (this.onLanguageChange) {
                    this.onLanguageChange();
                }
            });

            // Connect to geez numerals setting changes
            this.connectSettingSignal(SETTINGS.KEYS.USE_GEEZ_NUMERALS, () => {
                // Notify parent component to refresh the title
                if (this.onLanguageChange) {
                    this.onLanguageChange();
                }
            });
        }, "Failed to initialize month header settings");
    }

    /**
     * Initialize UI components
     */
    private initUI(): void {
        this.withErrorHandling(() => {
            // Create main container
            this.outer = new St.BoxLayout({
                vertical: false,
                style_class: "calendar-month-header",
            });

            this.createNavigationButtons();
            this.createTitleLabel();
        }, "Failed to initialize month header UI");
    }

    /**
     * Initialize connections
     */
    private initConnections(): void {
        this.withErrorHandling(() => {
            if (this.prevBtn) {
                this.prevBtn.connect("clicked", () => {
                    this.emit("prev-clicked");
                    this.onPrevClick?.();
                });
            }

            if (this.nextBtn) {
                this.nextBtn.connect("clicked", () => {
                    this.emit("next-clicked");
                    this.onNextClick?.();
                });
            }
        }, "Failed to initialize month header connections");
    }

    /**
     * Initialize business logic
     */
    private initLogic(): void {
        // No initial logic needed
    }

    private createNavigationButtons(): void {
        if (!this.outer) return;

        // Previous button
        this.prevBtn = new St.Button({
            style_class: "calendar-nav-button",
            can_focus: true,
        });
        this.prevBtn.set_child(
            new St.Icon({
                icon_name: "go-previous-symbolic",
                style_class: "popup-menu-icon",
            }),
        );

        // Next button
        this.nextBtn = new St.Button({
            style_class: "calendar-nav-button",
            can_focus: true,
        });
        this.nextBtn.set_child(
            new St.Icon({
                icon_name: "go-next-symbolic",
                style_class: "popup-menu-icon",
            }),
        );

        this.outer.add_child(this.prevBtn);
    }

    private createTitleLabel(): void {
        if (!this.outer) return;

        // Title label
        this.titleLabel = new St.Label({
            text: "",
            style_class: "calendar-title",
        });

        // Add spacers and title
        this.outer.add_child(new St.Widget({ x_expand: true }));
        this.outer.add_child(this.titleLabel);
        this.outer.add_child(new St.Widget({ x_expand: true }));
        if (this.nextBtn) {
            this.outer.add_child(this.nextBtn);
        }
    }

    public setTitle(title: string): void {
        if (this.titleLabel) {
            this.titleLabel.text = title;
        }
    }

    public getWidget(): St.BoxLayout {
        if (!this.outer) {
            throw new Error("CalendarMonthHeader not initialized");
        }
        return this.outer;
    }

    destroy(): void {
        // Clean up UI references
        this.outer = undefined;
        this.prevBtn = undefined;
        this.nextBtn = undefined;
        this.titleLabel = undefined;

        // Call parent destroy to clean up events
        super.destroy();
    }
}
