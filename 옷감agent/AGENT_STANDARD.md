# 생산사 Agent 표준 구조
작성일: 2026-05-22  
최종수정: 2026-05-22 (지퍼단추agent 구현 완료 기준으로 보강)  
작성 근거: 케어라벨회사 Agent → 지퍼단추사 Agent 순서로 구현하며 확인된 표준

이 문서를 읽는 AI에게:  
케어라벨 Agent를 표준으로 삼아 다른 생산사(옷감사, 지퍼단추사)에 동일한 구조로 시스템을 구축할 것.  
변경이 필요한 부분은 [회사별 커스텀] 항목만 수정하고 나머지는 그대로 따를 것.

---

## 1. 전체 폴더 구조

```
{회사명}agent/
├── backend/
│   ├── main.py
│   ├── database.py
│   ├── models.py
│   ├── schemas.py
│   ├── init_db.py
│   ├── fix_encoding.py
│   ├── requirements.txt
│   ├── .env
│   ├── .env.example
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── stock.py       재고 조회 + 체크박스 삭제
│   │   ├── order.py       발주 등록/취소
│   │   ├── release.py     출고 등록 + 완료처리 + 삭제
│   │   └── agent.py       AI 분석/검증/상태
│   └── services/
│       ├── __init__.py
│       ├── validator.py       품목코드 유효성 검증
│       ├── ai_agent.py        납기판정 + 원자재 계산
│       └── platform_sender.py 플랫폼 출고완료 신호 전송
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── index.css
│       ├── App.jsx            탭바 + 날짜필터 + AI납기분석 버튼
│       ├── services/
│       │   └── api.js
│       └── components/
│           ├── Header.jsx
│           ├── AgentPanel.jsx
│           ├── MachineLayout.jsx
│           └── tabs/
│               ├── StockTab.jsx
│               ├── OrderTab.jsx
│               ├── ProductionTab.jsx
│               └── CompleteTab.jsx
├── 발주서/
│   ├── 발주서_양식.xlsx
│   ├── 생산등록_양식.xlsx
│   ├── make_template.py
│   └── make_production_template.py
├── start.bat          ← 이것 하나만. setup.bat 별도 만들지 말 것
└── AGENT_STANDARD.md  ← 이 파일
```

---

## 2. 탭 구성 (4개 고정)

| 탭 | 기능 |
|----|------|
| 재고 | 원자재 재고 현황 / 체크박스 선택 삭제 |
| 발주 | 원자재 발주 등록(직접 + 엑셀 업로드) / 진행중·이력 / **재고도착 버튼** / 취소 |
| 생산 | 생산 주문 등록(직접 + 엑셀 업로드) / 생산중 목록 / 기계 배치 시뮬레이션 |
| 완료 | 완료 처리 버튼 / 출고완료 이력(날짜 범위 필터) |

탭 바 우측 고정:  
`✦ AI 납기 분석` 버튼 | 날짜 범위 달력 | `조회` 버튼

---

## 3. DB 스키마 표준

### 재고 테이블: `{prefix}_stock`
```sql
id            INT AUTO_INCREMENT PK
material_name VARCHAR(50)   -- 원자재명
unit          VARCHAR(10)   -- 단위
stock_qty     DECIMAL(10,1) -- 현재 재고량
updated_at    DATETIME
```

### 발주 테이블: `{prefix}_order`
```sql
id            INT AUTO_INCREMENT PK
material_name VARCHAR(50)
order_qty     DECIMAL(10,1)
supplier      VARCHAR(100)
order_date    DATE
due_date      DATE
status        VARCHAR(20)   -- 대기중/입고완료/취소
note          TEXT
```

### 출고 테이블: `{prefix}_release`
```sql
id           INT AUTO_INCREMENT PK
{품목키}     VARCHAR(N)    -- 회사별 핵심 식별자 (라벨코드 9자리 등)
release_qty  INT 또는 DECIMAL
due_date     DATE
status       VARCHAR(20)   -- 생산중/출고완료
release_date DATE
started_at   DATETIME      -- 생산 시작 시간 (기계 시뮬레이션 연동)
finished_at  DATETIME      -- 생산 완료 시간
created_at   DATETIME
```

---

