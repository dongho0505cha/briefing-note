import asyncio
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Briefing Note Server")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ConnectionManager:
    """WebSocket 연결 관리자"""

    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def send_message(self, message: dict, websocket: WebSocket):
        await websocket.send_json(message)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            await connection.send_json(message)


manager = ConnectionManager()

# 샘플 회의 데이터 (마크다운 형식)
SAMPLE_MEETING_DATA = [
    {
        "topic": '📋 **STT 후보 업체 리뷰** 주제로 회의가 진행되고 있습니다...',
        "summary": """## 📊 STT 후보업체 리뷰 요약

### 1. 텍스트 투 오디오 마스터
- **장점**: 높은 인식률, 다양한 언어 지원, 실시간 처리 가능
- **단점**: 비용이 높음, 커스터마이징 제한적

### 2. STT EX
- **장점**: 가격 경쟁력, 한국어 특화, API 연동 용이
- **단점**: 영어 인식률 낮음, 처리 속도 느림

### 3. 오디오 스트림
- **장점**: 실시간 스트리밍 지원, 낮은 지연시간, 확장성 우수
- **단점**: 초기 설정 복잡, 기술 지원 부족

---

> 💡 **결론**: 비용과 한국어 성능을 고려할 때 `STT EX`를 **1차 후보**로 검토하되, 영어 지원이 필요한 경우 *텍스트 투 오디오 마스터*와 병행 사용을 권장합니다.""",
    },
    {
        "topic": '📅 **도입 일정 및 예산 논의** 주제로 회의가 진행되고 있습니다...',
        "summary": """## 📅 도입 일정 및 예산 검토 요약

### 1. 예상 도입 일정
| 단계 | 기간 | 내용 |
|------|------|------|
| 1단계 | 1~2주 | 기술 검증 및 PoC 진행 |
| 2단계 | 3~4주 | 파일럿 테스트 및 피드백 수집 |
| 3단계 | 5~8주 | 본격 도입 및 안정화 |

### 2. 예산 분석
- **STT EX**: 월 `500만원` (1000시간 기준)
- **텍스트 투 오디오 마스터**: 월 `800만원` (1000시간 기준)
- **추가 개발 비용**: 약 `2000만원` (API 연동 및 커스터마이징)

### 3. 의사결정 사항
- [x] STT EX로 1차 PoC 진행 **승인**
- [ ] 다음 주 월요일까지 기술팀 검토 보고서 제출
- [ ] 예산 승인은 PoC 결과 확인 후 진행

---

> 📌 **다음 회의**: 2주 후 PoC 결과 리뷰 예정""",
    },
    {
        "topic": '📝 **회의 참석자 액션 아이템** 배정이 완료되었습니다...',
        "summary": """## 📋 회의 참석자 액션 아이템

### 👤 차동호 (프로젝트 매니저)
| 항목 | 내용 | 마감일 |
|------|------|--------|
| 1 | PoC 일정 수립 및 킥오프 미팅 준비 | 2/5 (월) |
| 2 | 각 팀별 R&R 정의서 작성 | 2/7 (수) |
| 3 | 주간 진행 상황 보고 체계 구축 | 2/9 (금) |

- [ ] 이해관계자 커뮤니케이션 계획 수립
- [ ] 리스크 관리 대장 작성

---

### 👤 이덕형 (기술 리드)
| 항목 | 내용 | 마감일 |
|------|------|--------|
| 1 | STT EX API 기술 검토 보고서 작성 | 2/5 (월) |
| 2 | 테스트 환경 구축 및 설정 | 2/8 (목) |
| 3 | 성능 벤치마크 테스트 계획 수립 | 2/9 (금) |

- [ ] 기존 시스템 연동 방안 검토
- [ ] 보안 요구사항 체크리스트 작성

---

### 👤 이재욱 (재무 담당)
| 항목 | 내용 | 마감일 |
|------|------|--------|
| 1 | 상세 비용 산출서 작성 | 2/6 (화) |
| 2 | ROI 분석 보고서 준비 | 2/8 (목) |
| 3 | 예산 승인 품의서 초안 작성 | 2/12 (월) |

- [ ] 벤더 계약 조건 검토
- [ ] 월별 비용 집행 계획 수립

---

> ⚠️ **중요**: 모든 액션 아이템은 **2/12(월) 다음 회의 전**까지 완료되어야 합니다.""",
    },
]


@app.get("/")
async def root():
    return {"message": "Briefing Note WebSocket Server", "status": "running"}


@app.websocket("/ws/briefing")
async def websocket_endpoint(websocket: WebSocket):
    """브리핑 노트 WebSocket 엔드포인트"""
    await manager.connect(websocket)
    try:
        # 연결 성공 메시지
        await manager.send_message(
            {"type": "connected", "message": "WebSocket 연결이 성공했습니다."}, websocket
        )

        # 첫 번째 요약 전송: STT 후보업체 리뷰
        await asyncio.sleep(0.5)
        await manager.send_message(
            {"type": "topic", "data": SAMPLE_MEETING_DATA[0]["topic"]}, websocket
        )

        await asyncio.sleep(1)
        await stream_summary(websocket, SAMPLE_MEETING_DATA[0]["summary"])

        # 10초 후 두 번째 요약 전송: 도입 일정 및 예산 검토
        await asyncio.sleep(10)

        await manager.send_message({"type": "separator"}, websocket)
        await manager.send_message(
            {"type": "topic", "data": SAMPLE_MEETING_DATA[1]["topic"]}, websocket
        )

        await asyncio.sleep(0.5)
        await stream_summary(websocket, SAMPLE_MEETING_DATA[1]["summary"])

        # 10초 후 세 번째 요약 전송: 회의 참석자 액션 아이템
        await asyncio.sleep(10)

        await manager.send_message({"type": "separator"}, websocket)
        await manager.send_message(
            {"type": "topic", "data": SAMPLE_MEETING_DATA[2]["topic"]}, websocket
        )

        await asyncio.sleep(0.5)
        await stream_summary(websocket, SAMPLE_MEETING_DATA[2]["summary"])

        # 클라이언트 메시지 수신 대기
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)

            if message.get("type") == "request_update":
                # 업데이트 요청 시 처음부터 다시 전송
                for i, meeting_data in enumerate(SAMPLE_MEETING_DATA):
                    if i > 0:
                        await manager.send_message({"type": "separator"}, websocket)
                    await manager.send_message(
                        {"type": "topic", "data": meeting_data["topic"]}, websocket
                    )
                    await stream_summary(websocket, meeting_data["summary"])

    except WebSocketDisconnect:
        manager.disconnect(websocket)


async def stream_summary(websocket: WebSocket, summary: str):
    """요약 텍스트를 스트리밍 방식으로 전송"""
    # 요약 시작 알림
    await manager.send_message({"type": "summary_start"}, websocket)

    # 글자 단위로 스트리밍 (타이핑 효과)
    chunk_size = 3  # 한 번에 전송할 글자 수
    for i in range(0, len(summary), chunk_size):
        chunk = summary[i : i + chunk_size]
        await manager.send_message({"type": "summary_chunk", "data": chunk}, websocket)
        await asyncio.sleep(0.03)  # 타이핑 속도 조절

    # 요약 완료 알림
    await manager.send_message({"type": "summary_end"}, websocket)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
