/**
 * Génération procédurale de toutes les textures du jeu.
 *
 * Le prototype ne dépend d'aucun asset externe : chaque sprite est dessiné au
 * démarrage avec l'API Graphics puis figé en texture. Ça permet d'itérer sur le
 * gameplay sans attendre les assets définitifs, et de remplacer plus tard un
 * sprite par un vrai PNG sans toucher au reste du code (même clé de texture).
 *
 * Tout est dessiné en résolution double (RES = 2) puis affiché à l'échelle 0.5,
 * pour rester net sur les écrans haute densité.
 */

import Phaser from 'phaser';
import { TILE_W, TILE_H, TILE_LIP, RES } from './render';
import { PALETTE } from './config';

type G = Phaser.GameObjects.Graphics;

/** Boîte de dessin standard d'une créature, en pixels de texture. */
const CW = 96;
const CH = 112;

function bake(scene: Phaser.Scene, key: string, w: number, h: number, draw: (g: G) => void): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const g = scene.add.graphics();
  draw(g);
  g.generateTexture(key, w, h);
  g.destroy();
}

// ---------------------------------------------------------------------------
// Briques de dessin partagées
// ---------------------------------------------------------------------------

function drawEyes(
  g: G,
  cx: number,
  cy: number,
  spread: number,
  r: number,
  opts: { pupil?: number; angry?: boolean; brow?: number; iris?: number } = {},
): void {
  const { pupil = 0.46, angry = false, brow = 0x2a1d16, iris = 0x241c2b } = opts;
  g.fillStyle(0xffffff, 1);
  g.fillCircle(cx - spread, cy, r);
  g.fillCircle(cx + spread, cy, r);
  g.fillStyle(iris, 1);
  g.fillCircle(cx - spread, cy + r * 0.12, r * pupil);
  g.fillCircle(cx + spread, cy + r * 0.12, r * pupil);
  g.fillStyle(0xffffff, 0.95);
  g.fillCircle(cx - spread - r * 0.22, cy - r * 0.34, r * 0.18);
  g.fillCircle(cx + spread - r * 0.22, cy - r * 0.34, r * 0.18);
  if (angry) {
    g.fillStyle(brow, 1);
    g.fillTriangle(
      cx - spread - r * 1.35, cy - r * 1.65,
      cx - spread + r * 1.15, cy - r * 0.5,
      cx - spread + r * 1.15, cy - r * 1.35,
    );
    g.fillTriangle(
      cx + spread + r * 1.35, cy - r * 1.65,
      cx + spread - r * 1.15, cy - r * 0.5,
      cx + spread - r * 1.15, cy - r * 1.35,
    );
  }
}

/** Ombre douce simulée par empilement d'ellipses de plus en plus opaques. */
function drawSoftShadow(g: G, cx: number, cy: number, w: number, h: number): void {
  for (let i = 5; i >= 1; i--) {
    g.fillStyle(0x000000, 0.055 * (6 - i));
    g.fillEllipse(cx, cy, w * (i / 5), h * (i / 5));
  }
}

/** Pattes simples, deux traits arrondis. */
function drawFeet(g: G, cx: number, cy: number, spread: number, color: number, w = 12, h = 10): void {
  g.fillStyle(color, 1);
  g.fillEllipse(cx - spread, cy, w, h);
  g.fillEllipse(cx + spread, cy, w, h);
}

// ---------------------------------------------------------------------------
// Terrain
// ---------------------------------------------------------------------------

const TW = TILE_W * RES;
const TH = TILE_H * RES;
const TLIP = TILE_LIP * RES;

/** Ratio d'origine verticale des tuiles : centre de la face supérieure. */
export const TILE_ORIGIN_Y = TH / 2 / (TH + TLIP);

