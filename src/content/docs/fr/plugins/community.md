---
summary: "OpenClawTrouver et publier des plugins OpenClaw maintenus par la communauté"
read_when:
  - You want to find third-party OpenClaw plugins
  - You want to publish or list your own plugin on ClawHub
title: "Plugins communautaires"
doc-schema-version: 1
---

Les plugins communautaires sont des packages tiers qui étendent OpenClaw avec des canaux,
des outils, des fournisseurs, des hooks ou d'autres capacités. Utilisez [ClawHub](OpenClawClawHub/en/clawhub) comme
principal surface de découverte pour les plugins communautaires publics.

## Trouver des plugins

Rechercher sur ClawHub depuis la CLI :

```bash
openclaw plugins search "calendar"
```

Installer un plugin ClawHub avec un préfixe de source explicite :

```bash
openclaw plugins install clawhub:<package-name>
```

npm reste un chemin d'installation direct pris en charge pendant la bascule de lancement :

```bash
openclaw plugins install npm:<package-name>
```

Utilisez [Gérer les plugins](/fr/plugins/manage-plugins) pour des exemples courants d'installation, de mise à jour,
d'inspection et de désinstallation. Utilisez [`openclaw plugins`](/fr/cli/plugins) pour la
référence complète des commandes et les règles de sélection de la source.

## Publier des plugins

Publiez des plugins communautaires publics sur ClawHub lorsque vous souhaitez que les utilisateurs d'OpenClaw
puissent les découvrir et les installer. ClawHub possède la liste des packages en direct, l'historique des
versions, l'état de l'analyse et les conseils d'installation ; la documentation ne maintient pas de
catalogue statique de plugins tiers.

```bash
clawhub package publish your-org/your-plugin --dry-run
clawhub package publish your-org/your-plugin
```

Avant de publier, assurez-vous que le plugin possède des métadonnées de package, un manifeste de plugin,
une documentation d'installation et un propriétaire de maintenance clair. ClawHub valide la portée du propriétaire,
le nom du package, la version, les limites de fichiers et les métadonnées de la source avant de créer une
version, puis maintient les nouvelles versions masquées pour les surfaces d'installation et de téléchargement
normales jusqu'à ce que la révision et la vérification soient terminées.

Utilisez cette liste de contrôle avant de publier :

| Exigence                                        | Pourquoi                                                                             |
| ----------------------------------------------- | ------------------------------------------------------------------------------------ |
| Publié sur ClawHub                              | Les utilisateurs ont besoin des conseils `openclaw plugins install` pour fonctionner |
| Dépôt GitHub public                             | Révision de la source, suivi des problèmes, transparence                             |
| Documentation de configuration et d'utilisation | Les utilisateurs doivent savoir comment le configurer                                |
| Maintenance active                              | Mises à jour récentes ou gestion réactive des problèmes                              |

Utilisez ces pages pour le contrat de publication complet :

- [ClawHub publication](/fr/clawhub/publishing) explique les propriétaires, les portées, les versions,
  la révision, la validation des packages et le transfert de packages.
- [Création de plugins](/fr/plugins/building-plugins) montre la structure du package de plugin
  et le flux de travail de première publication.
- [Manifeste de plugin](/fr/plugins/manifest) définit les champs du manifeste de plugin natif.

## Connexes

- [Plugins](/fr/tools/plugin) - installer, configurer, redémarrer et dépanner
- [Gérer les plugins](/fr/plugins/manage-plugins) - exemples de commandes
- [ClawHub publication](/fr/clawhub/publishing) - règles de publication et de version
