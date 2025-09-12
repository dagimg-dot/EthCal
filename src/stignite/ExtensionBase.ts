import type Gio from "gi://Gio";
import type { ExtensionMetadata } from "resource:///org/gnome/shell/extensions/extension.js";
import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";
import { logger } from "src/utils/logger.js";
import type { ComponentBase } from "./ComponentBase.js";

/**
 * Base class
 */
export abstract class ExtensionBase extends Extension {
    protected readonly settings: Gio.Settings;
    private components: ComponentBase[] = [];
    private cleanup: (() => void)[] = [];

    constructor(metadata: ExtensionMetadata) {
        super(metadata);
        this.settings = this.getSettings();
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
     * Set setting value
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
        } catch (error) {
            console.error(`Error setting '${key}':`, error);
        }
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