function bakeTile(scene: Phaser.Scene, key: string, top: number, side: number, decorate?: (g: G) => void): void {
  bake(scene, key, TW, TH + TLIP, (g) => {
    // Bords latéraux : c'est eux qui donnent l'épaisseur 2.5D.
    g.fillStyle(side, 1);
    g.fillPoints(
      [
        { x: 0, y: TH / 2 }, { x: TW / 2, y: TH }, { x: TW / 2, y: TH + TLIP }, { x: 0, y: TH / 2 + TLIP },
      ],
      true,
    );
    g.fillStyle(Phaser.Display.Color.IntegerToColor(side).darken(12).color, 1);
    g.fillPoints(
      [
        { x: TW, y: TH / 2 }, { x: TW / 2, y: TH }, { x: TW / 2, y: TH + TLIP }, { x: TW, y: TH / 2 + TLIP },
      ],
      true,
    );
    // Face supérieure.
    g.fillStyle(top, 1);
    g.fillPoints(
      [
        { x: TW / 2, y: 0 }, { x: TW, y: TH / 2 }, { x: TW / 2, y: TH }, { x: 0, y: TH / 2 },
      ],
      true,
    );
    decorate?.(g);
  });
}

function bakeTerrain(scene: Phaser.Scene): void {
  bakeTile(scene, 'tile_grass', PALETTE.grass, PALETTE.grassEdge, (g) => {
    g.fillStyle(0xffffff, 0.07);
    g.fillEllipse(TW / 2, TH * 0.42, TW * 0.42, TH * 0.36);
    g.fillStyle(PALETTE.grassEdge, 0.45);
    g.fillEllipse(TW * 0.36, TH * 0.62, 9, 5);
    g.fillEllipse(TW * 0.66, TH * 0.44, 7, 4);
  });

  bakeTile(scene, 'tile_grass_alt', PALETTE.grassAlt, PALETTE.grassEdge, (g) => {
    g.fillStyle(0xffffff, 0.05);
    g.fillEllipse(TW / 2, TH * 0.45, TW * 0.35, TH * 0.3);
    g.fillStyle(PALETTE.grassEdge, 0.4);
    g.fillEllipse(TW * 0.52, TH * 0.58, 8, 5);
  });

  bakeTile(scene, 'tile_path', PALETTE.dirt, PALETTE.dirtEdge, (g) => {
    g.fillStyle(PALETTE.dirtEdge, 0.35);
    g.fillEllipse(TW * 0.4, TH * 0.5, 10, 6);
    g.fillEllipse(TW * 0.62, TH * 0.62, 7, 4);
    g.fillStyle(0xffffff, 0.09);
    g.fillEllipse(TW * 0.55, TH * 0.36, 14, 7);
  });

  bakeTile(scene, 'tile_path_alt', PALETTE.dirtAlt, PALETTE.dirtEdge, (g) => {
    g.fillStyle(PALETTE.dirtEdge, 0.3);
    g.fillEllipse(TW * 0.58, TH * 0.48, 9, 5);
    g.fillEllipse(TW * 0.36, TH * 0.66, 6, 4);
  });

  // Surbrillances de placement.
  const overlay = (key: string, color: number, alpha: number) =>
    bake(scene, key, TW, TH, (g) => {
      g.fillStyle(color, alpha);
      g.fillPoints(
        [{ x: TW / 2, y: 0 }, { x: TW, y: TH / 2 }, { x: TW / 2, y: TH }, { x: 0, y: TH / 2 }],
        true,
      );
      g.lineStyle(3, color, Math.min(1, alpha + 0.5));
      g.strokePoints(
        [{ x: TW / 2, y: 0 }, { x: TW, y: TH / 2 }, { x: TW / 2, y: TH }, { x: 0, y: TH / 2 }],
        true,
        true,
      );
    });
  overlay('tile_ok', 0x8affa0, 0.3);
  overlay('tile_no', 0xff6b7a, 0.32);
  overlay('tile_hover', 0xffffff, 0.16);
}

