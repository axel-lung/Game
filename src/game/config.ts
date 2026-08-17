/**
 * Constantes d'équilibrage du prototype.
 *
 * HYPOTHÈSES — à revoir avec la suite du cahier des charges :
 *  - L'or est la seule ressource de la zone Défense. Les « âmes » (qui d'après
 *    l'intro relient Défense et Ferme) ne sont pas encore modélisées : le
 *    compteur existe et se remplit aux kills, mais ne se dépense pas.
 *  - Les fuites coûtent des vies, pas de la ressource.
 *  - Un seul héros sur le terrain à la fois.
 */

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

export const ECONOMY = {
  startingGold: 650,
  startingLives: 20,
  /** Or offert à la fin de chaque vague, en plus des kills. */
  waveClearBonus: 90,
  /** Croissance du bonus de fin de vague, par vague. */
  waveClearGrowth: 15,
  /** Remboursement à la revente d'une tour. */
  sellRatio: 0.7,
} as const;

export const HERO = {
  /** Vitesse de déplacement, en cases par seconde. */
  moveSpeed: 2.6,
  attackRange: 2.2,
  attackRate: 1.4,
  damage: 26,
  /** Ultime : dégâts de zone autour du héros. */
  ultimateDamage: 140,
  ultimateRadius: 2.8,
  ultimateCooldown: 22,
  /** Ralentissement infligé par l'ultime. */
  ultimateSlow: { factor: 0.45, duration: 2.5 },
} as const;

/** Le losange de terrain jouable. */
export const MAP = {
  cols: 13,
  rows: 13,
} as const;

/**
 * Tracé du chemin ennemi, en points de passage (coordonnées de grille).
 * Les ennemis suivent la polyligne qui relie ces points ; les cases traversées
 * deviennent inconstructibles.
 */
export const PATH_WAYPOINTS: ReadonlyArray<readonly [number, number]> = [
  [-1, 2],
  [9, 2],
  [9, 5],
  [3, 5],
  [3, 9],
  [12, 9],
  [13, 9],
];

export const PALETTE = {
  sky: 0x0f1626,
  grass: 0x67b95a,
  grassAlt: 0x5faa53,
  grassEdge: 0x3f7d3a,
  dirt: 0xd0a86d,
  dirtAlt: 0xc59c60,
  dirtEdge: 0x946f3f,
  gold: 0xffd257,
  danger: 0xff5d6c,
  ink: 0x1b2233,
  parchment: 0xf6e8c8,
} as const;
