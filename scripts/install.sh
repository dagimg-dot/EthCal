#!/bin/bash -e

# ==============================================================================
# EthCal GNOME Extension Installation Script
# Downloads and installs the latest release from GitHub
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
ZIP_FILE="$BUILD_DIR/$UUID.shell-extension.zip"

# Download settings
DOWNLOAD_DIR="/tmp"
DOWNLOAD_ZIP="$DOWNLOAD_DIR/$UUID.shell-extension.zip"

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check GNOME Shell version
get_gnome_version() {
    if command_exists gnome-shell; then
        gnome-shell --version | grep -oP '\d+\.\d+' | head -1
    else
        echo "unknown"
    fi
}

# Function to check if extension is already installed
is_extension_installed() {
    gnome-extensions list | grep -q "$UUID"
}

# Function to check if extension is enabled
is_extension_enabled() {
    gnome-extensions list --enabled | grep -q "$UUID"
}

# Function to get latest release download URL
get_latest_release_url() {
    local api_url="https://api.github.com/repos/$REPO/releases/latest"

    log_info "Fetching latest release information..."

    if ! command_exists curl; then
        log_error "curl is required but not installed"
        log_error "Install curl with: sudo apt install curl  (Ubuntu/Debian)"
        log_error "Or: sudo dnf install curl  (Fedora)"
        exit 1
    fi

    local response
    response=$(curl -s "$api_url" 2>/dev/null)

    if [ $? -ne 0 ] || [ -z "$response" ]; then
        log_error "Failed to fetch release information from GitHub"
        log_error "This could be due to:"
        log_error "  - No internet connection"
        log_error "  - GitHub API rate limiting"
        log_error "  - Network firewall blocking access"
        log_error ""
        log_error "Try using --local option if you have a local build:"
        log_error "  $0 --local"
        exit 1
    fi

    # Check if it's a valid JSON response
    if ! echo "$response" | grep -q '"tag_name"'; then
        log_error "Invalid response from GitHub API"
        log_error "Response: $response"
        exit 1
    fi

    # Extract download URL for the shell extension zip
    local download_url
    download_url=$(echo "$response" | grep -oP '"browser_download_url": "\K[^"]*\.shell-extension\.zip[^"]*' | head -1)

    if [ -z "$download_url" ]; then
        log_error "Could not find shell extension zip in latest release"
        log_error "Available assets:"
        echo "$response" | grep -oP '"name": "\K[^"]*' | grep -i "\.zip"
        exit 1
    fi

    echo "$download_url"
}

# Function to download the latest release
download_latest_release() {
    local download_url="$1"

    log_info "Downloading latest release..."
    log_info "URL: $download_url"

    # Create download directory if it doesn't exist
    mkdir -p "$DOWNLOAD_DIR"

    # Remove existing file if it exists
    rm -f "$DOWNLOAD_ZIP"

    # Download the file
    if ! curl -L -o "$DOWNLOAD_ZIP" "$download_url"; then
        log_error "Failed to download extension zip"
        exit 1
    fi

    # Verify download
    if [ ! -f "$DOWNLOAD_ZIP" ] || [ ! -s "$DOWNLOAD_ZIP" ]; then
        log_error "Download failed or file is empty"
        exit 1
    fi

    log_success "Extension downloaded successfully to $DOWNLOAD_ZIP"
    ls -lh "$DOWNLOAD_ZIP"
}

