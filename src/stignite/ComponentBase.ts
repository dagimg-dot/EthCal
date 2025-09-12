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
     * Destroy component and clean up all resources
     * Override this in subclasses for custom cleanup
     */
    destroy(): void {
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
