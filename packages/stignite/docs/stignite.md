# Stignite: Reactive Framework for GNOME Shell Extensions

## Overview

**Stignite** is a lightweight, reactive framework designed specifically for GNOME Shell extensions. It brings modern reactive programming patterns to the GNOME ecosystem, making extension development more maintainable and enjoyable.

## 🎯 Core Principles

- **Reactive State**: Automatic UI updates when state changes
- **Effect Management**: Proper cleanup of resources and side effects
- **Component-Based**: Modular, reusable components
- **GNOME-Native**: Built for GJS/St/Clutter patterns

## 🏗️ Architecture

### StateManager
Centralized reactive state management with automatic UI synchronization.

```typescript
const stateManager = new StateManager();

// Create reactive state
const positionState = stateManager.createState('position', 'left');

// Subscribe to changes
positionState.subscribe((newPosition) => {
    console.log('Position changed to:', newPosition);
});

// Update state (automatically notifies subscribers)
positionState.set('center');
```

### EffectManager
Handles side effects, timers, and resource cleanup.

```typescript
const effects = new EffectManager();

// Add timer with automatic cleanup
effects.addTimer('update-time', () => {
    updateClock();
}, 1000);

// React to state changes
effects.onStateChange(positionState, (position) => {
    updateIndicatorPosition(position);
});

// Cleanup everything
effects.dispose();
```

### Component Base Class
Provides lifecycle management and reactive state integration.

```typescript
class MyComponent extends Component<MyState> {
    onMount() {
        // Component is ready
        this.setupUI();
    }

    onDestroy() {
        // Clean up resources
        this.cleanup();
    }

    protected setupStateSubscriptions() {
        // Subscribe to reactive state changes
        this.subscribeToState(someState, (value) => {
            this.updateUI(value);
        });
    }
}
```

## 📦 Integration with EthCal

### Current Usage

```typescript
// StatusBarIndicator now extends Component
export class StatusBarIndicator extends Component<StatusBarState> {
    constructor(extension: Extension) {
        const initialState = {
            position: 'left',
            format: 'full',
            text: ''
        };

        super(initialState);

        // Framework handles initialization
        this.initialize();
    }

    onMount() {
        this.createIndicator();
        this.startTimeUpdate();
    }

    protected setupStateSubscriptions() {
        // Reactive state management
        const positionState = this.stateManager.createState('position',
            this.settings.get_string("status-bar-position"));

        this.subscribeToState(positionState, (position) => {
            this.state.position = position;
            this.updateIndicatorPosition();
        });
    }
}
```

## 🔧 API Reference

### StateManager

#### Methods
- `createState<T>(key: string, initialValue: T): ReactiveState<T>`
- `getState<T>(key: string): ReactiveState<T> | undefined`
- `batchUpdate(updates: Record<string, any>): void`
- `destroy(): void`

### ReactiveState

#### Methods
- `subscribe(callback: (value: T) => void): () => void`
- `set(value: T): void`
- `update(updater: (current: T) => T): void`
- `get value(): T`

### EffectManager

#### Methods
- `addEffect(effect: SideEffect): () => void`
- `removeEffect(id: string): void`
- `addTimer(id: string, callback: () => void, interval: number): () => void`
- `removeTimer(id: string): void`
- `onStateChange<T>(state: ReactiveState<T>, callback: (value: T) => void, effectId?: string): () => void`
- `dispose(): void`

### Component<TState, TProps>

#### Lifecycle Methods
- `onMount?(): void`
- `onDestroy?(): void`
- `onUpdate?(prevProps?: TProps): void`

#### Protected Methods
- `subscribeToState<T>(state: ReactiveState<T>, callback: (value: T) => void, effectId?: string): () => void`
- `addEffect(effectId: string, execute: () => void | Promise<void>, cleanup?: () => void): () => void`
- `addTimer(effectId: string, callback: () => void, interval: number): () => void`
- `connectSignal(object: any, signalName: string, callback: (...args: any[]) => void, effectId?: string): () => void`

## 🎨 Benefits for Extension Development

### Before Stignite
```typescript
// Manual state management
let position = 'left';
let listeners: ((pos: string) => void)[] = [];

function setPosition(newPos: string) {
    position = newPos;
    listeners.forEach(cb => cb(newPos));
}

// Manual cleanup required
const timer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000, () => {
    updateTime();
    return true;
});
// Must remember to remove timer in destroy()
```

### After Stignite
```typescript
// Reactive state management
const positionState = stateManager.createState('position', 'left');

// Automatic UI updates
positionState.subscribe((newPos) => {
    updateIndicatorPosition(newPos);
});

// Automatic cleanup
this.addTimer('update-time', updateTime, 1000);
// No manual cleanup needed!
```

## 🚀 Future Enhancements

1. **Widget Factory**: Pre-built GNOME widgets (buttons, menus, labels)
2. **Settings Integration**: Automatic GSettings binding
3. **Component Registry**: Dynamic component loading
4. **DevTools**: Debug panel for state inspection
5. **Testing Utilities**: Mock helpers for GJS components

## 📚 Examples

See the EthCal extension for real-world usage examples:

- `StatusBarIndicator.ts`: Reactive status bar component
- `CalendarPopupManager.ts`: Popup lifecycle management
- Settings integration with reactive updates

## 🤝 Contributing

Stignite is designed to grow with the GNOME extension ecosystem. Contributions for additional widgets, utilities, and patterns are welcome!
