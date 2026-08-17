import { MAP, PATH_WAYPOINTS } from './config';
import type { GridPoint } from './iso';

/**
 * Polyligne suivie par les ennemis, exprimée en unités de grille.
 *
 * Les longueurs cumulées sont pré-calculées une fois : chaque ennemi ne stocke
 * qu'un scalaire (sa distance parcourue), ce qui rend la progression triviale à
 * comparer pour le ciblage « premier ennemi ».
 */
export class EnemyPath {
  readonly points: GridPoint[];
  readonly cumulative: number[];
  readonly totalLength: number;

  constructor(waypoints: ReadonlyArray<readonly [number, number]>) {
    this.points = waypoints.map(([gx, gy]) => ({ gx, gy }));
    this.cumulative = [0];
    let total = 0;
    for (let i = 1; i < this.points.length; i++) {
      const a = this.points[i - 1]!;
      const b = this.points[i]!;
      total += Math.hypot(b.gx - a.gx, b.gy - a.gy);
      this.cumulative.push(total);
    }
    this.totalLength = total;
  }

  /** Position en grille à `dist` unités du départ. Clampée aux extrémités. */
  pointAt(dist: number): GridPoint {
    const first = this.points[0]!;
    const last = this.points[this.points.length - 1]!;
    if (dist <= 0) return { ...first };
    if (dist >= this.totalLength) return { ...last };

    // Les chemins font quelques segments : la recherche linéaire est plus
    // rapide qu'une dichotomie, et surtout plus simple à relire.
    for (let i = 1; i < this.points.length; i++) {
      const segEnd = this.cumulative[i]!;
      if (dist <= segEnd) {
        const segStart = this.cumulative[i - 1]!;
        const a = this.points[i - 1]!;
        const b = this.points[i]!;
        const segLen = segEnd - segStart;
        const t = segLen === 0 ? 0 : (dist - segStart) / segLen;
        return { gx: a.gx + (b.gx - a.gx) * t, gy: a.gy + (b.gy - a.gy) * t };
      }
    }
    return { ...last };
  }

  /** Direction normalisée du déplacement à `dist`. Sert à orienter les sprites. */
  headingAt(dist: number): { dx: number; dy: number } {
    const a = this.pointAt(Math.max(0, dist - 0.05));
    const b = this.pointAt(Math.min(this.totalLength, dist + 0.05));
    const len = Math.hypot(b.gx - a.gx, b.gy - a.gy) || 1;
    return { dx: (b.gx - a.gx) / len, dy: (b.gy - a.gy) / len };
  }
}

/**
 * Grille de terrain : sait quelles cases existent et lesquelles sont libres.
 *
 * Une case est inconstructible si le chemin la traverse. On teste la distance
 * du centre de la case au chemin plutôt que d'énumérer les cases traversées :
 * ça marche pour n'importe quel tracé, y compris en diagonale.
 */
export class GameMap {
  readonly cols = MAP.cols;
  readonly rows = MAP.rows;
  readonly path: EnemyPath;
  private readonly blocked: boolean[];

  constructor() {
    this.path = new EnemyPath(PATH_WAYPOINTS);
    this.blocked = new Array(this.cols * this.rows).fill(false);
    for (let gy = 0; gy < this.rows; gy++) {
      for (let gx = 0; gx < this.cols; gx++) {
        this.blocked[gy * this.cols + gx] = this.distanceToPath(gx, gy) < 0.85;
      }
    }
  }

  inBounds(gx: number, gy: number): boolean {
    return gx >= 0 && gy >= 0 && gx < this.cols && gy < this.rows;
  }

  /** Vrai si la case appartient au chemin (donc inconstructible). */
  isPath(gx: number, gy: number): boolean {
    if (!this.inBounds(gx, gy)) return false;
    return this.blocked[gy * this.cols + gx] === true;
  }

  /** Distance du centre d'une case au segment de chemin le plus proche. */
  private distanceToPath(gx: number, gy: number): number {
    let best = Infinity;
    const pts = this.path.points;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1]!;
      const b = pts[i]!;
      const vx = b.gx - a.gx;
      const vy = b.gy - a.gy;
      const lenSq = vx * vx + vy * vy;
      const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((gx - a.gx) * vx + (gy - a.gy) * vy) / lenSq));
      const d = Math.hypot(gx - (a.gx + vx * t), gy - (a.gy + vy * t));
      if (d < best) best = d;
    }
    return best;
  }
}
