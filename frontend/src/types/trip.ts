export interface LocationInfo {
  lat: float;
  lng: float;
  display_name: string;
  city: string;
  state: string;
}

export type float = number;

export interface RouteStop {
  stop_type: 'pickup' | 'dropoff' | 'fuel' | 'rest' | 'break' | 'cycle_restart';
  sequence: number;
  lat: number;
  lng: number;
  remark: string;
  duration_minutes: number;
  mile_marker: number | null;
  scheduled_at: string;
}

export interface DutyEvent {
  sequence: number;
  status: 'OFF_DUTY' | 'SLEEPER_BERTH' | 'DRIVING' | 'ON_DUTY_NOT_DRIVING';
  start_datetime: string;
  end_datetime: string;
  lat: number;
  lng: number;
  remark: string;
  mile_marker: number | null;
  stop_reason: string | null;
}

export interface LogSegment {
  status: 'OFF_DUTY' | 'SLEEPER_BERTH' | 'DRIVING' | 'ON_DUTY_NOT_DRIVING';
  start: string;
  end: string;
  hours: number;
  start_fraction: number;
  end_fraction: number;
}

export interface LogRemark {
  time_fraction: number;
  remark: string;
}

export interface DailyLog {
  day_number: number;
  log_date: string;
  period_start: string;
  period_end: string;
  total_miles: number;
  segments: LogSegment[];
  totals: {
    OFF_DUTY: number;
    SLEEPER_BERTH: number;
    DRIVING: number;
    ON_DUTY_NOT_DRIVING: number;
  };
  remarks: LogRemark[];
}

export interface TripSummary {
  total_distance_miles: number;
  total_driving_hours: number;
  total_on_duty_hours: number;
  total_duration_hours: number;
  num_days: number;
  cycle_restart_required: boolean;
}

export interface Trip {
  id: string;
  current_location: string;
  pickup_location: string;
  dropoff_location: string;
  current_cycle_used: number;
  start_time: string;
  created_at: string;
  summary: TripSummary;
  locations: Record<string, LocationInfo>;
  route_geometry: [number, number][];
  cycle_restart_required: boolean;
  stops: RouteStop[];
  duty_events: DutyEvent[];
  daily_logs: DailyLog[];
}
