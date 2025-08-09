-- CI-spezifische Datenbankinitialisierung für IMF
-- Verwendet imf_test Datenbank (GitHub Actions Standard)

\c imf_test;

-- Enable UUID extension for primary keys
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Minimale Tabellen für Integration Tests
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS problems (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL,
    severity TEXT NOT NULL,
    description TEXT NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    metadata JSONB DEFAULT '{}',
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS plugins (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    version TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL,
    config JSONB DEFAULT '{}',
    last_update TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS framework_config (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    server_type TEXT DEFAULT 'generic',
    monitoring_interval INTEGER DEFAULT 30,
    learning_enabled BOOLEAN DEFAULT true,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Test Profiles (minimal for CI)
CREATE TABLE IF NOT EXISTS test_profiles (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    version TEXT DEFAULT '1.0.0',
    description TEXT DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    source_config JSONB DEFAULT '{}',
    scenarios JSONB DEFAULT '[]',
    expectations JSONB DEFAULT '{}',
    generation_rules JSONB DEFAULT '{}',
    expected_data JSONB
);

CREATE TABLE IF NOT EXISTS generated_test_data (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id VARCHAR NOT NULL,
    generated_at TIMESTAMP NOT NULL DEFAULT now(),
    success BOOLEAN NOT NULL DEFAULT TRUE,
    execution_time INTEGER NOT NULL,
    log_entries INTEGER NOT NULL DEFAULT 0,
    code_problems INTEGER NOT NULL DEFAULT 0,
    metric_points INTEGER NOT NULL DEFAULT 0,
    data_size_bytes INTEGER NOT NULL DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    errors JSONB DEFAULT '[]'::jsonb
);

-- AI Progress Tabelle für Tests
CREATE TABLE IF NOT EXISTS ai_progress_tenant (
    id SERIAL PRIMARY KEY,
    model_name VARCHAR(255) NOT NULL,
    isolation_key VARCHAR(255) NOT NULL,
    tenant_context JSONB NOT NULL,
    mse FLOAT NOT NULL DEFAULT 0.1,
    accuracy FLOAT DEFAULT 0.9,
    training_samples INTEGER DEFAULT 100,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(isolation_key, model_name)
);

-- Einfache Indexes
CREATE INDEX IF NOT EXISTS idx_problems_timestamp ON problems(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_plugins_name ON plugins(name);
CREATE INDEX IF NOT EXISTS idx_ai_progress_isolation_key ON ai_progress_tenant(isolation_key);

-- Test-Daten für CI
INSERT INTO users (username, password) VALUES ('testuser', 'password123') ON CONFLICT (username) DO NOTHING;
INSERT INTO framework_config (server_type) VALUES ('test') ON CONFLICT DO NOTHING;

-- Grant permissions für postgres user (CI standard)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;

\echo 'IMF CI Test Database initialized successfully!'