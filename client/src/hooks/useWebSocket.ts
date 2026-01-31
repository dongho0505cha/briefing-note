import { useEffect, useRef, useState, useCallback } from 'react';

// 참석자 타입
export interface Participant {
  id: string;
  name: string;
  initial: string;
  color: string;
}

// 액션 아이템 타입
export interface ActionItem {
  id: string;
  content: string;
  assigneeIds: string[];
}

interface WebSocketMessage {
  type: 'connected' | 'topics_list' | 'active_topic' | 'summary_start' | 'summary_chunk' | 'summary_end' | 'separator' | 'participants' | 'action_items';
  data?: string | string[] | Participant[] | ActionItem[];
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
  participants: Participant[];
  actionItems: ActionItem[];
  connect: () => void;
  disconnect: () => void;
  addTopic: (topic: string) => void;
  addAssigneeToActionItem: (actionItemId: string, participantId: string) => void;
  removeAssigneeFromActionItem: (actionItemId: string, participantId: string) => void;
}

const WS_URL = 'ws://localhost:8000/ws/briefing';

export function useWebSocket(): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [topics, setTopics] = useState<string[]>([]);
  const [activeTopicIndex, setActiveTopicIndex] = useState(-1);
  const [summary, setSummary] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
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

        case 'participants':
          // 참석자 목록 수신
          if (Array.isArray(message.data)) {
            setParticipants(message.data as Participant[]);
          }
          break;

        case 'action_items':
          // 액션 아이템 목록 수신
          if (Array.isArray(message.data)) {
            setActionItems(message.data as ActionItem[]);
          }
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
    setParticipants([]);
    setActionItems([]);
  }, []);

  const addTopic = useCallback((topic: string) => {
    if (topic.trim()) {
      setTopics((prev) => [...prev, topic.trim()]);
    }
  }, []);

  const addAssigneeToActionItem = useCallback((actionItemId: string, participantId: string) => {
    setActionItems((prev) =>
      prev.map((item) => {
        if (item.id === actionItemId && !item.assigneeIds.includes(participantId)) {
          return { ...item, assigneeIds: [...item.assigneeIds, participantId] };
        }
        return item;
      })
    );
  }, []);

  const removeAssigneeFromActionItem = useCallback((actionItemId: string, participantId: string) => {
    setActionItems((prev) =>
      prev.map((item) => {
        if (item.id === actionItemId) {
          return { ...item, assigneeIds: item.assigneeIds.filter((id) => id !== participantId) };
        }
        return item;
      })
    );
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
    participants,
    actionItems,
    connect,
    disconnect,
    addTopic,
    addAssigneeToActionItem,
    removeAssigneeFromActionItem,
  };
}
