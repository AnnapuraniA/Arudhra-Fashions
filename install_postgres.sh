#!/bin/bash

echo "🚀 PostgreSQL Installation Script"
echo "=================================="
echo ""
echo "This script will:"
echo "1. Check if Homebrew is installed"
echo "2. Install Homebrew if needed"
echo "3. Install PostgreSQL"
echo "4. Start PostgreSQL service"
echo "5. Create the database"
echo ""
read -p "Press Enter to continue or Ctrl+C to cancel..."

# Check for Homebrew
if ! command -v brew &> /dev/null; then
    echo "📦 Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    
    # Add to PATH
    echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
    eval "$(/opt/homebrew/bin/brew shellenv)"
else
    echo "✅ Homebrew is already installed"
fi

# Install PostgreSQL
echo "🐘 Installing PostgreSQL..."
brew install postgresql@14

# Start PostgreSQL
echo "▶️  Starting PostgreSQL service..."
brew services start postgresql@14

# Wait a moment for service to start
sleep 3

# Create database
echo "📊 Creating database..."
psql postgres -c "CREATE DATABASE arudhra_boutique;" 2>/dev/null || {
    echo "⚠️  Could not create database automatically."
    echo "Please run manually:"
    echo "  psql postgres"
    echo "  CREATE DATABASE arudhra_boutique;"
    echo "  \\q"
}

echo ""
echo "✅ Installation complete!"
echo ""
echo "Next steps:"
echo "1. Update backend/.env file with PostgreSQL credentials"
echo "2. Run: cd backend && npm run dev"
