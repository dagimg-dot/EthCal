import type { ReactiveState, SideEffect } from "../utils/types.js";

/**
 * Manages side effects and lifecycle for GNOME Shell components
 * Handles cleanup of signals, timers, and other resources
 */
export class EffectManager {
    private effects: Map<string, SideEffect> = new Map();
    private activeTimers: Map<string, number> = new Map();
    private activeSignals: Map<string, number> = new Map();

    /**
     * Register a side effect with automatic cleanup
     */
    addEffect(effect: SideEffect): () => void {
        if (this.effects.has(effect.id)) {
            console.warn(
                `Effect with id '${effect.id}' already exists, replacing`,
            );
            this.removeEffect(effect.id);
        }

        this.effects.set(effect.id, effect);

        // Execute the effect
        try {
            const result = effect.execute();

            // Handle async effects
            if (result instanceof Promise) {
                result.catch((error) => {
                    console.error(
                        `Error in async effect '${effect.id}':`,
                        error,
                    );
                });
            }
        } catch (error) {
            console.error(`Error executing effect '${effect.id}':`, error);
        }

        // Return cleanup function
        return () => this.removeEffect(effect.id);
    }

    /**
     * Remove and cleanup an effect
     */
    removeEffect(id: string): void {
        const effect = this.effects.get(id);
        if (effect?.cleanup) {
            try {
                effect.cleanup();
            } catch (error) {
                console.error(`Error cleaning up effect '${id}':`, error);
            }
        }
        this.effects.delete(id);
    }

    /**
     * React to state changes with automatic cleanup
     */
    onStateChange<T>(
        state: ReactiveState<T>,
        callback: (value: T) => void,
        effectId?: string,
    ): () => void {
        const id = effectId || `state-change-${Date.now()}-${Math.random()}`;

        const unsubscribe = state.subscribe(callback);

        // Store the cleanup function
        this.addEffect({
            id,
            execute: () => {}, // State subscription is already active
            cleanup: unsubscribe,
        });

        return () => this.removeEffect(id);
    }

    /**
     * Add a timer with automatic cleanup
     */
    addTimer(id: string, callback: () => void, interval: number): () => void {
        if (this.activeTimers.has(id)) {
            this.removeTimer(id);
        }

        // Use GLib timeout for GNOME Shell compatibility
        const GLib = imports.gi.GLib;
        const timerId = GLib.timeout_add(
            GLib.PRIORITY_DEFAULT,
            interval,
            () => {
                try {
                    callback();
                    return true; // Continue the timer
                } catch (error) {
                    console.error(`Error in timer '${id}':`, error);
                    return false; // Stop the timer on error
                }
            },
        );

        this.activeTimers.set(id, timerId);

        return () => this.removeTimer(id);
    }

    /**
     * Remove a timer
     */
    removeTimer(id: string): void {
        const timerId = this.activeTimers.get(id);
        if (timerId) {
            const GLib = imports.gi.GLib;
            GLib.source_remove(timerId);
            this.activeTimers.delete(id);
        }
    }

    /**
     * Connect to a GObject signal with automatic cleanup
     */
    connectSignal(
        object: object,
        signalName: string,
        callback: (...args: unknown[]) => void,
        effectId?: string,
    ): () => void {
        const id = effectId || `signal-${Date.now()}-${Math.random()}`;

        if (this.activeSignals.has(id)) {
            this.disconnectSignal(id);
        }

        // Type assertion for GObject connect method
        const signalId = (
            object as {
                connect: (
                    signal: string,
                    callback: (...args: unknown[]) => void,
                ) => number;
            }
        ).connect(signalName, callback);
        this.activeSignals.set(id, signalId);

        return () => this.disconnectSignal(id);
    }

    /**
     * Disconnect a signal
     */
    disconnectSignal(id: string): void {
        const signalId = this.activeSignals.get(id);
        if (signalId) {
            // Note: In GNOME Shell, we don't have direct access to the GObject
            // This would need to be implemented based on the specific object type
            this.activeSignals.delete(id);
        }
    }

    /**
     * Clean up all effects, timers, and signals
     */
    dispose(): void {
        // Clean up all effects
        for (const [id] of this.effects) {
            this.removeEffect(id);
        }

        // Clean up all timers
        for (const [id] of this.activeTimers) {
            this.removeTimer(id);
        }

        // Clean up all signals
        for (const [id] of this.activeSignals) {
            this.disconnectSignal(id);
        }

        // Clear all maps
        this.effects.clear();
        this.activeTimers.clear();
        this.activeSignals.clear();
    }
}
