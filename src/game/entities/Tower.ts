import Phaser from 'phaser';
import type { TowerDef } from '../data/towers';
import type { Enemy } from './Enemy';
import { gridToWorld, gridDistance, RES_SCALE } from '../render';

/** Une tour posée sur une case, qui tire sur l'ennemi le plus avancé à portée. */
export class Tower extends Phaser.GameObjects.Container {
  readonly def: TowerDef;
  readonly gx: number;
  readonly gy: number;
  private readonly sprite: Phaser.GameObjects.Image;
  private cooldown = 0;
  private idlePhase = Math.random() * Math.PI * 2;

  constructor(scene: Phaser.Scene, def: TowerDef, gx: number, gy: number) {
    const w = gridToWorld(gx, gy);
    super(scene, w.x, w.y);
    this.def = def;
    this.gx = gx;
    this.gy = gy;

    this.sprite = scene.add.image(0, 0, `tower_${def.id}`);
    this.sprite.setOrigin(0.5, 0.9);
    this.sprite.setScale(RES_SCALE);
    this.add(this.sprite);

    this.setDepth(w.y);
    scene.add.existing(this);

    // Apparition : la tour tombe en place.
    this.sprite.setScale(RES_SCALE * 0.4);
    scene.tweens.add({
      targets: this.sprite,
      scale: RES_SCALE,
      duration: 260,
      ease: 'Back.easeOut',
    });
  }

  /** Position d'où partent les projectiles (à hauteur de tête). */
  get muzzleY(): number {
    return this.y - this.sprite.displayHeight * 0.6;
  }

  /**
   * Choisit l'ennemi à portée le plus proche de la sortie.
   *
   * C'est la politique « first » de BTD6 : elle concentre le feu sur la menace
   * la plus urgente plutôt que de disperser les dégâts.
   */
  private pickTarget(enemies: Enemy[]): Enemy | null {
    let best: Enemy | null = null;
    let bestDist = -Infinity;
    for (const e of enemies) {
      if (!e.alive) continue;
      if (gridDistance(e.gx, e.gy, this.gx, this.gy) > this.def.range) continue;
      if (e.dist > bestDist) {
        bestDist = e.dist;
        best = e;
      }
    }
    return best;
  }

  /** Avance l'horloge de tir. Retourne la cible si un tir part cette frame. */
  override update(dt: number, enemies: Enemy[]): Enemy | null {
    this.idlePhase += dt * 2;
    this.sprite.y = Math.sin(this.idlePhase) * 1.5;

    if (this.cooldown > 0) {
      this.cooldown -= dt;
      return null;
    }

    const target = this.pickTarget(enemies);
    if (!target) return null;

    this.cooldown = 1 / this.def.fireRate;
    this.sprite.setFlipX(target.x < this.x);

    // Léger recul pour donner du poids au tir.
    this.scene.tweens.add({
      targets: this.sprite,
      scaleX: RES_SCALE * 1.14,
      scaleY: RES_SCALE * 0.88,
      duration: 70,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.sprite.setScale(RES_SCALE);
      },
    });

    return target;
  }
}
