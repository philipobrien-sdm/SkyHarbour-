import { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, Plane, PlaneStatus, Position, ScheduledFlight, VIEWPORT_WIDTH, VIEWPORT_HEIGHT } from '../types';
import { MAP_NODES, INITIAL_ECONOMY, INITIAL_UPGRADES, AIRLINES, formatTime, getGameDate } from '../constants';
import { v4 as uuidv4 } from 'uuid';

const TICK_RATE_MS = 100; // Base tick rate (100ms = 1 game minute)
const SPEED_FACTOR = 4; // Physics movement multiplier
const GATE_PARK_DURATION = 300; // Ticks

export const useGameEngine = () => {
  const [gameState, setGameState] = useState<GameState>({
    gameTime: 0,
    schedule: [],
    planes: [],
    economy: INITIAL_ECONOMY,
    upgrades: INITIAL_UPGRADES,
    logs: [],
    paused: false,
    gameSpeed: 1, 
    weather: 'Sunny',
    windDirection: 90,
    windSpeed: 10,
    selectedPlaneId: null,
    aiEnabled: !!process.env.API_KEY,
    gateOccupancy: { 'gate_1': null, 'gate_2': null, 'gate_3': null }
  });

  const stateRef = useRef(gameState);
  stateRef.current = gameState;

  // --- HELPERS ---

  const addLog = useCallback((message: string, type: 'info' | 'success' | 'warning' | 'error' | 'ai' = 'info') => {
    setGameState(prev => ({
        ...prev,
        logs: [{ id: uuidv4(), message, type, timestamp: prev.gameTime }, ...prev.logs].slice(0, 50)
    }));
  }, []);

  const toggleAi = useCallback(() => {
    setGameState(prev => ({ ...prev, aiEnabled: !prev.aiEnabled }));
    addLog(gameState.aiEnabled ? "AI Systems Disabled. Manual Mode Active." : "AI Systems Online.", 'info');
  }, [gameState.aiEnabled, addLog]);

  const togglePause = useCallback(() => {
      setGameState(prev => ({ ...prev, paused: !prev.paused }));
  }, []);

  // --- SCHEDULER & SEASONALITY ---
  
  const generateSchedule = useCallback((currentTime: number, baseDemand: number) => {
      // Calculate Seasonal Multiplier
      const date = getGameDate(currentTime);
      // Peak in Summer (Month 5-6), Low in Winter (Month 0-1)
      const seasonality = 1 + 0.3 * Math.sin((date.monthIndex - 2) * Math.PI / 6);
      
      const effectiveDemand = Math.floor(baseDemand * seasonality);

      // Gate Availability Logic
      const hasTerminalExp = stateRef.current.upgrades.some(u => u.id === 'terminal_exp_1' && u.unlocked);
      const totalGates = hasTerminalExp ? 4 : 3;
      // Estimate time a plane occupies a slot (Approach + Taxi + Park + Taxi Out)
      // Park is 300. Taxiing is approx 100 total. Buffer included.
      const GATE_OCCUPANCY_WINDOW = 450; 

      // Get existing future commitments
      // We check against scheduled flights that haven't landed yet, AND planes currently active that will be at gates
      // Simplified: Just check the 'Schedule' for future overlap.
      const existingFlights = stateRef.current.schedule.filter(s => 
          s.status === 'Scheduled' && s.scheduledTime > currentTime
      );
      
      let committedIntervals = existingFlights.map(f => ({ 
          start: f.scheduledTime, 
          end: f.scheduledTime + GATE_OCCUPANCY_WINDOW 
      }));

      // Generate flights for the next 6 hours (360 ticks)
      const futureFlights: ScheduledFlight[] = [];
      const numFlights = Math.max(1, Math.ceil(effectiveDemand / 12)); 
      
      for (let i = 0; i < numFlights; i++) {
          let attempts = 0;
          let scheduled = false;

          while (attempts < 15 && !scheduled) {
              // Schedule 1 to 6 hours in future
              const scheduledTime = currentTime + Math.floor(Math.random() * 360) + 60; 
              const candidateEnd = scheduledTime + GATE_OCCUPANCY_WINDOW;

              // Collision Detection: Max Concurrency
              // Filter relevant intervals that overlap with candidate
              const relevant = [ ...committedIntervals, { start: scheduledTime, end: candidateEnd } ].filter(iv => 
                  iv.start < candidateEnd && iv.end > scheduledTime
              );

              // Sweep Line to find max concurrency in this window
              const points: {t: number, type: number}[] = [];
              relevant.forEach(iv => {
                  points.push({ t: iv.start, type: 1 });
                  points.push({ t: iv.end, type: -1 });
              });
              
              // Sort by time. If equal, process END (-1) before START (1) to allow tight packing (no overlap on exact edge)
              points.sort((a, b) => a.t - b.t || a.type - b.type);

              let maxConcurrent = 0;
              let currentConcurrent = 0;
              for (const p of points) {
                  currentConcurrent += p.type;
                  maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
              }

              if (maxConcurrent <= totalGates) {
                  // Valid Slot Found
                  const airline = AIRLINES[Math.floor(Math.random() * AIRLINES.length)];
                  let type: any = 'regional';
                  if (effectiveDemand > 50 && Math.random() > 0.5) type = 'narrowbody';
                  if (effectiveDemand > 80 && Math.random() > 0.8) type = 'widebody';

                  const newFlight: ScheduledFlight = {
                      id: uuidv4(),
                      airline: airline.name,
                      flightNumber: `${airline.code}${Math.floor(Math.random() * 900) + 100}`,
                      type,
                      scheduledTime,
                      isArrival: true,
                      status: 'Scheduled'
                  };

                  futureFlights.push(newFlight);
                  committedIntervals.push({ start: scheduledTime, end: candidateEnd });
                  scheduled = true;
              }
              attempts++;
          }
      }
      return futureFlights.sort((a,b) => a.scheduledTime - b.scheduledTime);
  }, []);

  // --- PHYSICS HELPERS (Pure functions) ---

  const createPlane = (flight: ScheduledFlight): Plane => {
    const startPos = { x: -600, y: 750, heading: 90 };
    const initialWaypoints = [
        { x: 500, y: 750, heading: 90 }, // Threshold only (triggers LANDING state)
    ];

    return {
      id: flight.id,
      airline: flight.airline,
      flightNumber: flight.flightNumber,
      type: flight.type,
      status: PlaneStatus.APPROACH,
      position: startPos,
      waypoints: initialWaypoints,
      targetGateId: null,
      passengers: Math.floor(Math.random() * 150) + 50,
      revenue: Math.floor(Math.random() * 2000) + 500,
      fuel: 100,
      timer: 0,
      history: []
    };
  };

  const isRunwayOccupied = (planes: Plane[], exceptId?: string): boolean => {
      return planes.some(p => {
          if (p.id === exceptId) return false;
          if (p.status === PlaneStatus.TAKEOFF || p.status === PlaneStatus.LANDING) return true;
          if (p.position.y > 740 && p.position.y < 760 && p.position.x > 450 && p.position.x < 1800) return true;
          return false;
      });
  };

  const getFreeGate = (occupancy: Record<string, string | null>, upgrades: any[]): string | null => {
      const hasTerminalExp = upgrades.some(u => u.id === 'terminal_exp_1' && u.unlocked);
      const gates = ['gate_1', 'gate_2', 'gate_3'];
      if (hasTerminalExp) gates.push('gate_4');

      for (const g of gates) {
          if (!occupancy[g]) return g;
      }
      return null;
  };

  const moveTowards = (plane: Plane, tx: number, ty: number, speed: number): boolean => {
    const dx = tx - plane.position.x;
    const dy = ty - plane.position.y;
    const distance = Math.sqrt(dx*dx + dy*dy);
    
    if (distance < speed) {
        plane.position.x = tx;
        plane.position.y = ty;
        return true;
    }

    const angle = Math.atan2(dy, dx);
    plane.position.x += Math.cos(angle) * speed;
    plane.position.y += Math.sin(angle) * speed;
    plane.position.heading = angle * 180 / Math.PI;

    return false;
  };

  const updatePlanePhysics = (plane: Plane, allPlanes: Plane[], currentOccupancy: Record<string, string|null>): Plane => {
    const updated = { ...plane };
    let speed = plane.type === 'regional' ? 3 : plane.type === 'narrowbody' ? 2.5 : 2;
    
    // Status Logic
    if (updated.status === PlaneStatus.APPROACH) {
        const distanceToRunway = Math.abs(updated.position.x - 500); 
        
        if (distanceToRunway < 300 && distanceToRunway > 100) {
            if (isRunwayOccupied(allPlanes, plane.id)) {
                 updated.status = PlaneStatus.GO_AROUND;
                 updated.waypoints = [
                     { x: 500, y: 500, heading: -45 },
                     { x: -500, y: 750, heading: 90 },
                     { x: 500, y: 750, heading: 90 },
                     { x: 1500, y: 750, heading: 90 }
                 ];
                 updated.history.push(`Go Around: Runway Busy`);
            }
        }
    }

    if (updated.status === PlaneStatus.HOLD_SHORT) {
        speed = 0;
        if (!isRunwayOccupied(allPlanes, plane.id)) {
            const incoming = allPlanes.some(p => p.status === PlaneStatus.APPROACH && p.position.x > -200);
            if (!incoming) {
                updated.status = PlaneStatus.TAKEOFF;
                updated.waypoints = [{ x: 3000, y: 750, heading: 90 }];
                updated.history.push("Cleared for Takeoff");
            }
        }
    }

    if (updated.status === PlaneStatus.WAITING_FOR_GATE) {
        speed = 0;
        const freeGate = getFreeGate(currentOccupancy, stateRef.current.upgrades);
        if (freeGate) {
            updated.targetGateId = freeGate;
            updated.status = PlaneStatus.TAXI_IN;
            const gateNode = MAP_NODES.find(n => n.id === freeGate);
            if (gateNode) {
                updated.waypoints = [
                    { x: gateNode.x, y: 850, heading: 180 },
                    { x: gateNode.x, y: gateNode.y, heading: 180 }
                ];
            }
        }
    }

    if (updated.status === PlaneStatus.TAXI_IN || updated.status === PlaneStatus.TAXI_OUT) speed *= 0.5;
    if (updated.status === PlaneStatus.PARKED || updated.status === PlaneStatus.WAITING_FOR_GATE) speed = 0;
    if (updated.status === PlaneStatus.TAKEOFF) speed *= 3;
    if (updated.status === PlaneStatus.LANDING) speed *= 2.5;
    
    const moveSpeed = speed * SPEED_FACTOR; // Fixed speed

    // Movement
    if (updated.waypoints.length > 0) {
        const target = updated.waypoints[0];
        const reached = moveTowards(updated, target.x, target.y, moveSpeed);
        if (reached) updated.waypoints.shift();
    }

    // State Transitions
    if (updated.waypoints.length === 0) {
        switch (updated.status) {
            case PlaneStatus.APPROACH:
                updated.status = PlaneStatus.LANDING;
                updated.waypoints = [{ x: 1300, y: 750, heading: 90 }]; // Rollout to high-speed exit
                break;

            case PlaneStatus.LANDING:
                updated.status = PlaneStatus.TAXI_IN;
                // Move to taxi intersection (apron entry)
                updated.waypoints = [{ x: 1300, y: 850, heading: 180 }];
                break;
            
            case PlaneStatus.TAXI_IN:
                if (updated.targetGateId) {
                    if (updated.position.y > 900) {
                         updated.status = PlaneStatus.PARKED;
                         updated.timer = GATE_PARK_DURATION;
                    }
                } else {
                    const freeGate = getFreeGate(currentOccupancy, stateRef.current.upgrades);
                    if (freeGate) {
                         updated.targetGateId = freeGate;
                         const gateNode = MAP_NODES.find(n => n.id === freeGate)!;
                         updated.waypoints = [
                            { x: gateNode.x, y: 850, heading: 180 },
                            { x: gateNode.x, y: gateNode.y, heading: 180 }
                        ];
                    } else {
                        updated.status = PlaneStatus.WAITING_FOR_GATE;
                        updated.history.push("Waiting for Gate");
                    }
                }
                break;

            case PlaneStatus.PARKED:
                if (updated.timer > 0) {
                    updated.timer -= 1;
                } else {
                    updated.status = PlaneStatus.TAXI_OUT;
                    updated.targetGateId = null;
                    updated.waypoints = [
                        { x: updated.position.x, y: 850, heading: 0 },
                        { x: 500, y: 850, heading: 0 },
                        { x: 500, y: 800, heading: 0 } 
                    ];
                }
                break;

            case PlaneStatus.TAXI_OUT:
                updated.status = PlaneStatus.HOLD_SHORT;
                updated.timer = 20; 
                break;
            
            case PlaneStatus.TAKEOFF:
                updated.status = PlaneStatus.DEPARTED;
                break;
            
            case PlaneStatus.GO_AROUND:
                updated.status = PlaneStatus.APPROACH;
                break;
        }
    }

    return updated;
  };

  // --- MAIN LOOP ---

  useEffect(() => {
    const interval = setInterval(() => {
        if (stateRef.current.paused) return;

        setGameState(prev => {
            const current = { ...prev };
            current.gameTime += 1;

            // 1. Scheduler Logic
            if (current.gameTime % 360 === 0 || current.schedule.length < 3) {
                const newFlights = generateSchedule(current.gameTime, current.economy.demand);
                const pending = current.schedule.filter(s => s.status === 'Scheduled' && s.scheduledTime > current.gameTime);
                current.schedule = [...pending, ...newFlights].sort((a,b) => a.scheduledTime - b.scheduledTime);
            }

            // 2. Identify Spawns
            const flightsToSpawn = current.schedule.filter(s => 
                s.status === 'Scheduled' && 
                s.scheduledTime <= current.gameTime
            );

            // 3. Process Spawns
            const newPlanes: Plane[] = [];
            const waitingPlanes = current.planes.filter(p => p.status === PlaneStatus.WAITING_FOR_GATE).length;
            const runwayBacklog = current.planes.filter(p => p.status === PlaneStatus.HOLD_SHORT).length;
            
            flightsToSpawn.forEach(flight => {
                if (waitingPlanes > 2 || runwayBacklog > 3) {
                    flight.status = 'Diverted';
                    current.logs = [{id: uuidv4(), message: `Flight ${flight.flightNumber} diverted (Congestion).`, type: 'error', timestamp: current.gameTime}, ...current.logs].slice(0, 50);
                    current.economy.reputation -= 2;
                    current.economy.balance -= 500;
                } else {
                    flight.status = 'On Time';
                    const newPlane = createPlane(flight);
                    newPlanes.push(newPlane);
                    current.logs = [{id: uuidv4(), message: `${flight.flightNumber} on approach.`, type: 'info', timestamp: current.gameTime}, ...current.logs].slice(0, 50);
                }
            });

            // 4. Update Occupancy Map
            const occupancy: Record<string, string|null> = { ...current.gateOccupancy };
            Object.keys(occupancy).forEach(k => occupancy[k] = null);
            
            current.planes.forEach(p => {
                if (p.targetGateId && (p.status === PlaneStatus.TAXI_IN || p.status === PlaneStatus.PARKED || p.status === PlaneStatus.WAITING_FOR_GATE)) {
                    occupancy[p.targetGateId] = p.id;
                }
            });

            // 5. Physics Update with Mutable Occupancy
            const allPlanes = [...current.planes, ...newPlanes];
            const updatedPlanes = allPlanes.map(p => {
                const oldStatus = p.status;
                const updatedP = updatePlanePhysics(p, allPlanes, occupancy);
                
                // CRITICAL: If a gate was claimed this tick, mark it occupied immediately
                if (updatedP.targetGateId && updatedP.targetGateId !== p.targetGateId) {
                     occupancy[updatedP.targetGateId] = updatedP.id;
                }
                
                // Revenue Event
                if (oldStatus === PlaneStatus.PARKED && updatedP.status === PlaneStatus.TAXI_OUT) {
                    current.economy.balance += p.revenue;
                    const sFlight = current.schedule.find(s => s.id === p.id);
                    if (sFlight) sFlight.status = 'Departed';
                    current.logs = [{id: uuidv4(), message: `Flight ${p.flightNumber} departed. +$${p.revenue}`, type: 'success', timestamp: current.gameTime}, ...current.logs].slice(0, 50);
                }
                
                // Go Around Event
                if (oldStatus !== PlaneStatus.GO_AROUND && updatedP.status === PlaneStatus.GO_AROUND) {
                     current.logs = [{id: uuidv4(), message: `${p.flightNumber} Go Around! Runway blocked.`, type: 'warning', timestamp: current.gameTime}, ...current.logs].slice(0, 50);
                     current.economy.reputation -= 1;
                }
                return updatedP;
            }).filter(p => p.status !== PlaneStatus.DEPARTED); 

            // Save final occupancy state
            current.gateOccupancy = occupancy;

            // 6. Economy Ticks
            if (current.gameTime % 1440 === 0) {
                let growth = 0;
                if (current.economy.reputation > 60) growth += 0.5;
                if (current.economy.reputation < 40) growth -= 0.5;
                const unlockedCount = current.upgrades.filter(u => u.unlocked).length;
                growth += unlockedCount * 0.2;
                current.economy.demand = Math.max(10, Math.min(200, current.economy.demand + growth));
            }

            return {
                ...current,
                planes: updatedPlanes,
                economy: { ...current.economy } 
            };
        });

    }, TICK_RATE_MS);

    return () => clearInterval(interval);
  }, [generateSchedule]);

  const purchaseUpgrade = (id: string) => {
    setGameState(prev => {
        const upgrade = prev.upgrades.find(u => u.id === id);
        if (!upgrade || upgrade.unlocked || prev.economy.balance < upgrade.cost) return prev;
        const newUpgrades = prev.upgrades.map(u => u.id === id ? { ...u, unlocked: true } : u);
        const newState = {
            ...prev,
            economy: { ...prev.economy, balance: prev.economy.balance - upgrade.cost },
            upgrades: newUpgrades
        };
        upgrade.effect(newState);
        addLog(`Purchased ${upgrade.name}`, 'success');
        return newState;
    });
  };

  const influenceEconomy = (type: 'tourism' | 'industry') => {
      setGameState(prev => {
          const cost = 25000;
          if (prev.economy.balance < cost) {
              addLog("Not enough funds for campaign!", "warning");
              return prev;
          }
          const newState = { ...prev };
          newState.economy.balance -= cost;
          if (type === 'tourism') newState.economy.tourismScore += 5;
          if (type === 'industry') newState.economy.industryScore += 5;
          newState.economy.demand += 5;
          addLog(`Ran ${type} campaign. Demand increased.`, 'info');
          return newState;
      });
  };

  return { gameState, setGameState, purchaseUpgrade, influenceEconomy, addLog, toggleAi, togglePause };
};
