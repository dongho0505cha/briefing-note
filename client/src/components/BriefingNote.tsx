import { useEffect, useRef, useState, useCallback } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useWebSocket, Participant } from '../hooks/useWebSocket';
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
  const { isConnected, topics, activeTopicIndex, summarySections, currentSectionContent, currentSectionTimestamp, isStreaming, connect, disconnect, addTopic, participants, actionItems, addAssigneeToActionItem, removeAssigneeFromActionItem } = useWebSocket();
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
  const [isTrashOver, setIsTrashOver] = useState(false);
  const [addingAssigneeToItemId, setAddingAssigneeToItemId] = useState<string | null>(null);
  const [popupPosition, setPopupPosition] = useState<{ top: number; right: number } | null>(null);

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
  }, [summarySections, currentSectionContent]);

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
    // 각 topic-item의 실제 높이를 합산
    const children = topicsContainerRef.current.children;
    let contentHeight = 0;
    for (let i = 0; i < children.length; i++) {
      contentHeight += (children[i] as HTMLElement).offsetHeight;
      if (i < children.length - 1) {
        contentHeight += 8; // gap
      }
    }
    // 헤더 패딩(16px * 2) + topics-list margin-top(8px) + add-topic-area(약 60px)
    const fixedHeight = 32 + 8 + 60;
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
    setIsTrashOver(false);
  };

  // 휴지통 드롭 핸들러
  const handleTrashDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsTrashOver(true);
  };

  const handleTrashDragLeave = () => {
    setIsTrashOver(false);
  };

  const handleTrashDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const participantId = e.dataTransfer.getData('participantId');
    const sourceItemId = e.dataTransfer.getData('sourceItemId');

    if (participantId && sourceItemId) {
      removeAssigneeFromActionItem(sourceItemId, participantId);
    }
    setDraggedParticipant(null);
    setDragOverItemId(null);
    setDragSourceItemId(null);
    setIsTrashOver(false);
  };

  // 참석자 추가 팝업 토글
  const handleAddAssigneeClick = (e: React.MouseEvent<HTMLButtonElement>, actionItemId: string) => {
    if (addingAssigneeToItemId === actionItemId) {
      setAddingAssigneeToItemId(null);
      setPopupPosition(null);
    } else {
      const button = e.currentTarget;
      const rect = button.getBoundingClientRect();
      setPopupPosition({
        top: rect.top - 8, // 버튼 위에 표시 (여유 8px)
        right: window.innerWidth - rect.right
      });
      setAddingAssigneeToItemId(actionItemId);
    }
  };

  // 참석자 선택
  const handleSelectParticipant = (actionItemId: string, participantId: string) => {
    addAssigneeToActionItem(actionItemId, participantId);
    setAddingAssigneeToItemId(null);
  };

  // 이미 할당된 참석자 제외한 목록
  const getAvailableParticipants = (actionItemId: string) => {
    const item = actionItems.find(i => i.id === actionItemId);
    if (!item) return participants;
    return participants.filter(p => !item.assigneeIds.includes(p.id));
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
                <span className="topic-indicator">
                  {index < activeTopicIndex ? (
                    <span className="check-icon">✓</span>
                  ) : index === activeTopicIndex ? (
                    <span className="arrow-icon">›</span>
                  ) : null}
                </span>
                <span className="topic-text">
                  <Markdown remarkPlugins={[remarkGfm]}>{topicText}</Markdown>
                </span>
                {index === activeTopicIndex && (
                  <span className="topic-loading-dots">
                    <span className="dot"></span>
                    <span className="dot"></span>
                    <span className="dot"></span>
                  </span>
                )}
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
          {summarySections.length > 0 || currentSectionContent ? (
            <>
              {summarySections.map((section, index) => (
                <div key={index} className="summary-section">
                  {index > 0 && (
                    <div className="summary-separator">
                      <span className="separator-time">{section.timestamp}</span>
                    </div>
                  )}
                  {index === 0 && (
                    <div className="summary-separator first-separator">
                      <span className="separator-time">{section.timestamp}</span>
                    </div>
                  )}
                  <Markdown remarkPlugins={[remarkGfm]}>{section.content}</Markdown>
                </div>
              ))}
              {currentSectionContent && (
                <div className="summary-section">
                  {summarySections.length > 0 ? (
                    <div className="summary-separator">
                      <span className="separator-time">{currentSectionTimestamp}</span>
                    </div>
                  ) : (
                    <div className="summary-separator first-separator">
                      <span className="separator-time">{currentSectionTimestamp}</span>
                    </div>
                  )}
                  <Markdown remarkPlugins={[remarkGfm]}>{currentSectionContent}</Markdown>
                </div>
              )}
            </>
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
        <div className="action-items-header">
          <span>액션 아이템</span>
          {/* 휴지통 - 드래그 중일 때만 표시 */}
          {draggedParticipant && (
            <div
              className={`trash-drop-zone ${isTrashOver ? 'active' : ''}`}
              onDragOver={handleTrashDragOver}
              onDragLeave={handleTrashDragLeave}
              onDrop={handleTrashDrop}
              title="여기에 드롭하여 담당자 제거"
            >
              🗑️
            </div>
          )}
        </div>
        <div className="action-items-list" ref={actionItemsListRef}>
          {actionItems.map((item) => {
            const assignees = item.assigneeIds.map((id) => getParticipant(id)).filter(Boolean);
            const availableParticipants = getAvailableParticipants(item.id);
            return (
              <div
                key={item.id}
                className={`action-item ${dragOverItemId === item.id ? 'drag-over' : ''}`}
                onDragOver={(e) => handleDragOver(e, item.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, item.id)}
              >
                <span className="action-item-bullet">•</span>
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
                  {/* 담당자 추가 버튼 */}
                  {availableParticipants.length > 0 && (
                    <div className="add-assignee-wrapper">
                      <button
                        className={`add-assignee-button ${addingAssigneeToItemId === item.id ? 'active' : ''}`}
                        onClick={(e) => handleAddAssigneeClick(e, item.id)}
                        title="담당자 추가"
                        style={{ marginLeft: assignees.length > 0 ? '-10px' : '0' }}
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 참석자 선택 팝업 - fixed position으로 stacking context 문제 해결 */}
      {addingAssigneeToItemId && popupPosition && (
        <div
          className="participant-popup fixed-popup"
          style={{
            position: 'fixed',
            top: popupPosition.top,
            right: popupPosition.right,
            transform: 'translateY(-100%)'
          }}
        >
          {getAvailableParticipants(addingAssigneeToItemId).map((p) => (
            <div
              key={p.id}
              className="participant-option"
              onClick={() => handleSelectParticipant(addingAssigneeToItemId, p.id)}
            >
              <div
                className="participant-option-avatar"
                style={{ backgroundColor: p.color }}
              >
                {p.initial}
              </div>
              <span className="participant-option-name">{p.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default BriefingNote;
