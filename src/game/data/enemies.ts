/** Les ennemis : créatures chibi, mignonnes mais vicieuses. */

export type EnemyId = 'goblinet' | 'lapin' | 'crapaud' | 'roi';

export interface EnemyDef {
  id: EnemyId;
  name: string;
  texture: string;
  hp: number;
  /** Vitesse, en cases par seconde. */
  speed: number;
  /** Or gagné au kill. */
  bounty: number;
  /** Âmes gagnées au kill (ressource de la zone Ferme, pas encore dépensable). */
  souls: number;
  /** Vies perdues si la créature atteint la sortie. */
  leak: number;
  /** Échelle d'affichage du sprite. */
  scale: number;
}

export const ENEMIES: Record<EnemyId, EnemyDef> = {
  goblinet: {
    id: 'goblinet',
    name: 'Goblinet',
    texture: 'enemy_goblinet',
    hp: 62,
    speed: 1.15,
    bounty: 9,
    souls: 1,
    leak: 1,
    scale: 0.82,
  },
  lapin: {
    id: 'lapin',
    name: 'Bunny Demon',
    texture: 'enemy_lapin',
    hp: 96,
    speed: 1.75,
    bounty: 14,
    souls: 1,
    leak: 1,
    scale: 0.84,
  },
  crapaud: {
    id: 'crapaud',
    name: 'Crapaud Bouffi',
    texture: 'enemy_crapaud',
    hp: 420,
    speed: 0.72,
    bounty: 40,
    souls: 3,
    leak: 3,
    scale: 1.0,
  },
  roi: {
    id: 'roi',
    name: 'Roi Gobelin',
    texture: 'enemy_roi',
    hp: 2600,
    speed: 0.62,
    bounty: 260,
    souls: 20,
    leak: 10,
    scale: 1.28,
  },
};