// ---------------------------------------------------------------------------
// Tours — animaux nationaux adultes
// ---------------------------------------------------------------------------

/** Socle de pierre commun à toutes les tours, pour l'ancrage visuel au sol. */
function drawPedestal(g: G, cx: number, cy: number, tint = 0x9aa3b2): void {
  g.fillStyle(Phaser.Display.Color.IntegerToColor(tint).darken(28).color, 1);
  g.fillEllipse(cx, cy + 5, 66, 26);
  g.fillStyle(tint, 1);
  g.fillEllipse(cx, cy, 66, 26);
  g.fillStyle(0xffffff, 0.16);
  g.fillEllipse(cx, cy - 3, 46, 15);
}

function bakeCoq(scene: Phaser.Scene): void {
  bake(scene, 'tower_coq', CW, CH, (g) => {
    drawSoftShadow(g, CW / 2, CH - 10, 62, 22);
    drawPedestal(g, CW / 2, CH - 14);

    // Queue tricolore, dessinée en premier pour passer derrière le corps.
    const tail: Array<[number, number]> = [[0xd0334a, 0], [0xf2f4f8, 6], [0x2f5fb0, 12]];
    for (const [color, off] of tail) {
      g.fillStyle(color, 1);
      g.fillTriangle(30 + off, 74, 6 + off, 28 - off, 26 + off, 54);
    }

    g.fillStyle(0x2f5fb0, 1);
    g.fillEllipse(52, 70, 52, 52);
    g.fillStyle(0xf2f4f8, 1);
    g.fillEllipse(56, 78, 32, 34);

    // Aile repliée.
    g.fillStyle(0x24498a, 1);
    g.fillEllipse(46, 68, 26, 30);

    drawFeet(g, 52, CH - 20, 11, 0xf0a93c, 13, 9);

    g.fillStyle(0x2f5fb0, 1);
    g.fillCircle(56, 34, 22);

    // Crête.
    g.fillStyle(0xd0334a, 1);
    g.fillCircle(48, 12, 8);
    g.fillCircle(58, 8, 9);
    g.fillCircle(68, 12, 7);
    // Caroncule.
    g.fillCircle(64, 50, 7);

    // Bec.
    g.fillStyle(0xf0a93c, 1);
    g.fillTriangle(74, 34, 94, 39, 74, 45);

    drawEyes(g, 58, 32, 9, 7, { angry: true, brow: 0x16305e });
  });
}

function bakeAigle(scene: Phaser.Scene): void {
  bake(scene, 'tower_aigle', CW, CH, (g) => {
    drawSoftShadow(g, CW / 2, CH - 10, 66, 24);
    drawPedestal(g, CW / 2, CH - 14, 0xb8a68c);

    // Ailes déployées.
    g.fillStyle(0x4a3018, 1);
    g.fillTriangle(46, 62, 2, 34, 30, 82);
    g.fillTriangle(50, 62, 94, 34, 66, 82);

    g.fillStyle(0x5a3b25, 1);
    g.fillEllipse(48, 70, 50, 54);
    g.fillStyle(0x6d4a30, 1);
    g.fillEllipse(48, 78, 32, 36);

    drawFeet(g, 48, CH - 20, 12, 0xf0b93c, 14, 9);

    // Tête blanche.
    g.fillStyle(0xf3f1ea, 1);
    g.fillCircle(48, 32, 23);
    g.fillStyle(0xe2ded1, 1);
    g.fillEllipse(48, 44, 30, 14);

    // Bec crochu.
    g.fillStyle(0xf0b93c, 1);
    g.fillTriangle(66, 30, 90, 36, 66, 42);
    g.fillStyle(0xd79a24, 1);
    g.fillTriangle(84, 35, 90, 36, 82, 44);

    drawEyes(g, 48, 28, 10, 7, { angry: true, brow: 0x3d2a14, iris: 0x1a1409 });
  });
}

