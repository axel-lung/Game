import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import { TOWERS, TOWER_ORDER, type TowerId } from '../data/towers';
import { emit, on } from '../bus';
import type { GameStats } from '../bus';

const BAR_H = 148;
const BAR_Y = GAME_HEIGHT - BAR_H;

const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

interface Button {
  container: Phaser.GameObjects.Container;
  redraw: (state: 'idle' | 'active' | 'disabled') => void;
  /** Masque le bouton *et* coupe sa zone tactile. */
  setEnabled: (enabled: boolean) => void;
}

/**
 * Interface de jeu, dans sa propre scène pour rester fixe quand la caméra du
 * terrain bouge.
 *
 * Les zones occupées par le HUD sont publiées dans le registry : la scène de
 * jeu s'en sert pour ignorer les touchers qui visaient un bouton, sinon chaque
 * appui sur « Lancer la vague » poserait aussi une tour derrière le panneau.
 */
export class HudScene extends Phaser.Scene {
  private stats: GameStats = {
    gold: 0,
    lives: 0,
    souls: 0,
    wave: 1,
    totalWaves: 1,
    waveInProgress: false,
    enemiesAlive: 0,
  };

  private goldText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;
  private soulsText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private toastText!: Phaser.GameObjects.Text;

  private towerButtons = new Map<TowerId, Button>();
  private startButton!: Button;
  private startLabel!: Phaser.GameObjects.Text;
  private heroButton!: Button;
  private ultButton!: Button;
  private ultFill!: Phaser.GameObjects.Rectangle;
  private heroExtras: Phaser.GameObjects.GameObject[] = [];
  private sellButton!: Button;
  private sellLabel!: Phaser.GameObjects.Text;
  private speedButtons: Array<{ button: Button; value: number }> = [];

  private selected: TowerId | null = null;
  private speed = 1;
  private overlay?: Phaser.GameObjects.Container;

  constructor() {
    super('Hud');
  }

  create(): void {
    this.buildTopBar();
    this.buildBottomBar();
    this.buildToast();
    this.publishHudRects();
    this.wireBus();

    // Le HUD est lancé après la scène de jeu : il faut réclamer l'état initial,
    // sinon les compteurs restent à zéro jusqu'au premier événement.
    emit('requestStats');
  }

  // -------------------------------------------------------------------------
  // Briques d'interface
  // -------------------------------------------------------------------------

  private panel(x: number, y: number, w: number, h: number, radius = 16, alpha = 0.86): Phaser.GameObjects.Graphics {
    const g = this.add.graphics();
    g.fillStyle(0x111a2b, alpha);
    g.fillRoundedRect(x, y, w, h, radius);
    g.lineStyle(2, 0x2b3a55, 0.9);
    g.strokeRoundedRect(x, y, w, h, radius);
    return g;
  }

