import { Button } from '@/components/ui/button';
import { StatusIndicator } from '@/components/ui/status-indicator';
import { RefreshCw, Settings, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeaderProps {
  title: string;
  onRefresh?: () => void;
  onSettings?: () => void;
  onToggleSidebar?: () => void;
  isLive?: boolean;
  isRefreshing?: boolean;
}

export function Header({
  title,
  onRefresh,
  onSettings,
  onToggleSidebar,
  isLive = false,
  isRefreshing = false,
}: HeaderProps) {
  return (
    <div className="relative z-10 flex-shrink-0 flex h-16 bg-white shadow border-b border-gray-200">
      <Button
        variant="ghost"
        size="sm"
        className="px-4 border-r border-gray-200 text-gray-500 md:hidden"
        onClick={onToggleSidebar}
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex-1 px-4 flex justify-between items-center">
        <div className="flex-1 flex">
          <h2 className="text-2xl font-semibold text-gray-900">{title}</h2>
        </div>

        <div className="ml-4 flex items-center md:ml-6 space-x-3">
          {/* Real-time Status */}
          <div className="flex items-center space-x-2">
            <StatusIndicator status={isLive ? 'running' : 'stopped'} animated={isLive} />
            <span className="text-sm text-gray-600">{isLive ? 'Live' : 'Offline'}</span>
          </div>

          {/* Refresh Button */}
          <Button
            data-testid="refresh-button"
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
          </Button>

          {/* Settings */}
          <Button variant="ghost" size="sm" onClick={onSettings}>
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
