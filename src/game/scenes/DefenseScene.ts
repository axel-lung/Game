import Phaser from 'phaser';
import { GameMap } from '../map';
import { ECONOMY, HERO, PALETTE } from '../config';
import { TOWERS, type TowerId } from '../data/towers';
import { ENEMIES, type EnemyId } from '../data/enemies';
import { WAVES } from '../data/waves';
import { Enemy } from '../entities/Enemy';
import { Tower } from '../entities/Tower';
import { Hero } from '../entities/Hero';
import { Projectile } from '../entities/Projectile';
import {
  gridToWorld,
  worldToGrid,
  gridDistance,
  rangeToEllipse,
  TILE_H,
  TILE_W,
  RES_SCALE,
} from '../render';
import { TILE_ORIGIN_Y } from '../art';
import { bus, emit, on } from '../bus';
import type { BusEvents } from '../bus';

/** Plages de profondeur, pour que le sol reste toujours sous les unités. */
const DEPTH_GROUND = -10000;
const DEPTH_OVERLAY = -5000;
const DEPTH_FX = 5000;

interface SpawnOrder {
  at: number;
  enemy: EnemyId;
  hpScale: number;
}

export class DefenseScene extends Phaser.Scene {
  private map!: GameMap;
  private hero!: Hero;

  private enemies: Enemy[] = [];
  private towers: Tower[] = [];
  private projectiles: Projectile[] = [];
  private towerAt = new Map<string, Tower>();

  private gold: number = ECONOMY.startingGold;
  private lives: number = ECONOMY.startingLives;
  private souls = 0;
  private waveIndex = 0;
  private waveInProgress = false;
  private spawnQueue: SpawnOrder[] = [];
  private waveClock = 0;
  private speedMultiplier = 1;
  private finished = false;

  private buildChoice: TowerId | null = null;
  private selectedTower: Tower | null = null;
  private heroMoveMode = false;
  private busEvents: Array<keyof BusEvents> = [];
  private lastEnemyCount = -1;

  private rangeGfx!: Phaser.GameObjects.Graphics;
  private hoverTile!: Phaser.GameObjects.Image;
  private ghost!: Phaser.GameObjects.Image;

  constructor() {
    super('Defense');
  }

  create(): void {
    this.resetState();
    this.cameras.main.setBackgroundColor(PALETTE.sky);

    this.map = new GameMap();
    this.drawGround();
    this.drawProps();
    this.drawMarkers();

    this.rangeGfx = this.add.graphics().setDepth(DEPTH_OVERLAY);
    this.hoverTile = this.add
      .image(0, 0, 'tile_hover')
      .setOrigin(0.5, 0.5)
      .setScale(RES_SCALE)
      .setDepth(DEPTH_OVERLAY + 1)
      .setVisible(false);
    this.ghost = this.add
      .image(0, 0, 'tower_coq')
      .setOrigin(0.5, 0.9)
      .setScale(RES_SCALE)
      .setAlpha(0.55)
      .setDepth(DEPTH_FX - 1)
      .setVisible(false);

    this.hero = new Hero(this, 6, 7);

    this.setupCamera();
    this.setupInput();
    this.wireBus();
    this.pushStats();
  }

  private resetState(): void {
    this.enemies = [];
    this.towers = [];
    this.projectiles = [];
    this.towerAt = new Map();
    this.gold = ECONOMY.startingGold;
    this.lives = ECONOMY.startingLives;
    this.souls = 0;
    this.waveIndex = 0;
    this.waveInProgress = false;
    this.spawnQueue = [];
    this.waveClock = 0;
    this.speedMultiplier = 1;
    this.finished = false;
    this.buildChoice = null;
    this.selectedTower = null;
    this.heroMoveMode = false;
  }

  // -------------------------------------------------------------------------
  // Construction du décor
  // -------------------------------------------------------------------------

