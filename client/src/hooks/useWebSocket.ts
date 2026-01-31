import { useEffect, useRef, useState, useCallback } from 'react';

interface WebSocketMessage {
  type: 'connected' | 'topic' | 'summary_start' | 'summary_chunk' | 'summary_end' | 'separator';
  data?: string;
  message?: string;
}

// 구분선 마커 (컴포넌트에서 이를 감지하여 렌더링)
export const SEPARATOR_MARKER = '___SEPARATOR___';

interface UseWebSocketReturn {
  isConnected: boolean;
  topic: string;
  summary: string;
  isStreaming: boolean;
  connect: () => void;
  disconnect: () => void;
}

const WS_URL = 'ws://localhost:8000/ws/briefing';

export function useWebSocket(): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [topic, setTopic] = useState('');
  const [summary, setSummary] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      setIsConnected(true);
      console.log('WebSocket 연결됨');
    };

    ws.onmessage = (event) => {
      const message: WebSocketMessage = JSON.parse(event.data);

      switch (message.type) {
        case 'connected':
          console.log(message.message);
          break;

        case 'topic':
          setTopic(message.data || '');
          break;

        case 'summary_start':
          setIsStreaming(true);
          break;

        case 'summary_chunk':
          setSummary((prev) => prev + (message.data || ''));
          break;

        case 'summary_end':
          setIsStreaming(false);
          break;

        case 'separator':
          // 구분선 마커 추가
          setSummary((prev) => prev + SEPARATOR_MARKER);
          break;
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket 에러:', error);
    };

    ws.onclose = () => {
      setIsConnected(false);
      console.log('WebSocket 연결 종료');
    };

    wsRef.current = ws;
  }, []);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setTopic('');
    setSummary('');
    setIsStreaming(false);
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    topic,
    summary,
    isStreaming,
    connect,
    disconnect,
  };
}
