/**
 * Constantes de rendu partagées.
 *
 * Séparé de `iso.ts` (qui ne fait que de la géométrie) et de `art.ts` (qui
 * dessine) pour que les entités puissent importer ces valeurs sans tirer tout
 * le module de génération de textures.
 */

export * from './iso';

/** Facteur de suréchantillonnage des textures générées. */
export const RES = 2;

/** Échelle d'affichage compensant le suréchantillonnage. */
export const RES_SCALE = 1 / RES;

/** Origine verticale des sprites de créatures : leurs pieds touchent le sol. */
export const CREATURE_ORIGIN_Y = 0.9;