function bakeOurs(scene: Phaser.Scene): void {
  bake(scene, 'tower_ours', CW, CH, (g) => {
    drawSoftShadow(g, CW / 2, CH - 10, 70, 26);
    drawPedestal(g, CW / 2, CH - 14, 0x8f9aa8);

    // Bras levés.
    g.fillStyle(0x744a2a, 1);
    g.fillEllipse(18, 58, 24, 34);
    g.fillEllipse(78, 58, 24, 34);
    g.fillStyle(0x3a2415, 1);
    g.fillCircle(16, 46, 9);
    g.fillCircle(80, 46, 9);

    g.fillStyle(0x8a5a34, 1);
    g.fillEllipse(48, 70, 60, 58);
    g.fillStyle(0xb98a5c, 1);
    g.fillEllipse(48, 78, 36, 38);

    drawFeet(g, 48, CH - 19, 14, 0x3a2415, 16, 11);

    // Oreilles.
    g.fillStyle(0x8a5a34, 1);
    g.fillCircle(28, 18, 11);
    g.fillCircle(68, 18, 11);
    g.fillStyle(0xc79a72, 1);
    g.fillCircle(28, 18, 6);
    g.fillCircle(68, 18, 6);

    g.fillStyle(0x8a5a34, 1);
    g.fillCircle(48, 34, 25);
    // Museau.
    g.fillStyle(0xd9b48a, 1);
    g.fillEllipse(48, 46, 32, 22);
    g.fillStyle(0x2b1a0f, 1);
    g.fillEllipse(48, 40, 12, 9);

    drawEyes(g, 48, 28, 11, 6.5, { angry: true, brow: 0x4a2f18 });
  });
}

function bakePanda(scene: Phaser.Scene): void {
  bake(scene, 'tower_panda', CW, CH, (g) => {
    drawSoftShadow(g, CW / 2, CH - 10, 66, 24);
    drawPedestal(g, CW / 2, CH - 14, 0x93a58f);

    // Bras noirs.
    g.fillStyle(0x24242a, 1);
    g.fillEllipse(20, 66, 22, 32);
    g.fillEllipse(76, 66, 22, 32);

    g.fillStyle(0xf4f2ec, 1);
    g.fillEllipse(48, 70, 58, 56);
    g.fillStyle(0xe4e1d7, 1);
    g.fillEllipse(48, 80, 34, 32);

    drawFeet(g, 48, CH - 19, 13, 0x24242a, 15, 10);

    // Oreilles.
    g.fillStyle(0x24242a, 1);
    g.fillCircle(27, 17, 11);
    g.fillCircle(69, 17, 11);

    g.fillStyle(0xf4f2ec, 1);
    g.fillCircle(48, 33, 25);

    // Taches oculaires.
    g.fillStyle(0x24242a, 1);
    g.fillEllipse(37, 32, 19, 22);
    g.fillEllipse(59, 32, 19, 22);

    drawEyes(g, 48, 32, 11, 6, { pupil: 0.5, iris: 0x101014 });

    // Museau.
    g.fillStyle(0x24242a, 1);
    g.fillEllipse(48, 44, 10, 7);

    // Tige de bambou tenue en main.
    g.fillStyle(0x5fa83f, 1);
    g.fillRoundedRect(74, 30, 8, 44, 4);
    g.fillStyle(0x7dc95c, 1);
    g.fillEllipse(70, 32, 20, 10);
    g.fillEllipse(88, 40, 20, 10);
  });
}

// ---------------------------------------------------------------------------
// Ennemis — chibi, mignons, méchants
// ---------------------------------------------------------------------------

