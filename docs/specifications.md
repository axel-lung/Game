# Cahier des charges — état

Ce document trace ce qui est **spécifié**, ce qui a été **supposé** faute de
spécification, et ce qui reste **ouvert**. Il sert de référence pour la suite :
toute hypothèse listée ici est un endroit du code qui changera quand la réponse
arrivera.

---

## 1. Spécifié

### Concept général

- **Genre** : hybride tower defense (BTD6) + RTS de gestion (AoE).
- **Rendu** : 2.5D isométrique, sprites 2D avec profondeur, ombres, animations
  cartoon.
- **Thème** : les nations du monde.
  - **Tours** = animaux nationaux adultes (Coq France, Aigle USA…)
  - **Ouvriers** = bébés animaux (Poussins, Aiglons…), avec des bonus de farming
    par pays
  - **Héros** = créatures mythologiques déplaçables (Griffon, Qilin…)
  - **Ennemis** = créatures chibi mignonnes mais vicieuses (Goblinets, Bunny
    Demons…)
- **Map** : divisée en deux zones — **Défense** et **Ferme**.
- **Progression** : avancement par âges, inspiré d'Age of Empires.

### Zone Défense

- Chemin fixe pour les ennemis.
- Grille pour les tours, qui sont fixes.
- Héros mobiles.

---

## 2. Implémenté dans le prototype

| Élément | État |
|---|---|
| Terrain isométrique 13×13 avec relief | ✅ |
| Chemin fixe, cases inconstructibles | ✅ |
| 4 tours aux rôles distincts (DPS / sniper / zone / contrôle) | ✅ |
| 4 ennemis dont un boss | ✅ |
| 10 vagues à difficulté croissante | ✅ |
| Héros Griffon : déplacement libre, attaque auto, ultime de zone | ✅ |
| Économie : or aux kills + bonus de vague, revente à 70 % | ✅ |
| Vies, défaite, victoire, rejouer | ✅ |
| Contrôles tactiles : pose, sélection, défilement, pincement, ×1/×2/×3 | ✅ |
| Compteur d'**âmes** | ⚠️ se remplit, ne se dépense pas encore |
| Zone Ferme | ❌ non spécifiée |
| Progression par âges | ❌ non spécifiée |

---

## 3. Hypothèses prises

Ces choix ont été faits pour que le prototype tourne. Aucun n'est définitif.

1. **L'or est la seule ressource de la zone Défense.** Les âmes s'accumulent aux
   kills (1 par goblinet, 3 par crapaud, 20 pour le boss) mais ne servent à rien
   pour l'instant, faute de savoir ce qu'elles achètent.
2. **Les fuites coûtent des vies**, proportionnellement à la taille de l'ennemi
   (1 pour un goblinet, 10 pour le boss). 20 vies au départ.
3. **Un seul héros à la fois**, sans montée en niveau, avec une seule capacité
   active.
4. **Les tours n'ont pas d'améliorations.** Dans BTD6 c'est le cœur de la
   progression ; ici on ne peut que poser et revendre. C'est le manque le plus
   important du prototype.
5. **Le ciblage est fixé sur « l'ennemi le plus avancé »**, sans option.
6. **Les vagues se lancent manuellement**, sans minuteur automatique.
7. **Une seule map**, avec un tracé de chemin unique.

---

## 4. Questions ouvertes

### Sur les sections manquantes du cahier des charges

Le document reçu s'interrompt au milieu de la section « Map ». Il manque :
**Zone Farm**, **Ennemis**, **Gameplay Loop**, ainsi que les détails annoncés en
introduction sur les tours, les bébés, les héros, les âmes et les bâtiments.

### Sur les âmes — le point le plus structurant

D'après l'introduction, les âmes relient les deux zones. Trois questions en
découlent :

- **À quoi servent-elles ?** Débloquer des tours, monter d'âge, invoquer des
  héros, acheter des bébés animaux ?
- **Comment se gagnent-elles ?** Seulement aux kills, ou aussi par la ferme ?
- **Sont-elles la ressource rare partagée entre Défense et Ferme ?** C'est
  l'hypothèse la plus intéressante pour l'équilibrage : si les deux zones se
  disputent la même ressource, le joueur arbitre en permanence. Si chacune a la
  sienne, les deux boucles vivent côte à côte sans jamais se parler, et la ferme
  devient un simple robinet à or.

### Sur les âges

- Combien d'âges, et qu'est-ce qui les déclenche — un coût, un palier de vague,
  un bâtiment ?
- Qu'est-ce qu'un âge débloque : de nouvelles tours, l'amélioration des
  existantes, de nouvelles nations ?
- Les ennemis montent-ils d'âge en même temps que le joueur ?

### Sur la présentation à l'écran

Les deux zones sur un écran de 6 pouces, c'est serré. Trois options :

1. **Deux vues avec bascule** — chaque zone occupe tout l'écran, un bouton passe
   de l'une à l'autre. C'est la plus lisible, et ma recommandation.
2. **Une seule carte, défilement libre** — plus immersif, mais on ne peut pas
   surveiller une vague en gérant la ferme.
3. **Vue principale + vignette** — la ferme en médaillon pendant les combats.

### Sur les améliorations de tours

Sans elles, il n'y a pas de courbe de progression à l'intérieur d'une partie :
on pose des tours jusqu'à saturer la carte, puis il ne se passe plus rien. Deux
modèles possibles :

- **BTD6** : deux ou trois branches d'amélioration par tour, choix exclusif.
- **AoE** : améliorations globales par âge, qui profitent à toutes les tours
  d'un type.

Le thème « nations + âges » penche vers le second, mais le premier donne
beaucoup plus de décisions au joueur.

---

## 5. Prochaines étapes proposées

Par ordre de valeur, une fois le cahier des charges complété :

1. **Améliorations de tours** — sans elles, le cœur du tower defense manque.
2. **Zone Ferme** — bébés animaux, production, et la ressource qui la relie à la
   défense.
3. **Progression par âges** — le liant entre les deux zones.
4. **Sauvegarde locale** de la progression.
5. **Son** — retours audio de tir, de mort et de fuite ; c'est ce qui donne le
   plus de « game feel » pour le moins d'effort.
6. **Assets définitifs** — remplacer les sprites procéduraux, sans toucher au
   code de jeu.
