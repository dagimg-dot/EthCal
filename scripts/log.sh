#!/bin/bash

# Check if metadata.json exists
if [ ! -f metadata.json ]; then
        echo "metadata.json not found"
        exit 1
fi

# Extract the project name from metadata.json
PROJECT_NAME=$(cat metadata.json | jq -r '.name')

# Check if project name is empty
if [ -z "$PROJECT_NAME" ]; then
        echo "metadata.json does not contain name"
        exit 1
fi

echo "Listening logs for $PROJECT_NAME ..."
echo ""

capture_gnome_shell_extension_logs() {
        journalctl /usr/bin/gjs -f -o cat | awk '
    /^'"$PROJECT_NAME"'/ {
        print
    }
    /^Extension/ {
        print
    }
    /^Stack trace:/ {
        print
        while (getline > 0) {
            if ($0 ~ /^[[:space:]]*$/) break
            print
        }
        print ""
    }
	/^JS ERROR:/ {
		print
		while (getline > 0) {
			if ($0 ~ /^[[:space:]]*$/) break
			print
		}
		print ""
    }'

}

capture_gnome_shell_extension_logs