function bakeGoblinet(scene: Phaser.Scene): void {
  bake(scene, 'enemy_goblinet', CW, CH, (g) => {
    drawSoftShadow(g, CW / 2, CH - 12, 52, 20);

    g.fillStyle(0x6fbf4a, 1);
    g.fillEllipse(48, 72, 50, 48);
    g.fillStyle(0x8ed76a, 1);
    g.fillEllipse(48, 80, 30, 28);

    drawFeet(g, 48, CH - 20, 12, 0x4a8a2e, 14, 9);

    g.fillStyle(0x6fbf4a, 1);
    g.fillCircle(48, 38, 24);
    // Oreilles pointues.
    g.fillTriangle(26, 34, 2, 18, 26, 48);
    g.fillTriangle(70, 34, 94, 18, 70, 48);
    g.fillStyle(0x559b34, 1);
    g.fillTriangle(26, 36, 12, 26, 26, 44);
    g.fillTriangle(70, 36, 84, 26, 70, 44);

    // Petites cornes.
    g.fillStyle(0xe8dcc0, 1);
    g.fillTriangle(34, 18, 30, 2, 42, 16);
    g.fillTriangle(62, 18, 66, 2, 54, 16);

    drawEyes(g, 48, 36, 10, 7, { angry: true, brow: 0x3b6b22, iris: 0xd8342f });

    // Rictus + croc.
    g.fillStyle(0x35210f, 1);
    g.fillEllipse(48, 54, 22, 10);
    g.fillStyle(0xffffff, 1);
    g.fillTriangle(41, 50, 45, 50, 43, 58);
    g.fillTriangle(53, 50, 57, 50, 55, 58);
  });
}

function bakeLapin(scene: Phaser.Scene): void {
  bake(scene, 'enemy_lapin', CW, CH, (g) => {
    drawSoftShadow(g, CW / 2, CH - 12, 50, 19);

    // Longues oreilles.
    g.fillStyle(0xf7e9ef, 1);
    g.fillEllipse(34, 20, 17, 44);
    g.fillEllipse(62, 20, 17, 44);
    g.fillStyle(0xf0aec4, 1);
    g.fillEllipse(34, 22, 8, 30);
    g.fillEllipse(62, 22, 8, 30);

    g.fillStyle(0xf7e9ef, 1);
    g.fillEllipse(48, 76, 46, 44);
    g.fillStyle(0xffffff, 1);
    g.fillEllipse(48, 82, 28, 26);

    drawFeet(g, 48, CH - 20, 13, 0xf0aec4, 16, 10);

    g.fillStyle(0xf7e9ef, 1);
    g.fillCircle(48, 50, 23);

    // Cornes de démon.
    g.fillStyle(0xd8342f, 1);
    g.fillTriangle(32, 36, 24, 20, 42, 34);
    g.fillTriangle(64, 36, 72, 20, 54, 34);

    drawEyes(g, 48, 48, 10, 7, { angry: true, brow: 0xc79ab0, iris: 0xd8342f, pupil: 0.55 });

    // Museau + crocs.
    g.fillStyle(0xf0aec4, 1);
    g.fillEllipse(48, 60, 9, 6);
    g.fillStyle(0xffffff, 1);
    g.fillTriangle(43, 64, 47, 64, 45, 72);
    g.fillTriangle(49, 64, 53, 64, 51, 72);
  });
}

function bakeCrapaud(scene: Phaser.Scene): void {
  bake(scene, 'enemy_crapaud', CW, CH, (g) => {
    drawSoftShadow(g, CW / 2, CH - 8, 76, 26);

    g.fillStyle(0x4f9e8c, 1);
    g.fillEllipse(48, 68, 84, 66);
    g.fillStyle(0x7cc4ae, 1);
    g.fillEllipse(48, 80, 54, 40);

    // Verrues.
    g.fillStyle(0x3d8071, 1);
    g.fillCircle(20, 58, 6);
    g.fillCircle(76, 62, 5);
    g.fillCircle(32, 44, 4);
    g.fillCircle(66, 42, 5);

    // Pattes palmées.
    g.fillStyle(0x3d8071, 1);
    g.fillEllipse(18, CH - 20, 26, 13);
    g.fillEllipse(78, CH - 20, 26, 13);

    // Yeux globuleux sur le dessus.
    g.fillStyle(0x4f9e8c, 1);
    g.fillCircle(30, 28, 17);
    g.fillCircle(66, 28, 17);
    drawEyes(g, 48, 26, 18, 11, { angry: true, brow: 0x35705f, iris: 0xf0c93c, pupil: 0.42 });

    // Grande bouche.
    g.fillStyle(0x2c4f47, 1);
    g.fillEllipse(48, 62, 56, 14);
    g.fillStyle(0xffffff, 1);
    g.fillTriangle(28, 56, 34, 56, 31, 66);
    g.fillTriangle(62, 56, 68, 56, 65, 66);
  });
}

