import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import MCPDashboard from '@/pages/mcp-dashboard'

// Mock the API module
vi.mock('@/lib/api', () => ({
  api: {
    httpGet: vi.fn(),
    httpPost: vi.fn(),
    httpPut: vi.fn(),
    httpDelete: vi.fn(),
    getDashboard: vi.fn(),
    getProblems: vi.fn(),
    getMetrics: vi.fn(),
    getPlugins: vi.fn(),
    restartFramework: vi.fn()
  }
}))

// Mock the toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}))

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Server: () => <div data-testid="server-icon" />,
  Activity: () => <div data-testid="activity-icon" />,
  Network: () => <div data-testid="network-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  CheckCircle: () => <div data-testid="check-circle-icon" />,
  XCircle: () => <div data-testid="x-circle-icon" />,
  AlertCircle: () => <div data-testid="alert-circle-icon" />,
  RefreshCw: () => <div data-testid="refresh-icon" />,
  Play: () => <div data-testid="play-icon" />,
  Square: () => <div data-testid="square-icon" />,
  Trash2: () => <div data-testid="trash-icon" />,
  Eye: () => <div data-testid="eye-icon" />,
  BarChart3: () => <div data-testid="bar-chart-icon" />,
  Wifi: () => <div data-testid="wifi-icon" />,
  WifiOff: () => <div data-testid="wifi-off-icon" />,
  Settings: () => <div data-testid="settings-icon" />
}))

// Mock the Header component
vi.mock('@/components/layout/header', () => ({
  Header: ({ title, onRefresh, isRefreshing }: any) => (
    <div data-testid="header">
      <h1>{title}</h1>
      <button onClick={onRefresh} disabled={isRefreshing}>
        Refresh
      </button>
    </div>
  )
}))

