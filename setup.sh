#!/bin/bash

# --- S M Glamz - Auto Setup Script ---
echo "🚀 Starting Glamz Web Application setup..."

# 1. Dependency Checks
command -v node >/dev/null 2>&1 || { echo >&2 "❌ Node.js is required but not installed. Aborting."; exit 1; }
command -v npm >/dev/null 2>&1 || { echo >&2 "❌ NPM is required but not installed. Aborting."; exit 1; }
command -v psql >/dev/null 2>&1 || { echo >&2 "⚠️ PostgreSQL client (psql) not found. Database setup might fail."; }

# 2. Project Installation
echo "📦 Installing project dependencies..."
npm install --legacy-peer-deps
cd backend && npm install && npm run build && cd ..

# 3. Environment Setup
if [ ! -f .env ]; then
  echo "📝 Creating frontend .env..."
  echo "VITE_API_BASE_URL=http://localhost:4000" > .env
fi

if [ ! -f backend/.env ]; then
  echo "📝 Creating backend .env..."
  cp backend/.env.example backend/.env
  echo "⚠️  Please update backend/.env with your actual DB credentials."
fi

# 4. Database Setup
echo "🗄️  Attempting to initialize database..."
DB_NAME=$(grep DB_NAME backend/.env | cut -d '=' -f2)
DB_USER=$(grep DB_USER backend/.env | cut -d '=' -f2)

sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME" || {
  echo "✨ Creating database $DB_NAME..."
  sudo -u postgres createdb "$DB_NAME"
  sudo -u postgres psql -d "$DB_NAME" -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
}

echo "🏗️  Running database migrations..."
cp backend/src/db/migrations.sql /tmp/glamz_migrations.sql
chmod 644 /tmp/glamz_migrations.sql
sudo -u postgres psql -d "$DB_NAME" -f /tmp/glamz_migrations.sql
rm /tmp/glamz_migrations.sql

# 5. Build Web Application
echo "🛠️  Building web application bundle..."
npm run build:webapp

echo ""
echo "✅ Setup complete! The application is now bundled."
echo "👉 To start the web application, run: cd backend && npm start"
echo ""