function bakeRoi(scene: Phaser.Scene): void {
  bake(scene, 'enemy_roi', CW, CH + 12, (g) => {
    drawSoftShadow(g, CW / 2, CH, 72, 26);

    // Cape.
    g.fillStyle(0x8c1f34, 1);
    g.fillTriangle(48, 40, 4, CH - 6, 92, CH - 6);
    g.fillStyle(0xa82a42, 1);
    g.fillTriangle(48, 44, 16, CH - 10, 80, CH - 10);

    g.fillStyle(0x5f9e34, 1);
    g.fillEllipse(48, 76, 58, 56);
    g.fillStyle(0x82c258, 1);
    g.fillEllipse(48, 84, 34, 32);

    drawFeet(g, 48, CH - 4, 14, 0x3d6b22, 17, 11);

    g.fillStyle(0x5f9e34, 1);
    g.fillCircle(48, 40, 26);
    g.fillTriangle(24, 36, 0, 18, 24, 52);
    g.fillTriangle(72, 36, 96, 18, 72, 52);

    drawEyes(g, 48, 38, 11, 7.5, { angry: true, brow: 0x35601c, iris: 0xffd257 });

    g.fillStyle(0x33200f, 1);
    g.fillEllipse(48, 58, 28, 12);
    g.fillStyle(0xffffff, 1);
    g.fillTriangle(38, 53, 43, 53, 40, 63);
    g.fillTriangle(53, 53, 58, 53, 56, 63);

    // Couronne.
    g.fillStyle(PALETTE.gold, 1);
    g.fillPoints(
      [
        { x: 26, y: 18 }, { x: 34, y: 4 }, { x: 41, y: 16 }, { x: 48, y: 0 },
        { x: 55, y: 16 }, { x: 62, y: 4 }, { x: 70, y: 18 }, { x: 70, y: 24 }, { x: 26, y: 24 },
      ],
      true,
    );
    g.fillStyle(0xd8342f, 1);
    g.fillCircle(48, 20, 4);
  });
}

// ---------------------------------------------------------------------------
// Héros — Griffon
// ---------------------------------------------------------------------------

