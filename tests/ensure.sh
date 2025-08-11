#!/bin/bash
# claude-sonnet-4-20250514

URL="http://localhost:3000/tiles/10"
NUM_REQUESTS=10
TEMP_DIR="/tmp/http_test_$$"

mkdir -p "$TEMP_DIR"

echo "Making $NUM_REQUESTS requests to $URL..."
echo "=" | tr '=' '='  | head -c 50; echo

for i in $(seq 1 $NUM_REQUESTS); do
    echo -n "Request $i... "
    
    if curl -s "$URL" > "$TEMP_DIR/response_$i.txt" 2>/dev/null; then
        echo "✓ Success"
    else
        echo "✗ Failed"
        echo "Error: Could not reach $URL"
        echo "Make sure the server is running on localhost:3000"
        rm -rf "$TEMP_DIR"
        exit 1
    fi
done

echo
echo "Comparing responses..."
echo "=" | tr '=' '='  | head -c 50; echo

REFERENCE_FILE="$TEMP_DIR/response_1.txt"
ALL_SAME=true

for i in $(seq 2 $NUM_REQUESTS); do
    CURRENT_FILE="$TEMP_DIR/response_$i.txt"
    
    if cmp -s "$REFERENCE_FILE" "$CURRENT_FILE"; then
        echo "Response $i: ✓ SAME as response 1"
    else
        echo "Response $i: ✗ DIFFERENT from response 1"
        ALL_SAME=false
        
        echo "  Differences:"
        diff "$REFERENCE_FILE" "$CURRENT_FILE" | head -5 | sed 's/^/    /'
    fi
done

echo
echo "=" | tr '=' '='  | head -c 50; echo

if $ALL_SAME; then
    echo "🎉 SUCCESS: All $NUM_REQUESTS responses are identical!"
    echo
    echo "Response content (first 200 chars):"
    echo "---"
    head -c 200 "$REFERENCE_FILE"
    echo
    echo "---"
    echo "Total response size: $(wc -c < "$REFERENCE_FILE") bytes"
else
    echo "❌ FAILURE: Responses are NOT all the same"
    echo
    echo "Response sizes:"
    for i in $(seq 1 $NUM_REQUESTS); do
        SIZE=$(wc -c < "$TEMP_DIR/response_$i.txt")
        echo "  Response $i: $SIZE bytes"
    done
fi

rm -rf "$TEMP_DIR"

echo
echo "Test completed."