import type Gio from "gi://Gio";
import { logger } from "../utils/logger.js";
import { ReactiveComputed, ReactiveSetting } from "./ReactiveBase.js";

export { ReactiveComputed, ReactiveSetting } from "./ReactiveBase.js";

// Event data type for component communication
export type EventData =
    | Record<string, unknown>
    | string
    | number
    | boolean
    | null
    | undefined
    | { year: number; month: number; day: number | string };

// Wrapper types for reactive settings storage
// biome-ignore lint/suspicious/noExplicitAny: allow any for wrapper type
type ReactiveSettingWrapper = ReactiveSetting<any> | ReactiveComputed<any>;

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
 * Component Base with Unified Reactive API
 *
 * Provides reactive settings management and basic event communication.
 * Minimal and focused - adds features only when actually needed.
 *
 * Key Features:
 * 1. Reactive Settings: Automatic UI updates when settings change
 * 2. Basic Event System: Simple pub/sub for component communication
 * 3. Error Handling: Consistent error boundaries
 * 4. Resource Management: Automatic cleanup of GObject signals and timers
 */
export abstract class ComponentBase {
    protected settings: Gio.Settings;
    protected cleanup: (() => void)[] = [];
    private _reactiveSettings = new Map<string, ReactiveSettingWrapper>();

    // Dependency graph properties
    public componentId: ComponentId = "";
    public dependencies: ComponentDependencies = {};
    public updatePriority: number = 0;
    protected rendered = false;

    /**
     * Get reactive setting by name with proper typing
     */
    protected getReactiveSetting<T>(
        name: string,
    ): ReactiveSetting<T> | ReactiveComputed<T> {
        const setting = this._reactiveSettings.get(name);
        if (!setting) {
            throw new Error(`Reactive setting '${name}' not found`);
        }
        return setting as unknown as ReactiveSetting<T> | ReactiveComputed<T>;
    }
    private eventListeners = new Map<string, ((data: EventData) => void)[]>();

    constructor(settings: Gio.Settings) {
        this.settings = settings;
    }

    /**
     * Unified reactive setting API - handles both single and multiple settings
     */
    protected addReactiveSetting<T>(
        name: string,
        keys: string | string[],
        defaults: T | Record<string, unknown>,
        updateFn: (value: T) => void,
    ): ReactiveSetting<T> | ReactiveComputed<T> {
        if (typeof keys === "string") {
            // Single setting - create ReactiveSetting
            const setting = new ReactiveSetting(
                this.settings,
                keys,
                defaults as T,
                updateFn,
            );
            setting.setCleanup(this.cleanup);
            this._reactiveSettings.set(name, setting);
            return setting;
        } else {
            // Multiple settings - create ReactiveComputed
            const computed = new ReactiveComputed(
                this.settings,
                keys,
                defaults as Record<string, unknown>,
                updateFn,
            );
            computed.setCleanup(this.cleanup);
            this._reactiveSettings.set(name, computed);
            return computed;
        }
    }

    /**
     * Add cleanup function - will be called when component is destroyed
     */
    protected addCleanup(cleanup: () => void): void {
        this.cleanup.push(cleanup);
    }

    /**
     * Add GLib timer with automatic cleanup
     */
    protected addTimer(callback: () => void, intervalMs: number): number {
        const GLib = imports.gi.GLib;
        const timerId = GLib.timeout_add(
            GLib.PRIORITY_DEFAULT,
            intervalMs,
            () => {
                callback();
                return true; // Continue timer
            },
        );
        this.addCleanup(() => GLib.source_remove(timerId));
        return timerId;
    }

    /**
     * Execute an operation with consistent error handling and logging
     */
    protected withErrorHandling<T>(
        operation: () => T,
        errorMessage: string,
    ): T {
        try {
            return operation();
        } catch (error) {
            logger(`${errorMessage}: ${error}`);
            throw error;
        }
    }

    /**
     * Execute an async operation with consistent error handling and logging
     */
    protected async withErrorHandlingAsync<T>(
        operation: () => Promise<T>,
        errorMessage: string,
    ): Promise<T> {
        try {
            return await operation();
        } catch (error) {
            logger(`${errorMessage}: ${error}`);
            throw error;
        }
    }

    /**
     * Emit a component event to all registered listeners
     */
    protected emit(eventName: string, data: EventData = null): void {
        this.withErrorHandling(() => {
            const listeners = this.eventListeners.get(eventName);
            if (!listeners) return;

            listeners.forEach((callback) => {
                try {
                    callback(data);
                } catch (error) {
                    logger(
                        `Error in event listener for '${eventName}': ${error}`,
                    );
                }
            });
        }, `Failed to emit component event '${eventName}'`);
    }

    /**
     * Connect to component events
     */
    public connect(
        eventName: string,
        callback: (data: EventData) => void,
    ): void {
        this.withErrorHandling(() => {
            if (!this.eventListeners.has(eventName)) {
                this.eventListeners.set(eventName, []);
            }

            const listeners = this.eventListeners.get(eventName);
            if (listeners) {
                listeners.push(callback);
                // Auto-cleanup when component is destroyed
                this.addCleanup(() => this.disconnect(eventName, callback));
            }
        }, `Failed to connect to event '${eventName}'`);
    }

    /**
     * Disconnect from component events
     */
    protected disconnect(
        eventName: string,
        callback: (data: EventData) => void,
    ): void {
        this.withErrorHandling(() => {
            const listeners = this.eventListeners.get(eventName);
            if (listeners) {
                const index = listeners.indexOf(callback);
                if (index > -1) {
                    listeners.splice(index, 1);
                }
            }
        }, `Failed to disconnect from event '${eventName}'`);
    }

