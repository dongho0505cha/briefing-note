# 브리핑 노트 - 실시간 AI 요약 서비스

React + TypeScript 기반 웹 클라이언트와 Python FastAPI 기반 서버를 활용한 실시간 AI 요약 제공 서비스입니다.

## 프로젝트 구조

```
copilot-client-server/
├── client/                     # React + TypeScript 클라이언트
│   ├── src/
│   │   ├── components/
│   │   │   └── BriefingNote.tsx    # 브리핑 노트 팝업 컴포넌트
│   │   ├── contexts/
│   │   │   └── ThemeContext.tsx    # 다크/라이트 테마 컨텍스트
│   │   ├── hooks/
│   │   │   └── useWebSocket.ts     # WebSocket 연결 관리 훅
│   │   ├── styles/
│   │   │   ├── global.css          # 전역 스타일
│   │   │   ├── App.css             # App 컴포넌트 스타일
│   │   │   └── BriefingNote.css    # 팝업 스타일
│   │   ├── App.tsx                 # 메인 App 컴포넌트
│   │   └── main.tsx                # 엔트리 포인트
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── server/                     # Python FastAPI 서버
│   ├── venv/                       # Python 가상환경 (git 제외)
│   ├── main.py                     # 메인 서버 애플리케이션
│   └── requirements.txt            # Python 의존성
│
├── .gitignore
└── README.md
```

## 기술 스택

### 클라이언트
- **React 18** - UI 라이브러리
- **TypeScript** - 타입 안정성
- **Vite** - 빠른 빌드 도구
- **react-markdown** - 마크다운 렌더링
- **remark-gfm** - GitHub Flavored Markdown 지원
- **CSS3 Animations** - 마키 및 타이핑 효과

### 서버
- **Python 3.10+**
- **FastAPI** - 고성능 웹 프레임워크
- **WebSockets** - 실시간 양방향 통신
- **Uvicorn** - ASGI 서버

## 설치 및 실행

### 1. 서버 설정

```bash
cd server

# 가상환경 생성
python -m venv venv

# 가상환경 활성화
# Windows (PowerShell)
venv\Scripts\Activate.ps1
# Windows (CMD)
venv\Scripts\activate.bat
# macOS/Linux
source venv/bin/activate

# 의존성 설치
pip install -r requirements.txt

# 서버 실행
python main.py
# 또는
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

서버가 `http://localhost:8000`에서 실행됩니다.

### 2. 클라이언트 설정

```bash
cd client

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

클라이언트가 `http://localhost:3000`에서 실행됩니다.

## 주요 기능

### 1. 브리핑 노트 팝업
- 화면 우측 하단에 팝업 표시
- 팝업이 열리면 자동으로 WebSocket 연결 시작
- **드래그 앤 드롭**으로 팝업 위치 이동 가능
- **8방향 리사이즈** 지원 (모서리 및 가장자리)
- 닫기 버튼 클릭 시 연결 종료 및 팝업 닫힘

### 2. 다중 안건 관리 (상단 영역)
- WebSocket을 통해 전달받은 모든 안건 목록 표시
- 현재 활성 안건 **하이라이트** 표시
- 완료된 안건은 다른 스타일로 구분
- **안건 추가 기능**: + 버튼으로 새 안건 추가 가능
- 활성 안건으로 **자동 스크롤**

### 3. 실시간 요약 스트리밍 (중앙 영역)
- WebSocket을 통해 요약 내용을 청크 단위로 수신
- **마크다운 렌더링**: 표, 체크박스, 인용문 등 지원
- **타이핑 효과**: 글자가 실시간으로 작성되는 것처럼 표시
- **깜빡이는 커서**: 스트리밍 중 커서가 깜빡이며 표시
- 콘텐츠가 영역을 초과하면 **세로 스크롤바** 자동 생성
- 안건별 **구분선**으로 요약 구분

### 4. 액션 아이템 관리 (하단 영역)
- 회의에서 도출된 액션 아이템 목록 표시
- 각 액션 아이템에 **담당자 아바타** 표시
- **드래그 앤 드롭**으로 담당자를 다른 액션 아이템으로 이동 가능
- 담당자별 고유 색상의 아바타

### 5. 참석자 정보
- 회의 참석자 목록을 서버에서 수신
- 참석자별 이름, 이니셜, 고유 색상 관리

### 6. 테마 지원
- **다크 모드 / 라이트 모드** 지원
- 로컬 스토리지에 테마 설정 저장
- 테마 토글 기능

### 7. 연결 상태 표시
- 실시간 WebSocket 연결 상태 표시
- 연결됨: 녹색 점
- 연결 중/연결 해제: 빨간색 점 (깜빡임 효과)

## WebSocket 메시지 프로토콜

### 서버 → 클라이언트

| 타입 | 설명 | 데이터 |
|------|------|--------|
| `connected` | 연결 성공 알림 | `message`: 연결 메시지 |
| `topics_list` | 전체 안건 목록 | `data`: 안건 텍스트 배열 |
| `active_topic` | 현재 활성 안건 인덱스 | `index`: 안건 인덱스 (0부터 시작) |
| `participants` | 참석자 목록 | `data`: 참석자 객체 배열 |
| `action_items` | 액션 아이템 목록 | `data`: 액션 아이템 객체 배열 |
| `summary_start` | 요약 스트리밍 시작 | - |
| `summary_chunk` | 요약 텍스트 청크 | `data`: 텍스트 청크 |
| `summary_end` | 요약 스트리밍 완료 | - |
| `separator` | 요약 구분선 | - |

### 클라이언트 → 서버

| 타입 | 설명 |
|------|------|
| `request_update` | 새로운 데이터 요청 (태스크 재시작) |

### 데이터 타입

```typescript
// 참석자
interface Participant {
  id: string;       // 고유 ID
  name: string;     // 이름
  initial: string;  // 이니셜 (아바타 표시용)
  color: string;    // 고유 색상
}

// 액션 아이템
interface ActionItem {
  id: string;           // 고유 ID
  content: string;      // 내용
  assigneeIds: string[]; // 담당자 ID 배열
}
```

## 커스터마이징

### 서버 데이터 변경
`server/main.py`의 다음 상수를 수정하여 데이터를 변경할 수 있습니다:
- `PARTICIPANTS`: 참석자 목록
- `ACTION_ITEMS`: 액션 아이템 목록
- `SAMPLE_MEETING_DATA`: 안건 및 요약 데이터 배열

### 스트리밍 속도 조절
`server/main.py`의 `stream_summary` 함수에서:
- `chunk_size`: 한 번에 전송할 글자 수 (기본값: 3)
- `asyncio.sleep()`: 청크 간 딜레이 (기본값: 0.03초)

### 타이밍 조절
`server/main.py`에서:
- `send_topics`: 안건 활성화 간격 (기본값: 20초)
- `send_summaries`: 요약 전송 간격 (기본값: 10초)

### 스타일 변경
`client/src/styles/BriefingNote.css`에서:
- `.briefing-popup`: 팝업 기본 크기 및 스타일
- `.topic-item.active`: 활성 안건 스타일
- `.action-item`: 액션 아이템 스타일
- `.assignee-avatar`: 담당자 아바타 스타일

## API 엔드포인트

| 엔드포인트 | 설명 |
|------------|------|
| `GET /` | 서버 상태 확인 |
| `WS /ws/briefing` | 브리핑 노트 WebSocket 연결 |

## 라이선스

MIT License
