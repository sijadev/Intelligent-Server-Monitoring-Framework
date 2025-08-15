import { Switch, Route } from 'wouter';
import { useState } from 'react';
import { queryClient } from './lib/queryClient';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Sidebar } from '@/components/layout/sidebar';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';

// Pages
import Dashboard from '@/pages/dashboard';
import Problems from '@/pages/problems';
import Metrics from '@/pages/metrics';
import Logs from '@/pages/logs';
import Configuration from '@/pages/configuration';
import CodeAnalysis from '@/pages/code-analysis';
import AiDashboard from '@/pages/ai-dashboard';
import MCPDashboard from '@/pages/mcp-dashboard';
import TestManager from '@/pages/test-manager';
import { ErrorBoundary } from '@/components/error-boundary';
import Plugins from '@/pages/plugins';
import NotFound from '@/pages/not-found';

function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="fixed inset-0 bg-gray-600 bg-opacity-75"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <Button
                variant="ghost"
                size="sm"
                className="ml-1 text-white hover:text-gray-300"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
            <Sidebar />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <Sidebar />

      {/* Main content */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        {/* Mobile menu button */}
        <div className="md:hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200">
            <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-6 w-6" />
            </Button>
            <h1 className="text-lg font-semibold">MCP.Guard Dashboard</h1>
            <div className="w-10" /> {/* Spacer for centering */}
          </div>
        </div>

        {children}
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/problems" component={Problems} />
      <Route path="/metrics" component={Metrics} />
      <Route path="/ai-dashboard" component={AiDashboard} />
      <Route path="/mcp-dashboard" component={MCPDashboard} />
      <Route
        path="/test-manager"
        component={() => (
          <ErrorBoundary>
            <TestManager />
          </ErrorBoundary>
        )}
      />
      <Route path="/plugins" component={Plugins} />
      <Route path="/logs" component={Logs} />
      <Route path="/configuration" component={Configuration} />
      <Route path="/code-analysis" component={CodeAnalysis} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppLayout>
          <Router />
        </AppLayout>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
