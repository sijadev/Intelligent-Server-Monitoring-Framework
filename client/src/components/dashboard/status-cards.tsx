import { Card, CardContent } from "@/components/ui/card";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { 
  Server, 
  AlertTriangle, 
  Puzzle, 
  FileText,
  ArrowUp,
  Check
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SystemStatus } from "@shared/schema";

interface StatusCardsProps {
  status?: SystemStatus;
}

export function StatusCards({ status }: StatusCardsProps) {
  const cards = [
    {
      title: "Server Status",
      value: status?.running ? "Online" : "Offline",
      icon: Server,
      iconColor: "text-primary",
      indicator: status?.running ? 'running' : 'stopped' as const,
      change: status?.running ? { icon: Check, text: "", color: "text-green-600" } : undefined
    },
    {
      title: "Active Problems",
      value: status?.activeProblems?.toString() || "0",
      icon: AlertTriangle,
      iconColor: "text-orange-500",
      change: status?.activeProblems && status.activeProblems > 0 
        ? { icon: ArrowUp, text: "+1", color: "text-red-600" }
        : undefined
    },
    {
      title: "Active Plugins",
      value: status?.pluginCount?.toString() || "0",
      icon: Puzzle,
      iconColor: "text-green-600",
      change: { icon: Check, text: "", color: "text-green-600" }
    },
    {
      title: "Log Entries",
      value: "1,247", // This would come from metrics
      icon: FileText,
      iconColor: "text-gray-600",
      change: { text: "last hour", color: "text-gray-500" }
    }
  ];

  return (
    <div data-testid="status-cards" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {cards.map((card, index) => {
        const Icon = card.icon;
        const ChangeIcon = card.change?.icon;
        
        // Create specific test IDs for each card
        const testId = card.title.toLowerCase().replace(/\s+/g, '-') + '-card';
        
        return (
          <Card key={index} data-testid={testId} className="border border-gray-200 card">
            <CardContent className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Icon className={cn("h-8 w-8", card.iconColor)} />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {card.title}
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900 flex items-center">
                        <span className="status-text">{card.value}</span>
                        {card.indicator && (
                          <StatusIndicator 
                            status={card.indicator as 'running' | 'stopped' | 'error' | 'warning'} 
                            className="ml-2" 
                            animated={card.indicator === 'running'}
                          />
                        )}
                      </div>
                      {card.change && (
                        <div className={cn("ml-2 flex items-baseline text-sm font-semibold", card.change.color)}>
                          {ChangeIcon && <ChangeIcon className="h-4 w-4" />}
                          {card.change.text && <span>{card.change.text}</span>}
                        </div>
                      )}
                    </dd>
                  </dl>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
