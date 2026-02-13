export enum TowerType {
  BASIC = 'BASIC',
  SNIPER = 'SNIPER',
  PULSE = 'PULSE',
  FROST = 'FROST',
  STUN = 'STUN'
}

export enum TargetingMode {
  FIRST = 'FIRST', // Closest to gate
  LAST = 'LAST',   // Furthest from gate
  STRONG = 'STRONG', // Highest HP
  WEAK = 'WEAK',   // Lowest HP
  CLOSE = 'CLOSE'  // Closest to tower
}

export interface Position {
  x: number;
  y: number;
}

export interface Enemy {
  id: string;
  type: 'SCOUT' | 'TANK' | 'BOSS' | 'RECON' | 'LEGIONARY' | 'HORSE_ARCHER';
  hp: number;
  maxHp: number;
  speed: number;
  progress: number; // 0 to 100
  pathIndex: number;
  x: number;
  y: number;
  isDead: boolean;
  slowedUntil?: number; // timestamp
  stunnedUntil?: number; // timestamp
  lastAttackTime?: number; // for ranged attackers
  isReinforcement: boolean;
  pathType: 'primary' | 'secondary';
}

export interface Tower {
  id: string;
  type: TowerType;
  x: number;
  y: number;
  range: number;
  damage: number;
  hp: number;
  maxHp: number;
  cooldown: number;
  lastFired: number;
  level: number;
  cost: number;
  totalInvested: number;
  color: string;
  targetingMode: TargetingMode;
  stunnedUntil?: number;
}

export interface Projectile {
  id: string;
  x: number;
  y: number;
  targetId: string;
  speed: number;
  damage: number;
  isEnemy?: boolean; // differentiate enemy arrows
}

export interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  opacity: number;
  startTime: number;
}

export interface Level {
  id: string;
  name: string;
  description: string;
  path: Position[];
  secondaryPath?: Position[];
  wavesToUnlock: number;
}

export interface GameState {
  gold: number;
  lives: number;
  wave: number;
  isGameOver: boolean;
  isPaused: boolean;
  currentLevelIndex: number;
  isVictory: boolean;
}

export interface AdvisorComment {
  role: 'AI' | 'USER';
  text: string;
  timestamp: number;
}