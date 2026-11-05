import Gio from "gi://Gio";

const ICONS = ["ethcal"] as const;
type ICON = (typeof ICONS)[number];

export class Icons {
    static #icons = new Map<ICON, Gio.Icon>();

    constructor(extPath: string) {
        Icons.load(extPath);
    }

    static load(extPath: string) {
        for (const name of ICONS) {
            const iconPath = `${extPath}/assets/icons/${name}.svg`;
            const icon = Gio.icon_new_for_string(iconPath);
            Icons.#icons.set(name, icon);
        }
    }

    static get(name: ICON): Gio.Icon {
        const icon = Icons.#icons.get(name);
        if (!icon)
            throw new Error(`Icon "${name}" requested before Icons.load()`);
        return icon;
    }

    static clear() {
        Icons.#icons.clear();
    }
}
