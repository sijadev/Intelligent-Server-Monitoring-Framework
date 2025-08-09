


A comprehensive full-stack monitoring solution for server systems, log analysis, and MCP (Model Context Protocol) server management. Built with React, Express.js, TypeScript, and Python plugins with an extensive plugin ecosystem.

## 🚀 Features

### Core Monitoring

- **Real-time System Metrics**: CPU, memory, disk usage, load average, network connections
- **Advanced Plugin System**: 8+ built-in plugins with collectors, detectors, and remediators
- **Problem Detection**: Automated issue identification with severity classification
- **Auto-Remediation**: Intelligent problem resolution with safety controls
- **Performance Analytics**: Trend analysis and performance optimization suggestions

### Plugin Ecosystem

- **System Metrics Collector**: Core system monitoring (CPU, Memory, Disk)
- **Network Monitor**: Network interface and traffic analysis
- **Process Monitor**: Process tracking and resource usage analysis
- **Log File Monitor**: System and application log monitoring
- **Threshold Detector**: Configurable threshold-based problem detection
- **Performance Analyzer**: Trend analysis and performance issue detection
- **Security Monitor**: Security-focused monitoring and anomaly detection
- **Auto-Remediator**: Automated problem resolution capabilities

### MCP Server Monitoring

- **Automatic Discovery**: Multiple discovery methods (process scan, port scan, Docker, config files)
- **Real-time Monitoring**: Live metrics collection and status tracking
- **Server Management**: Complete CRUD operations for MCP server configuration
- **Dashboard Analytics**: Comprehensive overview with aggregated statistics

### Technical Features

- **WebSocket Real-time Updates**: Live dashboard updates
- **PostgreSQL Database**: Robust data persistence with Drizzle ORM
- **Type Safety**: Full TypeScript coverage with shared schemas
- **Plugin Management UI**: Web-based plugin configuration and monitoring
- **Comprehensive Testing**: Frontend, backend, and Python plugin test suites

## 📋 Prerequisites

### Local Development

- **Node.js 18+** (for backend and frontend)
- **Python 3.11+** (for monitoring plugins)
- **PostgreSQL** (built-in Replit database or external)

### Docker Development (Empfohlen)

- **Docker** (latest version)
- **Docker Compose** (v2.0+)

## 🐳 Docker Quick Start

```bash
# Komplette Umgebung mit einem Befehl
npm run docker:setup

# Oder manuell:
chmod +x ./docker/setup.sh
./docker/setup.sh
```

**Verfügbare Services:**

