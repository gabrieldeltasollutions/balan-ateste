import { useState, useCallback, useRef, useEffect } from 'react';

export interface WeightReading {
  id: string;
  value: number;
  unit: string;
  timestamp: Date;
  stable: boolean;
}

interface UseSerialPortReturn {
  isConnected: boolean;
  isConnecting: boolean;
  currentWeight: number;
  unit: string;
  isStable: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  readings: WeightReading[];
  addReading: () => void;
  clearReadings: () => void;
  tare: () => void;
  tareValue: number;
}

interface WeightData {
  value: number;
  unit: string;
  stable: boolean;
  raw_data: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';

export function useSerialPort(): UseSerialPortReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [currentWeight, setCurrentWeight] = useState(0);
  const [unit, setUnit] = useState('kg');
  const [isStable, setIsStable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [readings, setReadings] = useState<WeightReading[]>([]);
  const [tareValue, setTareValue] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Conectar WebSocket quando estiver conectado
  useEffect(() => {
    if (isConnected && !wsRef.current) {
      connectWebSocket();
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [isConnected]);

  const connectWebSocket = useCallback(() => {
    try {
      const ws = new WebSocket(`${WS_URL}/ws`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket conectado');
        setError(null);
        // Enviar ping periódico para manter conexão viva
        const pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send('ping');
          } else {
            clearInterval(pingInterval);
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Verificar se é erro
          if (data.error) {
            setError(data.error);
            return;
          }

          // Processar dados de peso
          if (data.value !== undefined) {
            const weightData = data as WeightData;
            setCurrentWeight(weightData.value - tareValue);
            setUnit(weightData.unit);
            setIsStable(weightData.stable);
          }
        } catch (err) {
          console.error('Erro ao processar mensagem WebSocket:', err);
        }
      };

      ws.onerror = (err) => {
        console.error('Erro no WebSocket:', err);
        setError('Erro na conexão WebSocket');
      };

      ws.onclose = () => {
        console.log('WebSocket desconectado');
        wsRef.current = null;
        
        // Tentar reconectar se ainda estiver conectado
        if (isConnected) {
          reconnectTimeoutRef.current = setTimeout(() => {
            if (isConnected && !wsRef.current) {
              connectWebSocket();
            }
          }, 3000);
        }
      };
    } catch (err) {
      console.error('Erro ao criar WebSocket:', err);
      setError('Erro ao conectar WebSocket');
    }
  }, [isConnected, tareValue]);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          baudrate: 9600,
          bytesize: 7,
          parity: 'E',
          stopbits: 1,
          timeout: 1.0,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || data.error || 'Erro ao conectar');
      }

      if (data.connected) {
        setIsConnected(true);
        setError(null);
      } else {
        throw new Error(data.error || 'Falha na conexão');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao conectar ao backend';
      setError(errorMessage);
      console.error('Connection error:', err);
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      // Fechar WebSocket
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }

      // Desconectar do backend
      const response = await fetch(`${API_BASE_URL}/api/disconnect`, {
        method: 'POST',
      });

      await response.json();

      setIsConnected(false);
      setCurrentWeight(0);
      setIsStable(false);
      setError(null);
    } catch (err) {
      console.error('Disconnect error:', err);
      // Mesmo com erro, limpar estado local
      setIsConnected(false);
      setCurrentWeight(0);
      setIsStable(false);
    }
  }, []);

  const addReading = useCallback(() => {
    const reading: WeightReading = {
      id: crypto.randomUUID(),
      value: currentWeight,
      unit,
      timestamp: new Date(),
      stable: isStable,
    };
    setReadings(prev => [reading, ...prev].slice(0, 100));
  }, [currentWeight, unit, isStable]);

  const clearReadings = useCallback(() => {
    setReadings([]);
  }, []);

  const tare = useCallback(() => {
    setTareValue(prev => prev + currentWeight);
    setCurrentWeight(0);
  }, [currentWeight]);

  // Verificar status da conexão ao montar
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/status`);
        const data = await response.json();
        if (data.connected) {
          setIsConnected(true);
        }
      } catch (err) {
        console.error('Erro ao verificar status:', err);
      }
    };

    checkStatus();
  }, []);

  return {
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
  };
}
