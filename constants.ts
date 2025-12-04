import { Node, TechUpgrade, GameState } from './types';

export const MAP_NODES: Node[] = [
  // Runway (Left to Right) - Moved Right to avoid ocean overlap
  { id: 'rw_start_09', x: 500, y: 750, type: 'runway_start' },
  { id: 'rw_end_27', x: 1700, y: 750, type: 'runway_end' },
  
  // Taxiways
  { id: 'taxi_alpha_1', x: 500, y: 850, type: 'hold_short' }, // Entry to RW 09
  { id: 'taxi_exit_highspeed', x: 1300, y: 750, type: 'taxi_intersect' }, // Rapid exit
  { id: 'taxi_alpha_main', x: 1300, y: 850, type: 'taxi_intersect' }, 

  // Gates (Terminal Area)
  { id: 'gate_1', x: 800, y: 950, type: 'gate' },
  { id: 'gate_2', x: 1000, y: 950, type: 'gate' },
  { id: 'gate_3', x: 1200, y: 950, type: 'gate' },
  { id: 'gate_4', x: 1400, y: 950, type: 'gate' }, // Extra gate
];

export const INITIAL_UPGRADES: TechUpgrade[] = [
  {
    id: 'ils_cat2',
    name: 'ILS CAT II Instrument System',
    description: 'Allows landings in rainy weather. Essential for consistency.',
    cost: 150000,
    unlocked: false,
    effect: (s: GameState) => { /* Logic handled in engine */ }
  },
  {
    id: 'terminal_exp_1',
    name: 'Terminal Wing A Expansion',
    description: 'Constructs Gate 4 to handle increased daily traffic.',
    cost: 1250000,
    unlocked: false,
    effect: (s: GameState) => { /* Logic handled in map rendering/availability */ }
  },
  {
    id: 'radar_system',
    name: 'NextGen Radar Coverage',
    description: 'Increases airspace efficiency, allowing 25% more flights.',
    cost: 450000,
    unlocked: false,
    effect: (s: GameState) => { s.economy.demand += 25; }
  },
  {
    id: 'marketing_campaign',
    name: 'International Brand Campaign',
    description: 'Attracts major international carriers (+20 Tourism).',
    cost: 250000,
    unlocked: false,
    effect: (s: GameState) => { s.economy.tourismScore += 20; }
  }
];

export const AIRLINES = [
  { name: 'SkyRegional', code: 'SKR', color: '#3b82f6' },
  { name: 'EcoJet', code: 'ECO', color: '#10b981' },
  { name: 'RoyalAir', code: 'RYL', color: '#8b5cf6' },
  { name: 'BudgetFly', code: 'BGT', color: '#f59e0b' },
  { name: 'CargoLifter', code: 'CGO', color: '#475569' }
];

export const INITIAL_ECONOMY = {
  balance: 200000, // Increased starting capital for higher costs
  tourismScore: 20,
  industryScore: 30,
  demand: 40,
  reputation: 80
};

// Calendar Helpers
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const START_YEAR = 1;
// Start on May 1st (Month index 4). 
// 1 Month = 30 days. 1 Day = 1440 minutes.
// Start Offset = 4 months * 30 days * 1440 mins = 172,800 mins.
export const START_TIME_OFFSET = 172800; 

export const getGameDate = (ticks: number) => {
    const totalMinutes = ticks + START_TIME_OFFSET;
    const minutesInDay = 1440;
    const minutesInMonth = 1440 * 30;
    const minutesInYear = 1440 * 30 * 12;

    const years = Math.floor(totalMinutes / minutesInYear) + START_YEAR;
    const yearRemainder = totalMinutes % minutesInYear;
    
    const months = Math.floor(yearRemainder / minutesInMonth);
    const monthRemainder = yearRemainder % minutesInMonth;

    const days = Math.floor(monthRemainder / minutesInDay) + 1;
    const dayRemainder = monthRemainder % minutesInDay;

    const hours = Math.floor(dayRemainder / 60);
    const minutes = dayRemainder % 60;

    return {
        year: years,
        monthName: MONTHS[months],
        monthIndex: months,
        day: days,
        hours: hours,
        minutes: minutes,
        timeString: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
        fullDate: `${MONTHS[months]} ${days}, Y${years}`
    };
};

export const formatTime = (ticks: number): string => {
    const date = getGameDate(ticks);
    return `${date.fullDate} ${date.timeString}`;
};
