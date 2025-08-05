-- Initialisierung der IMF AI Storage Database
-- Erstellt alle notwendigen Tabellen für Tenant-Aware AI Storage

\c imf_ai_storage;

-- Enable UUID extension for primary keys
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Core IMF Tables
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

CREATE TABLE IF NOT EXISTS metrics (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMP NOT NULL,
    cpu_usage REAL,
    memory_usage REAL,
    disk_usage REAL,
    load_average REAL,
    network_connections INTEGER,
    processes INTEGER,
    metadata JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS log_entries (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMP NOT NULL,
    level TEXT NOT NULL,
    message TEXT NOT NULL,
    source TEXT NOT NULL,
    raw_line TEXT,
    metadata JSONB DEFAULT '{}'
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
    auto_remediation BOOLEAN DEFAULT true,
    log_level TEXT DEFAULT 'INFO',
    data_dir TEXT DEFAULT './data',
    log_files JSONB DEFAULT '[]',
    code_analysis_enabled BOOLEAN DEFAULT false,
    source_directories JSONB DEFAULT '[]',
    auto_fix_enabled BOOLEAN DEFAULT false,
    confidence_threshold INTEGER DEFAULT 70,
    backup_directory TEXT DEFAULT './backups',
    ai_learning_enabled BOOLEAN DEFAULT false,
    ai_model_dir TEXT DEFAULT './ai_models',
    ai_min_confidence INTEGER DEFAULT 75,
    ai_max_risk_score INTEGER DEFAULT 30,
    ai_min_success_probability INTEGER DEFAULT 80,
    ai_max_deployments_per_hour INTEGER DEFAULT 2,
    ai_require_approval BOOLEAN DEFAULT true,
    ai_learning_rate INTEGER DEFAULT 10,
    ai_retrain_frequency INTEGER DEFAULT 50,
    deployment_enabled BOOLEAN DEFAULT false,
    git_repo_path TEXT DEFAULT '.',
    use_docker BOOLEAN DEFAULT true,
    use_kubernetes BOOLEAN DEFAULT false,
    deployment_strategies JSONB DEFAULT '{"low_risk": "direct_deployment", "medium_risk": "canary_deployment", "high_risk": "blue_green_deployment"}',
    test_commands JSONB DEFAULT '["python -m pytest tests/ -v"]',
    docker_image_name TEXT DEFAULT 'mcp-server',
    k8s_deployment_name TEXT DEFAULT 'mcp-server-deployment',
    k8s_namespace TEXT DEFAULT 'production',
    restart_command TEXT DEFAULT 'sudo systemctl restart mcp-server',
    rollback_timeout INTEGER DEFAULT 300,
    business_hours_restriction BOOLEAN DEFAULT true,
    max_concurrent_deployments INTEGER DEFAULT 1,
    monitoring_period INTEGER DEFAULT 600,
    auto_rollback_triggers JSONB DEFAULT '{"error_rate_increase": 0.5, "response_time_increase": 1.0, "availability_drop": 0.05}',
    emergency_contacts JSONB DEFAULT '["devops@company.com"]',
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Code Analysis Tables
CREATE TABLE IF NOT EXISTS code_issues (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    file_path TEXT NOT NULL,
    line_number INTEGER NOT NULL,
    column_number INTEGER,
    issue_type TEXT NOT NULL,
    severity TEXT NOT NULL,
    description TEXT NOT NULL,
    suggested_fix TEXT,
    timestamp TIMESTAMP NOT NULL,
    fix_applied BOOLEAN DEFAULT false,
    fix_applied_at TIMESTAMP,
    confidence INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS code_analysis_runs (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMP NOT NULL,
    total_files_analyzed INTEGER DEFAULT 0,
    issues_found INTEGER DEFAULT 0,
    fixes_applied INTEGER DEFAULT 0,
    analysis_duration INTEGER DEFAULT 0,
    triggered_by TEXT,
    metadata JSONB DEFAULT '{}'
);

-- AI Learning Tables
CREATE TABLE IF NOT EXISTS ai_interventions (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMP NOT NULL,
    problem_type TEXT NOT NULL,
    description TEXT NOT NULL,
    confidence REAL NOT NULL,
    action_taken TEXT NOT NULL,
    outcome TEXT NOT NULL,
    success_probability REAL,
    risk_score REAL,
    metadata JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS ai_models (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    model_type TEXT NOT NULL,
    version TEXT NOT NULL,
    accuracy REAL,
    last_trained TIMESTAMP NOT NULL,
    training_data_size INTEGER,
    is_active BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}'
);

-- Deployment Tables
CREATE TABLE IF NOT EXISTS deployments (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL,
    status TEXT NOT NULL,
    description TEXT NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    initiated_by TEXT NOT NULL,
    files_changed JSONB DEFAULT '[]',
    strategy TEXT DEFAULT 'direct_deployment',
    rollback_reason TEXT,
    metadata JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS deployment_metrics (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    deployment_id VARCHAR NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    error_rate REAL,
    response_time REAL,
    availability REAL,
    request_count INTEGER,
    metadata JSONB DEFAULT '{}'
);

-- MCP Server Tables
CREATE TABLE IF NOT EXISTS mcp_servers (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    server_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    host TEXT NOT NULL,
    port INTEGER NOT NULL,
    protocol TEXT NOT NULL,
    status TEXT NOT NULL,
    pid INTEGER,
    process_name TEXT,
    command_line TEXT,
    working_directory TEXT,
    executable_path TEXT,
    source_directory TEXT,
    config_file TEXT,
    log_files TEXT[],
    version TEXT,
    capabilities TEXT[],
    health_endpoint TEXT,
    metrics_endpoint TEXT,
    container_id TEXT,
    container_name TEXT,
    image_name TEXT,
    discovery_method TEXT NOT NULL,
    discovered_at TIMESTAMP NOT NULL,
    last_seen TIMESTAMP NOT NULL,
    metadata JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS mcp_server_metrics (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    server_id TEXT NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    response_time INTEGER,
    uptime INTEGER,
    request_count INTEGER,
    error_count INTEGER,
    process_cpu_percent INTEGER,
    process_memory_mb INTEGER,
    process_threads INTEGER,
    process_open_files INTEGER,
    process_connections INTEGER,
    metadata JSONB DEFAULT '{}'
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_problems_timestamp ON problems(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_problems_resolved ON problems(resolved);
CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_log_entries_timestamp ON log_entries(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_log_entries_level ON log_entries(level);
CREATE INDEX IF NOT EXISTS idx_log_entries_source ON log_entries(source);
CREATE INDEX IF NOT EXISTS idx_plugins_name ON plugins(name);
CREATE INDEX IF NOT EXISTS idx_plugins_status ON plugins(status);
CREATE INDEX IF NOT EXISTS idx_code_issues_timestamp ON code_issues(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_code_issues_fix_applied ON code_issues(fix_applied);
CREATE INDEX IF NOT EXISTS idx_ai_interventions_timestamp ON ai_interventions(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ai_models_last_trained ON ai_models(last_trained DESC);
CREATE INDEX IF NOT EXISTS idx_deployments_start_time ON deployments(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_deployment_metrics_deployment_id ON deployment_metrics(deployment_id);
CREATE INDEX IF NOT EXISTS idx_mcp_servers_server_id ON mcp_servers(server_id);
CREATE INDEX IF NOT EXISTS idx_mcp_server_metrics_server_id ON mcp_server_metrics(server_id);
CREATE INDEX IF NOT EXISTS idx_mcp_server_metrics_timestamp ON mcp_server_metrics(timestamp DESC);

-- AI Progress Tenant Table (Haupttabelle für AI Models)
CREATE TABLE IF NOT EXISTS ai_progress_tenant (
    id SERIAL PRIMARY KEY,
    model_name VARCHAR(255) NOT NULL,
    isolation_key VARCHAR(255) NOT NULL,
    tenant_context JSONB NOT NULL,
    access_permissions TEXT[],
    created_by VARCHAR(255),
    last_accessed TIMESTAMP,
    
    -- AI Progress Daten
    training_start TIMESTAMP,
    training_end TIMESTAMP,
    accuracy FLOAT,
    mse FLOAT NOT NULL,
    training_samples INTEGER,
    validation_samples INTEGER,
    feature_count INTEGER,
    training_time_seconds INTEGER,
    cross_validation_score FLOAT,
    model_size_mb FLOAT,
    learning_curve_data FLOAT[],
    specialty VARCHAR(255),
    metadata JSONB,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Eindeutigkeit pro Tenant sicherstellen
    UNIQUE(isolation_key, model_name)
);

-- Cross-Tenant Sharing Audit Log
CREATE TABLE IF NOT EXISTS sharing_audit_log (
    id VARCHAR(255) PRIMARY KEY,
    timestamp TIMESTAMP NOT NULL,
    action VARCHAR(50) NOT NULL,
    source_isolation_key VARCHAR(255) NOT NULL,
    target_isolation_key VARCHAR(255) NOT NULL,
    model_name VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    success BOOLEAN NOT NULL,
    reason TEXT,
    sharing_metadata JSONB,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- MCP Server Registry (für Multi-Server Environments)
CREATE TABLE IF NOT EXISTS mcp_server_registry (
    id SERIAL PRIMARY KEY,
    server_id VARCHAR(255) UNIQUE NOT NULL,
    server_name VARCHAR(255) NOT NULL,
    server_url VARCHAR(500),
    organization_id VARCHAR(255),
    project_id VARCHAR(255),
    environment VARCHAR(50) DEFAULT 'development',
    status VARCHAR(50) DEFAULT 'active',
    config JSONB,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes für Performance
CREATE INDEX IF NOT EXISTS idx_ai_progress_isolation_key ON ai_progress_tenant(isolation_key);
CREATE INDEX IF NOT EXISTS idx_ai_progress_server_id ON ai_progress_tenant((tenant_context->>'serverId'));
CREATE INDEX IF NOT EXISTS idx_ai_progress_project_id ON ai_progress_tenant((tenant_context->>'projectId'));
CREATE INDEX IF NOT EXISTS idx_ai_progress_organization ON ai_progress_tenant((tenant_context->>'organizationId'));
CREATE INDEX IF NOT EXISTS idx_ai_progress_environment ON ai_progress_tenant((tenant_context->>'environment'));
CREATE INDEX IF NOT EXISTS idx_ai_progress_created_at ON ai_progress_tenant(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_progress_mse ON ai_progress_tenant(mse);
CREATE INDEX IF NOT EXISTS idx_ai_progress_specialty ON ai_progress_tenant(specialty);

CREATE INDEX IF NOT EXISTS idx_sharing_audit_timestamp ON sharing_audit_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_sharing_audit_source_key ON sharing_audit_log(source_isolation_key);
CREATE INDEX IF NOT EXISTS idx_sharing_audit_target_key ON sharing_audit_log(target_isolation_key);
CREATE INDEX IF NOT EXISTS idx_sharing_audit_model ON sharing_audit_log(model_name);
CREATE INDEX IF NOT EXISTS idx_sharing_audit_action ON sharing_audit_log(action);

CREATE INDEX IF NOT EXISTS idx_mcp_server_org ON mcp_server_registry(organization_id);
CREATE INDEX IF NOT EXISTS idx_mcp_server_project ON mcp_server_registry(project_id);
CREATE INDEX IF NOT EXISTS idx_mcp_server_env ON mcp_server_registry(environment);

-- Row Level Security (RLS) für zusätzliche Sicherheit
ALTER TABLE ai_progress_tenant ENABLE ROW LEVEL SECURITY;

-- Policy für Tenant Isolation
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'tenant_isolation_policy' 
        AND tablename = 'ai_progress_tenant'
    ) THEN
        CREATE POLICY tenant_isolation_policy ON ai_progress_tenant
            FOR ALL TO PUBLIC
            USING (
                isolation_key = current_setting('app.current_tenant_key', true) OR
                current_setting('app.current_tenant_key', true) = '' OR
                current_setting('app.bypass_rls', true) = 'true'
            );
    END IF;
END $$;

-- Test Data für Development
INSERT INTO mcp_server_registry (server_id, server_name, organization_id, project_id, environment)
VALUES 
    ('imf-main-server', 'IMF Main Server', 'imf-org', 'imf-monitoring', 'development'),
    ('test-mcp-server', 'Test MCP Server', 'imf-org', 'imf-testing', 'development'),
    ('mcp-server-dashboard', 'Dashboard Server', 'imf-org', 'imf-monitoring', 'development'),
    ('mcp-server-analytics', 'Analytics Server', 'imf-org', 'imf-monitoring', 'development')
ON CONFLICT (server_id) DO NOTHING;

-- Grant Permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO imf_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO imf_user;

-- Success Message
\echo 'IMF AI Storage Database initialized successfully!'
\echo 'Core Tables: users, problems, metrics, log_entries, plugins, framework_config'
\echo 'Analysis Tables: code_issues, code_analysis_runs, ai_interventions, ai_models'
\echo 'Deployment Tables: deployments, deployment_metrics'
\echo 'MCP Tables: mcp_servers, mcp_server_metrics'
\echo 'AI Storage Tables: ai_progress_tenant, sharing_audit_log, mcp_server_registry'
\echo 'Indexes and RLS policies applied'
\echo 'Test data inserted for development'