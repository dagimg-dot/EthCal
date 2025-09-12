import type Gio from "gi://Gio";
import type GObject from "gi://GObject";
import { logger } from "../utils/logger.js";
import { ReactiveComputed, ReactiveSetting } from "./ReactiveBase.js";

// Re-export for external use
export { ReactiveComputed, ReactiveSetting } from "./ReactiveBase.js";

/**
 * Enhanced Component Base with Unified Reactive API
 *
 * Provides both single-setting and multi-setting reactive patterns
 */
export abstract class ComponentBase {
    protected settings: Gio.Settings;
    protected cleanup: (() => void)[] = [];
    private _reactiveSettings = new Map<
        string,
        ReactiveSetting<any> | ReactiveComputed<any>
    >();
    private eventListeners = new Map<string, ((data?: any) => void)[]>();

    constructor(settings: Gio.Settings) {
        this.settings = settings;
    }

    /**
     * Unified reactive setting API - handles both single and multiple settings
     */
    protected addReactiveSetting<T>(
        name: string,
        keys: string | string[],
        defaults: T | Record<string, any>,
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
                defaults as Record<string, any>,
                updateFn,
            );
            computed.setCleanup(this.cleanup);
            this._reactiveSettings.set(name, computed);
            return computed;
        }
    }

    /**
     * Get reactive setting by name
     */
    protected getReactiveSetting<T>(
        name: string,
    ): ReactiveSetting<T> | ReactiveComputed<T> {
        const setting = this._reactiveSettings.get(name);
        if (!setting) {
            throw new Error(`Reactive setting '${name}' not found`);
        }
        return setting as ReactiveSetting<T> | ReactiveComputed<T>;
    }

    /**
     * Add cleanup function - will be called when component is destroyed
     */
    protected addCleanup(cleanup: () => void): void {
        this.cleanup.push(cleanup);
    }

    /**
     * Connect to GObject signal with automatic cleanup
     */
    protected connectSignal(
        object: GObject.Object,
        signalName: string,
        callback: (...args: unknown[]) => void,
    ): void {
        const handlerId = object.connect(signalName, callback);
        this.addCleanup(() => object.disconnect(handlerId));
    }

    /**
     * Simple settings signal connection - just pass the key and method reference
     */
    protected connectSettingSignal(key: string, callback: () => void): void {
        this.connectSignal(
            this.settings as unknown as GObject.Object,
            `changed::${key}`,
            callback,
        );
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
     * Remove timer manually
     */
    protected removeTimer(timerId: number): void {
        const GLib = imports.gi.GLib;
        GLib.source_remove(timerId);
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
    protected emit(eventName: string, data?: any): void {
        this.withErrorHandling(() => {
            const listeners = this.eventListeners.get(eventName);
            if (listeners) {
                listeners.forEach((callback) => {
                    try {
                        callback(data);
                    } catch (error) {
                        logger(
                            `Error in event listener for '${eventName}': ${error}`,
                        );
                    }
                });
            }
        }, `Failed to emit component event '${eventName}'`);
    }

    /**
     * Connect to component events with automatic cleanup
     */
    public connect(eventName: string, callback: (data?: any) => void): void {
        this.withErrorHandling(() => {
            if (!this.eventListeners.has(eventName)) {
                this.eventListeners.set(eventName, []);
            }
            const listeners = this.eventListeners.get(eventName);
            if (listeners) {
                listeners.push(callback);
            }

            // Auto-cleanup when component is destroyed
            this.addCleanup(() => this.disconnect(eventName, callback));
        }, `Failed to connect to event '${eventName}'`);
    }

    /**
     * Disconnect from component events
     */
    protected disconnect(
        eventName: string,
        callback: (data?: any) => void,
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
