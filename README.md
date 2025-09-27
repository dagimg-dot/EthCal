<div align="center" style="margin-bottom: 40px;">
  <h1>EthCal GNOME Extension</h1>
</div>

<p align="center" style="margin-bottom: 30px;">
<img src="https://raw.githubusercontent.com/dagimg-dot/EthCal/main/src/assets/icons/ethcal.svg" alt="EthCal" width="100">
</p>

<!-- download badge -->
  <p align="center" style="margin-bottom: 30px;">
    <a href="https://github.com/dagimg-dot/EthCal/releases/latest">
      <img src="https://img.shields.io/github/v/release/dagimg-dot/EthCal?label=Download&style=for-the-badge" alt="Download">
    </a>
    <a href="https://github.com/dagimg-dot/EthCal/releases">
      <img src="https://img.shields.io/github/downloads/dagimg-dot/EthCal/total?label=Downloads&style=for-the-badge" alt="Downloads">
    </a>
  </p>

<p align="center" style="margin-bottom: 30px;">
  <img src="https://raw.githubusercontent.com/dagimg-dot/EthCal/main/public/preview.png" alt="EthCal" width="400">
</p>

✨ **EthCal GNOME Extension** ✨ - Customizable Ethiopian Calendar at your top bar

- 📅 Complete implementation of the Ethiopian calendar including holidays (public, religious, cultural) and fasting periods

- 🌐 Customizable calendar display language (Amharic/English)
  
- ⚙️ Optional Geez numerals support

- 🎨 Powerful token-based formatting system (`dday, mnam dd, year hh:mm`) for the top bar display with a help dialog and token reference including real-time formatting preview in the top bar

- 🪧 Month and Year picker for easy date selection

## Installation


### 🚀 One-Line Installation

**Download and install the latest release automatically:**
```bash
curl -fsSL https://raw.githubusercontent.com/dagimg-dot/EthCal/main/scripts/install.sh | bash
```

**Or clone and install:**
```bash
git clone https://github.com/dagimg-dot/EthCal.git && cd EthCal && ./scripts/install.sh
```

**Options:**
```bash
./scripts/install.sh --help     # Show help
./scripts/install.sh --local    # Use local build instead of downloading
./scripts/install.sh --force    # Force reinstall
```

**Installation Modes:**
- **Default**: Downloads latest release from GitHub (requires internet)
- **--local**: Uses locally built extension (run `./scripts/build.sh` first)
- **--force**: Reinstalls even if already installed

> **Note:** The script downloads the extension to `/tmp` and installs it. If you have no internet or prefer to use your local changes, use the `--local` option after running `./scripts/build.sh` first.

### Manual

1. Download the `.shell-extension.zip` from the [latest release](https://github.com/dagimg-dot/EthCal/releases/latest)
2. Install using: `gnome-extensions install --force <filename>`
3. Restart GNOME Shell or log out/in
4. Enable the extension in GNOME Extensions app
5. Restart your vicinae server if it's running

## Development

### Overview

This extension uses a modern TypeScript-based development workflow with Bun and automated build scripts. The recommended setup involves:

- **Host machine**: Edit code, run linting/formatting, and manage versions
- **VM environment**: Test the extension in a controlled GNOME environment
- **Automated scripts**: Handle building, installation, VM setup, and development workflow

### Prerequisites

- **Host**: Bun, OpenSSH client
- **VM**: Fedora 41+ with GNOME on Xorg (for unsafe reload support)

### Development Scripts

The project includes several automation scripts in the `scripts/` directory:

#### `scripts/build.sh` - Build and Package
Handles the complete build process:
- Compiles TypeScript files using esbuild
- Compiles GResource files and translations
- Creates the `.shell-extension.zip` package
- Supports installation and unsafe reload options

#### `scripts/log.sh` - Log Monitoring
Monitors GNOME Shell logs for debugging:
- Captures logs from both `gnome-shell` and `gjs` processes
- Supports filtered output showing only extension-related logs
- Automatically extracts extension name from `metadata.json`

#### `scripts/setup.sh` - VM Bootstrap
Automates VM setup for development:
- Generates `dev-{project}.sh` script for VM access
- Copies development script to VM
- Installs `sshfs` and creates mount points
- Sets up proper permissions and SSHFS mounting

#### `scripts/update-contrib.sh` - Contributor Management
Automatically updates contributors in the About page:
- Fetches contributors from git history
- Updates the credits section with GitHub links
- Maintains contributor information dynamically

#### `scripts/bump-version.js` - Version Management
Handles version bumping and releases:
- Updates `package.json` and `metadata.json` versions
- Creates git commits and tags
- Supports semantic versioning

### Development Workflow

#### 1. Host Machine Setup

**Install Dependencies:**
```bash
bun install  # Install all dependencies
```

**Code Quality Tools:**
```bash
bun format         # Format code with Biome
bun lint          # Lint with safe fixes
bun lint:fix      # Lint with unsafe fixes
bun check         # Combined lint + format check
bun check:types   # TypeScript type checking only
```

**Version Management:**
```bash
bun bump 1.5.0    # Bump version to 1.5.0
bun release 1.5.0 # Bump version, commit, and create git tag
```

**Update Contributors:**
```bash
bun update-credits  # Update contributor list from git history
```

#### 2. VM Environment Setup

**Initial VM Configuration:**
1. Choose "GNOME on Xorg" or "GNOME" at login
2. Install required tools:
   ```bash
   sudo dnf install -y fuse-sshfs gnome-extensions-app jq
   ```
3. Install Bun:
   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```

**Bootstrap VM environment from Host:**
```bash
bun setup -- user@vm-ip  # Generate dev script and setup VM
```

**Run generated script in VM:**
```bash
~/dev-ethcal.sh  # Mount host directory and start shell
```

#### 3. Development Commands

**Build and Install:**
```bash
bun build           # Build extension package only
bun build:install   # Build and install extension
bun dev            # Build, install, and unsafe-reload (Xorg only)
bun dev:nested     # Build, install, and start nested Wayland session
```

**Debugging:**
```bash
bun log            # Monitor extension logs (filtered)
bun log:all        # Monitor all GNOME Shell logs
```

### Project Structure

- **`src/`**: TypeScript source files
- **`dist/`**: Compiled JavaScript (auto-generated)
- **`build/`**: Build artifacts and packages (gitignored)
- **`scripts/`**: Development automation scripts
- **`data/`**: Static resources (icons, UI files)

### Notes

- Build artifacts are automatically placed in `build/` directory
- The `dist/` directory contains compiled JavaScript when using TypeScript
- Biome handles all linting and formatting; `dist/` is gitignored
- Unsafe reload only works on Xorg sessions, not Wayland using the [Unsafe Mode Extension](https://github.com/linushdot/unsafe-mode-menu)

## License

This software is distributed under MIT license. See the license file for details.