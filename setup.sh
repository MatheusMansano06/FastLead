#!/bin/bash

# FastLead Backend Setup Script
# This script automates the setup process for local development

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║        FastLead Backend - Local Development Setup          ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check Node.js
echo "🔍 Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 20+ from https://nodejs.org"
    exit 1
fi
NODE_VERSION=$(node -v)
echo "✅ Node.js $NODE_VERSION found"
echo ""

# Install dependencies
echo "📦 Installing npm dependencies..."
if [ ! -d "node_modules" ]; then
    npm install
    echo "✅ Dependencies installed"
else
    echo "✅ Dependencies already installed"
fi
echo ""

# Generate Prisma Client
echo "🔄 Generating Prisma Client..."
npm run prisma:generate
echo "✅ Prisma Client generated"
echo ""

# Check database setup
echo "🗄️  Database Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Choose your database setup option:"
echo ""
echo "1) Docker (Recommended) - Docker must be running"
echo "2) PostgreSQL Homebrew (macOS)"
echo "3) PostgreSQL Installer"
echo "4) Cloud Database (Supabase/AWS RDS) - Already configured"
echo "5) Skip (Bring your own database)"
echo ""
read -p "Enter option (1-5) [1]: " DB_OPTION
DB_OPTION=${DB_OPTION:-1}

case $DB_OPTION in
    1)
        echo ""
        echo "🐳 Starting PostgreSQL with Docker..."
        if command -v docker &> /dev/null; then
            docker-compose up -d
            echo "⏳ Waiting for database to be ready..."
            sleep 5
            echo "✅ Docker database started"
        else
            echo "❌ Docker not found. Please install Docker Desktop"
            exit 1
        fi
        ;;
    2)
        echo ""
        echo "🍺 Setting up PostgreSQL with Homebrew..."
        if command -v brew &> /dev/null; then
            brew install postgresql@15 || true
            brew services start postgresql@15 || brew services restart postgresql@15
            echo "⏳ Setting up user and database..."
            createuser fastlead_user -P -s 2>/dev/null || true
            createdb -U fastlead_user fastlead_db 2>/dev/null || true
            echo "✅ PostgreSQL setup complete"
        else
            echo "❌ Homebrew not found. Please install Homebrew"
            exit 1
        fi
        ;;
    3)
        echo ""
        echo "📥 PostgreSQL Installer"
        echo "Please download and install from: https://www.postgresql.org/download/macosx/"
        echo "After installation, run:"
        echo "  createuser fastlead_user -P"
        echo "  createdb -U fastlead_user fastlead_db"
        echo ""
        read -p "Press Enter when database is ready..."
        ;;
    4)
        echo ""
        echo "☁️  Cloud Database"
        echo "Update DATABASE_URL in .env with your cloud database connection string"
        echo ""
        read -p "Press Enter when DATABASE_URL is configured..."
        ;;
    5)
        echo ""
        echo "ℹ️  Skipping database setup"
        echo "Please ensure:"
        echo "  1. PostgreSQL is running"
        echo "  2. DATABASE_URL is correct in .env"
        ;;
esac

echo ""

# Test database connection
echo "🔗 Testing database connection..."
if npm run db:validate 2>/dev/null; then
    echo "✅ Database connection successful"
else
    echo "⚠️  Database connection failed"
    echo "Please check DATABASE_URL in .env file"
    echo ""
    echo "Connection string format:"
    echo "  postgresql://user:password@localhost:5432/database"
    echo ""
    read -p "Press Enter to continue anyway (or Ctrl+C to exit)..."
fi

echo ""

# Run migrations
echo "📊 Running database migrations..."
npm run db:push
echo "✅ Migrations complete"
echo ""

# Seed database
echo "🌱 Seeding database with test data..."
npm run db:seed
echo "✅ Test data loaded"
echo ""

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build
echo "✅ Build complete"
echo ""

# Success
echo "╔════════════════════════════════════════════════════════════╗"
echo "║          ✅ Setup Complete! Ready to Start                 ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "📝 Next Steps:"
echo ""
echo "1. Start development server:"
echo "   npm run dev"
echo ""
echo "2. Test the API:"
echo "   curl http://localhost:3000/health"
echo ""
echo "3. Import Postman collection:"
echo "   POSTMAN_COLLECTION.json"
echo ""
echo "4. Test credentials:"
echo "   Admin:       admin@fastlead.com.br / admin123"
echo "   Driver:      joao.silva@motorista.com / motorista123"
echo "   Advertiser:  vendas@patriani.com.br / anunciante123"
echo ""
echo "📖 Documentation:"
echo "   - DATABASE_SETUP.md    - Database setup details"
echo "   - API_ROUTES.md        - Endpoint documentation"
echo "   - INTEGRATION_STATUS.md - Integration details"
echo "   - README.md            - Project overview"
echo ""
echo "🚀 Happy coding!"
echo ""
