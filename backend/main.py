from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import serial
import serial.tools.list_ports
import asyncio
import logging
import re
from contextlib import asynccontextmanager

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Estado global da conexão serial
serial_connection: Optional[serial.Serial] = None
serial_task: Optional[asyncio.Task] = None
websocket_clients: List[WebSocket] = []


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Gerencia o ciclo de vida da aplicação"""
    yield
    # Cleanup ao encerrar
    if serial_connection and serial_connection.is_open:
        serial_connection.close()
        logger.info("Conexão serial fechada ao encerrar aplicação")


app = FastAPI(
    title="Balança Industrial API",
    description="API para comunicação com balança via porta serial",
    version="1.0.0",
    lifespan=lifespan
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:8080",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8080",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Modelos Pydantic
class ConnectionRequest(BaseModel):
    port: Optional[str] = None
    baudrate: int = 9600
    bytesize: int = 7
    parity: str = "E"  # Even
    stopbits: int = 1
    timeout: float = 1.0


class ConnectionStatus(BaseModel):
    connected: bool
    port: Optional[str] = None
    error: Optional[str] = None


class WeightData(BaseModel):
    value: float
    unit: str
    stable: bool
    raw_data: str


async def read_serial_data():
    """Lê dados da porta serial e envia para clientes WebSocket"""
    global serial_connection
    
    if not serial_connection or not serial_connection.is_open:
        return
    
    buffer = bytearray()
    
    try:
        while serial_connection.is_open:
            try:
                # Ler dados disponíveis
                if serial_connection.in_waiting > 0:
                    data = serial_connection.read(serial_connection.in_waiting)
                    buffer.extend(data)
                    
                    # Processar linhas completas (terminadas com \n ou \r\n)
                    while b'\n' in buffer or b'\r' in buffer:
                        # Encontrar fim de linha
                        if b'\n' in buffer:
                            line_end = buffer.index(b'\n')
                        elif b'\r' in buffer:
                            line_end = buffer.index(b'\r')
                        else:
                            break
                        
                        # Extrair linha
                        line_bytes = bytes(buffer[:line_end])
                        buffer = buffer[line_end + 1:]
                        
                        # Decodificar e processar
                        try:
                            decoded = line_bytes.decode('utf-8', errors='ignore').strip()
                            if decoded:
                                await broadcast_weight_data(decoded)
                        except Exception as e:
                            logger.warning(f"Erro ao processar linha: {e}")
                
                await asyncio.sleep(0.05)  # Pequeno delay para não sobrecarregar
                
            except serial.SerialException as e:
                logger.error(f"Erro de comunicação serial: {e}")
                await broadcast_error(f"Erro de comunicação: {str(e)}")
                break
            except Exception as e:
                logger.error(f"Erro ao ler dados: {e}")
                await asyncio.sleep(0.1)
            
    except Exception as e:
        logger.error(f"Erro no loop de leitura serial: {e}")
        await broadcast_error(str(e))


async def broadcast_weight_data(raw_data: str):
    """Envia dados de peso para todos os clientes WebSocket conectados"""
    if not websocket_clients:
        return
    
    # Parse dos dados (formato comum: "ST,GS,+  123.45 kg" ou "  123.45 kg")
    clean_data = raw_data.strip()
    logger.debug(f"Dados recebidos da balança: {repr(clean_data)}")
    
    # Verificar indicador de estabilidade
    stable = "ST" in clean_data or "US" not in clean_data
    
    # Extrair valor numérico - regex melhorado para capturar todos os decimais
    # Captura números com ou sem sinal, incluindo decimais que começam com 0 (ex: 0.178)
    # Padrão: [+-]? espaços opcionais, depois número (inteiro ou decimal)
    match = re.search(r'[+-]?\s*(\d+\.\d+|\d+)', clean_data)
    weight = 0.0
    if match:
        weight_str = match.group(1)
        # Preservar todos os decimais convertendo para float
        # O float em Python preserva a precisão dos decimais
        weight = float(weight_str)
        logger.info(f"Valor extraído da balança: '{weight_str}' -> {weight} (dados brutos: {repr(clean_data)})")
    else:
        logger.warning(f"Não foi possível extrair valor numérico de: {repr(clean_data)}")
        # Tentar um regex alternativo mais permissivo
        alt_match = re.search(r'(\d+[.,]\d+)', clean_data.replace(',', '.'))
        if alt_match:
            weight_str = alt_match.group(1).replace(',', '.')
            weight = float(weight_str)
            logger.info(f"Valor extraído (regex alternativo): '{weight_str}' -> {weight}")
    
    # Extrair unidade
    unit_match = re.search(r'(kg|g|lb|oz)', clean_data, re.IGNORECASE)
    unit = unit_match.group(1).lower() if unit_match else "kg"
    
    weight_data = WeightData(
        value=weight,
        unit=unit,
        stable=stable,
        raw_data=raw_data
    )
    
    # Enviar para todos os clientes conectados
    disconnected_clients = []
    for client in websocket_clients:
        try:
            await client.send_json(weight_data.dict())
        except Exception as e:
            logger.warning(f"Erro ao enviar para cliente: {e}")
            disconnected_clients.append(client)
    
    # Remover clientes desconectados
    for client in disconnected_clients:
        if client in websocket_clients:
            websocket_clients.remove(client)


async def broadcast_error(error_message: str):
    """Envia mensagem de erro para todos os clientes"""
    for client in websocket_clients:
        try:
            await client.send_json({
                "error": error_message,
                "type": "error"
            })
        except:
            pass


@app.get("/")
async def root():
    return {"message": "Balança Industrial API", "version": "1.0.0"}


@app.get("/api/ports", response_model=List[dict])
async def list_ports():
    """Lista todas as portas seriais disponíveis"""
    ports = serial.tools.list_ports.comports()
    return [
        {
            "device": port.device,
            "description": port.description,
            "manufacturer": port.manufacturer,
            "hwid": port.hwid
        }
        for port in ports
    ]


@app.post("/api/connect", response_model=ConnectionStatus)
async def connect(request: ConnectionRequest):
    """Conecta à porta serial"""
    global serial_connection, serial_task
    
    if serial_connection and serial_connection.is_open:
        return ConnectionStatus(
            connected=True,
            port=serial_connection.port,
            error=None
        )
    
    try:
        # Se não especificou porta, tenta encontrar automaticamente
        port = request.port
        if not port:
            ports = serial.tools.list_ports.comports()
            if not ports:
                raise HTTPException(
                    status_code=400,
                    detail="Nenhuma porta serial encontrada"
                )
            port = ports[0].device
            logger.info(f"Usando primeira porta disponível: {port}")
        
        # Criar conexão serial
        serial_connection = serial.Serial(
            port=port,
            baudrate=request.baudrate,
            bytesize=request.bytesize,
            parity=request.parity,
            stopbits=request.stopbits,
            timeout=request.timeout
        )
        
        logger.info(f"Conectado à porta {port}")
        
        # Iniciar task de leitura
        serial_task = asyncio.create_task(read_serial_data())
        
        return ConnectionStatus(
            connected=True,
            port=port,
            error=None
        )
        
    except serial.SerialException as e:
        error_msg = f"Erro ao conectar à porta serial: {str(e)}"
        logger.error(error_msg)
        return ConnectionStatus(
            connected=False,
            port=None,
            error=error_msg
        )
    except Exception as e:
        error_msg = f"Erro inesperado: {str(e)}"
        logger.error(error_msg)
        return ConnectionStatus(
            connected=False,
            port=None,
            error=error_msg
        )


@app.post("/api/disconnect", response_model=ConnectionStatus)
async def disconnect():
    """Desconecta da porta serial"""
    global serial_connection, serial_task
    
    try:
        if serial_task:
            serial_task.cancel()
            try:
                await serial_task
            except asyncio.CancelledError:
                pass
            serial_task = None
        
        if serial_connection and serial_connection.is_open:
            serial_connection.close()
            logger.info("Desconectado da porta serial")
        
        serial_connection = None
        
        return ConnectionStatus(
            connected=False,
            port=None,
            error=None
        )
    except Exception as e:
        error_msg = f"Erro ao desconectar: {str(e)}"
        logger.error(error_msg)
        return ConnectionStatus(
            connected=False,
            port=None,
            error=error_msg
        )


@app.get("/api/status", response_model=ConnectionStatus)
async def get_status():
    """Retorna o status atual da conexão"""
    if serial_connection and serial_connection.is_open:
        return ConnectionStatus(
            connected=True,
            port=serial_connection.port,
            error=None
        )
    else:
        return ConnectionStatus(
            connected=False,
            port=None,
            error=None
        )


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """Endpoint WebSocket para receber dados em tempo real"""
    await websocket.accept()
    websocket_clients.append(websocket)
    logger.info(f"Cliente WebSocket conectado. Total: {len(websocket_clients)}")
    
    try:
        while True:
            # Manter conexão viva e escutar por mensagens do cliente
            data = await websocket.receive_text()
            # Cliente pode enviar ping/pong ou outras mensagens
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        logger.info("Cliente WebSocket desconectado")
    except Exception as e:
        logger.error(f"Erro no WebSocket: {e}")
    finally:
        if websocket in websocket_clients:
            websocket_clients.remove(websocket)
        logger.info(f"Cliente WebSocket removido. Total: {len(websocket_clients)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

