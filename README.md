# Intelligent Monitoring Framework (IMF)

A comprehensive full-stack monitoring solution for server systems, log analysis, and MCP (Model Context Protocol) server management. Built with React, Express.js, TypeScript, and Python plugins.

## 🚀 Features

### Core Monitoring
- **Real-time System Metrics**: CPU, memory, disk usage, load average, network connections
- **Log Analysis**: Multi-source log parsing with configurable severity levels
- **Problem Detection**: Automated issue identification with severity classification
- **Plugin Architecture**: Extensible Python-based monitoring plugins

### MCP Server Monitoring
- **Automatic Discovery**: Multiple discovery methods (process scan, port scan, Docker, config files)
- **Real-time Monitoring**: Live metrics collection and status tracking
- **Server Management**: Complete CRUD operations for MCP server configuration
- **Dashboard Analytics**: Comprehensive overview with aggregated statistics

### Technical Features
- **WebSocket Real-time Updates**: Live dashboard updates
- **PostgreSQL Database**: Robust data persistence with Drizzle ORM
- **Type Safety**: Full TypeScript coverage with shared schemas
- **Comprehensive Testing**: Frontend, backend, and Python plugin test suites

## 📋 Prerequisites

- **Node.js 18+** (for backend and frontend)
- **Python 3.11+** (for monitoring plugins)
- **PostgreSQL** (built-in Replit database or external)

## 🛠️ Installation

### 1. Clone and Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Install Python dependencies (if using external Python environment)
pip install aiohttp psutil pytest pytest-asyncio pyyaml requests websockets docker
```

### 2. Database Setup

The application uses PostgreSQL with automatic schema management:

```bash
# Generate database migrations
npx drizzle-kit generate

# Apply database migrations
npx drizzle-kit migrate
```

### 3. Environment Configuration

Create a `.env` file with required environment variables:

```env
# Database (auto-configured in Replit)
DATABASE_URL=postgresql://username:password@localhost:5432/dbname

# Session Secret
SESSION_SECRET=your-secure-session-secret-here

# Development Mode
NODE_ENV=development
```

## 🚀 Running the Application

### Development Mode

```bash
# Start the full-stack application
npm run dev
```

This command starts:
- **Express.js backend** on the configured port
- **Vite development server** for the React frontend
- **WebSocket server** for real-time updates

The application will be available at the provided Replit URL.

### Production Mode

```bash
# Build the application
npm run build

# Start production server
npm start
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

```
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

### Plugin Development

Create custom monitoring plugins in `python-framework/`:

```python
from mcp_monitoring_plugin import MonitoringPlugin

class CustomPlugin(MonitoringPlugin):
    def collect_data(self):
        # Implement data collection logic
        pass
    
    def detect_problems(self):
        # Implement problem detection logic
        pass
```

## 📝 Configuration

### MCP Discovery Configuration

```json
{
  "scan_ports": [8000, 8080, 3000, 5000, 9000],
  "scan_hosts": ["localhost", "127.0.0.1"],
  "discovery_methods": [
    "process_scan",
    "port_scan", 
    "docker_scan",
    "config_file_scan"
  ]
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

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Errors**
   ```bash
   # Check database status
   npx drizzle-kit check
   
   # Reset database
   npx drizzle-kit drop
   npx drizzle-kit migrate
   ```

2. **Python Plugin Errors**
   ```bash
   # Check Python dependencies
   python -c "import mcp_monitoring_plugin; print('OK')"
   
   # Install missing dependencies
   pip install -r python-framework/requirements.txt
   ```

3. **WebSocket Connection Issues**
   - Ensure no firewall blocking WebSocket connections
   - Check that WebSocket server is running on `/ws` path

### Log Locations

- **Application Logs**: Browser console and network tab
- **Server Logs**: Terminal output during development
- **Python Plugin Logs**: Python framework directory

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add comprehensive tests
4. Ensure all tests pass
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Check the troubleshooting section above
- Review the test files for usage examples
- Create an issue for bugs or feature requests

---

**Built with ❤️ using React, Express.js, TypeScript, and Python**