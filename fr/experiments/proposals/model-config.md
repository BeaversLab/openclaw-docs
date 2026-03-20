---
summary: "Exploration : configuration du model, profils d'authentification et comportement de repli"
read_when :
  - Exploration des futures idées de sélection de model + profil d'authentification
title: "Exploration de la configuration du model"
---

# Configuration du modèle (Exploration)

Ce document capture des **idées** pour la configuration future du model. Ce n'est pas
une spécification finale. Pour le comportement actuel, voir :

- [Modèles](/fr/concepts/models)
- [Basculement de model](/fr/concepts/model-failover)
- [OAuth + profils](/fr/concepts/oauth)

## Motivation

Les opérateurs souhaitent :

- Plusieurs profils d'authentification par fournisseur (personnel vs travail).
- Sélection simple de `/model` avec des replis prévisibles.
- Une séparation claire entre les modèles de texte et les modèles capables d'images.

## Direction possible (haut niveau)

- Garder la sélection du model simple : `provider/model` avec des alias optionnels.
- Permettre aux fournisseurs d'avoir plusieurs profils d'authentification, avec un ordre explicite.
- Utiliser une liste de repli globale pour que toutes les sessions basculent de manière cohérente.
- Ne remplacer le routage des images que lorsqu'il est explicitement configuré.

## Questions ouvertes

- La rotation des profils doit-elle être par fournisseur ou par modèle ?
- Comment l'interface utilisateur doit-elle présenter la sélection de profil pour une session ?
- Quel est le chemin de migration le plus sûr à partir des clés de configuration héritées ?

import en from "/components/footer/en.mdx";

<en />
