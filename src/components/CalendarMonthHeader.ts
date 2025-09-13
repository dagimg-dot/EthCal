import type Gio from "gi://Gio";
import St from "gi://St";
import { ComponentBase, ReactiveComponent } from "stignite";
import { SETTINGS } from "../types/index.js";

@ReactiveComponent({
    dependencies: {
        [SETTINGS.KEYS.CALENDAR_LANGUAGE]: ["month-name"],
        [SETTINGS.KEYS.USE_GEEZ_NUMERALS]: ["year-number"],
    },
    priority: 3, // Lower priority
    id: "calendar-month-header",
})
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

        // Initialize reactive settings first
        this.initSettings();

        // Initial render
        this.render({ force: true });
    }

    /**
     * Initialize reactive settings - unified reactive API
     */
    private initSettings(): void {
        this.withErrorHandling(() => {
            // Reactive language setting for title updates
            this.addReactiveSetting(
                "calendarLanguage",
                SETTINGS.KEYS.CALENDAR_LANGUAGE,
                SETTINGS.DEFAULTS.LANGUAGE,
                (newLanguage) => {
                    this.emit("language-changed", newLanguage);
                    if (this.onLanguageChange) {
                        this.onLanguageChange();
                    }
                },
            );

            // Reactive geez numerals setting for title updates
            this.addReactiveSetting(
                "useGeezNumerals",
                SETTINGS.KEYS.USE_GEEZ_NUMERALS,
                SETTINGS.DEFAULTS.GEEZ_NUMERALS,
                (useGeez) => {
                    this.emit("geez-numerals-changed", useGeez);
                    if (this.onLanguageChange) {
                        this.onLanguageChange();
                    }
                },
            );
        }, "Failed to initialize month header settings");
    }

    /**
     * Initial render - called once during construction
     */
    protected renderInitial(): void {
        this.withErrorHandling(() => {
            // Create main container
            this.outer = new St.BoxLayout({
                vertical: false,
                style_class: "calendar-month-header",
            });

            this.createNavigationButtons();
            this.createTitleLabel();

            // Connect button events
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
        }, "Failed to render CalendarMonthHeader initially");
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
                affectedParts.includes("month-name") ||
                affectedParts.includes("year-number")
            ) {
                // Update the title when language or geez numerals change
                if (this.onLanguageChange) {
                    this.onLanguageChange();
                }
            }
        }, "Failed to update CalendarMonthHeader");
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
