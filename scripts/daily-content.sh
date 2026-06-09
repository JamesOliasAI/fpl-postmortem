#!/bin/bash
# FPL Daily Content Generation Script
# Runs via cron every day at 9am UK time.
# Generates fresh content from live FPL data and saves it locally.

SITE_URL="${FPL_SITE_URL:-https://fpl-postmortem.vercel.app}"
OUTPUT_DIR="$HOME/fpl-postmortem/logs"
DATE=$(date +%Y-%m-%d)
OUTPUT_FILE="$OUTPUT_DIR/content-$DATE.md"

mkdir -p "$OUTPUT_DIR"

echo "🎯 FPL Content Batch — $DATE" > "$OUTPUT_FILE"
echo "Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Fetch social content
CONTENT=$(curl -s "$SITE_URL/api/content?type=social&count=15" 2>/dev/null)

if [ -z "$CONTENT" ]; then
  echo "ERROR: Failed to fetch content from $SITE_URL" >> "$OUTPUT_FILE"
  exit 1
fi

# Parse and format using python3
echo "$CONTENT" | python3 -c "
import json, sys
data = json.load(sys.stdin)
items = data.get('items', [])
print(f'Total items: {len(items)}')
print(f'GW: {data.get(\"gameweek\", \"?\")}')
print('')
for i, item in enumerate(items, 1):
    tier = item.get('tier', '?')
    angle = item.get('angle', '?')
    tags = ', '.join(item.get('tags', []))
    print(f'--- [{i}] T{tier} | {angle} | {tags}')
    print('')
    print('TWEET:')
    print(item.get('tweet', ''))
    print('')
    print('REDDIT:')
    print(f'Title: {item.get(\"redditTitle\", \"\")}')
    print(item.get('redditBody', ''))
    print('')
    if item.get('pollQuestion'):
        print(f'POLL: {item[\"pollQuestion\"]}')
        for opt in item.get('pollOptions', []):
            print(f'  - {opt}')
    print('')
    print('---')
    print('')
" >> "$OUTPUT_FILE"

echo "✅ Content saved to $OUTPUT_FILE"

# Also generate news block preview
echo "" >> "$OUTPUT_FILE"
echo "## Website News Block Preview" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

curl -s "$SITE_URL/api/content?type=news&count=5" 2>/dev/null | python3 -c "
import json, sys
data = json.load(sys.stdin)
for item in data.get('items', []):
    print(f'- {item.get(\"detail\", \"\")}')
" >> "$OUTPUT_FILE"

echo "📧 Content ready for manual posting."
