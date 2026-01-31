import { useEffect, useRef, useState, useCallback } from 'react';

interface WebSocketMessage {
  type: 'connected' | 'topics_list' | 'active_topic' | 'summary_start' | 'summary_chunk' | 'summary_end' | 'separator';
  data?: string | string[];
  index?: number;
  message?: string;
}

// 구분선 마커 (컴포넌트에서 이를 감지하여 렌더링)
export const SEPARATOR_MARKER = '___SEPARATOR___';

interface UseWebSocketReturn {
  isConnected: boolean;
  topics: string[];
  activeTopicIndex: number;
  summary: string;
  isStreaming: boolean;
  connect: () => void;
  disconnect: () => void;
  addTopic: (topic: string) => void;
}

const WS_URL = 'ws://localhost:8000/ws/briefing';

export function useWebSocket(): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [topics, setTopics] = useState<string[]>([]);
  const [activeTopicIndex, setActiveTopicIndex] = useState(-1);
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

        case 'topics_list':
          // 모든 topic 목록 수신
          if (Array.isArray(message.data)) {
            setTopics(message.data);
          }
          break;

        case 'active_topic':
          // 활성 topic 인덱스 수신
          if (typeof message.index === 'number') {
            setActiveTopicIndex(message.index);
          }
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
    setTopics([]);
    setActiveTopicIndex(-1);
    setSummary('');
    setIsStreaming(false);
  }, []);

  const addTopic = useCallback((topic: string) => {
    if (topic.trim()) {
      setTopics((prev) => [...prev, topic.trim()]);
    }
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    topics,
    activeTopicIndex,
    summary,
    isStreaming,
    connect,
    disconnect,
    addTopic,
  };
}
