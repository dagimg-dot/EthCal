// Core framework exports

// Component system
export { Component } from "./components/Component.js";
export { EffectManager } from "./core/EffectManager.js";
export { StateManager } from "./core/StateManager.js";

// Types and utilities
export type {
    AsyncDisposable,
    ComponentLifecycle,
    ComponentProps,
    DeepPartial,
    Disposable,
    EventHandler,
    GNOMEComponent,
    NonNullable,
    ReactiveState,
    SideEffect,
    SignalHandler,
} from "./utils/types.js";
// Type guards
// Error classes
export {
    EffectError,
    isBoolean,
    isNumber,
    isString,
    StateError,
    StigniteError,
} from "./utils/types.js";
