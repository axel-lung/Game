import Phaser from 'phaser';
import type { Enemy } from './Enemy';
import type { SlowEffect } from '../data/towers';

export interface ProjectileSpec {
  texture: string;
  /** Vitesse en pixels écran par seconde. */
  speed: number;
  damage: number;
  /** Rayon des dégâts de zone, en unités de grille. 0 = mono-cible. */
  splashRadius: number;
  slow?: SlowEffect;
}

/**
 * Projectile à guidage : il suit sa cible tant qu'elle vit, sinon il termine sa
 * course vers le dernier point connu puis disparaît. Sans ce repli, tuer une
 * cible en vol laisserait des projectiles orphelins tourner indéfiniment.
 */
export class Projectile extends Phaser.GameObjects.Image {
  readonly spec: ProjectileSpec;
  /** Cible suivie, mise à null dès qu'elle meurt. Lue par la scène à l'impact. */
  target: Enemy | null;
  private lastX: number;
  private lastY: number;
  private life = 3;
  done = false;
  /** Renseigné à l'impact, consommé par la scène pour appliquer les dégâts. */
  impact: { x: number; y: number } | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, target: Enemy, spec: ProjectileSpec) {
    super(scene, x, y, spec.texture);
    this.spec = spec;
    this.target = target;
    this.lastX = target.x;
    this.lastY = target.y;
    scene.add.existing(this);
    this.setDepth(y + 400);
  }

  override update(dt: number): void {
    if (this.done) return;

    this.life -= dt;
    if (this.life <= 0) {
      this.done = true;
      return;
    }

    if (this.target && this.target.alive && this.target.active) {
      this.lastX = this.target.x;
      this.lastY = this.target.y - 18;
    } else {
      this.target = null;
    }

    const dx = this.lastX - this.x;
    const dy = this.lastY - this.y;
    const dist = Math.hypot(dx, dy);
    const step = this.spec.speed * dt;

    if (dist <= step || dist < 4) {
      this.setPosition(this.lastX, this.lastY);
      // Un projectile dont la cible est morte en vol ne fait pas de dégâts,
      // sauf s'il est explosif : la zone, elle, part quand même.
      this.impact = this.target || this.spec.splashRadius > 0 ? { x: this.x, y: this.y } : null;
      this.done = true;
      return;
    }

    this.setPosition(this.x + (dx / dist) * step, this.y + (dy / dist) * step);
    this.setRotation(Math.atan2(dy, dx));
    this.setDepth(this.y + 400);
  }
}
