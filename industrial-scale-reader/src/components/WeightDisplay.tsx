import { cn } from '@/lib/utils';

interface WeightDisplayProps {
  value: number;
  unit: string;
  isStable: boolean;
  isConnected: boolean;
}

export function WeightDisplay({ value, unit, isStable, isConnected }: WeightDisplayProps) {
  // Formata o valor preservando todos os decimais significativos
  const formatWeight = (val: number): string => {
    // Usa toFixed com 6 casas decimais para preservar toda a precisão
    const formatted = val.toFixed(6);
    // Remove zeros à direita desnecessários
    return formatted.replace(/\.?0+$/, '') || '0';
  };

  const formattedValue = formatWeight(value).padStart(10, ' ');

  return (
    <div className="industrial-panel">
      <div className="flex items-center justify-between mb-4">
        <span className="text-muted-foreground text-sm uppercase tracking-wider">Peso Líquido</span>
        <div className="flex items-center gap-2">
          {isStable ? (
            <span className="text-success text-xs uppercase tracking-wider font-semibold flex items-center gap-2">
              <span className="status-indicator status-connected" />
              Estável
            </span>
          ) : (
            <span className="text-warning text-xs uppercase tracking-wider font-semibold flex items-center gap-2">
              <span className="status-indicator status-warning" />
              Instável
            </span>
          )}
        </div>
      </div>

      <div className="bg-background/50 rounded-lg p-6 border border-border">
        <div className="flex items-baseline justify-center gap-4">
          <span
            className={cn(
              'display-value transition-colors duration-300',
              isConnected ? 'text-success' : 'text-muted-foreground'
            )}
          >
            {isConnected ? formattedValue : '----.---'}
          </span>
          <span className="text-3xl md:text-4xl font-semibold text-muted-foreground uppercase">
            {unit}
          </span>
        </div>
      </div>

      <div className="mt-4 flex justify-between text-xs text-muted-foreground">
        <span>Min: 0.000 {unit}</span>
        <span>Max: 500.000 {unit}</span>
      </div>
    </div>
  );
}