  private drawGround(): void {
    for (let gy = 0; gy < this.map.rows; gy++) {
      for (let gx = 0; gx < this.map.cols; gx++) {
        const w = gridToWorld(gx, gy);
        const isPath = this.map.isPath(gx, gy);
        const alt = (gx + gy) % 2 === 0;
        const key = isPath ? (alt ? 'tile_path' : 'tile_path_alt') : alt ? 'tile_grass' : 'tile_grass_alt';
        this.add
          .image(w.x, w.y, key)
          .setOrigin(0.5, TILE_ORIGIN_Y)
          .setScale(RES_SCALE)
          .setDepth(DEPTH_GROUND + w.y);
      }
    }
  }

  private drawProps(): void {
    // Décor semé de façon déterministe : la map doit être identique d'une
    // partie à l'autre pour que l'équilibrage reste comparable.
    const rng = new Phaser.Math.RandomDataGenerator(['animal-nations-defense']);
    const props = ['prop_tree', 'prop_rock', 'prop_bush'];
    for (let gy = 0; gy < this.map.rows; gy++) {
      for (let gx = 0; gx < this.map.cols; gx++) {
        if (this.map.isPath(gx, gy)) continue;
        if (rng.frac() > 0.11) continue;
        const w = gridToWorld(gx, gy);
        const key = props[rng.integerInRange(0, props.length - 1)]!;
        this.add
          .image(w.x + rng.integerInRange(-6, 6), w.y + rng.integerInRange(-3, 3), key)
          .setOrigin(0.5, 0.9)
          .setScale(RES_SCALE * rng.realInRange(0.85, 1.15))
          .setDepth(w.y);
      }
    }
  }

