#!/bin/bash

# Setup script to apply database migrations to Supabase
# This script will run the migration SQL against your Supabase database

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}============================================================${NC}"
echo -e "${YELLOW}Supabase Database Migration Script${NC}"
echo -e "${YELLOW}============================================================${NC}"
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Error: .env file not found${NC}"
    echo "Please create a .env file with Supabase credentials"
    exit 1
fi

# Source the .env file
export $(cat .env | grep -v '#' | xargs)

# Check if NEXT_PUBLIC_SUPABASE_URL is set
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo -e "${RED}❌ Error: NEXT_PUBLIC_SUPABASE_URL not found in .env${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Supabase URL found${NC}"
echo "URL: $NEXT_PUBLIC_SUPABASE_URL"
echo ""

echo -e "${YELLOW}To apply the migration:${NC}"
echo ""
echo "1. Go to your Supabase Dashboard: https://app.supabase.com"
echo "2. Select your project"
echo "3. Go to SQL Editor"
echo "4. Create a new query"
echo "5. Copy the contents of docs/migration-add-columns.sql"
echo "6. Paste it into the SQL Editor"
echo "7. Run the query"
echo ""
echo -e "${GREEN}✅ Your database will be updated with the new columns${NC}"
echo ""
echo "The migration will:"
echo "  • Add 'prompt' column to store the generation prompt"
echo "  • Add 'headline' column for project headline"
echo "  • Add 'subtitle' column for project subtitle"
echo "  • Add 'tier' column for tier information"
echo "  • Add 'canvas_state' column for canvas data"
echo "  • Add 'image_urls' column (array) for storing image URLs"
echo "  • Add 'storage_paths' column (array) for storing storage paths"
echo "  • Create indexes for faster queries"
