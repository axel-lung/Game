import Phaser from 'phaser';
import type { TowerId } from './data/towers';

/**
 * Bus d'événements entre la scène de jeu et l'interface.
 *
 * Les deux scènes tournent en parallèle (le HUD ne doit pas suivre la caméra du
 * terrain). Plutôt que de les faire se référencer mutuellement, elles ne
 * connaissent que ce bus.
 */
export interface GameStats {
  gold: number;
  lives: number;
  souls: number;
  wave: number;
  totalWaves: number;
  waveInProgress: boolean;
  enemiesAlive: number;
}

export interface BusEvents {
  stats: (stats: GameStats) => void;
  heroCooldown: (ratio: number, ready: boolean) => void;
  selectTower: (id: TowerId | null) => void;
  requestStartWave: () => void;
  requestUltimate: () => void;
  requestSpeed: (multiplier: number) => void;
  towerSelected: (info: { id: TowerId; sellValue: number } | null) => void;
  requestSell: () => void;
  requestHeroMove: () => void;
  requestRestart: () => void;
  /** Émis par le HUD à son démarrage : il naît après la scène de jeu et rate
   *  donc le premier envoi de statistiques. */
  requestStats: () => void;
  gameOver: (won: boolean, wave: number) => void;
  toast: (message: string, tone: 'info' | 'bad') => void;
}

export const bus = new Phaser.Events.EventEmitter();

export function emit<K extends keyof BusEvents>(event: K, ...args: Parameters<BusEvents[K]>): void {
  bus.emit(event, ...args);
}

export function on<K extends keyof BusEvents>(event: K, fn: BusEvents[K], context?: unknown): void {
  bus.on(event, fn as (...args: unknown[]) => void, context);
}
