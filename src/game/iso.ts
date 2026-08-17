/**
 * Projection isométrique 2.5D.
 *
 * Toute la logique de jeu (portées, vitesses, distances) travaille en
 * *unités de grille*, qui sont isotropes : 1 unité = 1 case, dans toutes les
 * directions. Seul l'affichage passe en coordonnées écran. C'est ce qui évite
 * les bugs classiques de l'isométrique, où un cercle de portée devient une
 * ellipse et où les distances au carré ne veulent plus rien dire.
 */

/** Largeur d'une case en pixels écran (le losange fait 2x plus large que haut). */
export const TILE_W = 64;
/** Hauteur d'une case en pixels écran. */
export const TILE_H = 32;
/** Épaisseur du « bord » de terrain sous chaque case, qui donne le relief 2.5D. */
export const TILE_LIP = 10;

export interface GridPoint {
  gx: number;
  gy: number;
}

export interface WorldPoint {
  x: number;
  y: number;
}

/** Grille -> écran. Le point retourné est le centre de la face supérieure. */
export function gridToWorld(gx: number, gy: number): WorldPoint {
  return { x: (gx - gy) * (TILE_W / 2), y: (gx + gy) * (TILE_H / 2) };
}

/** Écran -> grille (inverse exact de `gridToWorld`). */
export function worldToGrid(x: number, y: number): GridPoint {
  const a = x / (TILE_W / 2);
  const b = y / (TILE_H / 2);
  return { gx: (b + a) / 2, gy: (b - a) / 2 };
}

/**
 * Demi-axes écran du cercle de portée.
 *
 * Un disque de rayon `r` en grille se projette en ellipse alignée sur les axes
 * écran — pas en cercle. Les facteurs viennent des points extrêmes de la
 * projection : (r,-r)/√2 donne le sommet horizontal, (r,r)/√2 le vertical.
 */
export function rangeToEllipse(r: number): { rx: number; ry: number } {
  const k = Math.SQRT2;
  return { rx: r * (TILE_W / 2) * k, ry: r * (TILE_H / 2) * k };
}

/** Profondeur de rendu : plus l'objet est « bas » à l'écran, plus il est devant. */
export function depthFor(worldY: number, bias = 0): number {
  return worldY + bias;
}

export function gridDistance(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}
