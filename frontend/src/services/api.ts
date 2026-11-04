import axios from 'axios';
import {
  AuthResponse,
  User,
  DashboardSummary,
  TrendPoint,
  HourlyPoint,
  EndUseResponse,
  ForecastResponse,
  ScenarioParams,
  AnomalyEvent,
  Recommendation,
  ComparisonReport,
  CommunityStats,
  MonthlyAuditReport,
  AdminOverview,
  SmartMeterInfo,
  HouseholdInfo,
  WeatherImpactResponse,
  WeatherSimulateResult,
  AdminUser,
  AdminDataset,
  DatasetUploadResult
} from '../types';

const API_BASE = '/api';

const client = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token automatically
client.interceptors.request.use((config: any) => {
  const token = localStorage.getItem('aquapulse_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const api = {
  // Auth
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const res = await client.post('/auth/login', { email, password });
    localStorage.setItem('aquapulse_token', res.data.access_token);
    return res.data;
  },

  register: async (data: any): Promise<AuthResponse> => {
    const res = await client.post('/auth/register', data);
    localStorage.setItem('aquapulse_token', res.data.access_token);
    return res.data;
  },

  demoLogin: async (role: 'resident' | 'utility_admin'): Promise<AuthResponse> => {
    const res = await client.post(`/auth/demo-login?role=${role}`);
    localStorage.setItem('aquapulse_token', res.data.access_token);
    return res.data;
  },

  getMe: async (): Promise<User> => {
    const res = await client.get('/auth/me');
    return res.data;
  },

  logout: () => {
    localStorage.removeItem('aquapulse_token');
  },

  // Analytics & Summary
  getDashboardSummary: async (): Promise<DashboardSummary> => {
    const res = await client.get('/analytics/summary');
    return res.data;
  },

  getTrends: async (days: number = 30): Promise<TrendPoint[]> => {
    const res = await client.get(`/analytics/trends?days=${days}`);
    return res.data;
  },

  getHourlyProfile: async (): Promise<HourlyPoint[]> => {
    const res = await client.get('/analytics/hourly-diurnal');
    return res.data;
  },

  getEndUse: async (): Promise<EndUseResponse> => {
    const res = await client.get('/analytics/end-use');
    return res.data;
  },

  simulateEvent: async (eventType: 'leak' | 'spike', flowRateLph: number): Promise<any> => {
    const res = await client.post(`/analytics/simulate-event?event_type=${eventType}&flow_rate_lph=${flowRateLph}`);
    return res.data;
  },

  // Readings
  logManualDialReading: async (meterDialReading: number, notes?: string): Promise<any> => {
    const res = await client.post('/readings/manual', {
      meter_dial_reading: meterDialReading,
      notes: notes || 'Manual homeowner meter dial reading',
    });
    return res.data;
  },

  importCsv: async (file: File): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await client.post('/readings/import-csv', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },

  exportCsvUrl: () => `${API_BASE}/readings/export-csv`,

  // Forecasting
  getForecast: async (horizonDays: number = 14): Promise<ForecastResponse> => {
    const res = await client.get(`/forecast?horizon_days=${horizonDays}`);
    return res.data;
  },

  simulateScenario: async (scenario: ScenarioParams, horizonDays: number = 14): Promise<ForecastResponse> => {
    const res = await client.post(`/forecast/scenario?horizon_days=${horizonDays}`, scenario);
    return res.data;
  },

  retrainModel: async (modelType: string = 'GradientBoostingRegressor'): Promise<any> => {
    const res = await client.post('/forecast/retrain', { model_type: modelType });
    return res.data;
  },

  getModelMetrics: async (): Promise<any> => {
    const res = await client.get('/forecast/metrics');
    return res.data;
  },

  // Anomalies
  getAnomalies: async (statusFilter?: string): Promise<AnomalyEvent[]> => {
    const url = statusFilter ? `/anomalies?status_filter=${statusFilter}` : '/anomalies';
    const res = await client.get(url);
    return res.data;
  },

  updateAnomalyStatus: async (anomalyId: number, status: string, notes?: string): Promise<AnomalyEvent> => {
    const res = await client.put(`/anomalies/${anomalyId}/status`, { status, notes });
    return res.data;
  },

  scanAnomalies: async (): Promise<any> => {
    const res = await client.post('/anomalies/scan');
    return res.data;
  },

  getThresholds: async (): Promise<any> => {
    const res = await client.get('/anomalies/thresholds');
    return res.data;
  },

  updateThresholds: async (thresholds: any): Promise<any> => {
    const res = await client.put('/anomalies/thresholds', thresholds);
    return res.data;
  },

  // Recommendations
  getRecommendations: async (): Promise<Recommendation[]> => {
    const res = await client.get('/recommendations');
    return res.data;
  },

  updateRecommendationStatus: async (recId: number, status: string): Promise<Recommendation> => {
    const res = await client.put(`/recommendations/${recId}/status`, { status });
    return res.data;
  },

  regenerateRecommendations: async (): Promise<any> => {
    const res = await client.post('/recommendations/regenerate');
    return res.data;
  },

  // Benchmarks
  getComparison: async (): Promise<ComparisonReport> => {
    const res = await client.get('/benchmarks');
    return res.data;
  },

  getCommunityStats: async (): Promise<CommunityStats> => {
    const res = await client.get('/benchmarks/community-stats');
    return res.data;
  },

  // Reports
  getMonthlyAuditReport: async (): Promise<MonthlyAuditReport> => {
    const res = await client.get('/reports/monthly-audit');
    return res.data;
  },

  // Weather Impact Analysis
  getWeatherImpact: async (days: number = 30): Promise<WeatherImpactResponse> => {
    const res = await client.get(`/weather/impact?days=${days}`);
    return res.data;
  },

  simulateWeather: async (params: {
    temp_change_c: number;
    rainfall_scenario: string;
    irrigation_smart_delay?: boolean;
  }): Promise<WeatherSimulateResult> => {
    const res = await client.post('/weather/simulate', params);
    return res.data;
  },

  // Admin
  getAdminOverview: async (): Promise<AdminOverview> => {
    const res = await client.get('/admin/overview');
    return res.data;
  },

  getAdminMeters: async (): Promise<SmartMeterInfo[]> => {
    const res = await client.get('/admin/meters');
    return res.data;
  },

  getAdminHouseholds: async (): Promise<HouseholdInfo[]> => {
    const res = await client.get('/admin/households');
    return res.data;
  },

  getAdminUsers: async (): Promise<AdminUser[]> => {
    const res = await client.get('/admin/users');
    return res.data;
  },

  createAdminUser: async (data: {
    full_name: string;
    email: string;
    password: string;
    role: string;
    household_id?: number;
  }): Promise<any> => {
    const res = await client.post('/admin/users', data);
    return res.data;
  },

  toggleUserStatus: async (userId: number, isActive: boolean): Promise<any> => {
    const res = await client.patch(`/admin/users/${userId}/status`, { is_active: isActive });
    return res.data;
  },

  deleteAdminUser: async (userId: number): Promise<any> => {
    const res = await client.delete(`/admin/users/${userId}`);
    return res.data;
  },

  getAdminDatasets: async (): Promise<AdminDataset[]> => {
    const res = await client.get('/admin/datasets');
    return res.data;
  },

  getSampleCsvTemplate: async (): Promise<any> => {
    const res = await client.get('/admin/datasets/sample-csv');
    return res.data;
  },

  uploadCustomDataset: async (file: File): Promise<DatasetUploadResult> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await client.post('/admin/datasets/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },

  activateDataset: async (datasetId: string): Promise<any> => {
    const res = await client.post(`/admin/datasets/${datasetId}/activate`);
    return res.data;
  },

  retrainFleet: async (): Promise<any> => {
    const res = await client.post('/admin/retrain-fleet');
    return res.data;
  },

  // Pan-India Machine Learning Model & Telemetry API
  predictDaily: async (payload: {
    city_id: string;
    date?: string;
    max_temp_c?: number;
    min_temp_c?: number;
    precipitation_mm?: number;
    solar_radiation_mj?: number;
    demand_lag_1?: number;
  }): Promise<any> => {
    const res = await client.post('/predict/daily', payload);
    return res.data;
  },

  predictHorizon: async (payload: {
    city_id: string;
    start_date?: string;
    days?: number;
    initial_lag?: number;
  }): Promise<any> => {
    const res = await client.post('/predict/horizon', payload);
    return res.data;
  },

  predictMonthly: async (payload: {
    city_id: string;
    year: number;
    month: number;
    initial_lag?: number;
  }): Promise<any> => {
    const res = await client.post('/predict/monthly', payload);
    return res.data;
  },

  getSupportedCities: async (): Promise<any[]> => {
    const res = await client.get('/predict/cities');
    return res.data;
  },

  getHistoricalTelemetry: async (params?: {
    city_id?: string;
    zone?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
  }): Promise<any> => {
    const res = await client.get('/data/historical', { params });
    return res.data;
  },

  getHistoricalSummary: async (): Promise<any> => {
    const res = await client.get('/data/historical/summary');
    return res.data;
  },

  getMLModelMetrics: async (): Promise<any> => {
    const res = await client.get('/model/metrics');
    return res.data;
  },

  getFeatureImportances: async (): Promise<any> => {
    const res = await client.get('/model/feature-importance');
    return res.data;
  },

  getAlgorithmBenchmarks: async (): Promise<any> => {
    const res = await client.get('/model/benchmark');
    return res.data;
  },

  getSystemHealth: async (): Promise<any> => {
    const res = await client.get('/health/comprehensive');
    return res.data;
  },

  // Conservation Analytics & Anomaly Detection
  getConservationAnalysis: async (cityId: string = 'BLR', days: number = 30): Promise<any> => {
    const res = await client.get(`/conservation/analysis?city_id=${cityId}&days=${days}`);
    return res.data;
  },

  getConservationAlerts: async (cityId?: string, days: number = 30): Promise<any> => {
    const url = cityId ? `/conservation/alerts?city_id=${cityId}&days=${days}` : `/conservation/alerts?days=${days}`;
    const res = await client.get(url);
    return res.data;
  },

  getConservationOverview: async (): Promise<any> => {
    const res = await client.get('/conservation/overview');
    return res.data;
  },

  simulateConservationIntervention: async (payload: {
    city_id: string;
    pressure_management?: boolean;
    smart_irrigation_cutoff?: boolean;
    fixture_aerator_retrofit?: boolean;
    meter_modernization?: boolean;
  }): Promise<any> => {
    const res = await client.post('/conservation/simulate-intervention', payload);
    return res.data;
  },
};
