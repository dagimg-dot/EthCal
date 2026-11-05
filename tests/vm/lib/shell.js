import Gio from "gi://Gio";
import GLib from "gi://GLib";
import { Fatal, notYet, waitFor } from "./harness.js";

export const UUID = GLib.getenv("VM_TEST_UUID");
export const ROOT = GLib.getenv("VM_TEST_ROOT");
export const SHELL_LOG = GLib.getenv("VM_TEST_LOG");
export const SESSION_LOG = `${GLib.getenv("VM_TEST_WORK")}/session.log`;
export const LOGS = [SHELL_LOG, SESSION_LOG];
export const METADATA = JSON.parse(
    new TextDecoder().decode(
        GLib.file_get_contents(`${ROOT}/metadata.json`)[1],
    ),
);

const call = (busName, path, iface, method, signature = null, args = []) =>
    Gio.DBus.session
        .call_sync(
            busName,
            path,
            iface,
            method,
            signature ? new GLib.Variant(signature, args) : null,
            null,
            Gio.DBusCallFlags.NONE,
            5000,
            null,
        )
        .recursiveUnpack();

const extensions = (method, signature, args) =>
    call(
        "org.gnome.Shell",
        "/org/gnome/Shell",
        "org.gnome.Shell.Extensions",
        method,
        signature,
        args,
    )[0];

export const ExtensionState = {
    ACTIVE: 1,
    INACTIVE: 2,
    ERROR: 3,
    OUT_OF_DATE: 4,
};

export const extension = {
    info: () => extensions("GetExtensionInfo", "(s)", [UUID]),
    enable: () => extensions("EnableExtension", "(s)", [UUID]),
    disable: () => extensions("DisableExtension", "(s)", [UUID]),
    openPrefs: () =>
        extensions("OpenExtensionPrefs", "(ssa{sv})", [UUID, "", {}]),
    waitForState(state, timeoutMs = 5000) {
        const seen = [];
        return waitFor(
            `extension state ${state}`,
            () => {
                const info = extension.info();
                if (seen.at(-1) !== info.state) seen.push(info.state);
                // loadExtension() reports ERROR while loading; it is final only once an error is attached
                if (
                    (info.state === ExtensionState.ERROR && info.error) ||
                    info.state === ExtensionState.OUT_OF_DATE
                )
                    throw new Fatal(
                        `extension failed to load (states: ${seen.join(" → ")}): ${info.error}`,
                    );
                return info.state === state
                    ? info
                    : notYet(`state ${info.state}`);
            },
            timeoutMs,
        );
    },
};

export const nameHasOwner = (name) =>
    call(
        "org.freedesktop.DBus",
        "/org/freedesktop/DBus",
        "org.freedesktop.DBus",
        "NameHasOwner",
        "(s)",
        [name],
    )[0];

export function extensionSettings() {
    const source = Gio.SettingsSchemaSource.new_from_directory(
        `${GLib.get_user_data_dir()}/gnome-shell/extensions/${UUID}/schemas`,
        Gio.SettingsSchemaSource.get_default(),
        false,
    );
    return new Gio.Settings({
        settings_schema: source.lookup(METADATA["settings-schema"], false),
    });
}

export const readLog = (path) =>
    new TextDecoder().decode(GLib.file_get_contents(path)[1]);

export const loggedPositions = () =>
    [
        ...readLog(SHELL_LOG).matchAll(
            /Status bar position updated to: (\w+)/g,
        ),
    ].map((match) => match[1]);