## 4. API 엔드포인트 표준

| Method | Path | 설명 |
|--------|------|------|
| GET    | /stock/ | 재고 전체 조회 |
| DELETE | /stock/bulk | 재고 선택 삭제 (body: id 배열) |
| GET    | /orders/ | 발주 전체 조회 |
| POST   | /orders/ | 발주 등록 |
| PATCH  | /orders/{id}/cancel | 발주 취소 |
| PATCH  | /orders/{id}/receive | 재고도착 처리 (발주량 → stock에 자동 추가) |
| GET    | /releases/ | 출고 전체 조회 |
| POST   | /releases/ | 출고 등록 |
| DELETE | /releases/bulk | 출고 선택 삭제 |
| POST   | /releases/{id}/complete | 완료처리 (body: started_at, finished_at) |
| POST   | /agent/analyze | AI 납기 분석 |
| GET    | /agent/validate/{code} | 품목코드 유효성 검증 |
| GET    | /agent/status | AI Agent 패널 상태 조회 |

---

## 5. 기계 시뮬레이션 표준

- localStorage key: `{회사명}_machines_v1`
- 생산 이력 key: `{회사명}_prod_log_v1`
- 기계 대수: 회사별 설정 (케어라벨: 6대)
- 생산 속도: `SPEED_PER_HOUR` 상수로 관리
- 시작 버튼 → prod log에 started_at 저장
- 완료 시 → prod log에 finished_at 저장
- 탭 이동 후 복귀 시 경과 시간 자동 계산
- 완료 버튼 클릭 시 prod log에서 started_at/finished_at 읽어 DB에 저장

---

## 6. 엑셀 업로드 표준

### 발주 양식 컬럼
| 품목 | 발주량 | 발주처 | 발주일 | 납기요청일 | 비고 |
|------|--------|--------|--------|-----------|------|

### 생산 양식 컬럼
| {품목식별자} | 주문량 | 납기일 |
|-------------|--------|--------|

품목에 컬러/사이즈가 포함되는 회사(지퍼단추사 등)는 컬럼 분리:
| 품목 | 컬러/사이즈 | 주문량 | 납기일 |
|------|------------|--------|--------|

- 프론트에서 한글 품목명/컬러명 → 코드(WOOD_BR 등)로 자동 변환
- 엑셀 컬럼 순서가 프론트 파싱 순서와 **정확히 일치**해야 함 — 컬럼 하나라도 밀리면 날짜 파싱 오류
- 날짜 형식: YYYY-MM-DD (Excel 날짜 직렬번호 자동 변환)
- 업로드 전 클라이언트 유효성 검사 필수
- 미리보기 테이블 → N건 업로드 → 결과 표시

---

## 7. AI Agent 패널 표준

우측 30% 고정 패널:
- 원자재 재고 현황 (안전재고 이하 시 빨간 표시)
- 납기 현황 (진행중 주문 D-day 표시)
- 경고/지시사항
- 30초마다 자동 갱신

---

## 8. [회사별 커스텀] 변경 항목

### 옷감사 적용 시

| 항목 | 케어라벨사 | 옷감사 |
|------|----------|--------|
| DB 스키마 | company_label | company_fabric |
| 테이블 prefix | label_ | fabric_ |
| 품목 식별자 | label_code (9자리) | fabric_code + color_code |
| 원자재 | 라벨원단(m), 잉크(통) | 원사(kg) |
| 생산 단위 | 장 | 야드 |
| 생산 속도 상수 | 800장/h | 옷감 규칙 파일 참조 |
| 기계명 | 인쇄기 | 직기 |
| 유효성 검증 | 9자리 라벨코드 | 원단코드+컬러코드 조합 |
| localStorage key prefix | label_ | fabric_ |

### 지퍼단추사 적용 시

| 항목 | 케어라벨사 | 지퍼단추사 |
|------|----------|-----------|
| DB 스키마 | company_label | company_zipper |
| 테이블 prefix | label_ | zipper_ |
| 품목 식별자 | label_code (9자리) | item_name + material |
| 원자재 | 라벨원단(m), 잉크(통) | 원목/플라스틱/금속(kg) |
| 생산 단위 | 장 | 개 |
| 생산 속도 상수 | 800장/h | 지퍼단추 규칙 파일 참조 |
| 기계명 | 인쇄기 | 성형기 |
| localStorage key prefix | label_ | zipper_ |