  private drawMarkers(): void {
    const start = this.map.path.pointAt(0);
    const end = this.map.path.pointAt(this.map.path.totalLength);
    const ws = gridToWorld(start.gx, start.gy);
    const we = gridToWorld(end.gx, end.gy);

    const portal = this.add
      .image(ws.x, ws.y, 'marker_spawn')
      .setOrigin(0.5, 0.85)
      .setScale(RES_SCALE)
      .setDepth(ws.y);
    this.tweens.add({
      targets: portal,
      scaleX: RES_SCALE * 1.08,
      scaleY: RES_SCALE * 0.94,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const core = this.add
      .image(we.x, we.y, 'marker_core')
      .setOrigin(0.5, 0.85)
      .setScale(RES_SCALE)
      .setDepth(we.y);
    this.tweens.add({
      targets: core,
      y: we.y - 6,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  // -------------------------------------------------------------------------
  // Caméra et entrées tactiles
  // -------------------------------------------------------------------------

  private setupCamera(): void {
    const cam = this.cameras.main;
    const halfSpan = ((this.map.cols + this.map.rows) * TILE_W) / 2;
    const center = gridToWorld((this.map.cols - 1) / 2, (this.map.rows - 1) / 2);
    cam.setBounds(center.x - halfSpan, -TILE_H * 4, halfSpan * 2, (this.map.cols + this.map.rows) * TILE_H + TILE_H * 8);
    cam.centerOn(center.x, center.y - 40);
    cam.setZoom(1.05);
  }

  /**
   * Vrai si le pointeur est sur le HUD.
   *
   * Le HUD vit dans une scène séparée : sans ce test, appuyer sur un bouton
   * enverrait aussi un toucher au terrain, et poserait une tour derrière le
   * panneau.
   */
  private overHud(p: Phaser.Input.Pointer): boolean {
    const rects = this.registry.get('hudRects') as Array<{ x: number; y: number; w: number; h: number }> | undefined;
    if (!rects) return false;
    return rects.some((r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h);
  }

  private setupInput(): void {
    const cam = this.cameras.main;
    let dragging = false;
    let ignoring = false;
    let downX = 0;
    let downY = 0;
    let pinchStart = 0;
    let zoomStart = 1;

    this.input.on(Phaser.Input.Events.POINTER_DOWN, (p: Phaser.Input.Pointer) => {
      dragging = false;
      ignoring = this.overHud(p);
      downX = p.x;
      downY = p.y;
    });

    this.input.on(Phaser.Input.Events.POINTER_MOVE, (p: Phaser.Input.Pointer) => {
      const p1 = this.input.pointer1;
      const p2 = this.input.pointer2;

      // Pincement à deux doigts : zoom.
      if (p1.isDown && p2.isDown) {
        dragging = true;
        const d = Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y);
        if (pinchStart === 0) {
          pinchStart = d;
          zoomStart = cam.zoom;
        } else {
          cam.setZoom(Phaser.Math.Clamp((zoomStart * d) / pinchStart, 0.6, 2.2));
        }
        return;
      }
      pinchStart = 0;

      if (!p.isDown) {
        if (!this.overHud(p)) this.updateHover(p);
        return;
      }

      if (ignoring) return;
      if (!dragging && Phaser.Math.Distance.Between(downX, downY, p.x, p.y) > 12) dragging = true;
      if (dragging) {
        cam.scrollX -= (p.x - p.prevPosition.x) / cam.zoom;
        cam.scrollY -= (p.y - p.prevPosition.y) / cam.zoom;
      }
    });

    this.input.on(Phaser.Input.Events.POINTER_UP, (p: Phaser.Input.Pointer) => {
      pinchStart = 0;
      const blocked = ignoring;
      ignoring = false;
      if (dragging || blocked || this.finished) return;
      this.handleTap(p);
    });

    this.input.on(
      Phaser.Input.Events.POINTER_WHEEL,
      (_p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => {
        cam.setZoom(Phaser.Math.Clamp(cam.zoom - dy * 0.001, 0.6, 2.2));
      },
    );
  }

  /** Case de grille sous le pointeur, arrondie à l'entier. */
  private tileUnder(p: Phaser.Input.Pointer): { gx: number; gy: number } {
    const world = this.cameras.main.getWorldPoint(p.x, p.y);
    const g = worldToGrid(world.x, world.y);
    return { gx: Math.round(g.gx), gy: Math.round(g.gy) };
  }

  private updateHover(p: Phaser.Input.Pointer): void {
    if (!this.buildChoice) {
      this.hoverTile.setVisible(false);
      this.ghost.setVisible(false);
      return;
    }
    const { gx, gy } = this.tileUnder(p);
    if (!this.map.inBounds(gx, gy)) {
      this.hoverTile.setVisible(false);
      this.ghost.setVisible(false);
      return;
    }
    const ok = this.canBuildAt(gx, gy);
    const w = gridToWorld(gx, gy);
    this.hoverTile.setTexture(ok ? 'tile_ok' : 'tile_no').setPosition(w.x, w.y).setVisible(true);
    this.ghost
      .setTexture(`tower_${this.buildChoice}`)
      .setPosition(w.x, w.y)
      .setDepth(w.y + 1)
      .setAlpha(ok ? 0.6 : 0.3)
      .setVisible(true);
    this.drawRange(gx, gy, TOWERS[this.buildChoice].range, ok ? 0x8affa0 : 0xff6b7a);
  }

  private handleTap(p: Phaser.Input.Pointer): void {
    const { gx, gy } = this.tileUnder(p);

    if (this.heroMoveMode) {
      if (this.map.inBounds(gx, gy)) {
        this.hero.setDestination(gx, gy);
        this.spawnBurst(gridToWorld(gx, gy), 0.5, 0xffd257);
      }
      this.heroMoveMode = false;
      emit('selectTower', null);
      return;
    }

    if (this.buildChoice) {
      this.tryBuild(gx, gy);
      return;
    }

    // Sinon : sélection d'une tour existante, pour voir sa portée / la revendre.
    const existing = this.towerAt.get(`${gx},${gy}`);
    if (existing) {
      this.selectTower(existing);
    } else {
      this.selectTower(null);
    }
  }

  // -------------------------------------------------------------------------
  // Construction / vente
  // -------------------------------------------------------------------------

  private canBuildAt(gx: number, gy: number): boolean {
    if (!this.map.inBounds(gx, gy)) return false;
    if (this.map.isPath(gx, gy)) return false;
    return !this.towerAt.has(`${gx},${gy}`);
  }

  private tryBuild(gx: number, gy: number): void {
    const id = this.buildChoice;
    if (!id) return;
    const def = TOWERS[id];

    if (!this.canBuildAt(gx, gy)) {
      emit('toast', 'Emplacement occupé', 'bad');
      return;
    }
    if (this.gold < def.cost) {
      emit('toast', `Il manque ${def.cost - this.gold} or`, 'bad');
      return;
    }

    this.gold -= def.cost;
    const tower = new Tower(this, def, gx, gy);
    this.towers.push(tower);
    this.towerAt.set(`${gx},${gy}`, tower);
    this.spawnBurst(gridToWorld(gx, gy), 0.7, 0xffffff);

    // On garde le type sélectionné : poser plusieurs tours d'affilée est le
    // geste le plus fréquent, le désélectionner à chaque fois serait pénible.
    this.pushStats();
    this.updateHover(this.input.activePointer);
  }

  private selectTower(tower: Tower | null): void {
    this.selectedTower = tower;
    if (!tower) {
      this.rangeGfx.clear();
      emit('towerSelected', null);
      return;
    }
    this.drawRange(tower.gx, tower.gy, tower.def.range, 0xffd257);
    emit('towerSelected', {
      id: tower.def.id,
      sellValue: Math.floor(tower.def.cost * ECONOMY.sellRatio),
    });
  }

  private sellSelected(): void {
    const tower = this.selectedTower;
    if (!tower) return;
    this.gold += Math.floor(tower.def.cost * ECONOMY.sellRatio);
    this.towerAt.delete(`${tower.gx},${tower.gy}`);
    this.towers = this.towers.filter((t) => t !== tower);
    this.spawnBurst({ x: tower.x, y: tower.y }, 0.6, 0xffd257);
    tower.destroy();
    this.selectTower(null);
    this.pushStats();
  }

  private drawRange(gx: number, gy: number, range: number, color: number): void {
    const w = gridToWorld(gx, gy);
    const { rx, ry } = rangeToEllipse(range);
    this.rangeGfx.clear();
    this.rangeGfx.fillStyle(color, 0.12);
    this.rangeGfx.fillEllipse(w.x, w.y, rx * 2, ry * 2);
    this.rangeGfx.lineStyle(2, color, 0.7);
    this.rangeGfx.strokeEllipse(w.x, w.y, rx * 2, ry * 2);
  }

  // -------------------------------------------------------------------------
  // Vagues
  // -------------------------------------------------------------------------

  private startWave(): void {
    if (this.waveInProgress || this.finished) return;
    const wave = WAVES[this.waveIndex];
    if (!wave) return;

    this.spawnQueue = [];
    for (const group of wave.groups) {
      for (let i = 0; i < group.count; i++) {
        this.spawnQueue.push({
          at: group.delay + i * group.interval,
          enemy: group.enemy,
          hpScale: group.hpScale ?? 1,
        });
      }
    }
    this.spawnQueue.sort((a, b) => a.at - b.at);
    this.waveClock = 0;
    this.waveInProgress = true;
    emit('toast', `Vague ${wave.index} — ${wave.name}`, 'info');
    this.pushStats();
  }

  private spawnEnemy(order: SpawnOrder): void {
    const enemy = new Enemy(this, ENEMIES[order.enemy], order.hpScale);
    enemy.update(0, this.map.path);
    this.enemies.push(enemy);
  }

  private completeWave(): void {
    this.waveInProgress = false;
    const bonus = ECONOMY.waveClearBonus + ECONOMY.waveClearGrowth * this.waveIndex;
    this.gold += bonus;
    this.waveIndex++;

    if (this.waveIndex >= WAVES.length) {
      this.finished = true;
      emit('gameOver', true, WAVES.length);
    } else {
      emit('toast', `Vague terminée · +${bonus} or`, 'info');
    }
    this.pushStats();
  }

  // -------------------------------------------------------------------------
  // Combat
  // -------------------------------------------------------------------------

  private fireAt(tower: Tower, target: Enemy): void {
    const proj = new Projectile(this, tower.x, tower.muzzleY, target, {
      texture: tower.def.projectileTexture,
      speed: tower.def.projectileSpeed,
      damage: tower.def.damage,
      splashRadius: tower.def.splashRadius,
      ...(tower.def.slow ? { slow: tower.def.slow } : {}),
    });
    this.projectiles.push(proj);
  }

  private resolveImpact(proj: Projectile): void {
    if (!proj.impact) return;
    const { damage, splashRadius, slow } = proj.spec;

    if (splashRadius > 0) {
      // Le point d'impact est en coordonnées écran, à hauteur de tête : on
      // enlève l'offset avant de repasser en grille, sinon la zone est décalée.
      const g = worldToGrid(proj.impact.x, proj.impact.y + 18);
      this.spawnBurst({ x: proj.impact.x, y: proj.impact.y }, splashRadius * 0.9, 0xffb347);
      for (const e of this.enemies) {
        if (!e.alive) continue;
        if (gridDistance(e.gx, e.gy, g.gx, g.gy) > splashRadius) continue;
        e.applyDamage(damage);
        if (slow) e.applySlow(slow.factor, slow.duration);
      }
      return;
    }

    const target = proj.target;
    if (!target || !target.alive) return;
    target.applyDamage(damage);
    if (slow) target.applySlow(slow.factor, slow.duration);
    this.spawnBurst({ x: proj.impact.x, y: proj.impact.y }, 0.35, 0xffffff);
  }

  private castUltimate(): void {
    if (!this.hero.triggerUltimate()) {
      emit('toast', 'Ultime en recharge', 'bad');
      return;
    }
    this.spawnBurst({ x: this.hero.x, y: this.hero.y }, HERO.ultimateRadius, 0xffd257);
    this.cameras.main.shake(220, 0.006);
    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (gridDistance(e.gx, e.gy, this.hero.gx, this.hero.gy) > HERO.ultimateRadius) continue;
      e.applyDamage(HERO.ultimateDamage);
      e.applySlow(HERO.ultimateSlow.factor, HERO.ultimateSlow.duration);
    }
  }

  private spawnBurst(at: { x: number; y: number }, scale: number, tint: number): void {
    const fx = this.add
      .image(at.x, at.y, 'fx_burst')
      .setDepth(DEPTH_FX)
      .setTint(tint)
      .setScale(scale * 0.5);
    this.tweens.add({
      targets: fx,
      scale: scale * 1.35,
      alpha: 0,
      duration: 300,
      ease: 'Quad.easeOut',
      onComplete: () => fx.destroy(),
    });
  }

  private killEnemy(enemy: Enemy): void {
    this.gold += enemy.def.bounty;
    this.souls += enemy.def.souls;

    const soul = this.add
      .image(enemy.x, enemy.y - 30, 'fx_soul')
      .setDepth(DEPTH_FX)
      .setScale(RES_SCALE);
    this.tweens.add({
      targets: soul,
      y: soul.y - 46,
      alpha: 0,
      duration: 620,
      ease: 'Quad.easeOut',
      onComplete: () => soul.destroy(),
    });

    enemy.playDeath();
  }

  private leakEnemy(enemy: Enemy): void {
    this.lives -= enemy.def.leak;
    this.cameras.main.shake(180, 0.004);
    emit('toast', `-${enemy.def.leak} vie${enemy.def.leak > 1 ? 's' : ''}`, 'bad');
    enemy.destroy();

    if (this.lives <= 0) {
      this.lives = 0;
      this.finished = true;
      emit('gameOver', false, this.waveIndex + 1);
    }
  }

  // -------------------------------------------------------------------------
  // Liaison avec l'interface
  // -------------------------------------------------------------------------

  private wireBus(): void {
    // `bus.removeAllListeners()` couperait aussi les écouteurs du HUD, qui
    // survit au redémarrage de cette scène : on ne détache que les nôtres, en
    // filtrant sur le contexte.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      for (const name of this.busEvents) bus.off(name, undefined, this);
      this.busEvents = [];
    });

    this.listen('selectTower', (id) => {
      this.buildChoice = id;
      this.heroMoveMode = false;
      if (id) this.selectTower(null);
      else {
        this.hoverTile.setVisible(false);
        this.ghost.setVisible(false);
        this.rangeGfx.clear();
      }
    });
    this.listen('requestStartWave', () => this.startWave());
    this.listen('requestUltimate', () => this.castUltimate());
    this.listen('requestSell', () => this.sellSelected());
    this.listen('requestSpeed', (m) => {
      this.speedMultiplier = m;
    });

    this.listen('requestHeroMove', () => {
      this.heroMoveMode = true;
      this.buildChoice = null;
      this.hoverTile.setVisible(false);
      this.ghost.setVisible(false);
      this.selectTower(null);
      emit('toast', 'Touchez le terrain pour déplacer le Griffon', 'info');
    });

    this.listen('requestRestart', () => {
      this.scene.restart();
    });

    this.listen('requestStats', () => this.pushStats());
  }

  /** Enregistre un écouteur du bus en gardant de quoi le détacher plus tard. */
  private listen<K extends keyof BusEvents>(event: K, fn: BusEvents[K]): void {
    on(event, fn, this);
    this.busEvents.push(event);
  }

  private pushStats(): void {
    emit('stats', {
      gold: this.gold,
      lives: this.lives,
      souls: this.souls,
      wave: Math.min(this.waveIndex + 1, WAVES.length),
      totalWaves: WAVES.length,
      waveInProgress: this.waveInProgress,
      enemiesAlive: this.enemies.length,
    });
  }

  // -------------------------------------------------------------------------
  // Boucle principale
  // -------------------------------------------------------------------------

  override update(_time: number, delta: number): void {
    if (this.finished) return;

    // Delta borné : après un passage en arrière-plan, un bond de plusieurs
    // secondes téléporterait la vague jusqu'à la sortie.
    const dt = Math.min(delta / 1000, 0.05) * this.speedMultiplier;

    if (this.waveInProgress) {
      this.waveClock += dt;
      while (this.spawnQueue.length > 0 && this.spawnQueue[0]!.at <= this.waveClock) {
        this.spawnEnemy(this.spawnQueue.shift()!);
      }
    }

    for (const enemy of this.enemies) enemy.update(dt, this.map.path);

    for (const tower of this.towers) {
      const target = tower.update(dt, this.enemies);
      if (target) this.fireAt(tower, target);
    }

    const heroTarget = this.hero.update(dt, this.enemies);
    if (heroTarget) {
      heroTarget.applyDamage(HERO.damage);
      this.spawnBurst({ x: heroTarget.x, y: heroTarget.y - 20 }, 0.4, 0xfff0c0);
    }

    for (const proj of this.projectiles) {
      proj.update(dt);
      if (proj.done) {
        this.resolveImpact(proj);
        proj.destroy();
      }
    }
    this.projectiles = this.projectiles.filter((p) => !p.done);

    // Un seul balayage pour les morts et les fuites.
    const survivors: Enemy[] = [];
    let dirty = false;
    for (const enemy of this.enemies) {
      if (!enemy.alive) {
        this.killEnemy(enemy);
        dirty = true;
      } else if (enemy.reachedEnd) {
        this.leakEnemy(enemy);
        dirty = true;
      } else {
        survivors.push(enemy);
      }
    }
    this.enemies = survivors;

    if (this.waveInProgress && this.spawnQueue.length === 0 && this.enemies.length === 0) {
      this.completeWave();
      dirty = false;
    }

    if (this.enemies.length !== this.lastEnemyCount) {
      this.lastEnemyCount = this.enemies.length;
      dirty = true;
    }
    if (dirty) this.pushStats();
    emit('heroCooldown', this.hero.ultimateRatio, this.hero.ultimateReady);
  }
}
