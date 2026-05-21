-- ================================================
-- B2B 플랫폼 전체 DB 초기화 스크립트
-- MySQL 기준 / 스키마 5개
-- ================================================

-- ================================================
-- 1. company_fabric (옷감사)
-- ================================================
CREATE DATABASE IF NOT EXISTS company_fabric CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE company_fabric;

CREATE TABLE IF NOT EXISTS fabric_stock (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    fabric_code VARCHAR(1)    NOT NULL COMMENT 'C/P/L/W/M',
    color_code  VARCHAR(2)    NOT NULL COMMENT 'BK/WH/NV 등',
    stock_qty   DECIMAL(10,1) NOT NULL DEFAULT 0,
    updated_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_fabric_color (fabric_code, color_code)
);

CREATE TABLE IF NOT EXISTS fabric_order (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    material_name VARCHAR(50)   NOT NULL,
    order_qty     DECIMAL(10,1) NOT NULL,
    supplier      VARCHAR(100),
    order_date    DATE          NOT NULL,
    due_date      DATE,
    status        VARCHAR(20)   NOT NULL DEFAULT '대기중' COMMENT '대기중/입고완료/취소',
    note          TEXT
);

CREATE TABLE IF NOT EXISTS fabric_release (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    label_code   VARCHAR(9)    NOT NULL COMMENT '연동 라벨코드 9자리',
    fabric_code  VARCHAR(1)    NOT NULL,
    color_code   VARCHAR(2)    NOT NULL,
    release_qty  DECIMAL(10,1) NOT NULL,
    due_date     DATE,
    status       VARCHAR(20)   NOT NULL DEFAULT '생산중' COMMENT '생산중/출고완료',
    release_date DATE,
    created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_label_code (label_code),
    INDEX idx_status (status)
);


-- ================================================
-- 2. company_label (케어라벨사)
-- ================================================
CREATE DATABASE IF NOT EXISTS company_label CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE company_label;

CREATE TABLE IF NOT EXISTS label_stock (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    material_name VARCHAR(50)   NOT NULL COMMENT '라벨원단 / 잉크',
    unit          VARCHAR(10)   NOT NULL COMMENT 'm / 통',
    stock_qty     DECIMAL(10,1) NOT NULL DEFAULT 0,
    updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_material (material_name)
);

CREATE TABLE IF NOT EXISTS label_order (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    material_name VARCHAR(50)   NOT NULL,
    order_qty     DECIMAL(10,1) NOT NULL,
    supplier      VARCHAR(100),
    order_date    DATE          NOT NULL,
    due_date      DATE,
    status        VARCHAR(20)   NOT NULL DEFAULT '대기중' COMMENT '대기중/입고완료/취소',
    note          TEXT
);

CREATE TABLE IF NOT EXISTS label_release (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    label_code   VARCHAR(9)    NOT NULL COMMENT '라벨코드 9자리 핵심 키',
    release_qty  INT           NOT NULL,
    due_date     DATE,
    status       VARCHAR(20)   NOT NULL DEFAULT '생산중' COMMENT '생산중/출고완료',
    release_date DATE,
    created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_label_code (label_code),
    INDEX idx_status (status)
);


-- ================================================
-- 3. company_zipper (지퍼단추사)
-- ================================================
CREATE DATABASE IF NOT EXISTS company_zipper CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE company_zipper;

CREATE TABLE IF NOT EXISTS zipper_stock (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    item_name  VARCHAR(50) NOT NULL COMMENT '원목단추/플라스틱단추/금속단추/지퍼',
    material   VARCHAR(20) NOT NULL COMMENT '원목/플라스틱/금속',
    stock_qty  INT         NOT NULL DEFAULT 0,
    updated_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_item_material (item_name, material)
);

CREATE TABLE IF NOT EXISTS zipper_order (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    material_name VARCHAR(50)   NOT NULL,
    unit          VARCHAR(10)   COMMENT 'kg / m',
    order_qty     DECIMAL(10,1) NOT NULL,
    supplier      VARCHAR(100),
    order_date    DATE          NOT NULL,
    due_date      DATE,
    status        VARCHAR(20)   NOT NULL DEFAULT '대기중' COMMENT '대기중/입고완료/취소',
    note          TEXT
);

CREATE TABLE IF NOT EXISTS zipper_release (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    label_code   VARCHAR(9)  NOT NULL COMMENT '연동 라벨코드 9자리',
    item_name    VARCHAR(50) NOT NULL,
    material     VARCHAR(20) NOT NULL,
    release_qty  INT         NOT NULL,
    due_date     DATE,
    status       VARCHAR(20) NOT NULL DEFAULT '생산중' COMMENT '생산중/출고완료',
    release_date DATE,
    created_at   DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_label_code (label_code)
);


-- ================================================
-- 4. company_logistics (물류사)
-- ================================================
CREATE DATABASE IF NOT EXISTS company_logistics CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE company_logistics;

CREATE TABLE IF NOT EXISTS driver (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(50)  NOT NULL,
    phone       VARCHAR(20),
    location_si VARCHAR(20)  COMMENT '현재위치 시',
    location_gu VARCHAR(20)  COMMENT '현재위치 구',
    status      VARCHAR(20)  NOT NULL DEFAULT '가용' COMMENT '가용/운행중/휴무'
);

CREATE TABLE IF NOT EXISTS vehicle (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    driver_id    INT          NOT NULL,
    plate_no     VARCHAR(20)  NOT NULL,
    max_weight   DECIMAL(8,1) NOT NULL COMMENT '최대 적재량 (kg)',
    vehicle_type VARCHAR(30)  COMMENT '트럭/탑차/화물차 등',
    CONSTRAINT fk_vehicle_driver FOREIGN KEY (driver_id) REFERENCES driver(id)
);

