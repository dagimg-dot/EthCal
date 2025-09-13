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
