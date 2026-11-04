-- =====================================================================
-- AquaPulse Water Forecasting & Conservation Platform
-- MySQL Production Schema Definition (InnoDB, UTF-8 MB4)
-- =====================================================================

CREATE DATABASE IF NOT EXISTS aquapulse_water_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE aquapulse_water_db;

-- 1. Households Table
CREATE TABLE IF NOT EXISTS households (
    id INT AUTO_INCREMENT PRIMARY KEY,
    address VARCHAR(255) NOT NULL,
    occupants INT NOT NULL DEFAULT 3,
    property_type VARCHAR(100) NOT NULL DEFAULT 'Single Family Residence',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Users & Authentication Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'resident',
    is_active BOOLEAN DEFAULT TRUE,
    household_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_household FOREIGN KEY (household_id)
        REFERENCES households (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Smart Meters Table
CREATE TABLE IF NOT EXISTS smart_meters (
    id INT AUTO_INCREMENT PRIMARY KEY,
    meter_serial VARCHAR(100) NOT NULL UNIQUE,
    household_id INT NOT NULL,
    installed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'online',
    battery_level_pct INT DEFAULT 95,
    firmware_version VARCHAR(50) DEFAULT 'v2.4.1',
    signal_strength_dbm INT DEFAULT -72,
    last_ping_at TIMESTAMP NULL,
    CONSTRAINT fk_meters_household FOREIGN KEY (household_id)
        REFERENCES households (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. High-Resolution Water Readings Table
CREATE TABLE IF NOT EXISTS water_readings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    household_id INT NOT NULL,
    timestamp DATETIME NOT NULL,
    consumption_liters FLOAT NOT NULL,
    meter_dial_reading FLOAT NOT NULL,
    flow_rate_lpm FLOAT DEFAULT 0.0,
    temperature_c FLOAT DEFAULT 22.0,
    provenance VARCHAR(50) DEFAULT 'measured',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_reading_hh_time (household_id, timestamp),
    CONSTRAINT fk_readings_household FOREIGN KEY (household_id)
        REFERENCES households (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Monitored Municipal Cities Table
CREATE TABLE IF NOT EXISTS municipal_cities (
    city_id VARCHAR(10) PRIMARY KEY,
    city_name VARCHAR(100) NOT NULL,
    zone VARCHAR(50) NOT NULL,
    water_stress_score FLOAT NOT NULL DEFAULT 100.0,
    cpheeo_target_lpcd INT NOT NULL DEFAULT 135,
    base_demand_mld FLOAT NOT NULL,
    mean_max_temp_c FLOAT NULL,
    mean_min_temp_c FLOAT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Historical Municipal Water Consumption Table
CREATE TABLE IF NOT EXISTS historical_water_consumption (
    id INT AUTO_INCREMENT PRIMARY KEY,
    city_id VARCHAR(10) NOT NULL,
    record_date DATE NOT NULL,
    actual_demand_mld FLOAT NOT NULL,
    billed_consumption_mld FLOAT NULL,
    bulk_supply_mld FLOAT NULL,
    nrw_loss_mld FLOAT NULL,
    nrw_ratio_pct FLOAT NULL,
    revenue_collection_cr FLOAT NULL,
    is_weekend INT DEFAULT 0,
    is_festival INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_city_record_date (city_id, record_date),
    INDEX idx_city_date_demand (city_id, record_date, actual_demand_mld),
    CONSTRAINT fk_hist_city FOREIGN KEY (city_id)
        REFERENCES municipal_cities (city_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Weather Telemetry Table
CREATE TABLE IF NOT EXISTS weather_telemetry (
    id INT AUTO_INCREMENT PRIMARY KEY,
    city_id VARCHAR(10) NOT NULL,
    record_date DATE NOT NULL,
    max_temp_c FLOAT NOT NULL,
    min_temp_c FLOAT NOT NULL,
    mean_temp_c FLOAT NOT NULL,
    temp_range_c FLOAT NULL,
    precipitation_mm FLOAT DEFAULT 0.0,
    solar_radiation_mj FLOAT NOT NULL,
    heat_index_proxy FLOAT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_city_weather_date (city_id, record_date),
    INDEX idx_city_weather_date (city_id, record_date),
    CONSTRAINT fk_weather_city FOREIGN KEY (city_id)
        REFERENCES municipal_cities (city_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Machine Learning Forecast Predictions Log Table
CREATE TABLE IF NOT EXISTS forecast_predictions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    prediction_uuid VARCHAR(64) NOT NULL UNIQUE,
    city_id VARCHAR(10) NOT NULL,
    forecast_date DATE NOT NULL,
    forecast_type VARCHAR(20) NOT NULL,
    horizon_days INT DEFAULT 1,
    predicted_demand_mld FLOAT NOT NULL,
    ci_lower_95_mld FLOAT NOT NULL,
    ci_upper_95_mld FLOAT NOT NULL,
    volume_mcm FLOAT NOT NULL,
    model_architecture VARCHAR(100) DEFAULT 'RandomForestRegressor',
    expected_rmse_error_mld FLOAT NOT NULL,
    input_parameters_json TEXT NULL,
    created_by_user_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_pred_city_date (city_id, forecast_date),
    CONSTRAINT fk_pred_city FOREIGN KEY (city_id)
        REFERENCES municipal_cities (city_id) ON DELETE CASCADE,
    CONSTRAINT fk_pred_user FOREIGN KEY (created_by_user_id)
        REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Anomaly & Leak Detection Events Table
CREATE TABLE IF NOT EXISTS anomaly_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    household_id INT NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NULL,
    anomaly_type VARCHAR(50) NOT NULL DEFAULT 'continuous_leak',
    severity VARCHAR(50) NOT NULL DEFAULT 'medium',
    flow_rate_liters_per_hour FLOAT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    estimated_daily_wastage_liters FLOAT NOT NULL,
    estimated_daily_cost_loss FLOAT NOT NULL,
    notes TEXT NULL,
    resolved_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_anomalies_household FOREIGN KEY (household_id)
        REFERENCES households (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- Seed Canonical 21 Indian Municipal Authorities
-- =====================================================================
INSERT INTO municipal_cities (city_id, city_name, zone, water_stress_score, cpheeo_target_lpcd, base_demand_mld, mean_max_temp_c, mean_min_temp_c)
VALUES
    ('AMD', 'Ahmedabad', 'West', 100.0, 140, 1301.47, 33.7, 22.5),
    ('BBI', 'Bhubaneswar', 'East', 79.58, 135, 174.87, 32.4, 23.1),
    ('BHO', 'Bhopal', 'Central', 99.83, 135, 350.92, 30.7, 19.9),
    ('BLR', 'Bengaluru', 'South', 100.0, 135, 1492.29, 29.6, 19.1),
    ('BOM', 'Mumbai', 'West', 100.0, 150, 4015.17, 31.4, 23.5),
    ('CCU', 'Kolkata', 'East', 100.0, 150, 2410.05, 31.3, 22.4),
    ('COK', 'Kochi', 'South', 100.0, 135, 315.70, 29.8, 24.4),
    ('DED', 'Dehradun', 'Himalayan', 98.29, 135, 138.14, 26.6, 15.7),
    ('DEL', 'Delhi', 'North', 100.0, 150, 2898.39, 30.4, 19.2),
    ('GAU', 'Guwahati', 'North-East', 99.52, 135, 165.69, 29.0, 19.6),
    ('GGN', 'Gurugram', 'North', 87.77, 150, 286.22, 30.1, 18.6),
    ('HYD', 'Hyderabad', 'South', 99.92, 150, 1624.08, 31.4, 21.3),
    ('IDR', 'Indore', 'Central', 99.74, 135, 472.57, 30.7, 19.9),
    ('JAI', 'Jaipur', 'North', 100.0, 135, 483.29, 30.9, 19.6),
    ('LKO', 'Lucknow', 'North', 99.97, 135, 537.42, 31.0, 20.0),
    ('LUH', 'Ludhiana', 'North', 99.86, 135, 293.20, 29.4, 17.5),
    ('MAA', 'Chennai', 'South', 100.0, 135, 1042.17, 32.1, 25.1),
    ('PAT', 'Patna', 'East', 100.0, 135, 353.32, 31.0, 21.1),
    ('PNQ', 'Pune', 'West', 94.30, 150, 1200.53, 31.2, 20.1),
    ('STV', 'Surat', 'West', 92.10, 140, 1046.90, 33.1, 22.9),
    ('VTZ', 'Visakhapatnam', 'South', 95.78, 135, 305.76, 32.0, 23.8)
ON DUPLICATE KEY UPDATE
    city_name = VALUES(city_name),
    base_demand_mld = VALUES(base_demand_mld);

