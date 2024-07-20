#!/bin/bash

PROJECT_NAME=$(cat metadata.json | jq -r '.name')

if [ ! -f metadata.json ]; then
        echo "metadata.json not found"
        exit 1
fi

if [ ! -f metadata.json ]; then
        echo "metadata.json does not contain name"
        exit 1
fi

echo "Listening logs for $PROJECT_NAME ..."
echo ""

journalctl /usr/bin/gnome-shell -f -o cat | awk '
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
}'
