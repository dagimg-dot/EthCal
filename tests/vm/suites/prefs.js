import { sleep, test, waitFor } from "../lib/harness.js";
import { extension, nameHasOwner } from "../lib/shell.js";

const PREFS_APP = "org.gnome.Shell.Extensions";

test("the preferences window opens and builds its pages", () => {
    extension.openPrefs();
    waitFor("preferences app", () => nameHasOwner(PREFS_APP), 20000);
    sleep(3000);
    waitFor("preferences app to keep running", () => nameHasOwner(PREFS_APP));
});
