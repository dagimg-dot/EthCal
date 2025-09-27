import type Gio from "gi://Gio";
import type { ExtensionMetadata } from "resource:///org/gnome/shell/extensions/extension.js";
import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";
import type { ComponentBase } from "./ComponentBase.js";
import { UpdateOrchestrator } from "./ReactiveBase.js";
import type {
    ExtensionConfig,
    InferSettingValue,
    Logger,
    SettingSchema,
} from "./types.js";

/**
 * Base class
 */
export abstract class ExtensionBase extends Extension {
    protected readonly settings: Gio.Settings;
    protected readonly settingSchema: SettingSchema;
    protected readonly logger: Logger;
    private components: ComponentBase[] = [];
    private cleanup: (() => void)[] = [];
    private orchestrator: UpdateOrchestrator;

    constructor(metadata: ExtensionMetadata, config: ExtensionConfig) {
        super(metadata);
        this.settingSchema = config.settingSchema;
        this.logger = config.logger ?? console.log;
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
     * Get a typed setting value using the schema
     */
    protected getSetting<K extends keyof SettingSchema>(
        key: K,
    ): InferSettingValue<SettingSchema, K> {
        const settingDef = this.settingSchema[key];
        if (!settingDef) {
            throw new Error(`Setting '${String(key)}' not defined in schema`);
        }

        try {
            switch (settingDef.type) {
                case "string":
                    return this.settings.get_string(
                        key as string,
                    ) as InferSettingValue<SettingSchema, K>;
                case "int":
                    return this.settings.get_int(
                        key as string,
                    ) as InferSettingValue<SettingSchema, K>;
                case "boolean":
                    return this.settings.get_boolean(
                        key as string,
                    ) as InferSettingValue<SettingSchema, K>;
                default:
                    throw new Error(
                        `Unknown setting type '${settingDef.type}' for key '${String(key)}'`,
                    );
            }
        } catch (error) {
            this.logger(`Error getting setting '${String(key)}': ${error}`);
            return settingDef.default as InferSettingValue<SettingSchema, K>;
        }
    }

    /**
     * Set up global setting change monitoring
     */
    private setupSettingMonitoring(): void {
        // Listen to all setting changes and notify orchestrator
        const handlerId = this.settings.connect("changed", (settings, key) => {
            try {
                const settingDef = this.settingSchema[key];
                if (!settingDef) {
                    this.logger(
                        `Warning: Setting '${key}' not defined in schema`,
                    );
                    return;
                }

                let value: string | boolean | number | undefined;

                // Get the new value based on the schema-defined type
                switch (settingDef.type) {
                    case "string":
                        value = settings.get_string(key);
                        break;
                    case "int":
                        value = settings.get_int(key);
                        break;
                    case "boolean":
                        value = settings.get_boolean(key);
                        break;
                    default:
                        this.logger(
                            `Error: Unknown setting type '${settingDef.type}' for key '${key}'`,
                        );
                        return;
                }

                if (value !== undefined) {
                    this.orchestrator.notifySettingChanged(key, value);
                }
            } catch (error) {
                this.logger(
                    `Error monitoring setting change for ${key}: ${error}`,
                );
            }
        });

        this.addCleanup(() => this.settings.disconnect(handlerId));
    }

    /**
     * Destroy extension and clean up all resources
     */
    destroy(): void {
        // Destroy all components
        this.logger("Destroying extension and all components");
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