  private makeButton(
    x: number,
    y: number,
    w: number,
    h: number,
    onTap: () => void,
    accent = 0x2f5fb0,
  ): Button {
    const container = this.add.container(x, y);
    const g = this.add.graphics();
    container.add(g);

    const redraw = (state: 'idle' | 'active' | 'disabled') => {
      g.clear();
      const fill = state === 'active' ? accent : state === 'disabled' ? 0x1a2233 : 0x1d2942;
      const stroke = state === 'active' ? 0xffffff : state === 'disabled' ? 0x2b3a55 : 0x3d5580;
      g.fillStyle(fill, state === 'disabled' ? 0.6 : 1);
      g.fillRoundedRect(0, 0, w, h, 14);
      g.lineStyle(2, stroke, state === 'disabled' ? 0.4 : 0.9);
      g.strokeRoundedRect(0, 0, w, h, 14);
    };
    redraw('idle');

    container.setSize(w, h);
    container.setInteractive(new Phaser.Geom.Rectangle(w / 2, h / 2, w, h), Phaser.Geom.Rectangle.Contains);
    container.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
      container.setScale(0.97);
    });
    container.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
      container.setScale(1);
      onTap();
    });
    container.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, () => {
      container.setScale(1);
    });

    const setEnabled = (enabled: boolean) => {
      container.setVisible(enabled);
      if (container.input) container.input.enabled = enabled;
    };

    return { container, redraw, setEnabled };
  }

  private buildTopBar(): void {
    this.panel(16, 14, 470, 62);

    const mk = (x: number, icon: string, color: string) => {
      this.add.text(x, 45, icon, { fontFamily: FONT, fontSize: '26px' }).setOrigin(0, 0.5);
      return this.add
        .text(x + 36, 45, '0', { fontFamily: FONT, fontSize: '26px', color, fontStyle: 'bold' })
        .setOrigin(0, 0.5);
    };
    this.goldText = mk(36, '🪙', '#ffd257');
    this.livesText = mk(196, '❤️', '#ff9aa4');
    this.soulsText = mk(336, '✨', '#bfe6ff');

    this.panel(GAME_WIDTH - 336, 14, 320, 62);
    this.waveText = this.add
      .text(GAME_WIDTH - 320, 45, 'Vague 1 / 10', {
        fontFamily: FONT,
        fontSize: '24px',
        color: '#f6e8c8',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);

    // Contrôles de vitesse.
    [1, 2, 3].forEach((value, i) => {
      const b = this.makeButton(GAME_WIDTH - 150 + i * 46, 22, 42, 46, () => this.setSpeed(value), 0x2f8f6b);
      this.add
        .text(GAME_WIDTH - 150 + i * 46 + 21, 45, `${value}×`, {
          fontFamily: FONT,
          fontSize: '19px',
          color: '#eaf2ff',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
      this.speedButtons.push({ button: b, value });
    });
    this.refreshSpeedButtons();
  }

  private buildBottomBar(): void {
    this.panel(0, BAR_Y, GAME_WIDTH, BAR_H, 0, 0.92);

    // Cartes de tours.
    const cardW = 142;
    const cardH = 112;
    const cardY = BAR_Y + 18;
    TOWER_ORDER.forEach((id, i) => {
      const def = TOWERS[id];
      const x = 18 + i * (cardW + 10);
      const button = this.makeButton(x, cardY, cardW, cardH, () => this.toggleTower(id));

      const icon = this.add.image(x + cardW / 2, cardY + 46, `tower_${id}`).setOrigin(0.5, 0.72).setScale(0.44);
      this.add
        .text(x + cardW / 2, cardY + 68, `${def.flag} ${def.name}`, {
          fontFamily: FONT,
          fontSize: '14px',
          color: '#eaf2ff',
          align: 'center',
          wordWrap: { width: cardW - 12 },
        })
        .setOrigin(0.5, 0);
      this.add
        .text(x + cardW / 2, cardH + cardY - 20, `🪙 ${def.cost}`, {
          fontFamily: FONT,
          fontSize: '16px',
          color: '#ffd257',
          fontStyle: 'bold',
        })
        .setOrigin(0.5, 0);

      icon.setDepth(1);
      this.towerButtons.set(id, button);
    });

    // Héros.
    const heroX = 18 + 4 * (cardW + 10) + 8;
    this.heroButton = this.makeButton(heroX, cardY, 118, cardH, () => emit('requestHeroMove'), 0xb07ae8);
    this.ultButton = this.makeButton(heroX + 128, cardY, 118, cardH, () => emit('requestUltimate'), 0xd8342f);
    this.ultFill = this.add
      .rectangle(heroX + 138, cardY + cardH - 16, 98, 8, 0xffd257)
      .setOrigin(0, 0.5)
      .setScale(0, 1);

    this.heroExtras = [
      this.add.image(heroX + 59, cardY + 44, 'hero_griffon').setOrigin(0.5, 0.72).setScale(0.4),
      this.add
        .text(heroX + 59, cardY + 78, 'Déplacer', { fontFamily: FONT, fontSize: '15px', color: '#eaf2ff' })
        .setOrigin(0.5, 0),
      this.add.text(heroX + 187, cardY + 34, '\u26a1', { fontFamily: FONT, fontSize: '34px' }).setOrigin(0.5),
      this.add
        .text(heroX + 187, cardY + 62, 'Ultime', { fontFamily: FONT, fontSize: '15px', color: '#eaf2ff' })
        .setOrigin(0.5, 0),
      this.ultFill,
    ];

    // Vente (masquée tant qu'aucune tour n'est sélectionnée).
    this.sellButton = this.makeButton(heroX, cardY, 246, cardH, () => emit('requestSell'), 0x8a5a34);
    this.sellLabel = this.add
      .text(heroX + 123, cardY + cardH / 2, '', {
        fontFamily: FONT,
        fontSize: '20px',
        color: '#ffd257',
        fontStyle: 'bold',
        align: 'center',
      })
      .setOrigin(0.5);
    this.showSell(null);

    // Lancer la vague.
    const startX = heroX + 258;
    this.startButton = this.makeButton(startX, cardY, GAME_WIDTH - startX - 18, cardH, () => emit('requestStartWave'), 0x2f8f6b);
    this.startLabel = this.add
      .text(startX + (GAME_WIDTH - startX - 18) / 2, cardY + cardH / 2, '▶  Lancer la vague', {
        fontFamily: FONT,
        fontSize: '24px',
        color: '#eaf2ff',
        fontStyle: 'bold',
        align: 'center',
      })
      .setOrigin(0.5);
  }

  private buildToast(): void {
    this.toastText = this.add
      .text(GAME_WIDTH / 2, 104, '', {
        fontFamily: FONT,
        fontSize: '26px',
        color: '#f6e8c8',
        fontStyle: 'bold',
        backgroundColor: '#111a2bdd',
        padding: { x: 18, y: 10 },
      })
      .setOrigin(0.5)
      .setAlpha(0);
  }

  private publishHudRects(): void {
    this.registry.set('hudRects', [
      { x: 0, y: 0, w: GAME_WIDTH, h: 88 },
      { x: 0, y: BAR_Y, w: GAME_WIDTH, h: BAR_H },
    ]);
  }

  // -------------------------------------------------------------------------
  // Réactions
  // -------------------------------------------------------------------------

  private toggleTower(id: TowerId): void {
    this.selected = this.selected === id ? null : id;
    emit('selectTower', this.selected);
    this.refreshTowerButtons();
  }

  private setSpeed(value: number): void {
    this.speed = value;
    emit('requestSpeed', value);
    this.refreshSpeedButtons();
  }

  private refreshSpeedButtons(): void {
    for (const { button, value } of this.speedButtons) {
      button.redraw(value === this.speed ? 'active' : 'idle');
    }
  }

  private refreshTowerButtons(): void {
    for (const [id, button] of this.towerButtons) {
      const affordable = this.stats.gold >= TOWERS[id].cost;
      button.redraw(this.selected === id ? 'active' : affordable ? 'idle' : 'disabled');
    }
  }

  private showSell(info: { id: TowerId; sellValue: number } | null): void {
    const visible = info !== null;
    this.sellButton.setEnabled(visible);
    this.sellLabel.setVisible(visible);
    if (info) {
      this.sellLabel.setText(`Revendre ${TOWERS[info.id].name}\n\ud83e\ude99 +${info.sellValue}`);
      this.sellButton.redraw('idle');
    }
    // Les boutons héros et vente partagent la même zone : l'un cache l'autre.
    this.heroButton.setEnabled(!visible);
    this.ultButton.setEnabled(!visible);
    for (const obj of this.heroExtras) {
      (obj as Phaser.GameObjects.Image).setVisible(!visible);
    }
  }

  private showToast(message: string, tone: 'info' | 'bad'): void {
    this.toastText.setText(message);
    this.toastText.setColor(tone === 'bad' ? '#ff9aa4' : '#f6e8c8');
    this.toastText.setAlpha(1);
    this.tweens.killTweensOf(this.toastText);
    this.tweens.add({ targets: this.toastText, alpha: 0, delay: 1100, duration: 500 });
  }

  private showGameOver(won: boolean, wave: number): void {
    if (this.overlay) return;
    const c = this.add.container(0, 0);
    const dim = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x05070d, 0.78).setOrigin(0);
    const box = this.panel(GAME_WIDTH / 2 - 280, GAME_HEIGHT / 2 - 160, 560, 300, 22, 0.98);
    const title = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 96, won ? 'Royaume sauvé !' : 'Le royaume est tombé', {
        fontFamily: 'Georgia, serif',
        fontSize: '40px',
        color: won ? '#ffd257' : '#ff9aa4',
      })
      .setOrigin(0.5);
    const sub = this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2 - 34,
        won ? `Les ${wave} vagues ont été repoussées.` : `Vous avez tenu jusqu'à la vague ${wave}.`,
        { fontFamily: FONT, fontSize: '22px', color: '#cdd8ea' },
      )
      .setOrigin(0.5);

    const btn = this.makeButton(GAME_WIDTH / 2 - 130, GAME_HEIGHT / 2 + 26, 260, 76, () => {
      this.overlay?.destroy();
      this.overlay = undefined;
      this.selected = null;
      this.speed = 1;
      this.showSell(null);
      this.refreshSpeedButtons();
      this.refreshTowerButtons();
      emit('requestRestart');
    }, 0x2f8f6b);
    const btnLabel = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 64, 'Rejouer', {
        fontFamily: FONT,
        fontSize: '26px',
        color: '#eaf2ff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    c.add([dim, box, title, sub, btn.container, btnLabel]);
    c.setDepth(1000);
    this.overlay = c;
  }

  private wireBus(): void {
    on('stats', (stats) => {
      this.stats = stats;
      this.goldText.setText(`${stats.gold}`);
      this.livesText.setText(`${stats.lives}`);
      this.soulsText.setText(`${stats.souls}`);
      this.waveText.setText(`Vague ${stats.wave} / ${stats.totalWaves}`);
      this.startLabel.setText(
        stats.waveInProgress ? `⚔  Vague en cours · ${stats.enemiesAlive}` : '▶  Lancer la vague',
      );
      this.startButton.redraw(stats.waveInProgress ? 'disabled' : 'idle');
      this.refreshTowerButtons();
    });

    on('heroCooldown', (ratio, ready) => {
      this.ultFill.setScale(ratio, 1);
      this.ultFill.fillColor = ready ? 0x7ee08a : 0xffd257;
    });

    on('towerSelected', (info) => this.showSell(info));
    on('toast', (message, tone) => this.showToast(message, tone));
    on('gameOver', (won, wave) => this.showGameOver(won, wave));
  }
}
