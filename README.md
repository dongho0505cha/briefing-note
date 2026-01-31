# 브리핑 노트 - 실시간 AI 요약 서비스

React + TypeScript 기반 웹 클라이언트와 Python FastAPI 기반 서버를 활용한 실시간 AI 요약 제공 서비스입니다.

## 프로젝트 구조

```
copilot-client-server/
├── client/                     # React + TypeScript 클라이언트
│   ├── src/
│   │   ├── components/
│   │   │   └── BriefingNote.tsx    # 브리핑 노트 팝업 컴포넌트
│   │   ├── hooks/
│   │   │   └── useWebSocket.ts     # WebSocket 연결 관리 훅
│   │   ├── styles/
│   │   │   ├── global.css          # 전역 스타일
│   │   │   ├── App.css             # App 컴포넌트 스타일
│   │   │   └── BriefingNote.css    # 팝업 스타일 (마키/타이핑 효과)
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
- 화면 좌측 하단의 "브리핑 노트" 버튼 클릭 시 팝업 표시
- 팝업이 열리면 자동으로 WebSocket 연결 시작
- 닫기 버튼 클릭 시 연결 종료 및 팝업 닫힘

### 2. 실시간 회의 주제 표시 (상단 영역)
- WebSocket을 통해 전달받은 회의 주제를 표시
- 텍스트가 팝업 너비를 초과하면 **우→좌 마키(슬라이드) 애니메이션** 자동 적용
- 파란색 배경의 헤더 영역에 표시

### 3. 실시간 요약 스트리밍 (하단 영역)
- WebSocket을 통해 요약 내용을 청크 단위로 수신
- **타이핑 효과**: 글자가 실시간으로 작성되는 것처럼 표시
- **깜빡이는 커서**: 스트리밍 중 커서가 깜빡이며 표시
- 콘텐츠가 영역을 초과하면 **세로 스크롤바** 자동 생성
- 새 내용이 추가될 때마다 자동으로 하단 스크롤

### 4. 연결 상태 표시
- 실시간 WebSocket 연결 상태 표시
- 연결됨: 녹색 점
- 연결 중/연결 해제: 빨간색 점 (깜빡임 효과)

## WebSocket 메시지 프로토콜

### 서버 → 클라이언트

| 타입 | 설명 | 데이터 |
|------|------|--------|
| `connected` | 연결 성공 알림 | `message`: 연결 메시지 |
| `topic` | 회의 주제 전송 | `data`: 주제 텍스트 |
| `summary_start` | 요약 스트리밍 시작 | - |
| `summary_chunk` | 요약 텍스트 청크 | `data`: 텍스트 청크 |
| `summary_end` | 요약 스트리밍 완료 | - |

### 클라이언트 → 서버

| 타입 | 설명 |
|------|------|
| `request_update` | 새로운 데이터 요청 |

## 커스터마이징

### 서버 데이터 변경
`server/main.py`의 `SAMPLE_MEETING_DATA` 딕셔너리를 수정하여 회의 주제와 요약 내용을 변경할 수 있습니다.

### 스트리밍 속도 조절
`server/main.py`의 `stream_summary` 함수에서:
- `chunk_size`: 한 번에 전송할 글자 수 (기본값: 3)
- `asyncio.sleep()`: 청크 간 딜레이 (기본값: 0.03초)

### 스타일 변경
`client/src/styles/BriefingNote.css`에서:
- `.briefing-popup`: 팝업 크기 및 위치
- `@keyframes marquee`: 마키 애니메이션 속도
- `.cursor`: 타이핑 커서 스타일

## API 엔드포인트

| 엔드포인트 | 설명 |
|------------|------|
| `GET /` | 서버 상태 확인 |
| `WS /ws/briefing` | 브리핑 노트 WebSocket 연결 |

## 라이선스

MIT License
