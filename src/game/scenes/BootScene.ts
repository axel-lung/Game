import Phaser from 'phaser';
import { buildTextures } from '../art';
import { PALETTE, GAME_WIDTH, GAME_HEIGHT } from '../config';

/** Génère les textures procédurales puis lance le jeu et son interface. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(PALETTE.sky);

    const label = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'Animal Nations', {
        fontFamily: 'Georgia, serif',
        fontSize: '46px',
        color: '#f6e8c8',
      })
      .setOrigin(0.5);

    buildTextures(this);

    // Une frame de battement, pour que le titre s'affiche vraiment.
    this.time.delayedCall(120, () => {
      label.destroy();
      this.scene.start('Defense');
      this.scene.launch('Hud');
    });
  }
}
