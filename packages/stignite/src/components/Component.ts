import { EffectManager } from "../core/EffectManager.js";
import type {
    ComponentLifecycle,
    GNOMEComponent,
    ReactiveState,
} from "../utils/types.js";

/**
 * Base component class for GNOME Shell extensions
 * Provides reactive state integration and lifecycle management
 */
export abstract class Component<
    TState = Record<string, unknown>,
    TProps = Record<string, unknown>,
> implements ComponentLifecycle<TProps>, GNOMEComponent
{
    protected state: TState;
    protected props: TProps;
    protected effects: EffectManager;
    protected mounted = false;

    constructor(initialState: TState, props: TProps = {} as TProps) {
        this.state = initialState;
        this.props = props;
        this.effects = new EffectManager();
    }

    /**
     * Initialize the component and set up reactive subscriptions
     */
    protected initialize(): void {
        // Set up state subscriptions
        this.setupStateSubscriptions();

        // Call onMount lifecycle
        this.mounted = true;
        if (this.onMount) {
            try {
                this.onMount();
            } catch (error) {
                console.error("Error in onMount:", error);
            }
        }
    }

    /**
     * Set up state subscriptions - override in subclasses
     */
    protected setupStateSubscriptions(): void {
        // Override in subclasses to subscribe to state changes
    }

    /**
     * Update component props
     */
    updateProps(newProps: Partial<TProps>): void {
        const oldProps = { ...this.props };
        this.props = { ...this.props, ...newProps };

        if (this.onUpdate) {
            try {
                this.onUpdate(oldProps);
            } catch (error) {
                console.error("Error in onUpdate:", error);
            }
        }
    }

    /**
     * Update component state
     */
    updateState(newState: Partial<TState>): void {
        this.state = { ...this.state, ...newState };
        this.onStateUpdate();
    }

    /**
     * Called when state changes - override for custom logic
     */
    protected onStateUpdate(): void {
        // Override in subclasses
    }

    /**
     * Subscribe to a reactive state with automatic cleanup
     */
    protected subscribeToState<T>(
        state: ReactiveState<T>,
        callback: (value: T) => void,
        effectId?: string,
    ): () => void {
        return this.effects.onStateChange(state, callback, effectId);
    }

    /**
     * Add a side effect with automatic cleanup
     */
    protected addEffect(
        effectId: string,
        execute: () => void | Promise<void>,
        cleanup?: () => void,
    ): () => void {
        return this.effects.addEffect({
            id: effectId,
            execute,
            cleanup,
        });
    }

    /**
     * Add a timer with automatic cleanup
     */
    protected addTimer(
        effectId: string,
        callback: () => void,
        interval: number,
    ): () => void {
        return this.effects.addTimer(effectId, callback, interval);
    }

    /**
     * Connect to a GObject signal with automatic cleanup
     */
    protected connectSignal(
        object: object,
        signalName: string,
        callback: (...args: unknown[]) => void,
        effectId?: string,
    ): () => void {
        return this.effects.connectSignal(
            object,
            signalName,
            callback,
            effectId,
        );
    }

    /**
     * Destroy the component and clean up all resources
     */
    destroy(): void {
        if (this.onDestroy) {
            try {
                this.onDestroy();
            } catch (error) {
                console.error("Error in onDestroy:", error);
            }
        }

        // Clean up all effects
        this.effects.dispose();
        this.mounted = false;
    }

    // Lifecycle methods - override in subclasses
    onMount?(): void;
    onDestroy?(): void;
    onUpdate?(prevProps?: TProps): void;
}
