import type Gio from "gi://Gio";

// Reactive Setting for single values
export class ReactiveSetting<T> {
    private _value: T;
    private _updateFn: (value: T) => void;
    private _settings: Gio.Settings;
    private _key: string;
    private _defaultValue: T;
    private _cleanup?: (() => void)[];

    constructor(
        settings: Gio.Settings,
        key: string,
        defaultValue: T,
        updateFn: (value: T) => void,
    ) {
        this._settings = settings;
        this._key = key;
        this._defaultValue = defaultValue;
        this._updateFn = updateFn;
        this._value = this.getValue();

        this.connect();
    }

    private getValue(): T {
        try {
            // get_value returns a GVariant, we need to unpack it based on the expected type
            const variant = this._settings.get_value(this._key);
            if (variant) {
                // Unpack based on the default value type
                if (typeof this._defaultValue === "string") {
                    return variant.unpack() as T;
                } else if (typeof this._defaultValue === "boolean") {
                    return variant.unpack() as T;
                } else if (typeof this._defaultValue === "number") {
                    return variant.unpack() as T;
                }
                return variant.unpack() as T;
            }
        } catch (_error) {
            // Silently fall back to default value
        }
        return this._defaultValue;
    }

    private connect(): void {
        const handlerId = this._settings.connect(
            `changed::${this._key}`,
            () => {
                const newValue = this.getValue();
                if (newValue !== this._value) {
                    this._value = newValue;
                    this._updateFn(newValue);
                }
            },
        );

        // Add to cleanup if available
        this._cleanup?.push(() => this._settings.disconnect(handlerId));
    }

    get value(): T {
        return this._value;
    }

    set value(newValue: T) {
        if (newValue !== this._value) {
            this._value = newValue;
            this._settings.set_value(this._key, newValue as any);
        }
    }

    setCleanup(cleanup: (() => void)[]): void {
        this._cleanup = cleanup;
    }
}

// Reactive Computed for multiple settings
export class ReactiveComputed<T> {
    private _value: T;
    private _updateFn: (value: T) => void;
    private _settings: Gio.Settings;
    private _keys: string[];
    private _defaults: Record<string, any>;
    private _cleanup?: (() => void)[];

    constructor(
        settings: Gio.Settings,
        keys: string[],
        defaults: Record<string, any>,
        updateFn: (value: T) => void,
    ) {
        this._settings = settings;
        this._keys = keys;
        this._defaults = defaults;
        this._updateFn = updateFn;
        this._value = this.computeValue();

        // Initial update
        this._updateFn(this._value);

        // Connect to all settings
        this.connect();
    }

    private computeValue(): T {
        const result: any = {};
        const defaultKeys = Object.keys(this._defaults);

        this._keys.forEach((key, index) => {
            const keyName = defaultKeys[index];
            try {
                const variant = this._settings.get_value(key);
                if (variant) {
                    result[keyName] = variant.unpack();
                } else {
                    result[keyName] = this._defaults[keyName];
                }
            } catch (error) {
                console.error(`Error getting value for key ${key}:`, error);
                result[keyName] = this._defaults[keyName];
            }
        });
        return result as T;
    }

    private connect(): void {
        this._keys.forEach((key) => {
            const handlerId = this._settings.connect(`changed::${key}`, () => {
                const newValue = this.computeValue();
                // Deep comparison for objects
                if (JSON.stringify(newValue) !== JSON.stringify(this._value)) {
                    this._value = newValue;
                    this._updateFn(newValue);
                }
            });
            this._cleanup?.push(() => this._settings.disconnect(handlerId));
        });
    }

    get value(): T {
        return this._value;
    }

    setCleanup(cleanup: (() => void)[]): void {
        this._cleanup = cleanup;
    }
}
