import type { EnemyId } from './enemies';

/** Un groupe d'ennemis identiques, lâchés en séquence. */
export interface WaveGroup {
  enemy: EnemyId;
  count: number;
  /** Délai entre deux apparitions du groupe, en secondes. */
  interval: number;
  /** Délai avant le démarrage du groupe, en secondes. */
  delay: number;
  /** Multiplicateur de PV, pour faire monter la difficulté sans nouveaux types. */
  hpScale?: number;
}

export interface WaveDef {
  index: number;
  name: string;
  groups: WaveGroup[];
}

export const WAVES: WaveDef[] = [
  {
    index: 1,
    name: 'Reconnaissance',
    groups: [{ enemy: 'goblinet', count: 6, interval: 1.1, delay: 0 }],
  },
  {
    index: 2,
    name: 'Les éclaireurs',
    groups: [{ enemy: 'goblinet', count: 10, interval: 0.85, delay: 0 }],
  },
  {
    index: 3,
    name: 'Premiers bonds',
    groups: [
      { enemy: 'goblinet', count: 8, interval: 0.8, delay: 0 },
      { enemy: 'lapin', count: 4, interval: 1.2, delay: 4 },
    ],
  },
  {
    index: 4,
    name: 'La horde bondissante',
    groups: [
      { enemy: 'lapin', count: 12, interval: 0.7, delay: 0 },
      { enemy: 'goblinet', count: 10, interval: 0.5, delay: 3 },
    ],
  },
  {
    index: 5,
    name: 'Le gros du bataillon',
    groups: [
      { enemy: 'crapaud', count: 2, interval: 3, delay: 0 },
      { enemy: 'goblinet', count: 14, interval: 0.45, delay: 2 },
    ],
  },
  {
    index: 6,
    name: 'Marée verte',
    groups: [
      { enemy: 'goblinet', count: 24, interval: 0.35, delay: 0, hpScale: 1.3 },
      { enemy: 'lapin', count: 8, interval: 0.6, delay: 6 },
    ],
  },
  {
    index: 7,
    name: 'Pression lourde',
    groups: [
      { enemy: 'crapaud', count: 5, interval: 2.2, delay: 0 },
      { enemy: 'lapin', count: 14, interval: 0.5, delay: 3, hpScale: 1.4 },
    ],
  },
  {
    index: 8,
    name: 'Assaut coordonné',
    groups: [
      { enemy: 'lapin', count: 20, interval: 0.4, delay: 0, hpScale: 1.6 },
      { enemy: 'crapaud', count: 6, interval: 1.8, delay: 5, hpScale: 1.3 },
    ],
  },
  {
    index: 9,
    name: 'Avant la tempête',
    groups: [
      { enemy: 'goblinet', count: 40, interval: 0.22, delay: 0, hpScale: 2.2 },
      { enemy: 'crapaud', count: 8, interval: 1.5, delay: 6, hpScale: 1.6 },
    ],
  },
  {
    index: 10,
    name: 'Le Roi Gobelin',
    groups: [
      { enemy: 'roi', count: 1, interval: 1, delay: 0 },
      { enemy: 'lapin', count: 24, interval: 0.35, delay: 4, hpScale: 1.8 },
      { enemy: 'crapaud', count: 6, interval: 2, delay: 12, hpScale: 2 },
    ],
  },
];