function bakeGriffon(scene: Phaser.Scene): void {
  bake(scene, 'hero_griffon', CW + 24, CH, (g) => {
    const cx = (CW + 24) / 2;
    drawSoftShadow(g, cx, CH - 10, 70, 24);

    // Ailes déployées, derrière le corps.
    g.fillStyle(0xe6c26a, 1);
    g.fillTriangle(cx - 12, 56, cx - 60, 16, cx - 20, 80);
    g.fillTriangle(cx + 12, 56, cx + 60, 16, cx + 20, 80);
    g.fillStyle(0xf5dc9a, 1);
    g.fillTriangle(cx - 14, 58, cx - 44, 28, cx - 20, 72);
    g.fillTriangle(cx + 14, 58, cx + 44, 28, cx + 20, 72);

    // Arrière-train de lion.
    g.fillStyle(0xd6a24a, 1);
    g.fillEllipse(cx, 74, 52, 50);
    g.fillStyle(0xe8bd72, 1);
    g.fillEllipse(cx, 82, 32, 30);

    // Queue à touffe.
    g.fillStyle(0xd6a24a, 1);
    g.fillEllipse(cx + 26, 84, 22, 9);
    g.fillStyle(0xa9762f, 1);
    g.fillCircle(cx + 38, 86, 8);

    drawFeet(g, cx, CH - 18, 13, 0xf0b93c, 15, 10);

    // Tête d'aigle.
    g.fillStyle(0xf7f2e2, 1);
    g.fillCircle(cx, 34, 23);
    g.fillStyle(0xe6ddc4, 1);
    g.fillEllipse(cx, 46, 30, 14);

    g.fillStyle(0xf0b93c, 1);
    g.fillTriangle(cx + 17, 32, cx + 42, 38, cx + 17, 44);
    g.fillStyle(0xd79a24, 1);
    g.fillTriangle(cx + 36, 37, cx + 42, 38, cx + 34, 46);

    drawEyes(g, cx, 30, 10, 7, { angry: true, brow: 0xb08a3a, iris: 0x2a2110 });

    // Petite couronne de plumes.
    g.fillStyle(PALETTE.gold, 1);
    g.fillTriangle(cx - 14, 14, cx - 8, 0, cx - 2, 14);
    g.fillTriangle(cx + 2, 14, cx + 8, 0, cx + 14, 14);
  });
}

// ---------------------------------------------------------------------------
// Projectiles, décors, marqueurs
// ---------------------------------------------------------------------------

function bakeProjectiles(scene: Phaser.Scene): void {
  bake(scene, 'proj_feather', 26, 14, (g) => {
    g.fillStyle(0xf2f4f8, 1);
    g.fillEllipse(13, 7, 24, 10);
    g.fillStyle(0x2f5fb0, 1);
    g.fillEllipse(17, 7, 12, 6);
  });

  bake(scene, 'proj_bolt', 30, 16, (g) => {
    g.fillStyle(0xffe9a8, 0.75);
    g.fillEllipse(15, 8, 28, 14);
    g.fillStyle(PALETTE.gold, 1);
    g.fillPoints([{ x: 30, y: 8 }, { x: 14, y: 2 }, { x: 6, y: 8 }, { x: 14, y: 14 }], true);
  });

  bake(scene, 'proj_paw', 22, 22, (g) => {
    g.fillStyle(0x8a5a34, 1);
    g.fillCircle(11, 12, 9);
    g.fillStyle(0x3a2415, 1);
    g.fillCircle(6, 5, 3);
    g.fillCircle(12, 3, 3);
    g.fillCircle(18, 6, 3);
  });

  bake(scene, 'proj_bamboo', 24, 12, (g) => {
    g.fillStyle(0x5fa83f, 1);
    g.fillRoundedRect(0, 3, 24, 6, 3);
    g.fillStyle(0x7dc95c, 1);
    g.fillEllipse(6, 6, 6, 6);
    g.fillEllipse(18, 6, 6, 6);
  });
}

