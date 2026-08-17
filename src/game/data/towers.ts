/**
 * Les tours : animaux nationaux adultes.
 *
 * Quatre rôles volontairement distincts, pour que le choix de placement
 * compte : DPS bon marché, sniper, dégâts de zone, contrôle.
 */

export type TowerId = 'coq' | 'aigle' | 'ours' | 'panda';

export interface SlowEffect {
  /** Multiplicateur de vitesse appliqué à la cible (0.6 = -40 %). */
  factor: number;
  /** Durée en secondes. */
  duration: number;
}

export interface TowerDef {
  id: TowerId;
  name: string;
  nation: string;
  flag: string;
  cost: number;
  /** Portée, en cases. */
  range: number;
  /** Cadence, en tirs par seconde. */
  fireRate: number;
  damage: number;
  /** Vitesse du projectile, en pixels écran par seconde. */
  projectileSpeed: number;
  projectileTexture: string;
  /** Rayon des dégâts de zone, en cases. 0 = mono-cible. */
  splashRadius: number;
  slow?: SlowEffect;
  blurb: string;
}

export const TOWERS: Record<TowerId, TowerDef> = {
  coq: {
    id: 'coq',
    name: 'Coq Gaulois',
    nation: 'France',
    flag: '🇫🇷',
    cost: 180,
    range: 3.1,
    fireRate: 2.2,
    damage: 11,
    projectileSpeed: 460,
    projectileTexture: 'proj_feather',
    splashRadius: 0,
    blurb: 'Tir rapide et bon marché. La colonne vertébrale de toute défense.',
  },
  aigle: {
    id: 'aigle',
    name: 'Aigle Royal',
    nation: 'États-Unis',
    flag: '🇺🇸',
    cost: 340,
    range: 6.4,
    fireRate: 0.62,
    damage: 62,
    projectileSpeed: 900,
    projectileTexture: 'proj_bolt',
    splashRadius: 0,
    blurb: 'Portée énorme, frappe lourde. Placez-le au centre, il couvre tout.',
  },
  ours: {
    id: 'ours',
    name: 'Ours Brun',
    nation: 'Russie',
    flag: '🇷🇺',
    cost: 300,
    range: 2.3,
    fireRate: 0.85,
    damage: 34,
    projectileSpeed: 340,
    projectileTexture: 'proj_paw',
    splashRadius: 1.35,
    blurb: 'Courte portée mais dégâts de zone. À poser sur les virages serrés.',
  },
  panda: {
    id: 'panda',
    name: 'Panda Géant',
    nation: 'Chine',
    flag: '🇨🇳',
    cost: 240,
    range: 3.4,
    fireRate: 1.1,
    damage: 7,
    projectileSpeed: 380,
    projectileTexture: 'proj_bamboo',
    splashRadius: 0.9,
    slow: { factor: 0.55, duration: 2.2 },
    blurb: 'Peu de dégâts, mais englue les vagues. Multiplie la valeur des autres tours.',
  },
};

export const TOWER_ORDER: TowerId[] = ['coq', 'aigle', 'ours', 'panda'];
