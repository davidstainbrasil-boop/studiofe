#!/bin/bash

# setup-vercel-env.sh
# Helper script to add production environment variables to Vercel

echo "🚀 Starting Vercel Production Environment Setup..."
echo "---------------------------------------------------"

# Check if npx is available
if ! command -v npx &> /dev/null; then
    echo "❌ Error: npx is not installed. Please install Node.js."
    exit 1
fi

echo "📋 Required Variables:"
echo "1. NEXT_PUBLIC_SUPABASE_URL"
echo "2. NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "3. SUPABASE_SERVICE_ROLE_KEY"
echo "4. DATABASE_URL"
echo "5. REDIS_URL"
echo "6. NEXTAUTH_SECRET"
echo "7. NEXTAUTH_URL"
echo ""
echo "ℹ️  You will be prompted to enter the value for each variable."
echo "ℹ️  Variables will be added to the 'production' environment."
echo ""

read -p "Press Enter to start..."

# Function to add env var
add_env() {
    local key=$1
    local sensitive=$2
    
    echo ""
    echo "🔹 Configuring: $key"
    read -p "Enter value for $key: " value
    
    if [ -z "$value" ]; then
        echo "⚠️  Skipping $key (empty value)"
        return
    fi
    
    echo "⏳ Adding to Vercel..."
    # We pipe the value to stdin to avoid exposing it in process list/history if possible, 
    # though 'vercel env add' usually prompts. 
    # We will try to use the non-interactive mode if possible or just let the user run the command.
    # Actually, 'vercel env add NAME production' prompts for value.
    # We can try: echo -n "$value" | npx vercel env add "$key" production
    
    # Using 'echo -n "$value" | npx vercel env add $key production' might work for some versions,
    # but 'vercel env add' typically expects interactive input for the value or usage of stdin.
    
    # According to Vercel docs: `echo "my-value" | vercel env add MY_VAR production` works.
    
    echo -n "$value" | npx vercel env add "$key" production > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully added $key"
    else
        echo "❌ Failed to add $key. Make sure you are authenticated (npx vercel login)"
    fi
}

add_env "NEXT_PUBLIC_SUPABASE_URL"
add_env "NEXT_PUBLIC_SUPABASE_ANON_KEY"
add_env "SUPABASE_SERVICE_ROLE_KEY"
add_env "DATABASE_URL"
add_env "REDIS_URL"
add_env "NEXTAUTH_SECRET"
add_env "NEXTAUTH_URL"

echo ""
echo "🎉 Setup complete! Please verify variables in Vercel Dashboard."
