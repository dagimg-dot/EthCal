import type Gio from "gi://Gio";
import type { ExtensionMetadata } from "resource:///org/gnome/shell/extensions/extension.js";
import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";
import { logger } from "src/utils/logger.js";
import type { ComponentBase } from "./ComponentBase.js";
import { UpdateOrchestrator } from "./ComponentBase.js";

/**
 * Base class
 */
export abstract class ExtensionBase extends Extension {
    protected readonly settings: Gio.Settings;
    private components: ComponentBase[] = [];
    private cleanup: (() => void)[] = [];
    private orchestrator: UpdateOrchestrator;

    constructor(metadata: ExtensionMetadata) {
        super(metadata);
        this.settings = this.getSettings();
        this.orchestrator = UpdateOrchestrator.getInstance();

        // Set up global setting change monitoring
        this.setupSettingMonitoring();
    }

    /**
     * Add a component for automatic cleanup
     */
    protected addComponent(component: ComponentBase): void {
        this.components.push(component);
    }

    /**
     * Add cleanup function
     */
    protected addCleanup(cleanup: () => void): void {
        this.cleanup.push(cleanup);
    }

    /**
     * Listen to setting changes with automatic cleanup
     */
    protected onSettingChange(key: string, callback: () => void): void {
        const handlerId = this.settings.connect(`changed::${key}`, callback);
        this.addCleanup(() => this.settings.disconnect(handlerId));
    }

    /**
     * Get setting value with type safety
     */
    public getSetting<T>(key: string, defaultValue: T): T {
        try {
            if (typeof defaultValue === "string") {
                return this.settings.get_string(key) as T;
            } else if (typeof defaultValue === "boolean") {
                return this.settings.get_boolean(key) as T;
            } else if (typeof defaultValue === "number") {
                return this.settings.get_int(key) as T;
            }
            return defaultValue;
        } catch {
            return defaultValue;
        }
    }

    /**
     * Set setting value and notify orchestrator
     */
    protected setSetting(key: string, value: string | boolean | number): void {
        try {
            if (typeof value === "string") {
                this.settings.set_string(key, value);
            } else if (typeof value === "boolean") {
                this.settings.set_boolean(key, value);
            } else if (typeof value === "number") {
                this.settings.set_int(key, value);
            }

            // Notify orchestrator of setting change
            this.orchestrator.notifySettingChanged(key, value);
        } catch (error) {
            console.error(`Error setting '${key}':`, error);
        }
    }

    /**
     * Set up global setting change monitoring
     */
    private setupSettingMonitoring(): void {
        // Listen to all setting changes and notify orchestrator
        const handlerId = this.settings.connect("changed", (settings, key) => {
            try {
                let value: string | boolean | number | undefined;

                // Get the new value based on the key
                if (
                    key.includes("position") ||
                    key.includes("format") ||
                    key.includes("language")
                ) {
                    value = settings.get_string(key);
                } else if (key.includes("geez") || key.includes("numerals")) {
                    value = settings.get_boolean(key);
                } else {
                    // For other keys, try to determine type dynamically
                    try {
                        value = settings.get_int(key);
                    } catch {
                        try {
                            value = settings.get_string(key);
                        } catch {
                            value = settings.get_boolean(key);
                        }
                    }
                }

                if (value !== undefined) {
                    this.orchestrator.notifySettingChanged(key, value);
                }
            } catch (error) {
                logger(`Error monitoring setting change for ${key}: ${error}`);
            }
        });

        this.addCleanup(() => this.settings.disconnect(handlerId));
    }

    /**
     * Destroy extension and clean up all resources
     */
    destroy(): void {
        // Destroy all components
        logger("Destroying extension and all components");
        this.components.forEach((component) => component.destroy());
        this.components = [];

        // Run all cleanup functions
        this.cleanup.forEach((cleanup) => {
            try {
                cleanup();
            } catch (error) {
                console.error("Cleanup error:", error);
            }
        });
        this.cleanup = [];
    }
}

// Re-export ComponentBase for convenience
export { ComponentBase } from "./ComponentBase.js";
