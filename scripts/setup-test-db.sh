#!/bin/bash

# Setup Test Database Script
# This script creates and configures the test database for the IMF project

set -e

# Configuration
DB_NAME="imf_test_db"
DB_USER="test"
DB_PASSWORD="test"
DB_HOST="localhost"
DB_PORT="5432"

echo "🚀 Setting up test database for IMF..."

# Check if PostgreSQL is running
if ! pg_isready -h "$DB_HOST" -p "$DB_PORT" > /dev/null 2>&1; then
    echo "❌ PostgreSQL is not running on $DB_HOST:$DB_PORT"
    echo "Please start PostgreSQL first:"
    echo "  brew services start postgresql"
    echo "  # or"
    echo "  docker run --name postgres-test -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:15"
    exit 1
fi

echo "✅ PostgreSQL is running"

# Create test user if it doesn't exist
echo "📝 Creating test user..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$(whoami)" -d postgres -c "
    DO \$\$
    BEGIN
        CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
        EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'User $DB_USER already exists';
    END
    \$\$;
" 2>/dev/null || echo "⚠️  Could not create user (might already exist)"

# Grant permissions to test user
echo "🔐 Granting permissions..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$(whoami)" -d postgres -c "
    ALTER USER $DB_USER CREATEDB;
    GRANT ALL PRIVILEGES ON DATABASE postgres TO $DB_USER;
" 2>/dev/null || echo "⚠️  Could not grant all permissions"

# Drop existing test database if it exists
echo "🧹 Cleaning up existing test database..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$(whoami)" -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;" 2>/dev/null || true

# Create test database
echo "🗄️  Creating test database..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;" || {
    echo "❌ Failed to create test database"
    echo "Trying with default user..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$(whoami)" -d postgres -c "CREATE DATABASE $DB_NAME;"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$(whoami)" -d postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
}

# Test connection
echo "🔍 Testing database connection..."
TEST_DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"

if psql "$TEST_DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ Test database connection successful!"
else
    echo "❌ Test database connection failed"
    exit 1
fi

# Initialize schema
echo "📋 Initializing database schema..."
cd "$(dirname "$0")/.."

if command -v npx > /dev/null 2>&1; then
    echo "🔧 Running database migrations..."
    TEST_DATABASE_URL="$TEST_DATABASE_URL" npx drizzle-kit push --config=drizzle.config.ts 2>/dev/null || {
        echo "⚠️  Could not run migrations automatically"
        echo "You may need to run: TEST_DATABASE_URL=$TEST_DATABASE_URL npx drizzle-kit push"
    }
else
    echo "⚠️  npx not found, skipping automatic schema setup"
fi

echo ""
echo "🎉 Test database setup complete!"
echo ""
echo "📋 Database Configuration:"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo "  URL: $TEST_DATABASE_URL"
echo ""
echo "💡 To use this database in tests, set:"
echo "  export TEST_DATABASE_URL=\"$TEST_DATABASE_URL\""
echo ""
echo "🧪 Run tests with:"
echo "  npm test"
echo "  # or with real database:"
echo "  TEST_DATABASE_URL=\"$TEST_DATABASE_URL\" npm test"