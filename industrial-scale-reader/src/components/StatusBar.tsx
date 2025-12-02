import { Activity, Clock, Gauge } from 'lucide-react';
import { useEffect, useState } from 'react';

interface StatusBarProps {
  isConnected: boolean;
  readingsCount: number;
}

export function StatusBar({ isConnected, readingsCount }: StatusBarProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatDateTime = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="bg-card border-b border-border px-4 py-2">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-sm">
            <Activity className={`w-4 h-4 ${isConnected ? 'text-success' : 'text-muted-foreground'}`} />
            <span className={isConnected ? 'text-success' : 'text-muted-foreground'}>
              {isConnected ? 'Online' : 'Offline'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Gauge className="w-4 h-4" />
            <span>{readingsCount} registros</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground font-mono">
          <Clock className="w-4 h-4" />
          <span>{formatDateTime(currentTime)}</span>
        </div>
      </div>
    </div>
  );
}
