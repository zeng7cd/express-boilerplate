CREATE DATABASE IF NOT EXISTS subway_fire DEFAULT CHARACTER
SET
  utf8mb4 COLLATE utf8mb4_unicode_ci;

USE subway_fire;

-- 1. 车辆基础信息表
CREATE TABLE
  `vehicles` (
    `vehicle_id` CHAR(36) PRIMARY KEY COMMENT '车辆唯一标识（UUID）',
    `vehicle_number` VARCHAR(20) NOT NULL UNIQUE COMMENT '车辆编号',
    `total_detectors` INT NOT NULL DEFAULT 96 COMMENT '总探测器数量',
    `current_status` TINYINT NOT NULL DEFAULT 0 COMMENT '当前状态: 0=正常, 1=火警, 2=预警',
    `created_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
  ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '车辆基础信息';

-- 2. 探测器配置表（修改detector_id为自增整数类型）
CREATE TABLE
  `detectors` (
    `detector_id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '探测器唯一标识（自增ID）',
    `vehicle_id` CHAR(36) NOT NULL COMMENT '所属车辆ID',
    `vehicle_number` VARCHAR(20) NOT NULL COMMENT '所属车辆编号',
    `detector_number` VARCHAR(20) NOT NULL COMMENT '探测器编号（1~96）',
    `type` TINYINT NOT NULL COMMENT '探测器类型: 1=烟火, 2=烟感',
    `status` TINYINT NOT NULL DEFAULT 0 COMMENT '探测器状态: 0=正常, 1=故障',
    `created_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    UNIQUE KEY `uk_vehicle_detector` (`vehicle_id`, `detector_number`),
    INDEX `idx_vehicle_id` (`vehicle_id`),
    INDEX `idx_vehicle_number` (`vehicle_number`)
  ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '探测器配置信息';

-- 3. 探测器实时数据表
CREATE TABLE
  `detector_data` (
    `data_id` BIGINT UNSIGNED AUTO_INCREMENT COMMENT '自增主键',
    `vehicle_number` VARCHAR(20) NOT NULL COMMENT '车辆编号',
    `timestamp` DATETIME NOT NULL COMMENT '采集时间（精确到秒）',
    `detectors_json` JSON NOT NULL COMMENT '全部探测器数据（JSON数组，包含96个探测器信息）',
    `created_time` DATETIME (3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
    INDEX `idx_vehicle_timestamp` (`vehicle_number`, `timestamp`),
    PRIMARY KEY (`data_id`, `timestamp`)
  ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '探测器实时数据'
PARTITION BY
  RANGE COLUMNS (`timestamp`) (
    PARTITION p202506
    VALUES
      LESS THAN ('2025-07-01'),
      PARTITION p202507
    VALUES
      LESS THAN ('2025-08-01'),
      PARTITION p202508
    VALUES
      LESS THAN ('2025-09-01'),
      PARTITION p202509
    VALUES
      LESS THAN ('2025-10-01'),
      PARTITION p202510
    VALUES
      LESS THAN ('2025-11-01'),
      PARTITION p202511
    VALUES
      LESS THAN ('2025-12-01'),
      PARTITION p202512
    VALUES
      LESS THAN ('2026-01-01')
  );

-- 4. 历史事件主表
CREATE TABLE
  `events` (
    `event_id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '自增主键',
    `vehicle_id` CHAR(36) NOT NULL COMMENT '车辆ID',
    `event_type` TINYINT NOT NULL COMMENT '事件类型: 1=火警, 2=预警',
    `start_time` DATETIME (3) NOT NULL COMMENT '事件开始时间',
    `end_time` DATETIME (3) DEFAULT NULL COMMENT '事件结束时间',
    `duration_seconds` INT DEFAULT NULL COMMENT '持续时间（秒）',
    `event_status` TINYINT NOT NULL DEFAULT 1 COMMENT '事件状态: 1=进行中, 2=已结束',
    `involved_detectors` JSON NOT NULL COMMENT '涉及的探测器ID列表',
    `created_time` DATETIME (3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
    `updated_time` DATETIME (3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
    INDEX `idx_vehicle_status` (`vehicle_id`, `event_status`),
    INDEX `idx_start_time` (`start_time`),
    INDEX `idx_end_time` (`end_time`)
  ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '历史事件主表';

-- 5. 事件详情表
CREATE TABLE
  `event_details` (
    `detail_id` BIGINT UNSIGNED AUTO_INCREMENT COMMENT '自增主键',
    `event_id` BIGINT UNSIGNED NOT NULL COMMENT '事件ID',
    `timestamp` DATETIME (3) NOT NULL COMMENT '采集时间（精确到毫秒）',
    `detector_id` INT UNSIGNED NOT NULL COMMENT '探测器ID',
    `value` FLOAT NOT NULL COMMENT '探测器数值',
    `status` TINYINT NOT NULL COMMENT '状态: 0=正常, 1=预警, 2=火警',
    `created_time` DATETIME (3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
    INDEX `idx_event_detector` (`event_id`, `detector_id`, `timestamp`),
    INDEX `idx_timestamp` (`timestamp`),
    PRIMARY KEY (`detail_id`, `timestamp`)
  ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '事件期间探测器数据详情'
PARTITION BY
  RANGE COLUMNS (`timestamp`) (
    PARTITION p202506
    VALUES
      LESS THAN ('2025-07-01'),
      PARTITION p202507
    VALUES
      LESS THAN ('2025-08-01'),
      PARTITION p202508
    VALUES
      LESS THAN ('2025-09-01'),
      PARTITION p202509
    VALUES
      LESS THAN ('2025-10-01'),
      PARTITION p202510
    VALUES
      LESS THAN ('2025-11-01'),
      PARTITION p202511
    VALUES
      LESS THAN ('2025-12-01'),
      PARTITION p202512
    VALUES
      LESS THAN ('2026-01-01')
  );

-- 批量更新detectors表的vehicle_number字段
UPDATE detectors d
JOIN vehicles v ON d.vehicle_id = v.vehicle_id
SET
  d.vehicle_number = v.vehicle_number;