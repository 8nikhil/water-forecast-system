export type DataProvenance = 'measured' | 'user_entered' | 'simulated' | 'predicted';

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: 'resident' | 'utility_admin' | 'admin';
  household_id?: number;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface DashboardSummary {
  today_consumption_liters: number;
  daily_budget_liters: number;
  budget_percentage: number;
  weekly_average_liters: number;
  projected_monthly_liters: number;
  projected_monthly_bill_usd: number;
  active_leaks_count: number;
  daily_wasted_liters: number;
  efficiency_score: number;
  efficiency_tier: string;
  occupants: number;
  water_tariff_rate_usd_m3: number;
}

export interface TrendPoint {
  date: string;
  total_liters: number;
  measured: number;
  user_entered: number;
  simulated: number;
  predicted: number;
  temperature_c: number;
  is_anomaly: boolean;
  notes?: string;
}

export interface HourlyPoint {
  hour: number;
  label: string;
  average_liters: number;
  is_peak: boolean;
  is_night_baseline: boolean;
}

export interface EndUseCategory {
  category: string;
  category_id: string;
  liters: number;
  percentage: number;
  color: string;
}

export interface EndUseResponse {
  total_liters: number;
  breakdown: EndUseCategory[];
}

export interface ScenarioParams {
  leak_repaired: boolean;
  fixture_retrofit: boolean;
  smart_irrigation: boolean;
  behavioral_conservation: boolean;
  custom_reduction_pct: number;
}

export interface ForecastPoint {
  date: string;
  predicted_liters: number;
  lower_bound: number;
  upper_bound: number;
  scenario_liters: number;
  provenance: DataProvenance;
  day_name: string;
  is_weekend: boolean;
  temperature_c: number;
}

export interface ForecastResponse {
  id?: number;
  household_id: number;
  created_at: string;
  horizon_days: number;
  model_name: string;
  mae_liters: number;
  rmse_liters: number;
  r2_score: number;
  mape_pct?: number;
  training_samples_count: number;
  validation_samples_count: number;
  baseline_projected_total_liters: number;
  scenario_projected_total_liters: number;
  potential_liters_saved: number;
  potential_cost_saved_usd: number;
  scenario_params: ScenarioParams;
  feature_importances: Record<string, number>;
  forecast_points: ForecastPoint[];
}

export interface AnomalyEvent {
  id: number;
  household_id: number;
  meter_id?: number;
  detected_at: string;
  start_time: string;
  end_time?: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  anomaly_type: string;
  flow_rate_liters_per_hour: number;
  wasted_liters: number;
  estimated_cost_usd: number;
  confidence_score: number;
  status: 'active' | 'investigating' | 'resolved' | 'dismissed';
  description: string;
  root_cause?: string;
  recommended_action?: string;
  resolved_at?: string;
}

export interface Recommendation {
  id: number;
  household_id: number;
  title: string;
  category: 'leak_fix' | 'fixtures' | 'irrigation' | 'behavior' | 'appliances';
  impact_level: 'high' | 'medium' | 'low';
  difficulty: 'easy' | 'moderate' | 'advanced';
  potential_saving_liters_month: number;
  potential_saving_usd_month: number;
  estimated_payback_days: number;
  status: 'pending' | 'in_progress' | 'implemented' | 'dismissed';
  description: string;
  action_steps?: string;
  created_at: string;
  updated_at: string;
}

export interface ComparisonReport {
  user_daily_average_liters: number;
  community_average_liters: number;
  efficient_benchmark_liters: number;
  percentile_rank: number;
  comparison_text: string;
  tier: string;
  district: string;
  occupants: number;
}

export interface CommunityStats {
  district: string;
  total_enrolled_households: number;
  district_water_saved_liters_ytd: number;
  district_water_saved_usd_ytd: number;
  district_target_reduction_pct: number;
  district_current_reduction_pct: number;
  active_anomalies_resolved_this_month: number;
  community_leaderboard: Array<{
    rank: number;
    neighborhood: string;
    efficiency_score: number;
    avg_daily_liters: number;
    badge: string;
  }>;
}