---

## 9. 환경변수 (.env)

```
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME={company_label / company_fabric / company_zipper}

OPENAI_API_KEY=sk-...
PLATFORM_API_URL=http://localhost:8000/api/release
```

---

## 10. 실행 방법 (원클릭)

### start.bat 하나로 전부 처리됨

`start.bat` 더블클릭 한 번으로 아래 순서가 자동 실행된다:

```
1. pip install -r requirements.txt   Python 패키지 설치/확인
2. npm install (node_modules 없을 때만)  Node 패키지 설치
3. .env 파일 없으면 .env.example 복사 후 경고 출력
4. 백엔드 서버 새 창에서 실행  (uvicorn main:app --reload --port {PORT})
5. 프론트엔드 서버 새 창에서 실행  (npx vite)
6. 브라우저 자동 오픈  http://localhost:5173
```

실행 후 CMD 창 2개가 뜬다:
- **Backend 창**: FastAPI 서버 로그 출력 (오류 발생 시 여기서 확인)
- **Frontend 창**: Vite 개발 서버 로그

종료: 각 창을 닫으면 서버 종료됨.

### start.bat 작성 규칙 (새 Agent 만들 때)

```bat
@echo off
title {회사명} Agent

echo  [1/4] Checking Python packages...
cd /d "%~dp0backend"
pip install -r requirements.txt
if errorlevel 1 ( echo [ERROR] pip install failed & pause & exit /b 1 )

echo  [2/4] Checking Node packages...
cd /d "%~dp0frontend"
if not exist "node_modules" (
    npm install
    if errorlevel 1 ( echo [ERROR] npm install failed & pause & exit /b 1 )
)

if not exist "%~dp0backend\.env" (
    copy "%~dp0backend\.env.example" "%~dp0backend\.env" >nul
    echo  [!] backend\.env created - set DB_PASSWORD and OPENAI_API_KEY
)

echo  [3/4] Starting Backend  (http://localhost:{PORT})...
start "Backend" cmd /k "cd /d %~dp0backend && uvicorn main:app --reload --port {PORT}"

timeout /t 2 /nobreak >nul

echo  [4/4] Starting Frontend (http://localhost:5173)...
start "Frontend" cmd /k "cd /d %~dp0frontend && npx vite"

timeout /t 3 /nobreak >nul
start http://localhost:5173
```

**주의사항:**
- 배치 파일은 반드시 **영문만** 사용 (한글 echo 사용 시 인코딩 깨짐)
- `%~dp0` = 배치 파일이 있는 폴더 경로 (절대경로 자동 참조)
- `cmd /k` = 명령 실행 후 창 유지 (오류 확인 가능)
- `timeout /t 2` = 백엔드 기동 대기 (2초) 후 프론트 실행

### 백엔드 포트 규칙

| 회사 | 포트 |
|------|------|
| 케어라벨사 | 8001 |
| 옷감사 | 8002 |
| 지퍼단추사 | 8003 |
| 물류사 | 8004 |

프론트엔드는 모두 5173 포트 사용 (동시에 한 Agent만 실행 가정).  
동시에 여러 Agent 띄울 경우 vite.config.js에서 port 변경 필요.

---

## 11. 재고 연동 규칙

### 발주 → 재고 (수동)
- 발주 탭 진행중 목록에 **재고도착** 버튼 배치
- 클릭 시: `order.status = "입고완료"` + `stock.stock_qty += order.order_qty`
- 납기일 자동 처리 없음 — 수동 버튼만 제공 (일찍 도착하는 경우 대비)
- `PATCH /orders/{id}/receive` 엔드포인트로 처리
- `material_name` 기준으로 stock 테이블과 매핑 (동일 이름이어야 함)

### 생산완료 → 원자재 재고 차감 (자동)
- 완료 탭 완료 버튼 클릭 시 자동 처리
- 품목코드 → 품목 타입 → 원자재 변환비율로 차감량 계산
- 재고 부족 시 완료 처리 자체를 400 에러로 차단
- `POST /releases/{id}/complete` 엔드포인트에서 처리

