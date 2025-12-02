import { History, Trash2, Check, AlertTriangle } from 'lucide-react';
import type { WeightReading } from '@/hooks/useSerialPort';

interface ReadingsHistoryProps {
  readings: WeightReading[];
  onClear: () => void;
}

export function ReadingsHistory({ readings, onClear }: ReadingsHistoryProps) {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // Formata o valor preservando todos os decimais significativos
  const formatWeight = (val: number): string => {
    // Usa toFixed com 6 casas decimais para preservar toda a precisão
    const formatted = val.toFixed(6);
    // Remove zeros à direita desnecessários
    return formatted.replace(/\.?0+$/, '') || '0';
  };

  return (
    <div className="industrial-panel h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <History className="w-5 h-5 text-muted-foreground" />
          <span className="text-sm uppercase tracking-wider text-muted-foreground font-semibold">
            Histórico
          </span>
          <span className="text-xs bg-secondary px-2 py-0.5 rounded-full text-muted-foreground">
            {readings.length}
          </span>
        </div>
        {readings.length > 0 && (
          <button
            onClick={onClear}
            className="text-muted-foreground hover:text-destructive transition-colors p-2"
            title="Limpar histórico"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-hidden">
        {readings.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            Nenhum registro
          </div>
        ) : (
          <div className="h-full overflow-y-auto space-y-2 pr-2 scrollbar-thin">
            {readings.map((reading) => (
              <div
                key={reading.id}
                className="p-3 bg-background/50 rounded-lg border border-border flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  {reading.stable ? (
                    <Check className="w-4 h-4 text-success" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-warning" />
                  )}
                  <span className="font-mono text-lg font-semibold text-foreground">
                    {formatWeight(reading.value)}
                  </span>
                  <span className="text-sm text-muted-foreground uppercase">
                    {reading.unit}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground font-mono">
                  {formatTime(reading.timestamp)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
