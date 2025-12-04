export enum PlaneStatus {
  APPROACH = 'APPROACH',
  LANDING = 'LANDING',
  TAXI_IN = 'TAXI_IN',
  WAITING_FOR_GATE = 'WAITING_FOR_GATE',
  PARKED = 'PARKED',
  TAXI_OUT = 'TAXI_OUT',
  HOLD_SHORT = 'HOLD_SHORT',
  TAKEOFF = 'TAKEOFF',
  DEPARTED = 'DEPARTED',
  GO_AROUND = 'GO_AROUND',
  DIVERTED = 'DIVERTED'
}

export interface Position {
  x: number;
  y: number;
  heading: number; // degrees
}

export interface ScheduledFlight {
  id: string;
  airline: string;
  flightNumber: string;
  type: 'regional' | 'narrowbody' | 'widebody';
  scheduledTime: number; // Game tick time
  isArrival: boolean;
  status: 'Scheduled' | 'On Time' | 'Delayed' | 'Landed' | 'Departed' | 'Cancelled' | 'Diverted';
}

export interface Plane {
  id: string;
  airline: string;
  flightNumber: string;
  type: 'regional' | 'narrowbody' | 'widebody';
  status: PlaneStatus;
  position: Position;
  waypoints: Position[];
  targetGateId: string | null;
  passengers: number;
  revenue: number;
  fuel: number;
  timer: number;
  history: string[]; // Log of what happened
}

export interface Node {
  id: string;
  x: number;
  y: number;
  type: 'runway_start' | 'runway_end' | 'taxi_intersect' | 'gate' | 'hold_short';
}

export interface Economy {
  balance: number;
  tourismScore: number;
  industryScore: number;
  demand: number;
  reputation: number;
}

export interface TechUpgrade {
  id: string;
  name: string;
  description: string;
  cost: number;
  unlocked: boolean;
  effect: (gameState: GameState) => void;
  prerequisite?: string;
}

export interface LogEntry {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'ai';
  timestamp: number;
}

export interface GameState {
  gameTime: number; // Ticks since start (0 = Day 1 06:00)
  schedule: ScheduledFlight[];
  planes: Plane[];
  economy: Economy;
  upgrades: TechUpgrade[];
  logs: LogEntry[];
  paused: boolean;
  gameSpeed: number;
  weather: 'Sunny' | 'Rainy' | 'Foggy' | 'Stormy';
  windDirection: number;
  windSpeed: number;
  selectedPlaneId: string | null;
  aiEnabled: boolean;
  gateOccupancy: Record<string, string | null>; // gateId -> planeId
}

export const VIEWPORT_WIDTH = 2500;
export const VIEWPORT_HEIGHT = 1500;
