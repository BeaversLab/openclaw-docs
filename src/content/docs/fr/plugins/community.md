---
summary: "Plugins OpenClaw maintenus par la communauté : parcourir, installer et soumettre les vôtres"
read_when:
  - You want to find third-party OpenClaw plugins
  - You want to publish or list your own plugin
title: "Plugins Communautaires"
---

# Plug-ins communautaires

Les plugins communautaires sont des packages tiers qui étendent OpenClaw avec de nouveaux
canaux, outils, fournisseurs ou autres capacités. Ils sont construits et maintenus
par la communauté, publiés sur [ClawHub](/fr/tools/clawhub) ou npm, et
installables avec une seule commande.

ClawHub est la surface de découverte canonique pour les plugins communautaires. N'ouvrez pas de PR uniquement pour la documentation juste pour ajouter votre plugin ici pour qu'il soit découvrable ; publiez-le plutôt sur ClawHub.

```bash
openclaw plugins install <package-name>
```

OpenClaw vérifie d'abord ClawHub et revient automatiquement à npm.

## Plugins répertoriés

### Apify

Scrapez des données de n'importe quel site Web avec plus de 20 000 scrapers prêts à l'emploi. Laissez votre agent
extraire des données d'Instagram, Facebook, TikTok, YouTube, Google Maps, Google
Search, des sites de e-commerce, et plus encore — simplement en le demandant.

- **npm :** `@apify/apify-openclaw-plugin`
- **repo :** [github.com/apify/apify-openclaw-plugin](https://github.com/apify/apify-openclaw-plugin)

```bash
openclaw plugins install @apify/apify-openclaw-plugin
```

### Codex App Server Bridge

Pont OpenClaw indépendant pour les conversations du Codex App Server. Liez une discussion à
un fil Codex, parlez-lui en texte brut, et contrôlez-le avec des commandes
natives de chat pour la reprise, la planification, la révision, la sélection de modèle, la compaction, et plus encore.

- **npm :** `openclaw-codex-app-server`
- **repo :** [github.com/pwrdrvr/openclaw-codex-app-server](https://github.com/pwrdrvr/openclaw-codex-app-server)

```bash
openclaw plugins install openclaw-codex-app-server
```

### DingTalk

Intégration de robot d'entreprise utilisant le mode Stream. Prend en charge les textes, images, et
messages de fichiers via n'importe quel client DingTalk.

- **npm :** `@largezhou/ddingtalk`
- **repo :** [github.com/largezhou/openclaw-dingtalk](https://github.com/largezhou/openclaw-dingtalk)

```bash
openclaw plugins install @largezhou/ddingtalk
```

### Lossless Claw (LCM)

Plugin de gestion de contexte sans perte pour OpenClaw. Résumé de conversation
basé sur des DAG avec compactage incrémental — préserve la fidélité complète du contexte
tout en réduisant l'utilisation des tokens.

- **npm :** `@martian-engineering/lossless-claw`
- **repo :** [github.com/Martian-Engineering/lossless-claw](https://github.com/Martian-Engineering/lossless-claw)

```bash
openclaw plugins install @martian-engineering/lossless-claw
```

### Opik

Plugin officiel qui exporte les traces d'agent vers Opik. Surveillez le comportement de l'agent,
le coût, les tokens, les erreurs, et plus encore.

- **npm :** `@opik/opik-openclaw`
- **repo :** [github.com/comet-ml/opik-openclaw](https://github.com/comet-ml/opik-openclaw)

```bash
openclaw plugins install @opik/opik-openclaw
```

### Prometheus Avatar

Donnez à votre agent OpenClaw un avatar Live2D avec synchronisation labiale en temps réel, expressions d'émotion et synthèse vocale. Inclut des outils de création pour la génération de ressources IA et un déploiement en un clic sur le Prometheus Marketplace. Actuellement en alpha.

- **npm :** `@prometheusavatar/openclaw-plugin`
- **dépôt :** [github.com/myths-labs/prometheus-avatar](https://github.com/myths-labs/prometheus-avatar)

```bash
openclaw plugins install @prometheusavatar/openclaw-plugin
```

### QQbot

Connectez OpenClaw à QQ via l'API QQ Bot. Prend en charge les conversations privées, les mentions de groupe, les messages de channel et les médias riches, y compris la voix, les images, les vidéos et les fichiers.

- **npm :** `@tencent-connect/openclaw-qqbot`
- **dépôt :** [github.com/tencent-connect/openclaw-qqbot](https://github.com/tencent-connect/openclaw-qqbot)

```bash
openclaw plugins install @tencent-connect/openclaw-qqbot
```

### wecom

Plugin de channel WeCom pour OpenClaw par l'équipe Tencent WeCom. Alimenté par des connexions WebSocket persistantes du bot WeCom, il prend en charge les messages directs et les conversations de groupe, les réponses en streaming, la messagerie proactive, le traitement d'images/fichiers, le formatage Markdown, le contrôle d'accès intégré et les compétences de document/réunion/messagerie.

- **npm :** `@wecom/wecom-openclaw-plugin`
- **dépôt :** [github.com/WecomTeam/wecom-openclaw-plugin](https://github.com/WecomTeam/wecom-openclaw-plugin)

```bash
openclaw plugins install @wecom/wecom-openclaw-plugin
```

## Soumettre votre plugin

Nous accueillons favorablement les plugins communautaires utiles, documentés et sûrs à utiliser.

<Steps>
  <Step title="Publier sur ClawHub ou npm">
    Votre plugin doit être installable via `openclaw plugins install \<package-name\>`.
    Publiez-le sur [ClawHub](/fr/tools/clawhub) (préféré) ou npm.
    Voir [Building Plugins](/fr/plugins/building-plugins) pour le guide complet.

  </Step>

  <Step title="Héberger sur GitHub">
    Le code source doit se trouver dans un dépôt public avec une documentation d'installation et un suivi de problèmes.

  </Step>

  <Step title="Utiliser les PR de docs uniquement pour les modifications des docs sources">
    Vous n'avez pas besoin d'une PR de docs juste pour rendre votre plugin découvrable. Publiez-le plutôt sur ClawHub.

    N'ouvrez une PR de docs que lorsque les docs sources de OpenClaw nécessitent un changement réel de contenu, comme la correction des instructions d'installation ou l'ajout de documentation inter-dépôt appartenant à l'ensemble principal de la documentation.

  </Step>
</Steps>

## Niveau de qualité

| Exigence                                          | Pourquoi                                                              |
| ------------------------------------------------- | --------------------------------------------------------------------- |
| Publié sur ClawHub ou npm                         | Les utilisateurs ont besoin que `openclaw plugins install` fonctionne |
| Dépôt public GitHub                               | Révision du code source, suivi des problèmes, transparence            |
| Documentation sur l'installation et l'utilisation | Les utilisateurs doivent savoir comment le configurer                 |
| Maintenance active                                | Mises à jour récentes ou gestion réactive des problèmes               |

Les enveloppes de faible effort, la propriété incertaine ou les packages non entretenus peuvent être refusés.

## Connexes

- [Installer et configurer des plugins](/fr/tools/plugin) — comment installer n'importe quel plugin
- [Créer des plugins](/fr/plugins/building-plugins) — créer le vôtre
- [Manifeste de plugin](/fr/plugins/manifest) — schéma du manifeste
