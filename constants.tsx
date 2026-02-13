import { TowerType, Level } from './types';

export const GRID_SIZE = 40;
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;

export const TOWER_CONFIGS = {
  [TowerType.BASIC]: {
    name: 'Krujë Arbalest',
    cost: 100,
    range: 170,
    damage: 15,
    hp: 100,
    cooldown: 650,
    color: '#991b1b', // Red
    description: 'Expert crossbowmen defending the citadel walls.'
  },
  [TowerType.SNIPER]: {
    name: 'Mirditë Longbow',
    cost: 250,
    range: 360,
    damage: 65,
    hp: 80,
    cooldown: 1900,
    color: '#1e293b', // Black
    description: 'Elite mountain marksmen capable of striking from the peaks.'
  },
  [TowerType.PULSE]: {
    name: 'Pitch & Sulfur',
    cost: 400,
    range: 120,
    damage: 30,
    hp: 150,
    cooldown: 1100,
    color: '#ea580c', // Orange
    description: 'Scalding oil and pitch that burns a large area of invaders.'
  },
  [TowerType.FROST]: {
    name: 'Iron Barricade',
    cost: 200,
    range: 140,
    damage: 8,
    hp: 200,
    cooldown: 750,
    color: '#38bdf8', // Light Blue
    description: 'Strategically placed debris and oil that slows the advance.'
  },
  [TowerType.STUN]: {
    name: 'Rock Volley',
    cost: 350,
    range: 150,
    damage: 12,
    hp: 180,
    cooldown: 2600,
    color: '#d1d5db', // Silver/Grey
    description: 'Massive boulders dropped from high cliffs to crush and daze.'
  }
};

export const LEVELS: Level[] = [
  {
    id: 'kruje',
    name: 'The Bastion of Krujë',
    description: 'The capital of the resistance. Defend the winding mountain pass to the castle gates.',
    wavesToUnlock: 10, // Next level (Berat) unlocks after completing Wave 10
    path: [
      { x: -50, y: 150 },
      { x: 250, y: 150 },
      { x: 250, y: 350 },
      { x: 150, y: 350 },
      { x: 150, y: 500 },
      { x: 650, y: 500 },
      { x: 650, y: 200 },
      { x: 850, y: 200 },
    ],
    secondaryPath: [
      { x: 400, y: 650 },
      { x: 400, y: 500 },
      { x: 650, y: 500 },
      { x: 650, y: 200 },
      { x: 850, y: 200 },
    ]
  },
  {
    id: 'berat',
    name: 'Stronghold of Berat',
    description: 'The city of a thousand windows. A complex urban defense with sharp turns.',
    wavesToUnlock: 12,
    path: [
      { x: 400, y: -50 },
      { x: 400, y: 150 },
      { x: 100, y: 150 },
      { x: 100, y: 450 },
      { x: 700, y: 450 },
      { x: 700, y: 100 },
      { x: 850, y: 100 },
    ],
    secondaryPath: [
      { x: -50, y: 450 },
      { x: 100, y: 450 },
      { x: 700, y: 450 },
      { x: 700, y: 100 },
      { x: 850, y: 100 },
    ]
  },
  {
    id: 'shkoder',
    name: 'Rozafa Fortress, Shkodër',
    description: 'An ancient northern sentinel. Force the invaders into a narrow bottleneck.',
    wavesToUnlock: 15,
    path: [
      { x: -50, y: 300 },
      { x: 300, y: 300 },
      { x: 300, y: 100 },
      { x: 500, y: 100 },
      { x: 500, y: 500 },
      { x: 850, y: 500 },
    ],
    secondaryPath: [
      { x: 500, y: -50 },
      { x: 500, y: 100 },
      { x: 500, y: 500 },
      { x: 850, y: 500 },
    ]
  },
  {
    id: 'durres',
    name: 'The Durrës Seawall',
    description: 'Protect the vital port. The invaders arrive from the Adriatic coast.',
    wavesToUnlock: 20,
    path: [
      { x: -50, y: 500 },
      { x: 150, y: 500 },
      { x: 150, y: 100 },
      { x: 350, y: 100 },
      { x: 350, y: 500 },
      { x: 550, y: 500 },
      { x: 550, y: 100 },
      { x: 850, y: 100 },
    ],
    secondaryPath: [
      { x: 350, y: -50 },
      { x: 350, y: 100 },
      { x: 350, y: 500 },
      { x: 550, y: 500 },
      { x: 550, y: 100 },
      { x: 850, y: 100 },
    ]
  }
];