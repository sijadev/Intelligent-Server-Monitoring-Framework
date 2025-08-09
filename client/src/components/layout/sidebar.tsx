import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { StatusIndicator } from '@/components/ui/status-indicator';
import {
  Server,
  FileText,
  AlertTriangle,
  Puzzle,
  Settings,
  BarChart3,
  Home,
  Code,
  Brain,
  Network,
  TestTube,
} from 'lucide-react';

interface SidebarProps {
  uptime?: string;
  problemCount?: number;
  systemStatus?: 'running' | 'stopped' | 'error';
}

export function Sidebar({
  uptime = '0h 0m',
  problemCount = 0,
  systemStatus = 'running',
}: SidebarProps) {
  const [location] = useLocation();

  const navigation = [
    { name: 'Overview', href: '/', icon: Home },
    { name: 'Problems', href: '/problems', icon: AlertTriangle },
    { name: 'Metrics', href: '/metrics', icon: BarChart3 },
    { name: 'AI Dashboard', href: '/ai-dashboard', icon: Brain },
    { name: 'MCP Dashboard', href: '/mcp-dashboard', icon: Network },
    { name: 'Test Manager', href: '/test-manager', icon: TestTube },
    { name: 'Plugins', href: '/plugins', icon: Puzzle },
    { name: 'Log Analysis', href: '/logs', icon: FileText },
    { name: 'Code Analysis', href: '/code-analysis', icon: Code },
    { name: 'Configuration', href: '/configuration', icon: Settings },
  ] as const;

  return (
    <div className="hidden md:flex md:flex-shrink-0">
      <div className="flex flex-col w-64 bg-white border-r border-gray-200">
        {/* Logo */}
        <div className="flex items-center justify-center h-16 px-4 bg-primary">
          <h1 className="text-xl font-bold text-white">
            <Server className="inline-block mr-2 h-6 w-6" />
            MCP.Guard Dashboard
          </h1>
        </div>

        {/* Navigation */}
        <nav className="mt-8 flex-1 px-4 space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                  isActive
                    ? 'bg-blue-50 text-primary border-r-2 border-primary'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                )}
              >
                <Icon className={cn('mr-3 h-5 w-5', isActive ? 'text-primary' : '')} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Status Footer */}
        <div className="flex-shrink-0 p-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <StatusIndicator
                status={systemStatus}
                animated={systemStatus === 'running'}
                className="mr-2"
              />
              <span className="text-sm text-gray-600">
                {systemStatus === 'running' ? 'System Active' : 'System Inactive'}
              </span>
            </div>
            <span className="text-xs text-gray-400">{uptime}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