    /**
     * Smart render method - override in subclasses
     */
    render(options: RenderOptions = {}): void {
        const { force = false, changes = {}, affectedParts = [] } = options;

        // Default implementation - can be overridden
        if (!this.rendered || force) {
            this.renderInitial();
            this.rendered = true;
        }

        // Handle smart partial updates if implemented
        if (Object.keys(changes).length > 0 || affectedParts.length > 0) {
            this.renderUpdates(changes, affectedParts);
        }
    }

    /**
     * Initial render - called once
     */
    protected renderInitial(): void {
        // Override in subclasses
    }

    /**
     * Smart partial updates - called on setting changes
     */
    protected renderUpdates(
        _changes: Record<SettingKey, unknown>,
        _affectedParts: ComponentPart[],
    ): void {
        // Override in subclasses for smart updates
    }

    /**
     * Register component with update orchestrator
     */
    protected registerWithOrchestrator(): void {
        if (this.dependencies && Object.keys(this.dependencies).length > 0) {
            UpdateOrchestrator.getInstance().registerComponent(this);
        }
    }

    /**
     * Get affected parts for a setting change
     */
    public getAffectedParts(settingKey: SettingKey): ComponentPart[] {
        return this.dependencies[settingKey] || [];
    }

    /**
     * Destroy component and clean up all resources
     * Override this in subclasses for custom cleanup
     */
    destroy(): void {
        // Unregister from orchestrator
        UpdateOrchestrator.getInstance().unregisterComponent(this.componentId);

        // Clean up reactive settings
        this._reactiveSettings.clear();

        // Clean up other resources
        this.cleanup.forEach((cleanup) => {
            try {
                cleanup();
            } catch (error) {
                logger(`Cleanup error: ${error}`);
            }
        });
        this.cleanup = [];
    }
}

// Update Orchestrator - Singleton for managing component updates
export class UpdateOrchestrator {
    private static instance: UpdateOrchestrator;
    private componentRegistry = new Map<ComponentId, ComponentBase>();
    private dependencyGraph = new Map<SettingKey, Set<ComponentId>>();
    private updateQueue: ComponentUpdateInfo[] = [];
    private isProcessing = false;

    static getInstance(): UpdateOrchestrator {
        if (!UpdateOrchestrator.instance) {
            UpdateOrchestrator.instance = new UpdateOrchestrator();
        }
        return UpdateOrchestrator.instance;
    }

    registerComponent(component: ComponentBase): void {
        if (!component.componentId) {
            component.componentId = `component-${Date.now()}-${Math.random()}`;
        }

        this.componentRegistry.set(component.componentId, component);

        // Register dependencies
        Object.keys(component.dependencies).forEach((settingKey) => {
            if (!this.dependencyGraph.has(settingKey)) {
                this.dependencyGraph.set(settingKey, new Set());
            }
            this.dependencyGraph.get(settingKey)?.add(component.componentId);
        });
    }

    unregisterComponent(componentId: ComponentId): void {
        this.componentRegistry.delete(componentId);

        // Remove from dependency graph
        this.dependencyGraph.forEach((componentSet) => {
            componentSet.delete(componentId);
        });
    }

    notifySettingChanged(settingKey: SettingKey, newValue: unknown): void {
        const affectedComponents = this.dependencyGraph.get(settingKey);

        if (!affectedComponents || affectedComponents.size === 0) {
            return;
        }

        // Create update info for each affected component
        affectedComponents.forEach((componentId) => {
            const component = this.componentRegistry.get(componentId);
            if (component) {
                const affectedParts = component.getAffectedParts(settingKey);
                const updateInfo: ComponentUpdateInfo = {
                    componentId,
                    affectedParts,
                    changes: { [settingKey]: newValue },
                    priority: component.updatePriority,
                };
                this.updateQueue.push(updateInfo);
            }
        });

        // Process updates
        this.processUpdateQueue();
    }

    private async processUpdateQueue(): Promise<void> {
        if (this.isProcessing || this.updateQueue.length === 0) {
            return;
        }

        this.isProcessing = true;

        // Sort by priority (higher priority first)
        this.updateQueue.sort((a, b) => b.priority - a.priority);

        const currentBatch = [...this.updateQueue];
        this.updateQueue = [];

        // Process batch
        for (const updateInfo of currentBatch) {
            const component = this.componentRegistry.get(
                updateInfo.componentId,
            );
            if (component) {
                try {
                    component.render({
                        changes: updateInfo.changes,
                        affectedParts: updateInfo.affectedParts,
                        priority: updateInfo.priority,
                    });
                } catch (error) {
                    logger(
                        `Error updating component ${updateInfo.componentId}: ${error}`,
                    );
                }
            }
        }

        this.isProcessing = false;
    }
}

// Reactive Component Decorator
export function ReactiveComponent(config: ReactiveComponentConfig) {
    // biome-ignore lint/suspicious/noExplicitAny: allow the decorator to work with any component
    return <T extends { new (...args: any[]): ComponentBase }>(target: T) =>
        class extends target {
            // biome-ignore lint/suspicious/noExplicitAny: allow the constructor to work with any arguments
            constructor(...args: any[]) {
                super(...args);

                // Set component properties from config
                this.componentId =
                    config.id || `component-${Date.now()}-${Math.random()}`;
                this.dependencies = config.dependencies;
                this.updatePriority = config.priority || 0;

                // Register with orchestrator after construction
                this.registerWithOrchestrator();
            }
        };
}
