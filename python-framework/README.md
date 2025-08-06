# IMF Python Monitoring Framework

🐍 **AI-powered system monitoring and analysis framework** for Node.js and containerized environments.

## Features

- 🔍 **Real-time System Monitoring** - CPU, memory, disk, network, processes
- 🤖 **AI-powered Problem Detection** - Intelligent analysis and pattern recognition  
- 🔧 **Auto-remediation** - Automatic fixes for common system issues
- 📊 **Plugin Architecture** - Extensible collectors, detectors, and remediators
- 🌐 **HTTP API** - RESTful API for container communication
- 🐳 **Docker Ready** - Optimized for containerized deployments
- 📈 **Metrics History** - Time-series data collection and analysis

## Installation

### Global Installation
```bash
npm install -g @imf/python-monitoring-framework
```

### Project Installation
```bash
npm install @imf/python-monitoring-framework
```

## Prerequisites

- **Node.js** >= 18.0.0
- **Python** >= 3.11.0
- **pip** (Python package manager)

The package will automatically install Python dependencies during `npm install`.

## Quick Start

### Command Line Usage

```bash
# Start the framework with API server
imf-python-framework start

# Start in standalone mode (no API)
imf-python-framework start --mode standalone

# Check framework status
imf-python-framework status

# Start with custom port and verbose logging
imf-python-framework start --port 9000 --verbose

# Show help
imf-python-framework --help
```

### Programmatic Usage

```typescript
import { IMFPythonFramework, IMFFrameworkClient } from '@imf/python-monitoring-framework';

// Start framework programmatically
const framework = new IMFPythonFramework({
  mode: 'api',
  port: 8000,
  verbose: true
});

await framework.start();

// Connect to running framework
const client = new IMFFrameworkClient('http://localhost:8000');

// Get system status
const status = await client.getStatus();
console.log('Framework running:', status.running);

// Get current metrics
const metrics = await client.getMetrics();
console.log('CPU Usage:', metrics.cpuUsage);

// Get detected problems
const problems = await client.getProblems();
console.log('Problems found:', problems.length);
```

## API Reference

### CLI Commands

| Command | Description | Options |
|---------|-------------|---------|
| `start` | Start the monitoring framework | `--mode`, `--port`, `--config`, `--verbose` |
| `status` | Get current framework status | - |
| `stop` | Stop the running framework | - |
| `help` | Show help message | - |

### Framework Modes

- **`api`** - HTTP API server for container communication (default)
- **`standalone`** - Direct monitoring without API server
- **`docker`** - Optimized for Docker container deployment

### HTTP API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/status` | GET | Framework status and statistics |
| `/metrics` | GET | Current system metrics |
| `/problems` | GET | Detected problems and issues |
| `/plugins` | GET | Plugin status and information |
| `/data` | GET | All framework data combined |
| `/start` | POST | Start monitoring |
| `/stop` | POST | Stop monitoring |
| `/restart` | POST | Restart monitoring |
| `/health` | GET | Health check endpoint |

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | API server port | `8000` |
| `CONFIG_FILE` | Configuration file path | `config.yaml` |
| `PYTHONPATH` | Python module search path | Auto-configured |

### Configuration File (`config.yaml`)

```yaml
monitoring:
  interval: 30  # seconds
  plugins:
    - system_metrics_collector
    - network_monitor
    - process_monitor
    - log_file_monitor
  
detection:
  thresholds:
    cpu_usage: 80
    memory_usage: 85
    disk_usage: 90
  
api:
  host: "0.0.0.0"
  port: 8000
  cors_enabled: true
```

## Docker Integration

### Using in Docker Compose

```yaml
version: '3.8'
services:
  monitoring:
    image: node:18-alpine
    working_dir: /app
    command: >
      sh -c "npm install -g @imf/python-monitoring-framework && 
             imf-python-framework start --mode docker"
    ports:
      - "8000:8000"
    environment:
      - PORT=8000
    volumes:
      - /var/log:/var/log:ro
```

### Integration with Node.js App

```typescript
// In your Node.js application
import { IMFFrameworkClient } from '@imf/python-monitoring-framework';

class MonitoringService {
  private client = new IMFFrameworkClient(process.env.PYTHON_API_URL);

  async getSystemHealth() {
    const status = await this.client.getStatus();
    const metrics = await this.client.getMetrics();
    const problems = await this.client.getProblems();

    return {
      running: status.running,
      cpuUsage: metrics.cpuUsage,
      memoryUsage: metrics.memoryUsage,
      problems: problems.length,
      lastUpdate: status.last_update
    };
  }
}
```

## Plugin Development

The framework supports custom plugins for data collection, problem detection, and auto-remediation:

```python
# Example custom plugin
class CustomMetricsCollector:
    def __init__(self):
        self.name = "custom_collector"
        self.version = "1.0.0"
        self.type = "collector"
    
    async def collect(self):
        return {
            "custom_metric": self.get_custom_data(),
            "timestamp": datetime.now()
        }
```

## Troubleshooting

### Common Issues

1. **Python not found**: Ensure Python 3.11+ is installed and in PATH
2. **Permission denied**: Run with appropriate permissions for system monitoring
3. **Port already in use**: Change port with `--port` option
4. **Dependencies not installed**: Run `npm run install-python-deps`

### Debug Mode

```bash
# Enable verbose logging
imf-python-framework start --verbose

# Check specific endpoint
curl http://localhost:8000/status
```

## Development

```bash
# Clone repository
git clone https://github.com/sijadev/IMF.git
cd IMF/python-framework

# Install dependencies
npm install

# Build TypeScript
npm run build

# Run tests
npm test

# Create package
npm run package
```

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## Support

- 🐛 **Issues**: [GitHub Issues](https://github.com/sijadev/IMF/issues)
- 📖 **Documentation**: [GitHub Wiki](https://github.com/sijadev/IMF/wiki)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/sijadev/IMF/discussions)

---

Made with ❤️ by the IMF Team