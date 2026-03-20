---
summary: "Plugins communautaires : barre de qualité, exigences d'hébergement et processus de soumission de PR"
read_when:
  - Vous souhaitez publier un plugin OpenClaw tiers
  - Vous souhaitez proposer un plugin pour la liste de la documentation
title: "Plugins communautaires"
---

# Plugins communautaires

Cette page répertorie les **plugins maintenus par la communauté** de haute qualité pour OpenClaw.

Nous acceptons les PR qui ajoutent des plugins communautaires ici lorsqu'ils respectent la barre de qualité.

## Requis pour le listing

- Le package du plugin est publié sur npmjs (installable via `openclaw plugins install <npm-spec>`).
- Le code source est hébergé sur GitHub (dépôt public).
- Le dépôt inclut une documentation d'installation/d'utilisation et un tracker de tickets.
- Le plugin présente un signal de maintenance clair (mainteneur actif, mises à jour récentes ou gestion réactive des tickets).

## Comment soumettre

Ouvrez une PR qui ajoute votre plugin à cette page avec :

- Nom du plugin
- Nom du package npm
- URL du dépôt GitHub
- Description en une ligne
- Commande d'installation

## Barre de révision

Nous privilégions les plugins utiles, documentés et sûrs à utiliser.
Les wrappers de faible qualité, la propriété incertaine ou les packages non maintenus peuvent être refusés.

## Format candidat

Utilisez ce format lors de l'ajout d'entrées :

- **Nom du plugin** — description courte
  npm : `@scope/package`
  repo : `https://github.com/org/repo`
  install : `openclaw plugins install @scope/package`

## Plugins répertoriés

- **WeChat** — Connectez OpenClaw aux comptes personnels WeChat via WeChatPadPro (protocole iPad). Prend en charge les échanges de texte, d'image et de fichiers avec des conversations déclenchées par mots-clés.
  npm : `@icesword760/openclaw-wechat`
  repo : `https://github.com/icesword0760/openclaw-wechat`
  install : `openclaw plugins install @icesword760/openclaw-wechat`

import fr from "/components/footer/fr.mdx";

<fr />
