# 🗄️ FastLead Database Setup Guide

## Option 1: PostgreSQL with Docker (Recommended)

### Prerequisites
- Docker Desktop installed and running

### Setup Steps

1. **Start PostgreSQL with Docker Compose**
   ```bash
   docker-compose up -d
   ```

2. **Verify Database Connection**
   ```bash
   npm run db:push
   ```

3. **Seed Test Data**
   ```bash
   npm run db:seed
   ```

4. **Access pgAdmin (Optional)**
   - Open http://localhost:5050
   - Email: admin@fastlead.com.br
   - Password: admin123

---

## Option 2: PostgreSQL on macOS (Homebrew)

### Prerequisites
- Homebrew installed

### Setup Steps

1. **Install PostgreSQL**
   ```bash
   brew install postgresql@15
   brew services start postgresql@15
   ```

2. **Create Database and User**
   ```bash
   createuser fastlead_user -P  # Enter password: fastlead_password_dev
   createdb -U fastlead_user fastlead_db
   ```

3. **Update .env**
   ```bash
   DATABASE_URL=postgresql://fastlead_user:fastlead_password_dev@localhost:5432/fastlead_db
   ```

4. **Apply Schema**
   ```bash
   npm run db:push
   ```

5. **Seed Database**
   ```bash
   npm run db:seed
   ```

---

## Option 3: PostgreSQL Installer (PostgreSQL.org)

1. **Download and Install**
   - Go to https://www.postgresql.org/download/macosx/
   - Download PostgreSQL 15 or latest
   - Run installer and follow prompts

2. **Create Database**
   ```bash
   sudo -u postgres createdb fastlead_db
   sudo -u postgres createuser fastlead_user -P
   ```

3. **Update .env**
   ```bash
   DATABASE_URL=postgresql://fastlead_user:fastlead_password_dev@localhost:5432/fastlead_db
   ```

4. **Apply Migrations**
   ```bash
   npm run db:push
   npm run db:seed
   ```

---

## Option 4: SQLite (For Quick Testing - Development Only)

If you want to test without PostgreSQL setup:

1. **Create .env.sqlite**
   ```bash
   cp .env .env.sqlite
   ```

2. **Update DATABASE_URL in .env.sqlite**
   ```
   DATABASE_URL="file:./dev.db"
   ```

3. **Use SQLite Schema**
   ```bash
   DATABASE_URL="file:./dev.db" npx prisma db push
   DATABASE_URL="file:./dev.db" npm run db:seed
   ```

4. **Run Development Server**
   ```bash
   DATABASE_URL="file:./dev.db" npm run dev
   ```

**Note**: SQLite doesn't support all PostgreSQL features. Use only for basic testing.

---

## Verification

### Test Database Connection
```bash
npm run db:validate
```

### Open Prisma Studio
```bash
npm run db:studio
```

### View Migration Status
```bash
npm run db:migrate
```

---

## Test Credentials (After Seed)

Admin:
- Email: `admin@fastlead.com.br`
- Password: `admin123`

Motorista:
- Email: `joao.silva@motorista.com`
- Password: `motorista123`

Anunciante:
- Email: `vendas@patriani.com.br`
- Password: `anunciante123`

---

## Troubleshooting

### "Can't reach database server"
- Ensure PostgreSQL is running: `brew services list`
- Check DATABASE_URL in .env
- Verify credentials match

### "Database does not exist"
- Create database: `createdb -U fastlead_user fastlead_db`
- Run migrations: `npm run db:push`

### "User authentication failed"
- Reset user password: `ALTER USER fastlead_user WITH PASSWORD 'fastlead_password_dev';`
- Restart PostgreSQL: `brew services restart postgresql@15`

### Reset Database (Development Only)
```bash
npm run db:migrate:reset
npm run db:seed
```

---

## Next Steps

After database is running:

1. Start development server: `npm run dev`
2. Test endpoints with cURL or Postman
3. Check API_ROUTES.md for endpoint documentation
4. View logs in terminal for debugging

For more info: See DATABASE.md for schema documentation
