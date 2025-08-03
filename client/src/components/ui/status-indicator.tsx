import { cn } from "@/lib/utils";

interface StatusIndicatorProps {
  status: 'running' | 'stopped' | 'error' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  className?: string;
}

const statusColors = {
  running: 'bg-green-500',
  stopped: 'bg-gray-500', 
  error: 'bg-red-500',
  warning: 'bg-orange-500'
};

const statusSizes = {
  sm: 'w-2 h-2',
  md: 'w-3 h-3',
  lg: 'w-4 h-4'
};

export function StatusIndicator({ 
  status, 
  size = 'md', 
  animated = false, 
  className 
}: StatusIndicatorProps) {
  return (
    <div
      className={cn(
        "rounded-full",
        statusColors[status],
        statusSizes[size],
        animated && "animate-pulse",
        className
      )}
    />
  );
}
