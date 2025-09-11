import type Gio from "gi://Gio";
import type GObject from "gi://GObject";

/**
 * Simple Component Base - No Framework, Just Patterns
 *
 * Copy this pattern across all your GNOME extensions for consistency
 */
export abstract class ComponentBase {
    protected settings: Gio.Settings;
    protected cleanup: (() => void)[] = [];

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
     * Destroy component and clean up all resources
     * Override this in subclasses for custom cleanup
     */
    destroy(): void {
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