export interface MonthlyAuditReport {
  report_id: string;
  generated_at: string;
  audit_period: {
    start: string;
    end: string;
    billing_days: number;
  };
  household: {
    id: number;
    name: string;
    address: string;
    district: string;
    occupants: number;
    property_type: string;
  };
  consumption_metrics: {
    total_consumption_liters: number;
    total_consumption_cubic_meters: number;
    daily_average_liters: number;
    per_capita_daily_liters: number;
    daily_budget_liters: number;
    water_tariff_rate_usd_m3: number;
    estimated_water_bill_usd: number;
  };
  provenance_breakdown: {
    measured_liters: number;
    user_entered_liters: number;
    simulated_liters: number;
    predicted_liters: number;
  };
  wastage_and_leak_audit: {
    total_anomalies_detected: number;
    estimated_wasted_liters: number;
    estimated_wasted_cost_usd: number;
    active_unresolved_leaks: number;
  };
  ml_forecast_preview: {
    projected_next_month_liters: number;
    projected_next_month_bill_usd: number;
    model_confidence: string;
    model_architecture: string;
  };
  prioritized_actions: Array<{
    title: string;
    category: string;
    potential_saving_liters_month: number;
    potential_saving_usd_month: number;
    difficulty: string;
    status: string;
  }>;
}

export interface AdminOverview {
  utility_name: string;
  district: string;
  total_smart_meters: number;
  online_smart_meters: number;
  fleet_connectivity_pct: number;
  total_enrolled_households: number;
  active_fleet_anomalies: number;
  fleet_daily_wasted_liters: number;
  fleet_daily_wasted_cost_usd: number;
  total_network_water_delivered_liters: number;
  global_ml_status: {
    model_architecture: string;
    average_mae_liters: number;
    average_rmse_liters: number;
    average_r2: number;
    last_retrain_cycle: string;
  };
}

export interface SmartMeterInfo {
  id: number;
  serial_number: string;
  household_id: number;
  meter_model: string;
  firmware_version: string;
  status: string;
  battery_level_pct: number;
  signal_strength_dbm: number;
  last_ping: string;
}

export interface HouseholdInfo {
  id: number;
  name: string;
  address: string;
  district: string;
  occupants: number;
  property_type: string;
  has_garden: boolean;
  daily_budget_liters: number;
  active_leaks_count: number;
  last_reading_time?: string;
  last_reading_liters?: number;
}

export interface WeatherImpactSummary {
  temperature_correlation: number;
  rainfall_correlation: number;
  temperature_elasticity_liters_per_c: number;
  rain_suppression_pct: number;
  dry_day_avg_liters: number;
  rainy_day_avg_liters: number;
  regression_formula: string;
  garden_irrigation_sensitivity: string;
}

export interface WeatherTimelinePoint {
  date: string;
  consumption_liters: number;
  indoor_liters: number;
  outdoor_irrigation_liters: number;
  avg_temperature_c: number;
  rainfall_mm: number;
  weather_condition: string;
}

export interface WeatherForecastDay {
  date: string;
  day_name: string;
  temperature_c: number;
  rainfall_mm: number;
  condition: string;
  icon: string;
  projected_demand_liters: number;
  demand_shift_pct: number;
  recommendation: string;
  alert_level: 'normal' | 'warning' | 'opportunity';
}

export interface SeasonalInsight {
  season: string;
  avg_temp_c: number;
  avg_demand_liters: number;
  peak_driver: string;
  recommended_action: string;
}

export interface WeatherImpactResponse {
  summary: WeatherImpactSummary;
  historical_timeline: WeatherTimelinePoint[];
  upcoming_forecast: WeatherForecastDay[];
  seasonal_insights: SeasonalInsight[];
}

export interface WeatherSimulateResult {
  baseline_daily_liters: number;
  simulated_daily_liters: number;
  variance_pct: number;
  monthly_cost_impact_usd: number;
  scenario_description: string;
  recommended_adaptive_actions: string[];
}

export interface AdminUser {
  id: number;
  email: string;
  full_name: string;
  role: string;
  household_id?: number;
  household_name?: string;
  is_active: boolean;
  created_at: string;
}

export interface AdminDataset {
  id: string;
  name: string;
  description: string;
  record_count: number;
  date_range: string;
  status: 'active' | 'ready' | 'archived';
  features: string[];
  source: string;
  last_updated: string;
}

export interface DatasetUploadResult {
  success: boolean;
  message: string;
  dataset_id: string;
  valid_rows: number;
  total_liters_ingested: number;
  avg_liters_per_reading: number;
}

// =====================================================================
// PAN-INDIA MACHINE LEARNING & MUNICIPAL TELEMETRY TYPES
// =====================================================================

export interface CityMetadataItem {
  city_id: string;
  city_name: string;
  zone: string;
  water_stress_score: number;
  cpheeo_target_lpcd: number;
  base_demand_mld: number;
  mean_max_temp_c?: number;
  mean_min_temp_c?: number;
}

