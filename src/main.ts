import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, PALETTE } from './game/config';
import { BootScene } from './game/scenes/BootScene';
import { DefenseScene } from './game/scenes/DefenseScene';
import { HudScene } from './game/scenes/HudScene';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: PALETTE.sky,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
  },
  render: {
    // Les sprites sont générés en résolution double et affichés à 50 % :
    // le filtrage linéaire donne un rendu cartoon plus propre que le nearest.
    antialias: true,
    roundPixels: false,
  },
  input: {
    activePointers: 3,
  },
  scene: [BootScene, DefenseScene, HudScene],
});
