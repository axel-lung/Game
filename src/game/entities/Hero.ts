import Phaser from 'phaser';
import type { Enemy } from './Enemy';
import { HERO } from '../config';
import { gridToWorld, gridDistance, RES_SCALE } from '../render';

/**
 * Le héros mythologique : la seule unité que le joueur déplace librement.
 *
 * Il se déplace en ligne droite vers le point demandé (le terrain de la zone
 * Défense est ouvert, il n'y a rien à contourner) et frappe automatiquement.
 */
export class Hero extends Phaser.GameObjects.Container {
  gx: number;
  gy: number;
  private targetGx: number;
  private targetGy: number;
  private readonly sprite: Phaser.GameObjects.Image;
  private readonly ring: Phaser.GameObjects.Ellipse;
  private attackCooldown = 0;
  private ultimateCooldown = 0;
  private bobPhase = 0;

  constructor(scene: Phaser.Scene, gx: number, gy: number) {
    const w = gridToWorld(gx, gy);
    super(scene, w.x, w.y);
    this.gx = gx;
    this.gy = gy;
    this.targetGx = gx;
    this.targetGy = gy;

    // Anneau au sol : sans lui, on perd le héros de vue au milieu d'une vague.
    this.ring = scene.add.ellipse(0, 0, 54, 27, 0xffd257, 0.28);
    this.ring.setStrokeStyle(2, 0xffd257, 0.85);

    this.sprite = scene.add.image(0, 0, 'hero_griffon');
    this.sprite.setOrigin(0.5, 0.9);
    this.sprite.setScale(RES_SCALE * 1.05);

    this.add([this.ring, this.sprite]);
    this.setDepth(w.y);
    scene.add.existing(this);
  }

  get ultimateReady(): boolean {
    return this.ultimateCooldown <= 0;
  }

  /** Progression de la recharge de l'ultime, dans [0, 1]. */
  get ultimateRatio(): number {
    return 1 - Phaser.Math.Clamp(this.ultimateCooldown / HERO.ultimateCooldown, 0, 1);
  }

  /** Ordonne un déplacement vers une case. */
  setDestination(gx: number, gy: number): void {
    this.targetGx = gx;
    this.targetGy = gy;
  }

  /** Déclenche l'ultime. Retourne false si encore en recharge. */
  triggerUltimate(): boolean {
    if (!this.ultimateReady) return false;
    this.ultimateCooldown = HERO.ultimateCooldown;
    this.scene.tweens.add({
      targets: this.sprite,
      scale: RES_SCALE * 1.5,
      duration: 130,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => this.sprite.setScale(RES_SCALE * 1.05),
    });
    return true;
  }

  /** Avance le héros. Retourne la cible si une attaque part cette frame. */
  override update(dt: number, enemies: Enemy[]): Enemy | null {
    if (this.ultimateCooldown > 0) this.ultimateCooldown -= dt;

    // Déplacement.
    const dx = this.targetGx - this.gx;
    const dy = this.targetGy - this.gy;
    const dist = Math.hypot(dx, dy);
    const moving = dist > 0.02;
    if (moving) {
      const step = Math.min(dist, HERO.moveSpeed * dt);
      this.gx += (dx / dist) * step;
      this.gy += (dy / dist) * step;
      const w = gridToWorld(this.gx, this.gy);
      this.setPosition(w.x, w.y);
      this.setDepth(w.y);
      this.sprite.setFlipX(dx - dy < 0);
    }

    this.bobPhase += dt * (moving ? 9 : 3);
    this.sprite.y = -Math.abs(Math.sin(this.bobPhase)) * (moving ? 4 : 2);
    this.ring.setScale(1 + Math.sin(this.bobPhase * 0.5) * 0.04);

    // Attaque automatique.
    if (this.attackCooldown > 0) {
      this.attackCooldown -= dt;
      return null;
    }

    let best: Enemy | null = null;
    let bestDist = -Infinity;
    for (const e of enemies) {
      if (!e.alive) continue;
      if (gridDistance(e.gx, e.gy, this.gx, this.gy) > HERO.attackRange) continue;
      if (e.dist > bestDist) {
        bestDist = e.dist;
        best = e;
      }
    }
    if (!best) return null;

    this.attackCooldown = 1 / HERO.attackRate;
    this.sprite.setFlipX(best.x < this.x);
    return best;
  }
}
