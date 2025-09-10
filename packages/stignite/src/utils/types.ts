// Core state types
export interface ReactiveState<T> {
    readonly value: T;
    subscribe(callback: (value: T) => void): () => void;
    set(value: T): void;
    update(updater: (current: T) => T): void;
}

// GNOME-specific types
export interface GNOMEComponent {
    destroy(): void;
    show?(): void;
    hide?(): void;
}

// Effect types
export interface SideEffect {
    id: string;
    execute: () => void | Promise<void>;
    cleanup?: () => void;
}

// Component lifecycle
export interface ComponentLifecycle<TProps = Record<string, unknown>> {
    onMount?(): void;
    onDestroy?(): void;
    onUpdate?(prevProps?: TProps): void;
}

// Enhanced component props types
export interface ComponentProps {
    [key: string]: unknown;
}

// Utility types for type safety
export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type NonNullable<T> = T extends null | undefined ? never : T;

// Type guards for common patterns
export const isString = (value: unknown): value is string => {
    return typeof value === "string";
};

export const isNumber = (value: unknown): value is number => {
    return typeof value === "number" && !Number.isNaN(value);
};

export const isBoolean = (value: unknown): value is boolean => {
    return typeof value === "boolean";
};

// Event handler types
export type EventHandler<T = unknown> = (event: T) => void;
export type SignalHandler = (...args: unknown[]) => void;

// Resource management types
export interface Disposable {
    dispose(): void;
}

export interface AsyncDisposable {
    dispose(): Promise<void>;
}

// Error types
export class StigniteError extends Error {
    constructor(
        message: string,
        public readonly code: string,
        public readonly context?: Record<string, unknown>,
    ) {
        super(message);
        this.name = "StigniteError";
    }
}

export class StateError extends StigniteError {
    constructor(message: string, context?: Record<string, unknown>) {
        super(message, "STATE_ERROR", context);
    }
}

export class EffectError extends StigniteError {
    constructor(message: string, context?: Record<string, unknown>) {
        super(message, "EFFECT_ERROR", context);
    }
}