# Main installation function
main() {
    echo "🚀 Installing $EXTENSION_NAME GNOME Extension"
    echo "==============================================="

    # Check if running on GNOME
    if [ "$XDG_CURRENT_DESKTOP" != "GNOME" ]; then
        log_warning "Not running on GNOME desktop. This extension is designed for GNOME Shell."
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi

    # Check for required commands
    if ! command_exists gnome-extensions; then
        log_error "gnome-extensions command not found. Please install GNOME Shell development tools."
        log_error "On Ubuntu/Debian: sudo apt install gnome-shell-extension-tool"
        log_error "On Fedora: sudo dnf install gnome-extensions-app"
        exit 1
    fi

    # Check GNOME Shell version
    GNOME_VERSION=$(get_gnome_version)
    if [ "$GNOME_VERSION" != "unknown" ]; then
        log_info "Detected GNOME Shell version: $GNOME_VERSION"
    else
        log_warning "Could not detect GNOME Shell version"
    fi

    # Check if extension is already installed
    if is_extension_installed; then
        log_warning "Extension $UUID is already installed"
        if is_extension_enabled; then
            log_success "Extension is already enabled"
            exit 0
        else
            log_info "Enabling existing extension..."
            if gnome-extensions enable "$UUID"; then
                log_success "Extension enabled successfully"
                exit 0
            else
                log_error "Failed to enable extension"
                exit 1
            fi
        fi
    fi

    # Choose between local build or download
    if [ "$USE_LOCAL" = true ]; then
        # Use local build
        log_info "Using local build..."

        if [ ! -f "$BUILD_DIR/$UUID.shell-extension.zip" ]; then
            log_error "Local build not found at: $BUILD_DIR/$UUID.shell-extension.zip"
            log_error "Run './scripts/build.sh' first or use without --local to download from GitHub"
            exit 1
        fi

        ZIP_FILE="$BUILD_DIR/$UUID.shell-extension.zip"
        log_info "Using local extension: $ZIP_FILE"
    else
        # Download the latest release
        log_info "Downloading latest $EXTENSION_NAME release..."

        DOWNLOAD_URL=$(get_latest_release_url)
        if [ -z "$DOWNLOAD_URL" ]; then
            log_error "Could not get download URL"
            exit 1
        fi

        download_latest_release "$DOWNLOAD_URL"

        # Use the downloaded file for installation
        ZIP_FILE="$DOWNLOAD_ZIP"
    fi

    # Install the extension
    log_info "Installing extension..."
    if ! gnome-extensions install --force "$ZIP_FILE"; then
        log_error "Failed to install extension"
        exit 1
    fi

    log_success "Extension installed successfully"

    # Enable the extension
    log_info "Enabling extension..."

    # Sometimes GNOME needs a moment to recognize the newly installed extension
    sleep 2

    # Try to enable the extension
    if ! gnome-extensions enable "$UUID"; then
        log_warning "Failed to enable extension immediately. This can happen on some systems."

        # Try to list available extensions to see if it's there
        log_info "Checking available extensions..."
        if gnome-extensions list | grep -q "$UUID"; then
            log_info "Extension is installed but not enabled. Trying again..."

            # Wait a bit more and try again
            sleep 3
            if gnome-extensions enable "$UUID"; then
                log_success "Extension enabled successfully on second attempt"
            else
                log_error "Extension is installed but could not be enabled automatically"
                log_info "Please try enabling it manually through the GNOME Extensions app"
                log_info "Or run: gnome-extensions enable $UUID"
                exit 1
            fi
        else
            log_error "Extension was not found in the installed extensions list"
            log_info "Available extensions:"
            gnome-extensions list
            exit 1
        fi
    else
        log_success "Extension enabled successfully"
    fi

    # Optional: Restart GNOME Shell (only on X11)
    if [ "$XDG_SESSION_TYPE" = "x11" ]; then
        log_info "Restarting GNOME Shell to apply changes..."
        if command_exists killall; then
            killall -HUP gnome-shell
            log_success "GNOME Shell restarted"
        else
            log_warning "Could not restart GNOME Shell automatically"
            log_info "Please log out and log back in to complete the installation"
        fi
    else
        log_info "Please log out and log back in to complete the installation"
    fi

    # Final success message
    echo
    # Clean up downloaded file if it exists
    if [ -f "$DOWNLOAD_ZIP" ]; then
        rm -f "$DOWNLOAD_ZIP"
        log_info "Cleaned up temporary download file"
    fi

    log_success "🎉 $EXTENSION_NAME has been successfully installed!"
    log_info "You should now see the Ethiopian calendar indicator in your status bar"
    log_info "Right-click the indicator to access settings"
}

# Show usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo
    echo "Install EthCal GNOME Extension from GitHub releases"
    echo
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo "  -f, --force    Force reinstall even if already installed"
    echo "  -l, --local    Use local build instead of downloading from GitHub"
    echo
    echo "Examples:"
    echo "  $0              # Download and install latest release"
    echo "  $0 --local      # Use local build instead of downloading"
    echo "  $0 --force      # Force reinstall"
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

# Handle force options
if [ "$FORCE_REINSTALL" = true ] && is_extension_installed; then
    log_info "Force reinstall requested. Removing existing extension..."
    if gnome-extensions uninstall "$UUID" 2>/dev/null; then
        log_success "Existing extension removed"
    fi
fi

if [ "$FORCE_BUILD" = true ]; then
    log_info "Force build requested. Removing existing zip..."
    rm -f "$ZIP_FILE"
fi

# Run main installation
main
