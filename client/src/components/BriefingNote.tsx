import { useEffect, useRef, useState, useCallback } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useWebSocket, SEPARATOR_MARKER } from '../hooks/useWebSocket';
import '../styles/BriefingNote.css';

interface BriefingNoteProps {
  onClose: () => void;
}

interface Position {
  x: number;
  y: number;
}

interface Size {
  width: number;
  height: number;
}

const MIN_WIDTH = 280;
const MIN_HEIGHT = 300;
const DEFAULT_WIDTH = 350;
const DEFAULT_HEIGHT = 450;

function BriefingNote({ onClose }: BriefingNoteProps) {
  const { isConnected, topic, summary, isStreaming, connect, disconnect } = useWebSocket();
  const summaryRef = useRef<HTMLDivElement>(null);
  const topicRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [isOverflow, setIsOverflow] = useState(false);

  // 위치 및 크기 상태 (우측 하단에 배치)
  const [position, setPosition] = useState<Position>({
    x: window.innerWidth - DEFAULT_WIDTH - 30,
    y: window.innerHeight - DEFAULT_HEIGHT - 120
  });
  const [size, setSize] = useState<Size>({ width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<string>('');
  const dragStart = useRef<Position>({ x: 0, y: 0 });
  const resizeStart = useRef<{ x: number; y: number; width: number; height: number; posX: number; posY: number }>({
    x: 0, y: 0, width: 0, height: 0, posX: 0, posY: 0
  });

  // 팝업 열릴 때 WebSocket 연결
  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // 요약 내용이 업데이트될 때 자동 스크롤
  useEffect(() => {
    if (summaryRef.current) {
      summaryRef.current.scrollTop = summaryRef.current.scrollHeight;
    }
  }, [summary]);

  // 주제 텍스트가 컨테이너보다 길면 슬라이드 애니메이션 활성화
  useEffect(() => {
    if (topicRef.current && containerRef.current) {
      const textWidth = topicRef.current.scrollWidth;
      const containerWidth = containerRef.current.clientWidth;
      setIsOverflow(textWidth > containerWidth);
    }
  }, [topic, size.width]);

  // 드래그 시작
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.close-button')) return;
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
  }, [position]);

  // 리사이즈 시작
  const handleResizeStart = useCallback((e: React.MouseEvent, direction: string) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeDirection(direction);
    resizeStart.current = {
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height,
      posX: position.x,
      posY: position.y
    };
  }, [size, position]);

  // 마우스 이동 처리
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = Math.max(0, Math.min(e.clientX - dragStart.current.x, window.innerWidth - size.width));
        const newY = Math.max(0, Math.min(e.clientY - dragStart.current.y, window.innerHeight - size.height));
        setPosition({ x: newX, y: newY });
      }

      if (isResizing) {
        const deltaX = e.clientX - resizeStart.current.x;
        const deltaY = e.clientY - resizeStart.current.y;
        let newWidth = resizeStart.current.width;
        let newHeight = resizeStart.current.height;
        let newX = resizeStart.current.posX;
        let newY = resizeStart.current.posY;

        if (resizeDirection.includes('e')) {
          newWidth = Math.max(MIN_WIDTH, resizeStart.current.width + deltaX);
        }
        if (resizeDirection.includes('w')) {
          const possibleWidth = resizeStart.current.width - deltaX;
          if (possibleWidth >= MIN_WIDTH) {
            newWidth = possibleWidth;
            newX = resizeStart.current.posX + deltaX;
          }
        }
        if (resizeDirection.includes('s')) {
          newHeight = Math.max(MIN_HEIGHT, resizeStart.current.height + deltaY);
        }
        if (resizeDirection.includes('n')) {
          const possibleHeight = resizeStart.current.height - deltaY;
          if (possibleHeight >= MIN_HEIGHT) {
            newHeight = possibleHeight;
            newY = resizeStart.current.posY + deltaY;
          }
        }

        // 화면 경계 체크
        newX = Math.max(0, newX);
        newY = Math.max(0, newY);
        newWidth = Math.min(newWidth, window.innerWidth - newX);
        newHeight = Math.min(newHeight, window.innerHeight - newY);

        setSize({ width: newWidth, height: newHeight });
        setPosition({ x: newX, y: newY });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      setResizeDirection('');
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
    };
  }, [isDragging, isResizing, resizeDirection, size.width, size.height]);

  const handleClose = () => {
    disconnect();
    onClose();
  };

  return (
    <div
      ref={popupRef}
      className={`briefing-popup ${isDragging ? 'dragging' : ''} ${isResizing ? 'resizing' : ''}`}
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height
      }}
    >
      {/* 리사이즈 핸들 */}
      <div className="resize-handle resize-n" onMouseDown={(e) => handleResizeStart(e, 'n')} />
      <div className="resize-handle resize-s" onMouseDown={(e) => handleResizeStart(e, 's')} />
      <div className="resize-handle resize-e" onMouseDown={(e) => handleResizeStart(e, 'e')} />
      <div className="resize-handle resize-w" onMouseDown={(e) => handleResizeStart(e, 'w')} />
      <div className="resize-handle resize-ne" onMouseDown={(e) => handleResizeStart(e, 'ne')} />
      <div className="resize-handle resize-nw" onMouseDown={(e) => handleResizeStart(e, 'nw')} />
      <div className="resize-handle resize-se" onMouseDown={(e) => handleResizeStart(e, 'se')} />
      <div className="resize-handle resize-sw" onMouseDown={(e) => handleResizeStart(e, 'sw')} />

      <div className="popup-header" onMouseDown={handleDragStart}>
        <button className="close-button" onClick={handleClose}>
          &times;
        </button>
        <div className="topic-container" ref={containerRef}>
          <div className={`topic-wrapper ${isOverflow ? 'marquee' : ''}`}>
            <span ref={topicRef} className="topic-text">
              <Markdown remarkPlugins={[remarkGfm]}>{topic || '회의 주제를 불러오는 중...'}</Markdown>
            </span>
            {isOverflow && (
              <span className="topic-text">
                <Markdown remarkPlugins={[remarkGfm]}>{topic}</Markdown>
              </span>
            )}
          </div>
        </div>
        <div className="connection-status">
          <span className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}></span>
          {isConnected ? '연결됨' : '연결 중...'}
        </div>
      </div>

      <div className="popup-content" ref={summaryRef}>
        <div className="summary-text markdown-content">
          {summary ? (
            summary.split(SEPARATOR_MARKER).map((section, index) => (
              <div key={index} className="summary-section">
                {index > 0 && <div className="summary-separator" />}
                <Markdown remarkPlugins={[remarkGfm]}>{section}</Markdown>
              </div>
            ))
          ) : (
            isConnected ? '요약을 불러오는 중...' : ''
          )}
          {isStreaming && <span className="cursor">|</span>}
        </div>
      </div>
    </div>
  );
}

export default BriefingNote;