describe('MCP Dashboard', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })
    vi.clearAllMocks()
  })

  const renderWithQueryClient = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    )
  }

  describe('Dashboard Loading and Display', () => {
    it('should show loading state initially', async () => {
      const { api } = await import('@/lib/api')
      const mockApi = vi.mocked(api)
      mockApi.httpGet.mockReturnValue(new Promise(() => {})) // Never resolves

      renderWithQueryClient(<MCPDashboard />)

      expect(screen.getByText('Loading MCP Dashboard...')).toBeInTheDocument()
    })

    it('should display dashboard with mock data', async () => {
      const { api } = require('@/lib/api')
      
      const mockDashboardData = {
        totalServers: 5,
        runningServers: 3,
        stoppedServers: 1,
        unknownServers: 1,
        averageResponseTime: 250,
        totalRequests: 1000,
        totalErrors: 5,
        serversByProtocol: {
          http: 3,
          websocket: 2
        },
        serversByDiscoveryMethod: {
          process_scan: 2,
          port_scan: 2,
          docker_scan: 1
        }
      }

      const mockServers = [
        {
          id: '1',
          serverId: 'server-1',
          name: 'Test MCP Server 1',
          host: 'localhost',
          port: 8000,
          protocol: 'http',
          status: 'running',
          capabilities: ['test', 'demo'],
          lastSeen: new Date(),
          discoveryMethod: 'process_scan',
          responseTime: 150,
          uptime: 3600
        },
        {
          id: '2',
          serverId: 'server-2',
          name: 'Test MCP Server 2',
          host: '127.0.0.1',
          port: 8001,
          protocol: 'websocket',
          status: 'stopped',
          capabilities: ['production'],
          lastSeen: new Date(),
          discoveryMethod: 'docker_scan',
          containerName: 'mcp-server-2'
        }
      ]

      api.get.mockImplementation((url: string) => {
        if (url === '/api/mcp/dashboard') {
          return Promise.resolve(mockDashboardData)
        }
        if (url === '/api/mcp/servers') {
          return Promise.resolve(mockServers)
        }
        return Promise.resolve([])
      })

      renderWithQueryClient(<MCPDashboard />)

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('MCP Dashboard')).toBeInTheDocument()
      })

      // Check overview statistics
      expect(screen.getByText('5')).toBeInTheDocument() // Total servers
      expect(screen.getByText('3')).toBeInTheDocument() // Running servers
      expect(screen.getByText('250ms')).toBeInTheDocument() // Avg response time
      expect(screen.getByText('1000')).toBeInTheDocument() // Total requests
    })
  })

  describe('Navigation Tabs', () => {
    it('should switch between tabs', async () => {
      const { api } = require('@/lib/api')
      api.get.mockResolvedValue({})

      renderWithQueryClient(<MCPDashboard />)

      await waitFor(() => {
        expect(screen.getByText('MCP Dashboard')).toBeInTheDocument()
      })

      // Check all tabs are present
      expect(screen.getByText('Overview')).toBeInTheDocument()
      expect(screen.getByText('Servers')).toBeInTheDocument()
      expect(screen.getByText('Metrics')).toBeInTheDocument()
      expect(screen.getByText('Discovery')).toBeInTheDocument()

      // Click on Servers tab
      fireEvent.click(screen.getByText('Servers'))
      
      // Should show servers content
      expect(screen.getByText('Discovered Model Context Protocol servers')).toBeInTheDocument()

      // Click on Metrics tab
      fireEvent.click(screen.getByText('Metrics'))
      
      // Should show metrics content
      expect(screen.getByText('Select a server to view detailed metrics')).toBeInTheDocument()
    })
  })

  describe('Server Management', () => {
    it('should display server list', async () => {
      const { api } = require('@/lib/api')
      
      const mockServers = [
        {
          id: '1',
          serverId: 'test-server-1',
          name: 'Test Server 1',
          host: 'localhost',
          port: 8000,
          protocol: 'http',
          status: 'running',
          capabilities: ['test', 'demo'],
          lastSeen: new Date('2023-01-01T12:00:00Z'),
          discoveryMethod: 'process_scan',
          responseTime: 150,
          uptime: 3600,
          version: '1.0.0'
        }
      ]

      api.get.mockImplementation((url: string) => {
        if (url === '/api/mcp/dashboard') {
          return Promise.resolve({})
        }
        if (url === '/api/mcp/servers') {
          return Promise.resolve(mockServers)
        }
        return Promise.resolve([])
      })

      renderWithQueryClient(<MCPDashboard />)

      // Switch to servers tab
      await waitFor(() => {
        fireEvent.click(screen.getByText('Servers'))
      })

      // Check server details are displayed
      await waitFor(() => {
        expect(screen.getByText('Test Server 1')).toBeInTheDocument()
      })

      expect(screen.getByText('localhost:8000')).toBeInTheDocument()
      expect(screen.getByText('v1.0.0')).toBeInTheDocument()
      expect(screen.getByText('process_scan')).toBeInTheDocument()
      expect(screen.getByText('150ms')).toBeInTheDocument()
    })

    it('should show empty state when no servers exist', async () => {
      const { api } = require('@/lib/api')
      
      api.get.mockImplementation((url: string) => {
        if (url === '/api/mcp/dashboard') {
          return Promise.resolve({})
        }
        if (url === '/api/mcp/servers') {
          return Promise.resolve([])
        }
        return Promise.resolve([])
      })

      renderWithQueryClient(<MCPDashboard />)

      // Switch to servers tab
      await waitFor(() => {
        fireEvent.click(screen.getByText('Servers'))
      })

      // Check empty state
      await waitFor(() => {
        expect(screen.getByText('No MCP servers discovered')).toBeInTheDocument()
      })
    })

    it('should handle server actions', async () => {
      const { api } = require('@/lib/api')
      
      const mockServer = {
        id: '1',
        serverId: 'test-server-1',
        name: 'Test Server 1',
        host: 'localhost',
        port: 8000,
        protocol: 'http',
        status: 'running',
        capabilities: ['test'],
        lastSeen: new Date(),
        discoveryMethod: 'process_scan'
      }

      api.get.mockImplementation((url: string) => {
        if (url === '/api/mcp/dashboard') {
          return Promise.resolve({})
        }
        if (url === '/api/mcp/servers') {
          return Promise.resolve([mockServer])
        }
        return Promise.resolve([])
      })

      api.post.mockResolvedValue({ success: true })

      renderWithQueryClient(<MCPDashboard />)

      // Switch to servers tab
      await waitFor(() => {
        fireEvent.click(screen.getByText('Servers'))
      })

      // Wait for server to be displayed
      await waitFor(() => {
        expect(screen.getByText('Test Server 1')).toBeInTheDocument()
      })

      // Find and click the view button (Eye icon)
      const viewButton = screen.getByTestId('eye-icon').closest('button')
      if (viewButton) {
        fireEvent.click(viewButton)
      }

      // Should be able to interact with server controls
      expect(screen.getByTestId('eye-icon')).toBeInTheDocument()
    })
  })

  describe('Metrics Display', () => {
    it('should show metrics when server is selected', async () => {
      const { api } = require('@/lib/api')
      
      const mockMetrics = [
        {
          id: '1',
          serverId: 'test-server-1',
          timestamp: new Date('2023-01-01T12:00:00Z'),
          status: 'running',
          responseTime: 200,
          requestCount: 50,
          errorCount: 2,
          cpuUsage: 45.5
        }
      ]

      api.get.mockImplementation((url: string) => {
        if (url === '/api/mcp/dashboard') {
          return Promise.resolve({})
        }
        if (url === '/api/mcp/servers') {
          return Promise.resolve([])
        }
        if (url.includes('/metrics')) {
          return Promise.resolve(mockMetrics)
        }
        return Promise.resolve([])
      })

      renderWithQueryClient(<MCPDashboard />)

      // Switch to metrics tab
      await waitFor(() => {
        fireEvent.click(screen.getByText('Metrics'))
      })

      // Initially should show selection message
      expect(screen.getByText('Select a server from the Servers tab to view metrics')).toBeInTheDocument()
    })
  })

  describe('Discovery Information', () => {
    it('should display discovery methods', async () => {
      const { api } = require('@/lib/api')
      
      const mockDashboardData = {
        serversByDiscoveryMethod: {
          process_scan: 2,
          port_scan: 1,
          docker_scan: 1,
          config_file_scan: 0
        }
      }

      api.get.mockImplementation((url: string) => {
        if (url === '/api/mcp/dashboard') {
          return Promise.resolve(mockDashboardData)
        }
        return Promise.resolve([])
      })

      renderWithQueryClient(<MCPDashboard />)

      // Switch to discovery tab
      await waitFor(() => {
        fireEvent.click(screen.getByText('Discovery'))
      })

      await waitFor(() => {
        expect(screen.getByText('How MCP servers are being discovered')).toBeInTheDocument()
      })

      // Check discovery methods are displayed
      expect(screen.getByText('Process scan')).toBeInTheDocument()
      expect(screen.getByText('Port scan')).toBeInTheDocument()
      expect(screen.getByText('Docker scan')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const { api } = require('@/lib/api')
      
      api.get.mockRejectedValue(new Error('API Error'))

      renderWithQueryClient(<MCPDashboard />)

      // Should still render the component structure
      await waitFor(() => {
        expect(screen.getByText('MCP Dashboard')).toBeInTheDocument()
      })
    })
  })

  describe('Refresh Functionality', () => {
    it('should refresh data when refresh button is clicked', async () => {
      const { api } = require('@/lib/api')
      
      api.get.mockResolvedValue({})

      renderWithQueryClient(<MCPDashboard />)

      await waitFor(() => {
        expect(screen.getByText('MCP Dashboard')).toBeInTheDocument()
      })

      const refreshButton = screen.getByText('Refresh')
      fireEvent.click(refreshButton)

      // Should call the API again
      expect(api.get).toHaveBeenCalledWith('/api/mcp/dashboard')
    })
  })
})