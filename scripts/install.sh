#!/bin/bash -e

# ==============================================================================
# EthCal GNOME Extension Installation Script
# Downloads and installs the latest release from GitHub, or installs local build
# ==============================================================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Extension details
UUID="eth-cal@dagimg-dot"
EXTENSION_NAME="EthCal"
REPO="dagimg-dot/EthCal"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BUILD_DIR="$PROJECT_DIR/build"

# Download settings
DOWNLOAD_DIR="/tmp"
DOWNLOAD_ZIP="$DOWNLOAD_DIR/$UUID.shell-extension.zip"

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}" >&2
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}" >&2
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}" >&2
}

log_error() {
    echo -e "${RED}❌ $1${NC}" >&2
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check GNOME Shell version
get_gnome_version() {
    if command_exists gnome-shell; then
        gnome-shell --version | sed -E 's/[^0-9]*([0-9]+(\.[0-9]+)?).*/\1/' | head -1
    else
        echo "unknown"
    fi
}

# Function to check if extension is already installed
is_extension_installed() {
    gnome-extensions list 2>/dev/null | grep -q "$UUID"
}

# Function to check if extension is enabled
is_extension_enabled() {
    gnome-extensions list --enabled 2>/dev/null | grep -q "$UUID"
}

# Function to find local built zip file
find_local_zip() {
    local version
    version=$(sed -n 's/.*"version": "\([^"]*\)".*/\1/p' "$PROJECT_DIR/package.json" 2>/dev/null || echo "")

    if [ -n "$version" ] && [ -f "$BUILD_DIR/$UUID.shell-extension-v$version.zip" ]; then
        echo "$BUILD_DIR/$UUID.shell-extension-v$version.zip"
        return 0
    fi

    # Fallback to any matching zip in build dir
    local found_zip
    found_zip=$(find "$BUILD_DIR" -maxdepth 1 -name "$UUID*.zip" 2>/dev/null | head -1)
    if [ -n "$found_zip" ] && [ -f "$found_zip" ]; then
        echo "$found_zip"
        return 0
    fi

    return 1
}

# Function to get latest release download URL
get_latest_release_url() {
    local api_url="https://api.github.com/repos/$REPO/releases/latest"

    if ! command_exists curl; then
        log_error "curl is required but not installed"
        log_error "Install curl with: sudo apt install curl  (Ubuntu/Debian)"
        log_error "Or: sudo dnf install curl  (Fedora)"
        exit 1
    fi

    log_info "Fetching latest release information from GitHub..."

    local response
    response=$(curl -s "$api_url" 2>/dev/null)

    if [ $? -ne 0 ] || [ -z "$response" ]; then
        log_error "Failed to fetch release information from GitHub"
        log_error "Try using --local option if you have a local build:"
        log_error "  $0 --local"
        exit 1
    fi

    # Extract download URL for the shell extension zip
    local download_url
    download_url=$(echo "$response" | sed -n 's/.*"browser_download_url": "\([^"]*\.zip\)".*/\1/p' | grep -i "shell-extension" | head -1)

    if [ -z "$download_url" ]; then
        download_url=$(echo "$response" | sed -n 's/.*"browser_download_url": "\([^"]*\.zip\)".*/\1/p' | head -1)
    fi

    if [ -z "$download_url" ]; then
        log_error "Could not find shell extension zip in latest release"
        log_error "Please check the GitHub releases page or use --local to install from source"
        exit 1
    fi

    log_info "Found download URL: $download_url"
    echo "$download_url"
}

# Function to download the latest release
download_latest_release() {
    local download_url="$1"

    log_info "Downloading latest release..."
    mkdir -p "$DOWNLOAD_DIR"
    rm -f "$DOWNLOAD_ZIP"

    if ! curl -L --fail --silent --show-error -o "$DOWNLOAD_ZIP" "$download_url"; then
        log_error "Failed to download extension zip from: $download_url"
        exit 1
    fi

    if [ ! -f "$DOWNLOAD_ZIP" ] || [ ! -s "$DOWNLOAD_ZIP" ]; then
        log_error "Download failed or file is empty"
        exit 1
    fi

    log_success "Extension downloaded successfully"
}

# Main installation function
main() {
    echo "🚀 Installing $EXTENSION_NAME GNOME Extension"
    echo "==============================================="

    # Check if running in a GNOME environment
    local is_gnome=false
    if echo "${XDG_CURRENT_DESKTOP:-}" | grep -qi "gnome"; then
        is_gnome=true
    elif command_exists gnome-shell || command_exists gnome-extensions; then
        is_gnome=true
    fi

    if [ "$is_gnome" = false ]; then
        log_warning "Desktop environment (${XDG_CURRENT_DESKTOP:-unknown}) might not be GNOME."
        log_warning "This extension requires GNOME Shell."
    fi

    # Check for gnome-extensions CLI
    if ! command_exists gnome-extensions; then
        log_error "gnome-extensions command not found."
        log_error "Please install GNOME Shell extension tools:"
        log_error "  - Ubuntu/Debian: sudo apt install gnome-shell-extension-tool or gnome-shell-extensions"
        log_error "  - Fedora: sudo dnf install gnome-extensions-app"
        log_error "  - Arch Linux: sudo pacman -S gnome-shell"
        exit 1
    fi

    GNOME_VERSION=$(get_gnome_version)
    if [ "$GNOME_VERSION" != "unknown" ]; then
        log_info "Detected GNOME Shell version: $GNOME_VERSION"
    fi

    local zip_to_install=""

    # Choose between local build or download
    if [ "$USE_LOCAL" = true ]; then
        log_info "Looking for local build..."
        zip_to_install=$(find_local_zip || true)

        if [ -z "$zip_to_install" ] || [ ! -f "$zip_to_install" ]; then
            log_info "No build found in build/, running build script..."
            if [ -x "$PROJECT_DIR/scripts/build.sh" ]; then
                "$PROJECT_DIR/scripts/build.sh" --build
                zip_to_install=$(find_local_zip || true)
            fi
        fi

        if [ -z "$zip_to_install" ] || [ ! -f "$zip_to_install" ]; then
            log_error "Local build not found. Run 'bun run build' or './scripts/build.sh' first."
            exit 1
        fi

        log_info "Using local extension package: $zip_to_install"
    else
        DOWNLOAD_URL=$(get_latest_release_url)
        download_latest_release "$DOWNLOAD_URL"
        zip_to_install="$DOWNLOAD_ZIP"
    fi

    # Install the extension
    log_info "Installing extension package..."
    if ! gnome-extensions install --force "$zip_to_install"; then
        log_error "Failed to install extension"
        exit 1
    fi

    log_success "Extension files installed successfully"

    # Enable the extension
    if is_extension_installed; then
        log_info "Enabling extension $UUID..."
        gnome-extensions enable "$UUID" 2>/dev/null || true
    fi

    # Clean up downloaded file if needed
    if [ -f "$DOWNLOAD_ZIP" ] && [ "$USE_LOCAL" = false ]; then
        rm -f "$DOWNLOAD_ZIP"
    fi

    echo
    log_success "🎉 $EXTENSION_NAME ($UUID) has been successfully installed and enabled!"
    log_info "If this is a fresh install or major upgrade, you may need to reload GNOME Shell or log out and log back in."
}

# Show usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo
    echo "Install EthCal GNOME Extension from GitHub releases or local build"
    echo
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo "  -l, --local    Use local build from build/ directory"
    echo "  -f, --force    Force reinstall"
    echo
    echo "Examples:"
    echo "  $0              # Download and install latest release from GitHub"
    echo "  $0 --local      # Install local build"
}

# Parse command line arguments
FORCE_REINSTALL=false
USE_LOCAL=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            usage
            exit 0
            ;;
        -f|--force)
            FORCE_REINSTALL=true
            shift
            ;;
        -l|--local)
            USE_LOCAL=true
            shift
            ;;
        *)
            log_error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

if [ "$FORCE_REINSTALL" = true ] && is_extension_installed; then
    log_info "Force reinstall requested. Removing existing installation..."
    gnome-extensions uninstall "$UUID" 2>/dev/null || true
fi

main