function bakeProps(scene: Phaser.Scene): void {
  bake(scene, 'prop_tree', 64, 88, (g) => {
    drawSoftShadow(g, 32, 80, 42, 16);
    g.fillStyle(0x6b4526, 1);
    g.fillRoundedRect(27, 48, 10, 30, 4);
    g.fillStyle(0x2f7d3f, 1);
    g.fillCircle(32, 40, 22);
    g.fillCircle(18, 48, 15);
    g.fillCircle(46, 48, 15);
    g.fillStyle(0x3d9a4f, 1);
    g.fillCircle(30, 34, 15);
    g.fillStyle(0xffffff, 0.12);
    g.fillCircle(26, 28, 8);
  });

  bake(scene, 'prop_rock', 56, 44, (g) => {
    drawSoftShadow(g, 28, 38, 40, 14);
    g.fillStyle(0x7c8592, 1);
    g.fillEllipse(28, 26, 44, 28);
    g.fillStyle(0x99a2ae, 1);
    g.fillEllipse(25, 22, 30, 18);
    g.fillStyle(0xffffff, 0.16);
    g.fillEllipse(22, 18, 14, 8);
  });

  bake(scene, 'prop_bush', 52, 40, (g) => {
    drawSoftShadow(g, 26, 34, 34, 12);
    g.fillStyle(0x3f8f45, 1);
    g.fillCircle(16, 24, 12);
    g.fillCircle(34, 24, 12);
    g.fillCircle(25, 18, 14);
    g.fillStyle(0x54a95a, 1);
    g.fillCircle(22, 15, 8);
    g.fillStyle(0xd8342f, 1);
    g.fillCircle(14, 20, 3);
    g.fillCircle(36, 22, 3);
  });

  // Portail d'apparition des ennemis.
  bake(scene, 'marker_spawn', 72, 84, (g) => {
    drawSoftShadow(g, 36, 76, 50, 18);
    g.fillStyle(0x3a2a52, 1);
    g.fillEllipse(36, 44, 60, 72);
    g.fillStyle(0x6b3fa0, 1);
    g.fillEllipse(36, 44, 46, 58);
    g.fillStyle(0xb07ae8, 0.9);
    g.fillEllipse(36, 44, 30, 40);
    g.fillStyle(0xe9d5ff, 0.8);
    g.fillEllipse(36, 40, 14, 20);
  });

  // Cœur du royaume, à défendre.
  bake(scene, 'marker_core', 76, 92, (g) => {
    drawSoftShadow(g, 38, 84, 56, 20);
    g.fillStyle(0x8d6b3f, 1);
    g.fillEllipse(38, 74, 62, 24);
    g.fillStyle(0xb08a52, 1);
    g.fillEllipse(38, 70, 62, 24);
    g.fillStyle(0x2f7fd0, 1);
    g.fillPoints(
      [{ x: 38, y: 6 }, { x: 60, y: 40 }, { x: 38, y: 68 }, { x: 16, y: 40 }],
      true,
    );
    g.fillStyle(0x6fb8f5, 1);
    g.fillPoints(
      [{ x: 38, y: 14 }, { x: 52, y: 40 }, { x: 38, y: 60 }, { x: 26, y: 40 }],
      true,
    );
    g.fillStyle(0xffffff, 0.6);
    g.fillPoints(
      [{ x: 36, y: 18 }, { x: 44, y: 38 }, { x: 34, y: 44 }, { x: 30, y: 34 }],
      true,
    );
  });
}

function bakeEffects(scene: Phaser.Scene): void {
  // Éclat d'impact, réutilisé pour les explosions et les dégâts de zone.
  bake(scene, 'fx_burst', 64, 64, (g) => {
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(32, 32, 14);
    g.fillStyle(0xffd257, 0.7);
    g.fillCircle(32, 32, 24);
    g.fillStyle(0xff9d3c, 0.35);
    g.fillCircle(32, 32, 32);
  });

  bake(scene, 'fx_soul', 20, 26, (g) => {
    g.fillStyle(0xbfe6ff, 0.85);
    g.fillEllipse(10, 12, 18, 22);
    g.fillStyle(0xffffff, 0.9);
    g.fillEllipse(8, 9, 8, 10);
  });

  // Disque plein utilisé pour les halos et les cercles de portée.
  bake(scene, 'fx_disc', 128, 128, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillCircle(64, 64, 64);
  });
}

/** Génère l'intégralité des textures. Appelé une fois, au boot. */
export function buildTextures(scene: Phaser.Scene): void {
  bakeTerrain(scene);
  bakeCoq(scene);
  bakeAigle(scene);
  bakeOurs(scene);
  bakePanda(scene);
  bakeGoblinet(scene);
  bakeLapin(scene);
  bakeCrapaud(scene);
  bakeRoi(scene);
  bakeGriffon(scene);
  bakeProjectiles(scene);
  bakeProps(scene);
  bakeEffects(scene);
}
