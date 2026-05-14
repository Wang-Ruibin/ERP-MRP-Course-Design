CREATE DATABASE IF NOT EXISTS erp_mrp_system
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE erp_mrp_system;

DROP TABLE IF EXISTS demand_orders;
DROP TABLE IF EXISTS scheduled_receipts;
DROP TABLE IF EXISTS bom_relations;
DROP TABLE IF EXISTS report_history;
DROP TABLE IF EXISTS items;

CREATE TABLE items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  item_code VARCHAR(30) NOT NULL,
  item_name VARCHAR(100) NOT NULL,
  lead_time_weeks INT NOT NULL DEFAULT 0,
  on_hand_qty INT NOT NULL DEFAULT 0,
  allocated_qty INT NOT NULL DEFAULT 0,
  safety_stock INT NOT NULL DEFAULT 0,
  lot_rule ENUM('L4L', 'FIXED') NOT NULL DEFAULT 'L4L',
  lot_size INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_items_code (item_code)
) ENGINE=InnoDB;

CREATE TABLE bom_relations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  parent_item_id BIGINT UNSIGNED NOT NULL,
  child_item_id BIGINT UNSIGNED NOT NULL,
  quantity_per_parent INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_bom_relation (parent_item_id, child_item_id),
  CONSTRAINT fk_bom_parent FOREIGN KEY (parent_item_id) REFERENCES items (id),
  CONSTRAINT fk_bom_child FOREIGN KEY (child_item_id) REFERENCES items (id)
) ENGINE=InnoDB;

CREATE TABLE demand_orders (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  item_id BIGINT UNSIGNED NOT NULL,
  demand_week INT NOT NULL,
  demand_qty INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_demand_item_week (item_id, demand_week),
  CONSTRAINT fk_demand_item FOREIGN KEY (item_id) REFERENCES items (id)
) ENGINE=InnoDB;

CREATE TABLE scheduled_receipts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  item_id BIGINT UNSIGNED NOT NULL,
  receipt_week INT NOT NULL,
  receipt_qty INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_receipt_item_week (item_id, receipt_week),
  CONSTRAINT fk_receipt_item FOREIGN KEY (item_id) REFERENCES items (id)
) ENGINE=InnoDB;

CREATE TABLE report_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  report_name VARCHAR(120) NOT NULL,
  item_count INT NOT NULL DEFAULT 0,
  order_count INT NOT NULL DEFAULT 0,
  snapshot_json LONGTEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

INSERT INTO items (item_code, item_name, lead_time_weeks, on_hand_qty, allocated_qty, safety_stock, lot_rule, lot_size) VALUES
('X', '产品X', 4, 18, 10, 5, 'L4L', 0),
('Y', '产品Y', 4, 16, 0, 6, 'L4L', 0),
('B', '部件B', 3, 10, 0, 0, 'L4L', 0),
('C', '部件C', 2, 20, 0, 0, 'L4L', 0),
('D', '部件D', 1, 0, 0, 0, 'FIXED', 200),
('E', '部件E', 1, 30, 0, 0, 'FIXED', 500);

INSERT INTO bom_relations (parent_item_id, child_item_id, quantity_per_parent) VALUES
((SELECT id FROM items WHERE item_code = 'X'), (SELECT id FROM items WHERE item_code = 'B'), 1),
((SELECT id FROM items WHERE item_code = 'X'), (SELECT id FROM items WHERE item_code = 'C'), 2),
((SELECT id FROM items WHERE item_code = 'Y'), (SELECT id FROM items WHERE item_code = 'C'), 2),
((SELECT id FROM items WHERE item_code = 'Y'), (SELECT id FROM items WHERE item_code = 'E'), 1),
((SELECT id FROM items WHERE item_code = 'C'), (SELECT id FROM items WHERE item_code = 'D'), 1),
((SELECT id FROM items WHERE item_code = 'C'), (SELECT id FROM items WHERE item_code = 'E'), 2);

INSERT INTO demand_orders (item_id, demand_week, demand_qty) VALUES
((SELECT id FROM items WHERE item_code = 'X'), 8, 103),
((SELECT id FROM items WHERE item_code = 'Y'), 7, 200);

-- 图中样例没有计划入库记录，因此 scheduled_receipts 初始为空。