- **MCP.Guard App**: [http://localhost:3000](http://localhost:3000)
- **Vite Dev**: [http://localhost:5173](http://localhost:5173)
- **pgAdmin**: [http://localhost:8080](http://localhost:8080)
- **Redis Commander**: [http://localhost:8081](http://localhost:8081)

Siehe [Docker Documentation](./docker/README.md) für Details.

## 🛠️ Complete Installation Guide

### 1. Clone and Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Install Python dependencies for monitoring plugins
pip install aiohttp psutil pytest pytest-asyncio pyyaml requests websockets docker

# Alternative: Use uv for faster Python dependency management
uv sync
```

### 2. Database Setup

The application uses PostgreSQL with automatic schema management:

```bash
# Generate database migrations
npx drizzle-kit generate

# Apply database migrations
npx drizzle-kit push
```

### 3. Environment Configuration

Create a `.env` file with required environment variables:

```env
# Database Configuration
# For local PostgreSQL:
DATABASE_URL=postgresql://localhost:5432/imf_database

# For Docker PostgreSQL:
# DATABASE_URL=postgresql://imf_user:imf_password@localhost:5432/imf_database

# Session Secret (generate a secure random string)
SESSION_SECRET=your-secure-random-session-secret-replace-this

# Development Mode
NODE_ENV=development

# Optional: Port configuration
PORT=3000
```

### 4. PostgreSQL Setup (Choose One)

#### Option A: Local PostgreSQL Installation

```bash
# macOS with Homebrew
brew install postgresql
brew services start postgresql

# Create database
createdb imf_database

# Test connection
psql imf_database -c "SELECT version();"
```

#### Option B: Docker PostgreSQL

```bash
# Start PostgreSQL container
docker run --name imf-postgres \
  -e POSTGRES_USER=imf_user \
  -e POSTGRES_PASSWORD=imf_password \
  -e POSTGRES_DB=imf_database \
  -p 5432:5432 \
  -d postgres:15

# Update .env with Docker credentials
```

## 🚀 Running the Application

### Quick Start

```bash
# Start the complete monitoring system
npm run dev
```

This command starts:

- **Express.js backend** on port 3000 (or configured PORT)
- **Vite development server** for the React frontend
- **WebSocket server** for real-time updates
- **Python monitoring framework** with 8+ plugins
- **PostgreSQL database** connection

### Plugin System Activation

MCP.Guard automatically starts with the following plugins:

**Collector Plugins** (Data Collection):

- ⚙️ `system_metrics_collector` - CPU, Memory, Disk monitoring
- 🌐 `network_monitor` - Network interfaces and traffic
- 📊 `process_monitor` - Process tracking and analysis
- 📝 `log_file_monitor` - System and application logs

**Detector Plugins** (Problem Detection):

- 🚨 `threshold_detector` - Configurable threshold monitoring
- 📈 `performance_analyzer` - Performance trend analysis
- 🔒 `security_monitor` - Security anomaly detection

**Remediator Plugins** (Auto-Healing):

- 🔧 `auto_remediator` - Automated problem resolution

### Manual Plugin Configuration

To customize plugin behavior, edit `python-framework/config.yaml`:

```yaml
# Plugin configuration
plugins:
  collectors:
    - system_metrics_collector
    - network_monitor
    - process_monitor
    - log_file_monitor
  detectors:
    - threshold_detector
    - performance_analyzer
    - security_monitor
  remediators:
    - auto_remediator

# Threshold configuration
thresholds:
  cpu_usage:
    warning: 80
    critical: 95
  memory_usage:
    warning: 85
    critical: 95
  disk_usage:
    warning: 80
    critical: 95
```

### Development Mode

```bash
# Start with full monitoring
npm run dev

# Check plugin status
curl http://localhost:3000/api/plugins

# View real-time metrics
curl http://localhost:3000/api/dashboard
```

### Production Mode

```bash
# Build the application
npm run build

# Start production server
npm start
```

### Plugin Framework Modes

The system supports different monitoring levels:

**Enhanced Mode** (Default):

```bash
# Uses enhanced_main.py with all 8 plugins
npm run dev
```

**Simple Mode** (Minimal resource usage):

```bash
# Edit server/services/python-monitor.ts
# Change to 'simple_main.py' for basic monitoring only
```

**Custom Mode** (Your own plugins):

```bash
# Add custom plugins to python-framework/
# Register in python-framework/enhanced_main.py
```

## 🧪 Testing

### Frontend and Backend Tests

```bash
# Run all tests
npx vitest

# Run tests in watch mode
npx vitest --watch

# Run tests with UI
npx vitest --ui

# Run with coverage
npx vitest --coverage
```

### Python Plugin Tests

```bash
# Navigate to Python framework
cd python-framework

# Run all Python tests
python -m pytest tests/ -v

# Run with coverage
python -m pytest tests/ -v --cov=mcp_monitoring_plugin

# Run specific test file
python -m pytest tests/test_mcp_discovery.py -v
```

### Integration Tests

```bash
# Run simple integration tests
node test-simple.js
```

## 📊 Application Structure

```text
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Application pages
│   │   ├── lib/            # Utilities and configurations
│   │   └── test/           # Frontend tests
├── server/                 # Express.js backend
│   ├── routes.ts           # API endpoints
│   ├── storage.ts          # Database operations
│   └── test/               # Backend tests
├── shared/                 # Shared types and schemas
│   └── schema.ts           # Database schema and types
├── python-framework/       # Python monitoring plugins
│   ├── mcp_monitoring_plugin.py
│   └── tests/              # Python tests
└── types/                  # TypeScript type definitions
```

## 📡 API Endpoints

### Core System Monitoring

```http
GET    /api/dashboard       # System overview and metrics
GET    /api/logs           # Recent log entries
POST   /api/logs           # Create new log entry
GET    /api/problems       # Active problems
POST   /api/problems       # Create new problem
GET    /api/metrics        # System metrics
POST   /api/metrics        # Create metric entry
```

### MCP Server Management

```http
GET    /api/mcp/servers                    # List all MCP servers
POST   /api/mcp/servers                    # Create new MCP server
GET    /api/mcp/servers/:serverId         # Get specific server
PUT    /api/mcp/servers/:serverId         # Update server
DELETE /api/mcp/servers/:serverId         # Delete server
GET    /api/mcp/servers/:serverId/metrics # Get server metrics
POST   /api/mcp/metrics                   # Create metrics entry
GET    /api/mcp/dashboard                 # MCP dashboard data
```

### WebSocket Events

```javascript
// Connect to WebSocket
const socket = new WebSocket('ws://localhost:PORT/ws');

// Listen for real-time updates
socket.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // Handle: problems, metrics, logs, mcp_servers, mcp_metrics
};
```

## 🎯 Usage Guide

### 1. Main Dashboard

- View system overview and key metrics
- Monitor active problems and recent logs
- Access navigation to specialized dashboards

### 2. MCP Dashboard

- **Overview Tab**: Aggregated MCP server statistics
- **Servers Tab**: Manage individual MCP servers
- **Metrics Tab**: View historical performance data
- **Discovery Tab**: Configure automatic server discovery

### 3. System Monitoring

- Real-time metrics visualization
- Problem detection and alerts
- Log analysis and filtering

## 🔧 Development

### Adding New Features

1. **Database Changes**: Update `shared/schema.ts`
2. **API Endpoints**: Add routes to `server/routes.ts`
3. **Storage Operations**: Extend `server/storage.ts`
4. **Frontend Components**: Create in `client/src/components/`
5. **Tests**: Add corresponding test files

### Code Style and Patterns

- **TypeScript**: Full type safety with shared schemas
- **React Query**: Server state management and caching
- **Shadcn/ui**: Consistent UI component library
- **Tailwind CSS**: Utility-first styling approach
- **Drizzle ORM**: Type-safe database operations

## 🔧 Plugin Development & Management

Ausgelagert nach: [docs/plugin-development.md](./docs/plugin-development.md)

Kurzübersicht (Details im verlinkten Dokument):

- Collector, Detector, Remediator Architektur
- 8 eingebaute Plugins
- API & UI Verwaltung
- Konfigurationsdatei Beispiele

➡️ Vollständige Beispiele & Code Snippets siehe ausgelagertes Dokument.

### Built-in Plugin Architecture

MCP.Guard comes with 8 built-in plugins organized by type:

**Collector Plugins** (Data Gathering):

```python
# System Metrics Collector
async def collect_system_metrics():
    return {
        'cpuUsage': psutil.cpu_percent(),
        'memoryUsage': psutil.virtual_memory().percent,
        'diskUsage': psutil.disk_usage('/').percent
    }

# Network Monitor
async def collect_network_metrics():
    return {
        'totalBytesSent': net_io.bytes_sent,
        'totalBytesReceived': net_io.bytes_recv
    }
```

**Detector Plugins** (Problem Detection):

```python
# Threshold Detector
async def detect_threshold_problems(metrics):
    problems = []
    if metrics['cpuUsage'] > 90:
        problems.append(Problem(
            type='HIGH_CPU_USAGE',
            severity='CRITICAL',
            description=f'CPU usage is {metrics["cpuUsage"]}%'
        ))
    return problems
```

**Remediator Plugins** (Auto-Healing):

```python
# Auto-Remediator
async def auto_remediate_problems(problems):
    for problem in problems:
        if problem.type == 'HIGH_MEMORY_USAGE':
            # Trigger garbage collection
            gc.collect()
```

### Creating Custom Plugins

Create your own monitoring plugin:

```python
# custom_monitor.py
class CustomMonitorPlugin:
    def __init__(self):
        self.name = "custom_monitor"
        self.version = "1.0.0"
        self.type = "collector"

    async def collect_metrics(self):
        return {
            'customMetric': self.get_custom_data(),
            'timestamp': datetime.now()
        }

    def get_custom_data(self):
        # Your custom monitoring logic
        return 42
```

Then register it in `enhanced_main.py`:

```python
# Add to plugin initialization
self.plugins.append({
    'name': 'custom_monitor',
    'version': '1.0.0',
    'type': 'collector',
    'status': 'running',
    'description': 'Custom monitoring plugin',
    'collect_func': self.collect_custom_metrics
})
```

### Plugin Management via API

```bash
# List all plugins
curl http://localhost:3000/api/plugins

# Add new plugin
curl -X POST http://localhost:3000/api/plugins -H "Content-Type: application/json" -d '{
  "name": "custom_monitor",
  "version": "1.0.0",
  "type": "collector",
  "status": "running",
  "config": {"interval": 30},
  "metadata": {"description": "Custom monitoring plugin"}
}'

# Update plugin configuration
curl -X PUT http://localhost:3000/api/plugins/plugin-id -H "Content-Type: application/json" -d '{
  "status": "stopped"
}'

# Delete plugin
curl -X DELETE http://localhost:3000/api/plugins/plugin-id
```

### Plugin Management UI

Access the web-based plugin management at `http://localhost:3000/plugins`:

- **🔍 Plugin Overview**: Visual dashboard of all plugins
- **🟢 Real-time Status**: Live updates via WebSocket
- **🎨 Type-based Coloring**: Collectors (blue), Detectors (orange), Remediators (green)
- **▶️ Control Actions**: Start/Stop/Configure plugins
- **📈 Performance Metrics**: Execution time and resource usage
- **⚙️ Configuration**: Edit thresholds and plugin settings

### Plugin Configuration File

Customize plugin behavior in `python-framework/config.yaml`:

```yaml
# Enhanced Plugin Configuration
server_type: generic
monitoring_interval: 30
learning_enabled: true
auto_remediation: true
log_level: INFO

# Plugin-specific settings
thresholds:
  cpu_usage:
    warning: 80
    critical: 95
  memory_usage:
    warning: 85
    critical: 95
  disk_usage:
    warning: 80
    critical: 95
  load_average:
    warning: 2.0
    critical: 4.0

# Network monitoring
network_monitoring:
  enabled: true
  interfaces: ["eth0", "wlan0"]
  traffic_threshold_mb: 1000

# Process monitoring
process_monitoring:
  enabled: true
  track_top_processes: 10
  zombie_detection: true

# Security monitoring
security_monitoring:
  enabled: true
  max_processes: 500
  suspicious_process_detection: true
  failed_login_monitoring: true

# Auto-remediation settings
auto_remediation:
  enabled: true
  safe_mode: true
  max_actions_per_hour: 5
  require_confirmation: false
```

## 📝 Configuration

Ausgelagert nach: [docs/configuration.md](./docs/configuration.md)

Beinhaltet:

- Grundstruktur
- Schwellenwerte
- Datenbank & Feature Flags
- Override Reihenfolge

### MCP Discovery Configuration

```json
{
  "scan_ports": [8000, 8080, 3000, 5000, 9000],
  "scan_hosts": ["localhost", "127.0.0.1"],
  "discovery_methods": ["process_scan", "port_scan", "docker_scan", "config_file_scan"]
}
```

### Plugin Configuration

```json
{
  "enabled_plugins": ["system_monitor", "log_analyzer", "mcp_monitor"],
  "collection_interval": 30,
  "problem_detection_interval": 60
}
```

## 🐛 Enhanced Troubleshooting Guide

Vollständige Fehlerszenarien ausgelagert: [docs/troubleshooting.md](./docs/troubleshooting.md)

Enthalten:

- Diagnose Strategie
- Häufige Probleme
- Tools & Log-Level

### Quick Diagnostics

```bash
# Check all components
npm run dev  # Should start without errors
curl http://localhost:3000/api/plugins  # Should return plugin list
curl http://localhost:3000/api/dashboard  # Should return metrics
```

### Common Issues & Solutions

#### 1. Plugin System Issues

##### Problem: "Error collecting system metrics (pid=XXXX)"

```bash
# Solution A: Install missing Python dependencies
pip install psutil aiohttp websockets docker

# Solution B: Test psutil directly
python -c "import psutil; print('CPU:', psutil.cpu_percent())"

# Solution C: Switch to simple monitoring
# Edit server/services/python-monitor.ts
# Change 'enhanced_main.py' to 'simple_main.py'
```

##### Problem: "Plugin page shows 404 Not Found"

```bash
# Check if plugin route is registered in client/src/App.tsx
# Should include: <Route path="/plugins" component={Plugins} />

# Restart development server
npm run dev
```

##### Problem: "No plugins showing in dashboard"

```bash
# Check Python framework is running
cd python-framework
python enhanced_main.py  # Should output JSON

# Check WebSocket connection
# Browser Dev Tools -> Network -> WS tab
# Should show active WebSocket connection
```

#### 2. Database Connection Errors

```bash
# Check PostgreSQL status
pg_isready

# Verify database exists
psql imf_database -c "\dt"  # Should show tables

# Reset database if corrupted
npx drizzle-kit drop
npx drizzle-kit migrate

# Check .env configuration
cat .env  # Verify DATABASE_URL is correct
```

#### 3. Python Framework Issues

```bash
# Test Python environment
python --version  # Should be 3.11+
which python     # Verify correct Python path

# Test individual components
python -c "import asyncio, psutil, json; print('All OK')"

# Check plugin loading
cd python-framework
python -c "from enhanced_main import EnhancedMonitoringFramework; print('Framework OK')"

# Run framework in debug mode
PYTHONPATH=. python enhanced_main.py
```

#### 4. Frontend/Backend Communication

```bash
# Check API endpoints
curl -v http://localhost:3000/api/plugins
curl -v http://localhost:3000/api/dashboard

# Test WebSocket connection
# Browser console:
# const ws = new WebSocket('ws://localhost:3000/ws');
# ws.onmessage = e => console.log(JSON.parse(e.data));

# Check CORS issues
# Should see plugins data in Network tab
```

#### 5. Performance Issues

```bash
# Check resource usage
top -p $(pgrep -f "enhanced_main.py")

# Reduce monitoring frequency
# Edit python-framework/enhanced_main.py
# Change: await asyncio.sleep(30)  # to higher value

# Switch to minimal monitoring
# Edit server/services/python-monitor.ts
# Use 'simple_main.py' instead of 'enhanced_main.py'
```

#### 6. Port Already in Use / Port Conflicts

This occurs when a previous dev server (Node, Vite, Python, or Docker container) did not shut down cleanly. Typical ports:

- 3000 (Express API)
- 5173 (Vite Dev Server)
- 3001 (Test MCP Server)
- 5432 (PostgreSQL)

Resolution:

```bash
# 1. Identify the blocking process (replace PORT as needed)
lsof -i :3000

# 2. Terminate it (force if necessary)
kill -9 $(lsof -ti:3000)

# 3. (If Docker) ensure no leftover containers bind the port
docker ps --format '{{.Ports}} {{.Names}}' | grep 3000 || true

# 4. Retry on an alternate port if you prefer
PORT=8080 npm run dev

# 5. (Optional) Free common dev ports in one sweep
for p in 3000 3001 5173; do
  pid=$(lsof -ti :$p); [ -n "$pid" ] && kill -9 $pid && echo "Freed $p";
done
```

See also Docker-specific guidance in `docker/README.md` under **Port Already in Use**.

### Plugin-Specific Troubleshooting

#### System Metrics Plugin

```bash
# Test system metrics collection
python -c "
import psutil
print('CPU:', psutil.cpu_percent())
print('Memory:', psutil.virtual_memory().percent)
print('Disk:', psutil.disk_usage('/').percent)
"
```

#### Network Monitor Plugin

```bash
# Test network monitoring
python -c "
import psutil
print('Network IO:', psutil.net_io_counters())
print('Interfaces:', list(psutil.net_if_stats().keys()))
"
```

#### Process Monitor Plugin

```bash
# Test process monitoring
python -c "
import psutil
processes = list(psutil.process_iter(['pid', 'name']))
print(f'Total processes: {len(processes)}')
"
```

### Log Locations & Debugging

```bash
# Application logs
tail -f ~/.npm/_logs/*debug*.log  # npm logs
journalctl -f -u postgresql      # PostgreSQL logs (Linux)
brew services info postgresql    # PostgreSQL status (macOS)

# Python framework logs
cd python-framework
python enhanced_main.py 2>&1 | tee debug.log

# Browser debugging
# F12 -> Console tab for JavaScript errors
# F12 -> Network tab for API call issues
# F12 -> WebSocket tab for real-time connection issues
```

### Advanced Debugging

```bash
# Enable verbose Python logging
export PYTHONPATH=.
export LOGLEVEL=DEBUG
python enhanced_main.py

# Enable Node.js debugging
DEBUG=* npm run dev

# Database query debugging
echo "SELECT * FROM plugins;" | psql imf_database
echo "SELECT * FROM problems ORDER BY timestamp DESC LIMIT 5;" | psql imf_database
```

### Getting Help

If issues persist:

1. **Check GitHub Issues**: Search existing issues for solutions
2. **Create Detailed Bug Report**: Include:
   - Operating system and version
   - Node.js and Python versions
   - Complete error messages
   - Steps to reproduce
   - Log outputs
3. **System Information**:

```bash
 # Gather system info for bug reports
 echo "OS: $(uname -a)"
 echo "Node: $(node --version)"
 echo "Python: $(python --version)"
 echo "PostgreSQL: $(psql --version)"
 echo "MCP.Guard Version: $(grep version package.json)"
```

## 🚀 Advanced Usage & Best Practices

Ausgelagert nach: [docs/advanced-usage.md](./docs/advanced-usage.md)

### Production Deployment

```bash
# Production build with optimizations
NODE_ENV=production npm run build
NODE_ENV=production npm start

# Environment-specific configuration
cp .env.example .env.production
# Edit production settings

# Process management with PM2
npm install -g pm2
pm2 start ecosystem.config.js
pm2 startup
pm2 save
```

### Security Hardening

```bash
# Secure PostgreSQL installation
sudo -u postgres psql
# ALTER USER postgres PASSWORD 'secure_password';
# CREATE USER imf_user WITH PASSWORD 'secure_password';
# GRANT ALL PRIVILEGES ON DATABASE imf_database TO imf_user;

# Firewall configuration
sudo ufw allow 3000/tcp  # Only if needed for external access
sudo ufw enable

# SSL/TLS setup (production)
# Add HTTPS configuration to your reverse proxy
```

### Performance Optimization

```bash
# Database optimization
psql imf_database -c "VACUUM ANALYZE;"
psql imf_database -c "REINDEX DATABASE imf_database;"

# Monitor database performance
psql imf_database -c "SELECT * FROM pg_stat_activity;"

# Python framework optimization
# Edit enhanced_main.py monitoring intervals:
# await asyncio.sleep(60)  # Reduce frequency for production

# Enable database connection pooling
# Add to .env: DATABASE_POOL_SIZE=10
```

### Monitoring & Alerting

```bash
# Set up system monitoring for MCP.Guard itself
# Monitor MCP.Guard process
ps aux | grep enhanced_main.py

# Monitor database connections
psql imf_database -c "SELECT count(*) FROM pg_stat_activity;"

# Set up alerts for critical issues
# Configure email notifications in python-framework/config.yaml
```

### Backup & Recovery

```bash
# Database backup
pg_dump imf_database > backup_$(date +%Y%m%d_%H%M%S).sql

# Automated backup script
#!/bin/bash
BACKUP_DIR="/path/to/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
pg_dump imf_database | gzip > "$BACKUP_DIR/imf_backup_$TIMESTAMP.sql.gz"

# Restore from backup
psql imf_database < backup_file.sql

# Configuration backup
tar -czf config_backup_$(date +%Y%m%d).tar.gz .env python-framework/config.yaml
```

## 🤝 Contributing

Ausführliche Richtlinien: [docs/contributing.md](./docs/contributing.md)

### Development Setup

```bash
# Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/MCP.Guard.git
cd MCP.Guard

# Install development dependencies
npm install
pip install -r python-framework/requirements.txt

# Set up development database
createdb imf_database_dev
cp .env.example .env
# Edit .env with development settings

# Run tests
npm test
cd python-framework && python -m pytest tests/
```

### Contributing Guidelines

1. **Create Feature Branch**

   ```bash
   git checkout -b feature/awesome-plugin
   ```

2. **Development Standards**
   - TypeScript for all frontend/backend code
   - Python 3.11+ for plugins with type hints
   - Comprehensive tests for new features
   - ESLint/Prettier for code formatting
   - Conventional commits for git messages

3. **Plugin Development**
   - All plugins must implement the base interface
   - Include comprehensive error handling
   - Add tests for plugin functionality
   - Update documentation

4. **Testing Requirements**

   ```bash
   # Frontend tests
   npm run test:frontend

   # Backend tests
   npm run test:backend

   # Python tests
   cd python-framework
   python -m pytest tests/ -v --cov=.

   # Integration tests
   npm run test:integration
   ```

5. **Submit Pull Request**
   - Ensure all tests pass
   - Update README if needed
   - Include screenshots for UI changes
   - Reference related issues

### Code Style

```bash
# Frontend/Backend formatting
npm run lint
npm run format

# Python formatting
cd python-framework
black .
flake8 .
mypy .
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

```text
MIT License

Copyright (c) 2025 MCP.Guard

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 🆘 Support & Community

Ausführliche Community Informationen: [docs/community.md](./docs/community.md)

### Getting Support

- **📚 Documentation**: Check this README and inline code comments
- **🐛 Bug Reports**: Create detailed issues on GitHub
- **💡 Feature Requests**: Discuss ideas in GitHub Discussions
- **❓ Questions**: Check existing issues or create new ones

### Community Resources

- **GitHub Repository**: [https://github.com/username/MCP.Guard](https://github.com/username/MCP.Guard)
- **Issue Tracker**: Report bugs and request features
- **Wiki**: Additional documentation and tutorials
- **Discussions**: Community Q&A and ideas

### Roadmap

**Current Version**: 1.0.0

- ✅ Core monitoring framework
- ✅ 8+ built-in plugins
- ✅ Web-based plugin management
- ✅ Real-time WebSocket updates
- ✅ PostgreSQL integration

**Planned Features**:

- 🔄 **v1.1**: Email/Slack alerting system
- 🔄 **v1.2**: Machine learning anomaly detection
- 🔄 **v1.3**: Docker/Kubernetes monitoring
- 🔄 **v1.4**: Custom dashboard builder
- 🔄 **v1.5**: API rate limiting and authentication
- 🔄 **v2.0**: Distributed monitoring cluster support

### Acknowledgments

**Built with amazing open-source technologies**:

- **Frontend**: React, TypeScript, Tailwind CSS, Vite
- **Backend**: Node.js, Express.js, WebSocket
- **Database**: PostgreSQL, Drizzle ORM
- **Monitoring**: Python, psutil, asyncio
- **Testing**: Vitest, Jest, pytest
- **UI Components**: shadcn/ui, Radix UI, Lucide Icons

**Special thanks to**:

- The Python psutil maintainers for system monitoring capabilities
- The React and TypeScript communities for excellent tooling
- The PostgreSQL team for robust data persistence
- All contributors who help improve MCP.Guard

---

## 🚀 Built with ❤️

Built for system administrators, DevOps engineers, and monitoring enthusiasts.

⭐ If this project helps you, please consider giving it a star!
