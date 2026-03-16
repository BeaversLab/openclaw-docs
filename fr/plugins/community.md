---
summary: "Plugins communautaires : barre de qualité, exigences d'hébergement et processus de soumission de PR"
read_when:
  - You want to publish a third-party OpenClaw plugin
  - You want to propose a plugin for docs listing
title: "Plugins communautaires"
---

# Plugins communautaires

Cette page répertorie des **plugins communautaires** de haute qualité pour OpenClaw.

Nous acceptons les PR qui ajoutent des plugins communautaires ici lorsqu'ils répondent à nos critères de qualité.

## Requis pour le listing

- Le paquet du plugin est publié sur npmjs (installable via `openclaw plugins install <npm-spec>`).
- Le code source est hébergé sur GitHub (dépôt public).
- Le dépôt inclut une documentation d'installation/utilisation et un suivi des problèmes.
- Le plugin présente un signal de maintenance clair (mainteneur actif, mises à jour récentes ou gestion réactive des problèmes).

## Comment soumettre

Ouvrez une PR qui ajoute votre plugin à cette page avec :

- Nom du plugin
- Nom du paquet npm
- URL du dépôt GitHub
- Description en une ligne
- Commande d'installation

## Barre de revue

Nous préférons les plugins qui sont utiles, documentés et sûrs à utiliser.
Les enveloppes de faible effort, la propriété peu claire ou les paquets non maintenus peuvent être refusés.

## Format de candidature

Utilisez ce format lors de l'ajout d'entrées :

- **Nom du plugin** — courte description
  npm : `@scope/package`
  repo : `https://github.com/org/repo`
  install : `openclaw plugins install @scope/package`

## Plugins listés

- **WeChat** — Connecte OpenClaw aux comptes personnels WeChat via WeChatPadPro (protocole iPad). Prend en charge les échanges de texte, d'image et de fichiers avec des conversations déclenchées par mots-clés.
  npm : `@icesword760/openclaw-wechat`
  repo : `https://github.com/icesword0760/openclaw-wechat`
  install : `openclaw plugins install @icesword760/openclaw-wechat`

import fr from "/components/footer/fr.mdx";

<fr />
