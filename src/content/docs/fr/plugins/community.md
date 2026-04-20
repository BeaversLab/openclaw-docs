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

ClawHub est la surface de découverte canonique pour les plugins communautaires. N'ouvrez pas de PR uniquement pour la documentation juste pour ajouter votre plugin ici pour qu'il soit découvrable ; publiez-le plutôt sur ClawHub.

```bash
openclaw plugins install <package-name>
```

OpenClaw vérifie d'abord ClawHub et revient automatiquement à npm.

## Plugins répertoriés

### Codex App Server Bridge

Pont indépendant OpenClaw pour les conversations du Codex App Server. Liez une discussion à un fil Codex, parlez-lui en texte brut et contrôlez-le avec des commandes natives de discussion pour la reprise, la planification, la révision, la sélection de modèle, la compactage, et plus encore.

- **npm :** `openclaw-codex-app-server`
- **repo :** [github.com/pwrdrvr/openclaw-codex-app-server](https://github.com/pwrdrvr/openclaw-codex-app-server)

```bash
openclaw plugins install openclaw-codex-app-server
```

### DingTalk

Intégration de robot d'entreprise utilisant le mode Stream. Prend en charge les messages textuels, les images et les fichiers via n'importe quel client DingTalk.

- **npm :** `@largezhou/ddingtalk`
- **repo :** [github.com/largezhou/openclaw-dingtalk](https://github.com/largezhou/openclaw-dingtalk)

```bash
openclaw plugins install @largezhou/ddingtalk
```

### Lossless Claw (LCM)

Plugin de gestion de contexte sans perte pour OpenClaw. Résumé de conversation basé sur des DAG avec compactage incrémental — préserve la fidélité complète du contexte tout en réduisant l'utilisation des jetons.

- **npm :** `@martian-engineering/lossless-claw`
- **repo :** [github.com/Martian-Engineering/lossless-claw](https://github.com/Martian-Engineering/lossless-claw)

```bash
openclaw plugins install @martian-engineering/lossless-claw
```

### Opik

Plugin officiel qui exporte les traces d'agents vers Opik. Surveillez le comportement des agents, les coûts, les jetons, les erreurs, et plus encore.

- **npm :** `@opik/opik-openclaw`
- **repo :** [github.com/comet-ml/opik-openclaw](https://github.com/comet-ml/opik-openclaw)

```bash
openclaw plugins install @opik/opik-openclaw
```

### QQbot

Connectez OpenClaw à QQ via le QQ Bot API. Prend en charge les discussions privées, les mentions de groupe, les messages de canal et les médias riches incluant la voix, les images, les vidéos et les fichiers.

- **npm :** `@tencent-connect/openclaw-qqbot`
- **repo :** [github.com/tencent-connect/openclaw-qqbot](https://github.com/tencent-connect/openclaw-qqbot)

```bash
openclaw plugins install @tencent-connect/openclaw-qqbot
```

### wecom

Plugin de canal WeCom pour OpenClaw par l'équipe Tencent WeCom. Alimenté par des connexions WebSocket persistantes du WeCom Bot, il prend en charge les messages directs et les discussions de groupe, les réponses en continu, la messagerie proactive, le traitement d'images/fichiers, le formatage Markdown, le contrôle d'accès intégré, et les compétences de document/réunion/messagerie.

- **npm :** `@wecom/wecom-openclaw-plugin`
- **repo :** [github.com/WecomTeam/wecom-openclaw-plugin](https://github.com/WecomTeam/wecom-openclaw-plugin)

```bash
openclaw plugins install @wecom/wecom-openclaw-plugin
```

## Soumettre votre plugin

Nous accueillons favorablement les plugins communautaires qui sont utiles, documentés et sûrs à exploiter.

<Steps>
  <Step title="Publier sur ClawHub ou npm">
    Votre plugin doit être installable via `openclaw plugins install \<package-name\>`.
    Publiez-le sur [ClawHub](/fr/tools/clawhub) (préféré) ou npm.
    Consultez [Building Plugins](/fr/plugins/building-plugins) pour le guide complet.

  </Step>

  <Step title="Héberger sur GitHub">
    Le code source doit se trouver dans un dépôt public avec une documentation d'installation et un outil de suivi des problèmes.

  </Step>

  <Step title="Utiliser les PR de documentation uniquement pour les modifications des docs sources">
    Vous n'avez pas besoin d'une PR de documentation juste pour rendre votre plugin découvrable. Publiez-le plutôt sur ClawHub.

    N'ouvrez une PR de documentation que lorsque les docs sources de OpenClaw nécessitent une modification réelle du contenu, telle que la correction des instructions d'installation ou l'ajout d'une documentation inter-dépôts appartenant à l'ensemble principal de la documentation.

  </Step>
</Steps>

## Niveau de qualité requis

| Exigence                                      | Pourquoi                                                              |
| --------------------------------------------- | --------------------------------------------------------------------- |
| Publié sur ClawHub ou npm                     | Les utilisateurs ont besoin que `openclaw plugins install` fonctionne |
| Dépôt GitHub public                           | Révision du code source, suivi des problèmes, transparence            |
| Documentation d'installation et d'utilisation | Les utilisateurs doivent savoir comment le configurer                 |
| Maintenance active                            | Mises à jour récentes ou gestion réactive des problèmes               |

Les enveloppes de faible effort, la propriété peu claire ou les packages non maintenus peuvent être refusés.

## Connexes

- [Install and Configure Plugins](/fr/tools/plugin) — comment installer n'importe quel plugin
- [Building Plugins](/fr/plugins/building-plugins) — créer le vôtre
- [Plugin Manifest](/fr/plugins/manifest) — schéma du manifeste
