import { Cable, Power, PowerOff, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConnectionPanelProps {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
}

export function ConnectionPanel({
  isConnected,
  isConnecting,
  error,
  onConnect,
  onDisconnect,
}: ConnectionPanelProps) {
  return (
    <div className="industrial-panel">
      <div className="flex items-center gap-3 mb-4">
        <Cable className="w-5 h-5 text-muted-foreground" />
        <span className="text-sm uppercase tracking-wider text-muted-foreground font-semibold">
          Conexão Serial
        </span>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-border">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                'status-indicator',
                isConnected ? 'status-connected' : 'status-disconnected'
              )}
            />
            <span className="text-sm font-medium">
              {isConnected ? 'Conectado' : 'Desconectado'}
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            9600 baud • 7 bits
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-3 p-3 bg-destructive/10 rounded-lg border border-destructive/30">
            <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <span className="text-sm text-destructive">{error}</span>
          </div>
        )}

        <div className="flex gap-3">
          {!isConnected ? (
            <button
              onClick={onConnect}
              disabled={isConnecting}
              className="btn-primary-industrial flex-1 flex items-center justify-center gap-2"
            >
              <Power className="w-4 h-4" />
              {isConnecting ? 'Conectando...' : 'Conectar'}
            </button>
          ) : (
            <button
              onClick={onDisconnect}
              className="btn-secondary-industrial flex-1 flex items-center justify-center gap-2"
            >
              <PowerOff className="w-4 h-4" />
              Desconectar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
