import { Trip } from '../types/trip';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface PlanTripParams {
  current_location: string;
  pickup_location: string;
  dropoff_location: string;
  current_cycle_used: number;
}

export async function createTrip(params: PlanTripParams): Promise<Trip> {
  const response = await fetch(`${API_BASE_URL}/api/trips/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.message || 'Failed to calculate trip route and ELD logs.');
  }

  return response.json();
}

export async function getTrip(tripId: string): Promise<Trip> {
  const response = await fetch(`${API_BASE_URL}/api/trips/${tripId}/`);

  if (!response.ok) {
    throw new Error('Trip not found.');
  }

  return response.json();
}

export async function getRecentTrips(): Promise<Array<{ id: string; current_location: string; dropoff_location: string; total_distance_miles: number; num_days: number; created_at: string }>> {
  const response = await fetch(`${API_BASE_URL}/api/trips/`);
  if (!response.ok) {
    return [];
  }
  return response.json();
}
