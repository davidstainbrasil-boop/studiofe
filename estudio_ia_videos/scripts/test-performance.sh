#!/bin/bash

# Performance Testing with Lighthouse
# Tests Core Web Vitals and performance metrics

set -e

echo "🚀 Running Lighthouse Performance Tests..."

# Check if lighthouse is installed
if ! command -v lighthouse &> /dev/null; then
    echo "📦 Installing Lighthouse CLI..."
    npm install -g lighthouse
fi

# Configuration
URL="${1:-http://localhost:3000}"
OUTPUT_DIR="./lighthouse-reports"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

mkdir -p "$OUTPUT_DIR"

echo "🎯 Testing URL: $URL"

# Run Lighthouse for different pages
pages=(
    "/"
    "/dashboard"
    "/create"
    "/projects"
)

for page in "${pages[@]}"; do
    test_url="${URL}${page}"
    output_file="${OUTPUT_DIR}/lighthouse-${page//\//-}-${TIMESTAMP}"
    
    echo "📊 Testing: $test_url"
    
    lighthouse "$test_url" \
        --output html \
        --output json \
        --output-path "$output_file" \
        --chrome-flags="--headless --no-sandbox" \
        --only-categories=performance,accessibility,best-practices,seo \
        --budget-path=./lighthouse-budget.json 2>/dev/null || true
    
    echo "✅ Report saved: ${output_file}.html"
done

# Generate summary
echo ""
echo "📈 Performance Test Summary:"
echo "================================"

for json_file in "$OUTPUT_DIR"/*.json; do
    if [ -f "$json_file" ]; then
        page=$(basename "$json_file" | sed 's/lighthouse-\(.*\)-[0-9]*.json/\1/')
        perf=$(jq -r '.categories.performance.score * 100' "$json_file" 2>/dev/null || echo "N/A")
        a11y=$(jq -r '.categories.accessibility.score * 100' "$json_file" 2>/dev/null || echo "N/A")
        bp=$(jq -r '.categories["best-practices"].score * 100' "$json_file" 2>/dev/null || echo "N/A")
        seo=$(jq -r '.categories.seo.score * 100' "$json_file" 2>/dev/null || echo "N/A")
        
        echo "Page: $page"
        echo "  Performance: ${perf}%"
        echo "  Accessibility: ${a11y}%"
        echo "  Best Practices: ${bp}%"
        echo "  SEO: ${seo}%"
        echo ""
    fi
done

echo "📂 All reports saved to: $OUTPUT_DIR"
echo ""
echo "🎯 Performance Budgets:"
echo "  - First Contentful Paint: < 1.8s"
echo "  - Largest Contentful Paint: < 2.5s"
echo "  - Total Blocking Time: < 200ms"
echo "  - Cumulative Layout Shift: < 0.1"
echo "  - Speed Index: < 3.4s"
echo ""
