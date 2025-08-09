/* eslint-disable @typescript-eslint/no-explicit-any */
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusIndicator } from '@/components/ui/status-indicator';
import { Link } from 'wouter';
import { formatDistanceToNow } from 'date-fns';
import type { Problem } from '@shared/schema';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ProblemsListProps {
  problems: Problem[];
  onResolveProblem?: OnResolveProblem;
}

// eslint-disable-next-line no-unused-vars
type OnResolveProblem = (id: string) => void;

const severityColors = {
  LOW: 'bg-blue-100 text-blue-800',
  MEDIUM: 'bg-orange-100 text-orange-800',
  HIGH: 'bg-red-100 text-red-800',
  CRITICAL: 'bg-red-100 text-red-800',
};

const severityStatus = {
  LOW: 'running' as const,
  MEDIUM: 'warning' as const,
  HIGH: 'error' as const,
  CRITICAL: 'error' as const,
};

export function ProblemsList({ problems, onResolveProblem }: ProblemsListProps) {
  const [showAll, setShowAll] = useState(false);
  const [collapsed, setCollapsed] = useState(true); // default collapsed
  const display = problems.slice(0, 5);
  const scrollClass =
    problems.length > 5
      ? 'max-h-96 overflow-y-auto divide-y divide-gray-200'
      : 'divide-y divide-gray-200';
  return (
    <div className="lg:col-span-2">
      <Card data-testid="problems-list" className="border border-gray-200">
        <CardHeader className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-expanded={!collapsed}
                aria-controls="recent-problems-content"
                onClick={() => setCollapsed((c) => !c)}
                className="inline-flex items-center justify-center h-6 w-6 rounded border text-sm hover:bg-muted transition"
              >
                {collapsed ? '+' : '–'}
              </button>
              <h3 className="text-lg font-medium text-gray-900">Recent Problems</h3>
              <span className="text-xs text-gray-500">({problems.length})</span>
            </div>
            <div className="flex gap-2">
              {problems.length > 5 && (
                <Button variant="outline" size="sm" onClick={() => setShowAll(true)}>
                  Show All ({problems.length})
                </Button>
              )}
              {collapsed && problems.length > 0 && (
                <Button variant="outline" size="sm" onClick={() => setCollapsed(false)}>
                  Expand
                </Button>
              )}
              <Link href="/problems">
                <Button variant="ghost" size="sm" className="text-primary hover:text-blue-800">
                  View Page
                </Button>
              </Link>
            </div>
          </div>
        </CardHeader>
        {!collapsed && (
          <CardContent id="recent-problems-content" className="p-0">
            <div className={scrollClass}>
              {problems.length === 0 ? (
                <div className="px-6 py-8 text-center text-gray-500">
                  No active problems detected
                </div>
              ) : (
                display.map((problem) => (
                  <div key={problem.id} className="px-6 py-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <StatusIndicator
                            status={severityStatus[problem.severity as keyof typeof severityStatus]}
                            className="mt-1"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{problem.description}</p>
                          <p className="text-sm text-gray-500">
                            {(problem.metadata as any)?.sample_messages?.[0] ||
                              'No additional details'}
                          </p>
                          <div className="mt-2 flex items-center space-x-4">
                            <Badge
                              variant="secondary"
                              className={
                                severityColors[problem.severity as keyof typeof severityColors]
                              }
                            >
                              {problem.severity}
                            </Badge>
                            <span className="text-xs text-gray-500">{problem.type}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-2">
                        <div className="text-sm text-gray-500">
                          {formatDistanceToNow(new Date(problem.timestamp), { addSuffix: true })}
                        </div>
                        {!problem.resolved && onResolveProblem && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onResolveProblem(problem.id)}
                          >
                            Resolve
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        )}
      </Card>
      <Dialog open={showAll} onOpenChange={setShowAll}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>All Problems</DialogTitle>
            <DialogDescription>Total: {problems.length}</DialogDescription>
          </DialogHeader>
          <div className="divide-y divide-gray-200">
            {problems.map((problem) => (
              <div key={problem.id} className="py-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <StatusIndicator
                      status={severityStatus[problem.severity as keyof typeof severityStatus]}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{problem.description}</p>
                      <p className="text-xs text-gray-500 whitespace-pre-wrap">
                        {(problem.metadata as any)?.sample_messages?.join?.('\n') ||
                          (problem.metadata as any)?.sample_messages?.[0] ||
                          'No additional details'}
                      </p>
                      <div className="mt-2 flex items-center space-x-4">
                        <Badge
                          variant="secondary"
                          className={
                            severityColors[problem.severity as keyof typeof severityColors]
                          }
                        >
                          {problem.severity}
                        </Badge>
                        <span className="text-xs text-gray-500">{problem.type}</span>
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(problem.timestamp), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    {!problem.resolved && onResolveProblem && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onResolveProblem(problem.id)}
                      >
                        Resolve
                      </Button>
                    )}
                    {problem.resolved && (
                      <Badge variant="outline" className="text-green-700 border-green-300">
                        Resolved
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {problems.length === 0 && (
              <div className="text-sm text-gray-500 py-6 text-center">No problems available.</div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
