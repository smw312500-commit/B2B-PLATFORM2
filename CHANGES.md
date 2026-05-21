# CHANGES.md - 작업 진행 현황
> 작업 시작 전 반드시 이 파일 확인할 것
> 이어받는 AI는: 기획안.txt → CHANGES.md → NEXT_TASK.md 순서로 읽을 것

---

## 현재 상태 요약 (2026-05-21 기준)
- 전체 기획 확정 완료
- DB 설계 확정 완료
- **지퍼단추agent 코드 구현 완료** ← NEW
- 라벨agent, 옷감agent: 코드 구현 미완료

---

## 완료된 작업

### 2026-05-21
- [기획] 전체 플랫폼 기획 확정 → 기획안.txt
- [기획] 라벨코드 9자리 규칙 정의 → 라벨agent/라벨코드_규칙.txt
- [기획] 옷감 코드 규칙 정의 → 옷감agent/옷감코드_규칙.txt
- [기획] 개발 방식 확정: Claude Code 단독 + GPT API

---

## 폴더/파일 현황

```
e:\PROJECT\B2B PLATFORM 2\
├── 기획안.txt              ← 전체 기획 (필독)
├── CHANGES.md              ← 이 파일
├── NEXT_TASK.md            ← 다음 작업 목록
├── 라벨agent\
│   └── 라벨코드_규칙.txt   ← 케어라벨 코드 규칙 (확정)
└── 옷감agent\
    └── 옷감코드_규칙.txt   ← 원단 코드 규칙 (확정)
```

---

### 2026-05-21 (추가)
- [기획] 생산사 UI 표준 확정 → UI_STANDARD.md
- [기획] UI 스케치 → agent표준 구조/ 폴더 내 jpg 2개
- [기획] 생산 규칙 초안 확정
  - 옷감agent/생산규칙.txt
  - 라벨agent/생산규칙.txt
  - 지퍼단추agent/생산규칙.txt
- [기획] 지퍼단추agent 폴더 신규 생성
- [기획] AI Agent 로직 명세 작성
  - 옷감agent/AI_로직.txt
  - 라벨agent/AI_로직.txt
  - 지퍼단추agent/AI_로직.txt
- [기획] 기술스택 확정 → 기술스택.txt
  - Frontend: React
  - Backend: Python FastAPI
  - DB: MySQL (스키마 5개)
  - AI: GPT API
- [기획] 생산사 세션 시작 가이드 작성
  - 옷감agent/README.md
  - 라벨agent/README.md
  - 지퍼단추agent/README.md
- [기획] 지퍼단추 코드 규칙 → 지퍼단추agent/지퍼단추코드_규칙.txt
- [기획] 물류agent 구조 확정
  - 물류agent/README.md (UI 레이아웃 - 하단 AI 지시 구조)
  - 물류agent/AI_로직.txt (배차/왕복최적화/픽업일 계산 로직)
- [기획] DB 설계 확정 → DB세션/DB_설계.txt
  - 스키마 5개: 생산사3 + 물류사 + 플랫폼
  - 도착지: 인천항/부산항 고정
  - 픽업일: GPT AI API가 납기일 기준 자동 산출

---

---

### 2026-05-21 (지퍼단추agent 구현)
- [구현] 지퍼단추agent 전체 시스템 구축 완료
  - backend/ FastAPI (포트 8002)
    - database.py, models.py, schemas.py
    - production_logic.py (생산규칙/AI로직 구현)
    - routers/stock.py   - 완제품재고 + 원자재재고 CRUD
    - routers/order.py   - 발주 등록/취소/입고완료
    - routers/release.py - 출고 등록/완료버튼 (재고차감+플랫폼전송)
    - routers/agent.py   - AI Agent 분석 + 상태 조회 (GPT 연동)
    - main.py            - 앱 진입점 + DB 초기 데이터 자동 생성
  - frontend/ React (포트 3000)
    - 탭 5개: 재고 / 출고 / 발주하기 / 발주취소 / 기타
    - AI Agent 패널 (우측 30%, 탭 전환 무관 고정)
    - 완료 버튼: 재고 차감 + 플랫폼 전송 자동 실행
  - 실행가이드.txt 작성

---

## 미확정 항목 / 다음 작업
- 라벨agent 코드 구현 (미완료)
- 옷감agent 코드 구현 (미완료)
- 물류agent 코드 구현 (미완료)
- 플랫폼 중앙 DB + API 구현 (미완료)
- MySQL DB 직접 생성 및 연결 테스트 (미완료)

---
