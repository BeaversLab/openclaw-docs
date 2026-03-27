---
summary: "Plug-ins OpenClaw maintenus par la communauté : parcourir, installer et soumettre les vôtres"
read_when:
  - You want to find third-party OpenClaw plugins
  - You want to publish or list your own plugin
title: "Plug-ins communautaires"
---

# Plug-ins communautaires

Les plug-ins communautaires sont des packages tiers qui étendent OpenClaw avec de nouveaux
canaux, outils, fournisseurs ou autres capacités. Ils sont construits et maintenus
par la communauté, publiés sur [ClawHub](/fr/tools/clawhub) ou npm, et
installables avec une seule commande.

```bash
openclaw plugins install <package-name>
```

OpenClaw vérifie d'abord ClawHub et revient automatiquement à npm.

## Plug-ins répertoriés

### Codex App Server Bridge

Pont OpenClaw indépendant pour les conversations du Codex App Server. Lier une discussion à
un fil Codex, lui parler en texte brut, et la contrôler avec des commandes
natives de chat pour la reprise, la planification, la révision, la sélection de modèle, la compaction, et plus encore.

- **npm :** `openclaw-codex-app-server`
- **repo :** [github.com/pwrdrvr/openclaw-codex-app-server](https://github.com/pwrdrvr/openclaw-codex-app-server)

```bash
openclaw plugins install openclaw-codex-app-server
```

### DingTalk

Intégration de robot d'entreprise utilisant le mode Stream. Prend en charge les messages texte, images et
fichiers via n'importe quel client DingTalk.

- **npm :** `@largezhou/ddingtalk`
- **repo :** [github.com/largezhou/openclaw-dingtalk](https://github.com/largezhou/openclaw-dingtalk)

```bash
openclaw plugins install @largezhou/ddingtalk
```

### Lossless Claw (LCM)

Plug-in de gestion de contexte sans perte pour OpenClaw. Résumé de conversation
basé sur des DAG avec compactage incrémental — préserve la fidélité totale du contexte
tout en réduisant l'utilisation des jetons.

- **npm :** `@martian-engineering/lossless-claw`
- **repo :** [github.com/Martian-Engineering/lossless-claw](https://github.com/Martian-Engineering/lossless-claw)

```bash
openclaw plugins install @martian-engineering/lossless-claw
```

### Opik

Plug-in officiel qui exporte les traces d'agent vers Opik. Surveillez le comportement de l'agent,
le coût, les jetons, les erreurs, et plus encore.

- **npm :** `@opik/opik-openclaw`
- **repo :** [github.com/comet-ml/opik-openclaw](https://github.com/comet-ml/opik-openclaw)

```bash
openclaw plugins install @opik/opik-openclaw
```

### QQbot

Connectez OpenClaw à QQ via le QQ Bot API. Prend en charge les chats privés, les mentions
de groupe, les messages de canal, et les médias riches incluant la voix, les images, les vidéos,
et les fichiers.

- **npm :** `@sliverp/qqbot`
- **repo :** [github.com/sliverp/qqbot](https://github.com/sliverp/qqbot)

```bash
openclaw plugins install @sliverp/qqbot
```

### wecom

OpenClaw Enterprise WeCom Channel Plugin.
Un plugin de bot alimenté par des connexions WebSocket persistantes du bot IA WeCom,
prenant en charge les messages directs et les discussions de groupe, les réponses en streaming et la messagerie proactive.

- **npm :** `@wecom/wecom-openclaw-plugin`
- **dépôt :** [github.com/WecomTeam/wecom-openclaw-plugin](https://github.com/WecomTeam/wecom-openclaw-plugin)

```bash
openclaw plugins install @wecom/wecom-openclaw-plugin
```

## Soumettre votre plugin

Nous accueillons favorablement les plugins communautaires qui sont utiles, documentés et sûrs à utiliser.

<Steps>
  <Step title="Publier sur ClawHub ou npm">
    Votre plugin doit être installable via `openclaw plugins install \<package-name\>`.
    Publiez sur [ClawHub](/fr/tools/clawhub) (préféré) ou npm.
    Voir [Building Plugins](/fr/plugins/building-plugins) pour le guide complet.

  </Step>

  <Step title="Héberger sur GitHub">
    Le code source doit être dans un dépôt public avec une documentation de configuration et un suivi de problèmes.

  </Step>

  <Step title="Ouvrir une PR">
    Ajoutez votre plugin à cette page avec :

    - Nom du plugin
    - Nom du package npm
    - URL du dépôt GitHub
    - Description en une ligne
    - Commande d'installation

  </Step>
</Steps>

## Niveau de qualité

| Exigence                                        | Pourquoi                                                              |
| ----------------------------------------------- | --------------------------------------------------------------------- |
| Publié sur ClawHub ou npm                       | Les utilisateurs ont besoin que `openclaw plugins install` fonctionne |
| Dépôt GitHub public                             | Examen du code, suivi des problèmes, transparence                     |
| Documentation de configuration et d'utilisation | Les utilisateurs doivent savoir comment le configurer                 |
| Maintenance active                              | Mises à jour récentes ou gestion réactive des problèmes               |

Les enveloppes de faible effort, la propriété incertaine ou les packages non maintenus peuvent être refusés.

## Connexes

- [Install and Configure Plugins](/fr/tools/plugin) — comment installer n'importe quel plugin
- [Building Plugins](/fr/plugins/building-plugins) — créer le vôtre
- [Plugin Manifest](/fr/plugins/manifest) — schéma du manifeste

import fr from "/components/footer/fr.mdx";

<fr />
