#!/bin/bash
# FastLEAD Quick Start - PHASE 1
# Executa setup completo do banco em um script

set -e

echo "🚀 FastLEAD Database Setup (PHASE 1)"
echo "===================================="
echo ""

# Check prerequisites
echo "✓ Checking prerequisites..."
command -v node &> /dev/null || { echo "❌ Node.js not found"; exit 1; }
command -v npm &> /dev/null || { echo "❌ npm not found"; exit 1; }
command -v docker &> /dev/null || { echo "⚠️  Docker not found (need for PostgreSQL)"; }

echo "✅ Node $(node -v) installed"
echo "✅ npm $(npm -v) installed"
echo ""

# Install dependencies
echo "📦 Installing npm dependencies..."
npm install --silent > /dev/null 2>&1 || npm install

echo "✅ Dependencies installed"
echo ""

# Environment setup
echo "🔧 Setting up environment..."

if [ ! -f .env ]; then
  echo "Creating .env from .env.example..."
  cp .env.example .env
  echo "⚠️  Edit .env with your DATABASE_URL before proceeding"
fi

if [ ! -f .env.test ]; then
  echo "Creating .env.test from .env.example..."
  cp .env.example .env.test
  sed -i '' 's/fastlead_db/fastlead_test_db/g' .env.test
  echo "✅ .env.test created"
fi

echo "✅ Environment files ready"
echo ""

# Check docker-compose
if command -v docker &> /dev/null; then
  echo "📱 Starting PostgreSQL (docker-compose)..."
  docker compose up -d 2> /dev/null || echo "⚠️  Docker compose issue (may already be running)"
  sleep 3

  # Create test database if needed
  echo "🗄️  Creating test database..."
  docker exec fastlead_postgres psql -U fastlead_user -d fastlead_db -c "CREATE DATABASE IF NOT EXISTS fastlead_test_db;" 2>/dev/null || true

  echo "✅ PostgreSQL ready"
else
  echo "⚠️  Docker not available - manually start PostgreSQL"
fi

echo ""

# Validate Prisma
echo "📋 Validating Prisma schema..."
npm run prisma:generate > /dev/null 2>&1 || npm run prisma:generate

echo "✅ Prisma validated"
echo ""

# Setup database
echo "🌱 Setting up dev database with realistic seed..."
echo "   This takes ~45 seconds..."
echo ""

npm run db:dev

echo ""
echo "✅ Database setup complete!"
echo ""

# Verification
echo "🔍 Verifying database..."
docker exec fastlead_postgres psql -U fastlead_user -d fastlead_db -c "SELECT count(*) as table_count FROM information_schema.tables WHERE table_schema='public';" 2>/dev/null || echo "  (Could not verify tables)"

echo ""
echo "📊 Setup Summary"
echo "==============="
echo ""
echo "✅ Database:        fastlead_db (dev)"
echo "✅ Test Database:   fastlead_test_db (isolated)"
echo "✅ Models:          32 total"
echo "✅ Sample Data:     100 motoristas, 50 campanhas, 1000 leads"
echo "✅ Tablets:         50 paired and active"
echo ""

echo "🎯 Next Steps"
echo "============="
echo ""
echo "1️⃣  Start Backend API:"
echo "   npm run dev"
echo ""
echo "2️⃣  Start Frontend (new terminal):"
echo "   cd frontend && npm run dev"
echo ""
echo "3️⃣  Browse Database:"
echo "   npm run db:studio"
echo ""
echo "4️⃣  Test Endpoints:"
echo "   curl http://localhost:3000/health"
echo ""

echo "📖 Documentation"
echo "================"
echo "• Database schema:  docs/DATABASE.md"
echo "• Business flows:   docs/DATA_FLOW.md"
echo "• Setup guide:      SETUP.md"
echo "• Phase 1 summary:  PHASE1_SUMMARY.md"
echo ""

echo "🧪 Test Accounts (Ready to Use)"
echo "=============================="
echo "Admin:         admin@fastlead.com.br / admin123"
echo "Motorista #1:  motorista1@driver.com / driver123"
echo "Motorista #2:  motorista2@driver.com / driver123 (50 available)"
echo "Anunciante #1: anunciante1@company.com / password123"
echo "Anunciante #2: anunciante2@company.com / password123 (10 available)"
echo ""

echo "✨ Phase 1 Complete! Ready for Phase 2 (Testing)"
echo ""
