// Event data type for component communication
export type EventData =
    | Record<string, unknown>
    | string
    | number
    | boolean
    | null
    | undefined
    | { year: number; month: number; day: number | string };

// Dependency graph types for smart updates
export type ComponentId = string;
export type SettingKey = string;
export type ComponentPart = string;

export interface ComponentDependencies {
    [settingKey: string]: ComponentPart[];
}

export interface ComponentUpdateInfo {
    componentId: ComponentId;
    affectedParts: ComponentPart[];
    changes: Record<SettingKey, unknown>;
    priority: number;
}

export interface RenderOptions {
    changes?: Record<SettingKey, unknown>;
    affectedParts?: ComponentPart[];
    force?: boolean;
    priority?: number;
}

export interface ReactiveComponentConfig {
    dependencies: ComponentDependencies;
    priority?: number;
    id?: ComponentId;
}

/**
 * Setting value types supported by GSettings
 */
export type SettingValue = string | number | boolean;

/**
 * Setting schema definition for an extension
 */
export interface SettingSchema {
    [key: string]: {
        type: "string" | "int" | "boolean";
        default: SettingValue;
    };
}

/**
 * Logger interface for stignite
 */
export type Logger = (message: string) => void;

/**
 * Extension configuration for stignite
 */
export interface ExtensionConfig {
    /** Schema defining all settings and their types */
    settingSchema: SettingSchema;
    /** Optional logger function, defaults to console.log */
    logger?: Logger;
}

/**
 * Utility type to infer the TypeScript type from a SettingSchema
 */
export type InferSettingValue<
    T extends SettingSchema,
    K extends keyof T,
> = T[K]["type"] extends "string"
    ? string
    : T[K]["type"] extends "int"
      ? number
      : T[K]["type"] extends "boolean"
        ? boolean
        : never;

/**
 * Typed settings interface for an extension
 */
export type TypedSettings<T extends SettingSchema> = {
    readonly [K in keyof T]: InferSettingValue<T, K>;
};
