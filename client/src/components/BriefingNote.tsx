import { useEffect, useRef, useState, useCallback } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useWebSocket, SEPARATOR_MARKER, Participant } from '../hooks/useWebSocket';
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
const DEFAULT_WIDTH = 500;
const DEFAULT_HEIGHT = 1000;

// 섹션 높이 기본값 및 최소값
const DEFAULT_TOPICS_HEIGHT = 180;
const DEFAULT_ACTION_ITEMS_HEIGHT = 160;
const MIN_SECTION_HEIGHT = 80;

function BriefingNote({ onClose }: BriefingNoteProps) {
  const { isConnected, topics, activeTopicIndex, summary, isStreaming, connect, disconnect, addTopic, participants, actionItems, addAssigneeToActionItem, removeAssigneeFromActionItem } = useWebSocket();
  const summaryRef = useRef<HTMLDivElement>(null);
  const topicsContainerRef = useRef<HTMLDivElement>(null);
  const actionItemsListRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isAddingTopic, setIsAddingTopic] = useState(false);
  const [newTopicText, setNewTopicText] = useState('');
  const [draggedParticipant, setDraggedParticipant] = useState<Participant | null>(null);
  const [dragSourceItemId, setDragSourceItemId] = useState<string | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);

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

  // 섹션 높이 상태
  const [topicsHeight, setTopicsHeight] = useState(DEFAULT_TOPICS_HEIGHT);
  const [actionItemsHeight, setActionItemsHeight] = useState(DEFAULT_ACTION_ITEMS_HEIGHT);
  const [isResizingSection, setIsResizingSection] = useState<'topics' | 'actionItems' | null>(null);
  const sectionResizeStart = useRef<{ y: number; height: number }>({ y: 0, height: 0 });

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

  // 활성 주제로 스크롤
  useEffect(() => {
    if (topicsContainerRef.current && activeTopicIndex >= 0) {
      const activeItem = topicsContainerRef.current.children[activeTopicIndex] as HTMLElement;
      if (activeItem) {
        activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [activeTopicIndex]);

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

  // 섹션 최대 높이 계산 (내용이 스크롤 없이 보이는 높이)
  const getMaxTopicsHeight = useCallback(() => {
    if (!topicsContainerRef.current) return Infinity;
    // topics-list의 scrollHeight + 패딩(16px * 2) + add-topic-area(약 50px)
    const contentHeight = topicsContainerRef.current.scrollHeight;
    const fixedHeight = 32 + 50; // 패딩 + 안건추가
    return contentHeight + fixedHeight;
  }, []);

  const getMaxActionItemsHeight = useCallback(() => {
    if (!actionItemsListRef.current) return Infinity;
    // 각 action-item의 실제 높이를 합산 (scrollHeight는 컨테이너가 크면 컨테이너 크기를 반환함)
    const children = actionItemsListRef.current.children;
    let contentHeight = 0;
    for (let i = 0; i < children.length; i++) {
      contentHeight += (children[i] as HTMLElement).offsetHeight;
      if (i < children.length - 1) {
        contentHeight += 8; // gap
      }
    }
    const fixedHeight = 24 + 30; // 패딩(12*2) + 헤더(약 30px)
    return contentHeight + fixedHeight;
  }, []);

  // 섹션 리사이즈 시작
  const handleSectionResizeStart = useCallback((e: React.MouseEvent, section: 'topics' | 'actionItems') => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizingSection(section);
    sectionResizeStart.current = {
      y: e.clientY,
      height: section === 'topics' ? topicsHeight : actionItemsHeight
    };
  }, [topicsHeight, actionItemsHeight]);

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

      // 섹션 리사이즈 처리
      if (isResizingSection) {
        const deltaY = e.clientY - sectionResizeStart.current.y;
        if (isResizingSection === 'topics') {
          // 주제 영역: 아래로 드래그하면 높이 증가 (최대 높이 제한)
          const maxHeight = getMaxTopicsHeight();
          const newHeight = Math.min(maxHeight, Math.max(MIN_SECTION_HEIGHT, sectionResizeStart.current.height + deltaY));
          setTopicsHeight(newHeight);
        } else if (isResizingSection === 'actionItems') {
          // 액션 아이템 영역: 위로 드래그하면 높이 증가 (최대 높이 제한)
          const maxHeight = getMaxActionItemsHeight();
          const newHeight = Math.min(maxHeight, Math.max(MIN_SECTION_HEIGHT, sectionResizeStart.current.height - deltaY));
          setActionItemsHeight(newHeight);
        }
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      setResizeDirection('');
      setIsResizingSection(null);
    };

    if (isDragging || isResizing || isResizingSection) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
    };
  }, [isDragging, isResizing, isResizingSection, resizeDirection, size.width, size.height, getMaxTopicsHeight, getMaxActionItemsHeight]);

  const handleClose = () => {
    disconnect();
    onClose();
  };

  const handleAddTopicClick = () => {
    setIsAddingTopic(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleTopicSubmit = () => {
    if (newTopicText.trim()) {
      addTopic(newTopicText);
      setNewTopicText('');
      setIsAddingTopic(false);
    }
  };

  const handleTopicInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTopicSubmit();
    } else if (e.key === 'Escape') {
      setNewTopicText('');
      setIsAddingTopic(false);
    }
  };

  const handleTopicInputCancel = () => {
    setNewTopicText('');
    setIsAddingTopic(false);
  };

  // 참석자 ID로 참석자 정보 조회
  const getParticipant = (participantId: string) => {
    return participants.find((p) => p.id === participantId);
  };

  // 드래그 앤 드롭 핸들러
  const handleDragStartParticipant = (e: React.DragEvent, participant: Participant, sourceItemId: string) => {
    setDraggedParticipant(participant);
    setDragSourceItemId(sourceItemId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('participantId', participant.id);
    e.dataTransfer.setData('sourceItemId', sourceItemId);
  };

  const handleDragOver = (e: React.DragEvent, actionItemId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverItemId(actionItemId);
  };

  const handleDragLeave = () => {
    setDragOverItemId(null);
  };

  const handleDrop = (e: React.DragEvent, actionItemId: string) => {
    e.preventDefault();
    const participantId = e.dataTransfer.getData('participantId');
    const sourceItemId = e.dataTransfer.getData('sourceItemId');

    if (participantId) {
      // 같은 액션 아이템으로 드롭한 경우 무시
      if (sourceItemId === actionItemId) {
        setDraggedParticipant(null);
        setDragOverItemId(null);
        return;
      }

      // 이전 액션 아이템에서 제거
      if (sourceItemId) {
        removeAssigneeFromActionItem(sourceItemId, participantId);
      }

      // 새 액션 아이템에 추가
      addAssigneeToActionItem(actionItemId, participantId);
    }
    setDraggedParticipant(null);
    setDragOverItemId(null);
    setDragSourceItemId(null);
  };

  const handleDragEnd = () => {
    setDraggedParticipant(null);
    setDragOverItemId(null);
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

      <div className="popup-header" style={{ height: topicsHeight }} onMouseDown={handleDragStart}>
        <button className="close-button" onClick={handleClose}>
          &times;
        </button>
        <div className="topics-list" ref={topicsContainerRef}>
          {topics.length > 0 ? (
            topics.map((topicText, index) => (
              <div
                key={index}
                className={`topic-item ${index === activeTopicIndex ? 'active' : ''} ${index < activeTopicIndex ? 'completed' : ''}`}
              >
                <span className="topic-number">{index + 1}</span>
                <span className="topic-text">
                  <Markdown remarkPlugins={[remarkGfm]}>{topicText}</Markdown>
                </span>
              </div>
            ))
          ) : (
            <div className="topic-item loading">
              <span className="topic-text">회의 주제를 불러오는 중...</span>
            </div>
          )}
        </div>

        {/* 안건 추가 영역 */}
        <div className="add-topic-area">
          {isAddingTopic ? (
            <div className="add-topic-input-wrapper">
              <input
                ref={inputRef}
                type="text"
                className="add-topic-input"
                placeholder="새 안건을 입력하세요..."
                value={newTopicText}
                onChange={(e) => setNewTopicText(e.target.value)}
                onKeyDown={handleTopicInputKeyDown}
              />
              <button className="add-topic-confirm" onClick={handleTopicSubmit}>
                추가
              </button>
              <button className="add-topic-cancel" onClick={handleTopicInputCancel}>
                취소
              </button>
            </div>
          ) : (
            <button className="add-topic-button" onClick={handleAddTopicClick}>
              <span className="add-icon">+</span>
              <span>안건 추가</span>
            </button>
          )}
        </div>
      </div>

      {/* 주제 영역 리사이즈 핸들 */}
      <div
        className={`section-resize-handle ${isResizingSection === 'topics' ? 'active' : ''}`}
        onMouseDown={(e) => handleSectionResizeStart(e, 'topics')}
      >
        <div className="section-resize-grip" />
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

      {/* 액션 아이템 영역 리사이즈 핸들 */}
      <div
        className={`section-resize-handle ${isResizingSection === 'actionItems' ? 'active' : ''}`}
        onMouseDown={(e) => handleSectionResizeStart(e, 'actionItems')}
      >
        <div className="section-resize-grip" />
      </div>

      {/* 액션 아이템 영역 */}
      <div className="action-items-section" style={{ height: actionItemsHeight }}>
        <div className="action-items-header">액션 아이템</div>
        <div className="action-items-list" ref={actionItemsListRef}>
          {actionItems.map((item, index) => {
            const assignees = item.assigneeIds.map((id) => getParticipant(id)).filter(Boolean);
            return (
              <div
                key={item.id}
                className={`action-item ${dragOverItemId === item.id ? 'drag-over' : ''}`}
                onDragOver={(e) => handleDragOver(e, item.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, item.id)}
              >
                <span className="action-item-number">{index + 1}.</span>
                <span className="action-item-content">{item.content}</span>
                <div className="assignees-container">
                  {assignees.map((assignee, idx) => assignee && (
                    <div
                      key={assignee.id}
                      className="assignee-avatar"
                      style={{
                        backgroundColor: assignee.color,
                        marginLeft: idx > 0 ? '-10px' : '0',
                        zIndex: assignees.length - idx
                      }}
                      draggable
                      onDragStart={(e) => handleDragStartParticipant(e, assignee, item.id)}
                      onDragEnd={handleDragEnd}
                      title={`${assignee.name} - 다른 액션 아이템으로 드래그하여 이동`}
                    >
                      {assignee.initial}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default BriefingNote;
