import Phaser from 'phaser';
import type { EnemyDef } from '../data/enemies';
import { gridToWorld, RES_SCALE } from '../render';
import type { EnemyPath } from '../map';

/** Une créature ennemie qui avance le long du chemin. */
export class Enemy extends Phaser.GameObjects.Container {
  readonly def: EnemyDef;
  readonly maxHp: number;
  hp: number;
  /** Distance parcourue sur le chemin, en unités de grille. */
  dist = 0;
  gx = 0;
  gy = 0;
  alive = true;
  reachedEnd = false;

  private readonly sprite: Phaser.GameObjects.Image;
  private readonly barBg: Phaser.GameObjects.Rectangle;
  private readonly barFill: Phaser.GameObjects.Rectangle;
  private slowFactor = 1;
  private slowTimer = 0;
  private bobPhase = Math.random() * Math.PI * 2;
  private flashTimer = 0;

  constructor(scene: Phaser.Scene, def: EnemyDef, hpScale: number) {
    super(scene, 0, 0);
    this.def = def;
    this.maxHp = Math.round(def.hp * hpScale);
    this.hp = this.maxHp;

    this.sprite = scene.add.image(0, 0, def.texture);
    this.sprite.setOrigin(0.5, 0.9);
    this.sprite.setScale(RES_SCALE * def.scale);

    const barW = 42 * def.scale;
    const barY = -this.sprite.displayHeight * 0.92;
    this.barBg = scene.add.rectangle(0, barY, barW, 6, 0x18202f).setStrokeStyle(1, 0x0b111c);
    this.barFill = scene.add.rectangle(-barW / 2, barY, barW, 4, 0x7ee08a).setOrigin(0, 0.5);

    this.add([this.sprite, this.barBg, this.barFill]);
    this.refreshBar();
    scene.add.existing(this);
  }

  /** Fraction de vie restante, dans [0, 1]. */
  get healthRatio(): number {
    return Phaser.Math.Clamp(this.hp / this.maxHp, 0, 1);
  }

  applyDamage(amount: number): void {
    if (!this.alive) return;
    this.hp -= amount;
    this.flashTimer = 0.09;
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
    }
    this.refreshBar();
  }

  /** Applique un ralentissement. Le plus fort l'emporte, il ne s'empile pas. */
  applySlow(factor: number, duration: number): void {
    if (factor < this.slowFactor || this.slowTimer <= 0) {
      this.slowFactor = factor;
      this.slowTimer = Math.max(this.slowTimer, duration);
    }
  }

  private refreshBar(): void {
    const ratio = this.healthRatio;
    this.barFill.setScale(ratio, 1);
    this.barFill.fillColor = ratio > 0.5 ? 0x7ee08a : ratio > 0.25 ? 0xffd257 : 0xff5d6c;
    const hidden = ratio >= 1;
    this.barBg.setVisible(!hidden);
    this.barFill.setVisible(!hidden);
  }

  override update(dt: number, path: EnemyPath): void {
    if (!this.alive) return;

    if (this.slowTimer > 0) {
      this.slowTimer -= dt;
      if (this.slowTimer <= 0) this.slowFactor = 1;
    }

    this.dist += this.def.speed * this.slowFactor * dt;
    if (this.dist >= path.totalLength) {
      this.dist = path.totalLength;
      this.reachedEnd = true;
    }

    const p = path.pointAt(this.dist);
    this.gx = p.gx;
    this.gy = p.gy;
    const w = gridToWorld(p.gx, p.gy);
    this.setPosition(w.x, w.y);
    this.setDepth(w.y);

    // Petit rebond, pour que la horde ne semble pas glisser sur le sol.
    this.bobPhase += dt * (6 + this.def.speed * 3);
    this.sprite.y = -Math.abs(Math.sin(this.bobPhase)) * 3;

    // Le sprite regarde dans le sens du déplacement à l'écran.
    const h = path.headingAt(this.dist);
    this.sprite.setFlipX(h.dx - h.dy < 0);

    // Teinte bleutée sous ralentissement, éclair blanc quand touché.
    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      this.sprite.setTintFill(0xffffff);
    } else if (this.slowTimer > 0) {
      this.sprite.setTint(0x9fd8ff);
    } else {
      this.sprite.clearTint();
    }
  }

  /** Animation de mort, puis destruction. */
  playDeath(onDone?: () => void): void {
    this.barBg.setVisible(false);
    this.barFill.setVisible(false);
    this.sprite.clearTint();
    this.scene.tweens.add({
      targets: this.sprite,
      scale: this.sprite.scale * 1.25,
      alpha: 0,
      angle: Phaser.Math.Between(-40, 40),
      duration: 240,
      ease: 'Quad.easeOut',
      onComplete: () => {
        onDone?.();
        this.destroy();
      },
    });
  }
}
