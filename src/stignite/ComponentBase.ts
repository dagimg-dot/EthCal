import type Gio from "gi://Gio";
import { logger } from "../utils/logger.js";
import { UpdateOrchestrator } from "./ReactiveBase.js";
import type {
    ComponentDependencies,
    ComponentId,
    ComponentPart,
    EventData,
    RenderOptions,
    SettingKey,
} from "./types.js";

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

    // Dependency graph properties
    public componentId: ComponentId = "";
    public dependencies: ComponentDependencies = {};
    public updatePriority: number = 0;
    protected rendered = false;

    private eventListeners = new Map<string, ((data: EventData) => void)[]>();

    constructor(settings: Gio.Settings) {
        this.settings = settings;
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
