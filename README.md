# Animal Nations TD

Prototype jouable de la **zone Défense** du jeu : un tower defense 2.5D isométrique
où les tours sont des animaux nationaux, le héros une créature mythologique
déplaçable, et les ennemis des créatures chibi.

Conçu pour le mobile : jouable au doigt, portrait ou paysage, sans aucun asset
externe à télécharger.

## Démarrer

```bash
npm install
npm run dev
```

Vite affiche deux adresses. Celle en `192.168.x.x` est accessible depuis un
téléphone sur le même réseau Wi-Fi : **c'est comme ça qu'il faut tester le jeu**,
pas dans un navigateur de bureau. Le rendu, la taille des boutons et la
réactivité au toucher ne se jugent que sur un vrai écran tactile.

| Commande | Effet |
|---|---|
| `npm run dev` | Serveur de développement, rechargement à chaud |
| `npm run typecheck` | Vérification TypeScript stricte |
| `npm run build` | Typecheck + bundle de production dans `dist/` |
| `npm run preview` | Sert le bundle de production |

## Récupérer un APK Android

Le plus simple : **onglet Actions du dépôt → workflow « APK Android » → dernier
build → artefact `animal-nations-td-debug-apk`**. Décompresser le zip, envoyer
le `.apk` sur le téléphone, l'ouvrir. Android demandera d'autoriser
l'installation depuis cette source — c'est normal pour un APK non publié sur le
Play Store.

C'est un APK de **debug**, signé avec la clé de développement : parfait pour
tester, mais ni optimisé ni publiable en l'état sur le Play Store.

## Installer sans APK (le plus rapide)

Le jeu est une PWA. Ouvrir son adresse dans le navigateur du téléphone, puis
« Ajouter à l'écran d'accueil » : on obtient une icône et un lancement en plein
écran paysage, sans passer par l'installation d'un APK. C'est la boucle de test
la plus courte pendant le développement.

## Empaqueter en application native

Le projet est déjà configuré pour Capacitor (`capacitor.config.ts`), qui
transforme le bundle web en vraie application iOS / Android installable.

```bash
npm run build
npx cap add ios        # ou: npx cap add android
npm run sync
npx cap open ios       # ouvre Xcode / Android Studio
```

Les dossiers `ios/` et `android/` sont générés localement et volontairement
exclus du dépôt : ils se régénèrent avec `cap add`.

## Comment on joue

1. Toucher une **carte de tour** en bas, puis une case libre pour la poser. Le
   type reste sélectionné : on peut enchaîner les placements.
2. Toucher une **tour déjà posée** affiche sa portée et propose de la revendre.
3. **Déplacer** arme le mode héros : le toucher suivant sur le terrain envoie le
   Griffon à cet endroit. Il attaque tout seul.
4. **Ultime** déclenche une frappe de zone autour du héros (22 s de recharge).
5. **Lancer la vague** démarre l'assaut. Les boutons `1× 2× 3×` accélèrent.
6. Glisser un doigt fait défiler la carte, deux doigts la zooment.

## Architecture

```
src/
  main.ts                  Configuration Phaser, mise à l'échelle mobile
  game/
    config.ts              ⚙️  Tout l'équilibrage : or, vies, héros, tracé du chemin
    iso.ts                 Projection isométrique (grille ↔ écran)
    render.ts              Constantes de rendu partagées
    map.ts                 Grille de terrain + polyligne du chemin ennemi
    art.ts                 🎨 Génération procédurale de toutes les textures
    bus.ts                 Bus d'événements entre le jeu et l'interface
    data/
      towers.ts            Définitions des 4 tours
      enemies.ts           Définitions des 4 ennemis
      waves.ts             Les 10 vagues
    entities/              Enemy, Tower, Hero, Projectile
    scenes/
      BootScene.ts         Génère les textures puis lance le jeu
      DefenseScene.ts      Terrain, entrées tactiles, boucle de jeu
      HudScene.ts          Interface, dans sa propre scène (ne suit pas la caméra)
```

Deux principes structurent le code :

**Toute la logique travaille en unités de grille, jamais en pixels.** Une portée
de 3 est un vrai disque de rayon 3 cases. Seul l'affichage projette en
isométrique — un disque devient alors une ellipse, calculée par
`rangeToEllipse()`. C'est ce qui évite les bugs classiques où les portées
paraissent correctes en largeur mais fausses en profondeur.

**Aucun asset externe.** Chaque sprite est dessiné par code dans `art.ts` puis
figé en texture au démarrage. On peut itérer sur le gameplay sans attendre les
assets définitifs ; le jour où de vrais PNG arrivent, il suffit de les charger
sous les mêmes clés de texture (`tower_coq`, `enemy_goblinet`…) sans toucher au
reste du code.

## Où régler l'équilibrage

Presque tout tient dans trois fichiers, sans toucher à la logique :

- `src/game/config.ts` — or de départ, vies, bonus de vague, statistiques du
  héros, et **le tracé du chemin** (`PATH_WAYPOINTS`).
- `src/game/data/towers.ts` — coût, portée, cadence, dégâts, zone, ralentissement.
- `src/game/data/waves.ts` — composition et rythme des 10 vagues.

## Ce qui n'est pas encore là

Ce prototype ne couvre que la zone Défense. Voir
[`docs/specifications.md`](docs/specifications.md) pour l'état du cahier des
charges, les hypothèses prises et les questions ouvertes.
