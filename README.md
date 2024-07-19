# create-gnome-extension

`create-gnome-extension` is a community maintained scaffolding tool to build GNOME Shell extensions.

## Developing a GNOME Shell extension

To get started with developing GNOME Shell extensions, visit [gjs.guide](https://gjs.guide/extensions/). It has tutorials and guides written by the GNOME community.

If you need more help, you can use the following channels

-   [Discourse](https://discourse.gnome.org/tag/extensions)
-   [Matrix](https://matrix.to/#/#extensions:gnome.org)
-   [StackOverflow](https://stackoverflow.com/questions/tagged/gnome-shell-extensions+gjs)

## Usage

To use `create-gnome-extension` run the following command in a terminal.

```sh
npm create gnome-extension@latest
```

You will be asked some questions to determine which files to include in your project. Alternatively, you can also directly pass in the following arguments.

```sh
--target-dir=<string> # Or use the first positional argument
--project-name=<string> # Non-empty string
--description=<string> # Non-empty string
--version-name=<string> # Defaults to 1.0.0 on empty string
--license=<string> # Defaults to GPL-2.0-or-later on empty string
--home-page=<string> # Empty string allowed
--uuid=<string> # Non-empty string
--gettext-domain=<string> # Defaults to <uuid> on empty string
--settings-schema=<string> # Defaults to <uuid> on empty string
--shell-version=<string> # comma-separated list of numbers >= 45
--[no-]use-typescript
--[no-]use-esbuild
--[no-]use-eslint
--[no-]use-prettier
--[no-]use-types
--[no-]use-translations
--[no-]use-prefs
--[no-]use-prefs-window
--[no-]use-stylesheet
--[no-]use-resources
```

## Project Structure

The following file structure will be created when running `npm create gnome-extension`. Depending on the options passed to create-gnome-extension, some files may not be included in your project.

```
project-directory/
├── data/
├── po/
├── scripts/
├── src/
│   ├── schemas/
│   │   └── org.gnome.shell.extensions.project-name.gschema.xml
│   ├── extension.[js|ts]
│   ├── prefs.[js|ts]
│   └── stylesheet.css
├── metadata.json
└── ...
```

-   `data/` contains files that will be bundled into a [GResource](https://docs.gtk.org/gio/struct.Resource.html) file when building your extension.
-   `po/` contains files for the [translation of your project](https://gjs.guide/extensions/development/translations.html). The template file (`*.pot`) lists all translatable strings. Translators will use this template to create translation files (`*.po`).
-   `scripts/` consists of scripts to build and install your extension. The scripts have `--help` flags. They can also be called via the npm scripts in `package.json`.
-   `src/` is where the actual source code of your extension will reside. `extension.js` is the main entry point, `prefs.js` is the entry point for your preference window.
-   `metadata.json` provides information about your extension for GNOME Shell's extension system.

Other files may be included but they aren't directly related to extension development. For instance, configuration files for tools like Prettier or ESLint.

## License

This software is distributed under the terms of the GNU General Public License, version 2 or later. See the license file for details.
