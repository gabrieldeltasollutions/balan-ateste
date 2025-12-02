import { Scale, RotateCcw, Save } from 'lucide-react';

interface ControlPanelProps {
  onTare: () => void;
  onRecord: () => void;
  tareValue: number;
  unit: string;
  isConnected: boolean;
  isStable: boolean;
}

export function ControlPanel({
  onTare,
  onRecord,
  tareValue,
  unit,
  isConnected,
  isStable,
}: ControlPanelProps) {
  return (
    <div className="industrial-panel">
      <div className="flex items-center gap-3 mb-4">
        <Scale className="w-5 h-5 text-muted-foreground" />
        <span className="text-sm uppercase tracking-wider text-muted-foreground font-semibold">
          Controles
        </span>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onTare}
            disabled={!isConnected}
            className="btn-warning-industrial flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RotateCcw className="w-4 h-4" />
            Tarar
          </button>
          <button
            onClick={onRecord}
            disabled={!isConnected || !isStable}
            className="btn-primary-industrial flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            Registrar
          </button>
        </div>

        {tareValue !== 0 && (
          <div className="p-3 bg-warning/10 rounded-lg border border-warning/30">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-warning">Tara Ativa</span>
              <span className="font-mono text-warning font-semibold">
                {tareValue.toFixed(2)} {unit}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
