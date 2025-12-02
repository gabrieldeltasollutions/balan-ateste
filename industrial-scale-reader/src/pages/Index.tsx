import { Scale } from 'lucide-react';
import { WeightDisplay } from '@/components/WeightDisplay';
import { ConnectionPanel } from '@/components/ConnectionPanel';
import { ControlPanel } from '@/components/ControlPanel';
import { ReadingsHistory } from '@/components/ReadingsHistory';
import { StatusBar } from '@/components/StatusBar';
import { useSerialPort } from '@/hooks/useSerialPort';

const Index = () => {
  const {
    isConnected,
    isConnecting,
    currentWeight,
    unit,
    isStable,
    error,
    connect,
    disconnect,
    readings,
    addReading,
    clearReadings,
    tare,
    tareValue,
  } = useSerialPort();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <StatusBar isConnected={isConnected} readingsCount={readings.length} />

      <header className="border-b border-border bg-card/50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-lg border border-primary/30">
              <Scale className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">
                Sistema de Pesagem Industrial
              </h1>
              <p className="text-sm text-muted-foreground">
                Monitoramento em tempo real • Linha de produção
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
          <div className="lg:col-span-2 space-y-6">
            <WeightDisplay
              value={currentWeight}
              unit={unit}
              isStable={isStable}
              isConnected={isConnected}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ConnectionPanel
                isConnected={isConnected}
                isConnecting={isConnecting}
                error={error}
                onConnect={connect}
                onDisconnect={disconnect}
              />
              <ControlPanel
                onTare={tare}
                onRecord={addReading}
                tareValue={tareValue}
                unit={unit}
                isConnected={isConnected}
                isStable={isStable}
              />
            </div>
          </div>

          <div className="lg:col-span-1 min-h-[400px]">
            <ReadingsHistory readings={readings} onClear={clearReadings} />
          </div>
        </div>
      </main>

      <footer className="border-t border-border bg-card/50 py-3">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>Balança Industrial v1.0</span>
          <span>Porta Serial • 9600 baud • 7 data bits • Paridade Par</span>
        </div>
      </footer>
    </div>
  );
};

export default Index;