---

## 12. 트러블슈팅 — 지퍼단추agent 구현 중 확인된 문제들

이 섹션은 다음 Agent 구현 시 같은 실수를 반복하지 않기 위해 기록함.

### pip install이 멈추거나 꺼지는 경우

**원인 1**: `requirements.txt`에 `==` 정확 버전 고정  
→ 이미 설치된 패키지와 버전이 다르면 pip이 다운그레이드 시도 → 매우 느림  
**해결**: `>=` 최소버전 방식 사용 (라벨agent와 동일하게)
```
fastapi>=0.115.0
uvicorn>=0.32.0
sqlalchemy>=2.0.36
```

**원인 2**: `-q` 플래그로 에러가 숨겨짐  
**해결**: start.bat에서 `-q` 제거. 에러 메시지가 보여야 디버깅 가능.

**원인 3**: venv 생성 코드를 start.bat에 넣으면 멈춤  
**해결**: venv 없이 global pip 직접 사용 (라벨agent 방식 그대로)

### 프론트엔드 "연결할 수 없음" 에러

**원인**: Vite proxy의 target이 `localhost`로 설정 → Node.js 18+에서 IPv6(::1)로 해석  
→ 백엔드는 `127.0.0.1`(IPv4)로 실행 중 → 포트는 같아도 연결 실패  
**해결**: `vite.config.js`의 proxy target을 `http://127.0.0.1:{PORT}`로 명시
```js
proxy: {
  '/api': {
    target: 'http://127.0.0.1:8003',  // localhost 쓰지 말 것
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api/, ''),
  },
},
```

### PostCSS / Tailwind config 에러 (ES module scope)

**원인**: `package.json`에 `"type": "module"` 선언 시 모든 `.js` 파일이 ES module로 처리됨  
→ `module.exports = {}` (CommonJS) 사용 불가  
**해결**: `export default {}` 방식으로 작성
```js
// postcss.config.js
export default {
  plugins: { tailwindcss: {}, autoprefixer: {} },
}

// tailwind.config.js
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: { extend: {} },
  plugins: [],
}
```

### DB 연결 실패 (Unknown database)

**원인**: MySQL에 스키마(DB)가 없는 상태에서 FastAPI 시작 → `create_all` 전에 연결 자체가 실패  
**해결**: `database.py`에 스키마 자동 생성 로직 추가
```python
# database.py — DB 없으면 자동 생성
_root_url = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}?charset=utf8mb4"
try:
    _tmp = create_engine(_root_url)
    with _tmp.connect() as conn:
        conn.execute(text(f"CREATE DATABASE IF NOT EXISTS `{DB_NAME}` CHARACTER SET utf8mb4"))
    _tmp.dispose()
except Exception as e:
    print(f"[DB] could not auto-create database: {e}")
```

### DB 컬럼 불일치 에러 (Unknown column)

**원인**: 모델 변경 후 기존 테이블이 남아있으면 `create_all`은 신규 테이블만 생성, 기존 테이블 수정 안 함  
→ SQLAlchemy가 없는 컬럼을 조회하려다 500 에러  
**해결**: `init_db.py`로 전체 드롭 후 재생성 (개발 환경에서만)
```python
# init_db.py
Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)
```
**주의**: 실데이터가 있을 때는 실행 전 반드시 확인. 개발 초기에만 사용.

### setup.bat 별도 생성 금지

`start.bat` 하나면 충분. `setup.bat`을 따로 만들면 사용자가 어떤 걸 먼저 실행해야 하는지 혼란스러움.  
최초 실행도 `start.bat`에서 전부 처리 (venv 없이, node_modules 없으면 npm install 자동 실행).

---

## 13. 플랫폼 연동

완료 버튼 클릭 시 `platform_sender.py`가 아래 데이터를 플랫폼으로 전송:

```json
{
  "label_code": "W3MJW01NV",
  "release_qty": 5000,
  "release_date": "2026-05-22",
  "company_type": "케어라벨사",
  "parsed_info": { "brand": "W", "season": "3", ... }
}
```

플랫폼의 `collected_release` 테이블로 수집됨.  
item_name = 회사별 품목 식별자 (케어라벨사: 라벨코드 9자리)
