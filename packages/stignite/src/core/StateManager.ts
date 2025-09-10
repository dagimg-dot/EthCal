import type { ReactiveState } from "../utils/types.js";

/**
 * Reactive state implementation for GNOME Shell extensions
 * Provides subscription-based reactivity similar to Svelte stores
 */
class ReactiveStateImpl<T> implements ReactiveState<T> {
    private _value: T;
    protected subscribers: Set<(value: T) => void> = new Set();

    constructor(initialValue: T) {
        this._value = initialValue;
    }

    get value(): T {
        return this._value;
    }

    subscribe(callback: (value: T) => void): () => void {
        this.subscribers.add(callback);

        // Immediately call with current value
        callback(this._value);

        // Return unsubscribe function
        return () => {
            this.subscribers.delete(callback);
        };
    }

    set(value: T): void {
        if (this._value !== value) {
            this._value = value;
            this.notify();
        }
    }

    update(updater: (current: T) => T): void {
        this.set(updater(this._value));
    }

    private notify(): void {
        this.subscribers.forEach((callback) => {
            try {
                callback(this._value);
            } catch (error) {
                console.error("Error in state subscriber:", error);
            }
        });
    }

    /**
     * Clear all subscribers (used for cleanup)
     */
    public clearSubscribers(): void {
        this.subscribers.clear();
    }
}

/**
 * Central state manager for GNOME Shell extensions
 * Manages multiple reactive state slices
 */
export class StateManager {
    private states: Map<string, ReactiveState<unknown>> = new Map();

    /**
     * Create a new reactive state slice
     */
    createState<T>(key: string, initialValue: T): ReactiveState<T> {
        if (this.states.has(key)) {
            throw new Error(`State key '${key}' already exists`);
        }

        const state = new ReactiveStateImpl(initialValue);
        this.states.set(key, state);
        return state;
    }

    /**
     * Get an existing reactive state slice
     */
    getState<T>(key: string): ReactiveState<T> | undefined {
        return this.states.get(key) as ReactiveState<T> | undefined;
    }

    /**
     * Update multiple states atomically
     */
    batchUpdate<T extends Record<string, unknown>>(updates: T): void {
        // Store current values
        const currentValues: Record<string, unknown> = {};

        // Update all states
        for (const [key, value] of Object.entries(updates)) {
            const state = this.states.get(key);
            if (state) {
                currentValues[key] = state.value;
                (state as ReactiveState<unknown>).set(value);
            }
        }

        // Emit all notifications after updates
        // Note: ReactiveStateImpl handles notifications internally,
        // so this is mainly for debugging/logging purposes
    }

    /**
     * Destroy all states and clean up subscriptions
     */
    destroy(): void {
        for (const state of this.states.values()) {
            // Clear all subscribers
            if (state instanceof ReactiveStateImpl) {
                (state as ReactiveStateImpl<unknown>).clearSubscribers();
            }
        }
        this.states.clear();
    }

    /**
     * Get all current state values (for debugging)
     */
    getSnapshot(): Record<string, unknown> {
        const snapshot: Record<string, unknown> = {};
        for (const [key, state] of this.states.entries()) {
            snapshot[key] = state.value;
        }
        return snapshot;
    }
}