CREATE TABLE IF NOT EXISTS delivery (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    driver_id     INT          NOT NULL,
    vehicle_id    INT          NOT NULL,
    company_id    INT          NOT NULL COMMENT 'platform.company_info 참조',
    destination   VARCHAR(20)  NOT NULL COMMENT '인천항 / 부산항',
    cargo_detail  TEXT,
    weight_kg     DECIMAL(8,1),
    due_date      DATE,
    pickup_date   DATE         COMMENT 'AI 산출 픽업 예정일',
    complete_date DATE,
    status        VARCHAR(20)  NOT NULL DEFAULT '배차대기' COMMENT '배차대기/운행중/완료',
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_delivery_driver  FOREIGN KEY (driver_id)  REFERENCES driver(id),
    CONSTRAINT fk_delivery_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicle(id)
);


-- ================================================
-- 5. platform (중앙 플랫폼)
-- ================================================
CREATE DATABASE IF NOT EXISTS platform CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE platform;

CREATE TABLE IF NOT EXISTS company_info (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    company_name VARCHAR(100) NOT NULL,
    company_type VARCHAR(20)  NOT NULL COMMENT '생산사 / 물류사',
    address_si   VARCHAR(20),
    address_gu   VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS collected_release (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    company_id   INT           NOT NULL,
    item_name    VARCHAR(100)  NOT NULL COMMENT '회사별 물품명 (라벨사=라벨코드)',
    quantity     DECIMAL(10,1) NOT NULL,
    unit         VARCHAR(10)   NOT NULL COMMENT '야드/장/개',
    due_date     DATE,
    status       VARCHAR(20)   NOT NULL DEFAULT '생산중' COMMENT '생산중/출고완료',
    collected_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_collected_company FOREIGN KEY (company_id) REFERENCES company_info(id),
    INDEX idx_company_id (company_id),
    INDEX idx_item_name  (item_name),
    INDEX idx_status     (status)
);

CREATE TABLE IF NOT EXISTS dispatch (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    company_id  INT          NOT NULL,
    destination VARCHAR(20)  NOT NULL COMMENT '인천항 / 부산항',
    weight_kg   DECIMAL(8,1),
    due_date    DATE,
    pickup_date DATE         COMMENT 'AI 산출 픽업일',
    status      VARCHAR(20)  NOT NULL DEFAULT '대기' COMMENT '대기/배차완료/운행중/완료',
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_dispatch_company FOREIGN KEY (company_id) REFERENCES company_info(id)
);

CREATE TABLE IF NOT EXISTS insight_log (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    insight_type VARCHAR(50)  NOT NULL COMMENT '납기위험/트렌드/물류최적화',
    content      TEXT         NOT NULL,
    related_code VARCHAR(9)   COMMENT '관련 라벨코드',
    created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_insight_type (insight_type),
    INDEX idx_related_code (related_code)
);

-- ================================================
-- 기초 데이터 삽입
-- ================================================

-- 플랫폼 회사 정보
INSERT INTO platform.company_info (id, company_name, company_type, address_si, address_gu) VALUES
(1, '옷감사',     '생산사', '부산시', '사하구'),
(2, '케어라벨사', '생산사', '부산시', '강서구'),
(3, '지퍼단추사', '생산사', '부산시', '해운대구'),
(4, '물류사',     '물류사', '서울시', '강남구')
ON DUPLICATE KEY UPDATE company_name = VALUES(company_name);

-- 옷감사 초기 재고
INSERT INTO company_fabric.fabric_stock (fabric_code, color_code, stock_qty) VALUES
('C', 'BK', 1200.0), ('C', 'WH', 800.0),  ('C', 'NV', 600.0),
('P', 'BK', 500.0),  ('P', 'NV', 350.0),
('L', 'WH', 180.0),  ('L', 'BE', 220.0),
('W', 'NV', 130.0),  ('W', 'GY', 160.0),
('M', 'BK', 280.0)
ON DUPLICATE KEY UPDATE stock_qty = VALUES(stock_qty);

-- 케어라벨사 초기 재고
INSERT INTO company_label.label_stock (material_name, unit, stock_qty) VALUES
('라벨원단', 'm',  1500.0),
('잉크',     '통', 12.0)
ON DUPLICATE KEY UPDATE stock_qty = VALUES(stock_qty);

-- 지퍼단추사 초기 재고
INSERT INTO company_zipper.zipper_stock (item_name, material, stock_qty) VALUES
('단추', '원목',      5000),
('단추', '플라스틱',  8000),
('단추', '금속',      6000),
('지퍼', '금속',      3000),
('지퍼', '플라스틱',  4000)
ON DUPLICATE KEY UPDATE stock_qty = VALUES(stock_qty);

-- 물류사 기사/차량 샘플
INSERT INTO company_logistics.driver (name, phone, location_si, location_gu, status) VALUES
('김철수', '010-1234-5678', '부산시', '강서구', '가용'),
('이영희', '010-2345-6789', '부산시', '사하구', '가용'),
('박민준', '010-3456-7890', '서울시', '강남구', '가용');

INSERT INTO company_logistics.vehicle (driver_id, plate_no, max_weight, vehicle_type) VALUES
(1, '12가3456', 5000.0, '탑차'),
(2, '34나5678', 8000.0, '트럭'),
(3, '56다7890', 3000.0, '화물차');