export interface PanIndiaDailyPrediction {
  city_id: string;
  city_name: string;
  zone: string;
  forecast_date: string;
  day_of_week: string;
  is_weekend: number;
  predicted_demand_mld: number;
  confidence_interval_95_mld: {
    lower: number;
    upper: number;
  };
  unit: string;
  equivalent_million_cubic_meters: number;
  equivalent_billion_litres: number;
  expected_rmse_error_mld: number;
  model_architecture: string;
}

export interface HorizonStepItem {
  date: string;
  city_id: string;
  city_name: string;
  day_of_week: string;
  is_weekend: number;
  predicted_demand_mld: number;
  ci_lower_95_mld: number;
  ci_upper_95_mld: number;
  volume_mcm: number;
}

export interface PanIndiaHorizonPrediction {
  city_id: string;
  city_name: string;
  zone: string;
  horizon_days: number;
  start_date: string;
  end_date: string;
  total_projected_volume_mcm: number;
  average_daily_demand_mld: number;
  peak_day: {
    date: string;
    day_of_week: string;
    demand_mld: number;
  };
  minimum_day: {
    date: string;
    day_of_week: string;
    demand_mld: number;
  };
  forecast_series: HorizonStepItem[];
}

export interface PanIndiaMonthlyPrediction {
  city_id: string;
  city_name: string;
  zone: string;
  forecast_period: string;
  year: number;
  month: number;
  days_in_month: number;
  total_monthly_demand_mld_days: number;
  total_monthly_volume_mcm: number;
  total_monthly_billion_litres: number;
  average_daily_demand_mld: number;
  peak_day: {
    date: string;
    day_of_week: string;
    demand_mld: number;
  };
  minimum_day: {
    date: string;
    day_of_week: string;
    demand_mld: number;
  };
  confidence_interval_95: {
    total_mld_days_lower: number;
    total_mld_days_upper: number;
    total_mcm_lower: number;
    total_mcm_upper: number;
  };
  daily_forecast_series: HorizonStepItem[];
}

export interface HistoricalTelemetryRecord {
  record_date: string;
  city_id: string;
  city_name: string;
  zone: string;
  actual_demand_mld: number;
  billed_consumption_mld?: number;
  bulk_supply_mld?: number;
  nrw_loss_mld?: number;
  nrw_ratio_pct?: number;
  revenue_collection_cr?: number;
  max_temp_c: number;
  min_temp_c: number;
  mean_temp_c: number;
  precipitation_mm: number;
  solar_radiation_mj: number;
  water_stress_score: number;
  cpheeo_target_lpcd: number;
  is_weekend: number;
  is_festival: number;
}

export interface HistoricalSummaryItem {
  city_id: string;
  city_name: string;
  zone: string;
  total_records: number;
  date_range: {
    start: string;
    end: string;
  };
  average_demand_mld: number;
  max_demand_mld: number;
  min_demand_mld: number;
  total_volume_mcm: number;
  average_nrw_loss_mld: number;
  average_nrw_pct: number;
  average_max_temp_c: number;
  water_stress_score: number;
  cpheeo_target_lpcd: number;
}

export interface ModelMetricsData {
  model_architecture: string;
  model_file: string;
  training_date: string;
  target_variable: string;
  total_features_count: number;
  sample_counts: {
    total: number;
    train: number;
    test: number;
  };
  performance_train: {
    MAE_mld: number;
    MSE: number;
    RMSE_mld: number;
    R2_Score: number;
    R2_Percentage: number;
    MAPE_pct: number;
  };
  performance_test: {
    MAE_mld: number;
    MSE: number;
    RMSE_mld: number;
    R2_Score: number;
    R2_Percentage: number;
    MAPE_pct: number;
    Median_AE_mld?: number;
    Max_Error_mld?: number;
  };
  generalization_diagnosis: {
    R2_gap_pct: number;
    RMSE_ratio_test_vs_train: number;
    MAE_ratio_test_vs_train: number;
    overfitting_detected: boolean;
    underfitting_detected: boolean;
    verdict: string;
  };
  data_leakage_audit: Record<string, string>;
  residual_analysis: {
    mean_error_mld: number;
    std_error_mld: number;
    skewness: number;
    excess_kurtosis: number;
    durbin_watson_stat: number;
  };
}

export interface FeatureImportanceItem {
  feature: string;
  importance: number;
  category?: string;
}

export interface AlgorithmBenchmarkItem {
  algorithm: string;
  mae_mld: number;
  rmse_mld: number;
  mse: number;
  r2_percentage: number;
  mape_pct: number;
  training_time_sec?: number;
  is_champion: boolean;
}



