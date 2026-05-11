---
summary: "Plugins OpenClaw maintenus par la communauté : parcourir, installer et soumettre les vôtres"
read_when:
  - You want to find third-party OpenClaw plugins
  - You want to publish or list your own plugin
title: "Plugins communautaires"
---

Les plugins communautaires sont des packages tiers qui étendent OpenClaw avec de nouveaux
canaux, outils, fournisseurs ou autres capacités. Ils sont construits et maintenus
par la communauté, publiés sur [ClawHub](/fr/tools/clawhub) ou npm, et
installables avec une seule commande.

ClawHub est la surface de découverte canonique pour les plugins communautaires. N'ouvrez pas
de PR de documentation uniquement pour ajouter votre plugin ici pour sa découvrabilité ; publiez-le plutôt
sur ClawHub.

```bash
openclaw plugins install <package-name>
```

OpenClaw vérifie d'abord ClawHub et se rabat automatiquement sur npm.

## Plugins listés

### Apify

Scrapez des données de n'importe quel site Web avec plus de 20 000 scrapeurs prêts à l'emploi. Laissez votre agent
extraire des données d'Instagram, Facebook, TikTok, YouTube, Google Maps, Google
Recherche, de sites e-commerce et plus encore — simplement en le demandant.

- **npm :** `@apify/apify-openclaw-plugin`
- **dépôt :** [github.com/apify/apify-openclaw-plugin](https://github.com/apify/apify-openclaw-plugin)

```bash
openclaw plugins install @apify/apify-openclaw-plugin
```

### Codex App Server Bridge

Pont OpenClaw indépendant pour les conversations du serveur Codex App. Liez un chat à
un fil Codex, parlez-lui en texte clair et contrôlez-le avec des commandes natives
au chat pour la reprise, la planification, la révision, la sélection de modèle, la compactage et plus encore.

- **npm :** `openclaw-codex-app-server`
- **dépôt :** [github.com/pwrdrvr/openclaw-codex-app-server](https://github.com/pwrdrvr/openclaw-codex-app-server)

```bash
openclaw plugins install openclaw-codex-app-server
```

### DingTalk

Intégration de robot d'entreprise utilisant le mode Stream. Prend en charge les textes, images et
messages de fichiers via n'importe quel client DingTalk.

- **npm :** `@largezhou/ddingtalk`
- **dépôt :** [github.com/largezhou/openclaw-dingtalk](https://github.com/largezhou/openclaw-dingtalk)

```bash
openclaw plugins install @largezhou/ddingtalk
```

### Lossless Claw (LCM)

Plugin de gestion de contexte sans perte pour OpenClaw. Résumé de conversation basé sur des DAG
avec compactage incrémental — préserve la fidélité complète du contexte
tout en réduisant l'utilisation des tokens.

- **npm :** `@martian-engineering/lossless-claw`
- **dépôt :** [github.com/Martian-Engineering/lossless-claw](https://github.com/Martian-Engineering/lossless-claw)

```bash
openclaw plugins install @martian-engineering/lossless-claw
```

### Opik

Plugin officiel qui exporte les traces d'agents vers Opik. Surveillez le comportement des agents,
le coût, les tokens, les erreurs et plus encore.

- **npm :** `@opik/opik-openclaw`
- **repo:** [github.com/comet-ml/opik-openclaw](https://github.com/comet-ml/opik-openclaw)

```bash
openclaw plugins install @opik/opik-openclaw
```

### Prometheus Avatar

Donnez à votre agent OpenClaw un avatar Live2D avec synchronisation labiale en temps réel, expressions d'émotions et synthèse vocale. Inclut des outils de création pour la génération de ressources IA et un déploiement en un clic sur le Prometheus Marketplace. Actuellement en alpha.

- **npm :** `@prometheusavatar/openclaw-plugin`
- **repo :** [github.com/myths-labs/prometheus-avatar](https://github.com/myths-labs/prometheus-avatar)

```bash
openclaw plugins install @prometheusavatar/openclaw-plugin
```

### QQbot

Connectez OpenClaw à QQ via l'API QQ Bot. Prend en charge les chats privés, les mentions de groupe, les messages de channel et les médias riches, y compris la voix, les images, les vidéos et les fichiers.

Les versions actuelles de OpenClaw incluent QQ Bot. Utilisez la configuration intégrée dans [QQ Bot](/fr/channels/qqbot) pour les installations normales ; n'installez ce plugin externe que si vous souhaitez intentionnellement le package autonome maintenu par Tencent.

- **npm :** `@tencent-connect/openclaw-qqbot`
- **repo :** [github.com/tencent-connect/openclaw-qqbot](https://github.com/tencent-connect/openclaw-qqbot)

```bash
openclaw plugins install @tencent-connect/openclaw-qqbot
```

### wecom

Plugin de channel WeCom pour OpenClaw par l'équipe Tencent WeCom. Alimenté par des connexions WebSocket persistantes du bot WeCom, il prend en charge les messages directs et les conversations de groupe, les réponses en streaming, la messagerie proactive, le traitement d'images/fichiers, le formatage Markdown, le contrôle d'accès intégré et les compétences de document/réunion/messagerie.

- **npm :** `@wecom/wecom-openclaw-plugin`
- **repo :** [github.com/WecomTeam/wecom-openclaw-plugin](https://github.com/WecomTeam/wecom-openclaw-plugin)

```bash
openclaw plugins install @wecom/wecom-openclaw-plugin
```

### Yuanbao

Plugin de channel Yuanbao pour OpenClaw par l'équipe Tencent Yuanbao. Alimenté par des connexions persistantes WebSocket, il prend en charge les messages directs et les discussions de groupe, les réponses en streaming, la messagerie proactive, le traitement d'image/fichier/audio/vidéo, le formatage Markdown, le contrôle d'accès intégré et les menus de commandes slash.

- **npm :** `openclaw-plugin-yuanbao`
- **repo :** [github.com/yb-claw/openclaw-plugin-yuanbao](https://github.com/yb-claw/openclaw-plugin-yuanbao)

```bash
openclaw plugins install openclaw-plugin-yuanbao
```

## Soumettre votre plugin

Nous accueillons favorablement les plugins communautaires utiles, documentés et sûrs à utiliser.

<Steps>
  <Step title="Publier sur ClawHub ou npm">
    Votre plugin doit être installable via `openclaw plugins install \<package-name\>`.
    Publiez sur [ClawHub](/fr/tools/clawhub) (préféré) ou npm.
    Consultez [Building Plugins](/fr/plugins/building-plugins) pour le guide complet.

  </Step>

  <Step title="Héberger sur GitHub">
    Le code source doit se trouver dans un dépôt public avec une documentation de configuration et un suivi de problèmes.

  </Step>

  <Step title="Use docs PRs only for source-doc changes">
    Vous n'avez pas besoin de PR de documentation juste pour rendre votre plugin détectable. Publiez-le
    sur ClawHub à la place.

    Ouvrez un PR de documentation uniquement lorsque les docs source de OpenClaw nécessitent un changement de contenu réel,
    comme la correction des instructions d'installation ou l'ajout de documentation inter-repo
    appartenant à l'ensemble principal de la documentation.

  </Step>
</Steps>

## Niveau de qualité

| Exigence                                      | Pourquoi                                                              |
| --------------------------------------------- | --------------------------------------------------------------------- |
| Publié sur ClawHub ou npm                     | Les utilisateurs ont besoin que `openclaw plugins install` fonctionne |
| Dépôt GitHub public                           | Revue du code, suivi des problèmes, transparence                      |
| Documentation d'installation et d'utilisation | Les utilisateurs doivent savoir comment le configurer                 |
| Maintenance active                            | Mises à jour récentes ou gestion réactive des problèmes               |

Les enveloppements (wrappers) à faible effort, la propriété peu claire ou les paquets non maintenus peuvent être refusés.

## Connexes

- [Installer et configurer des plugins](/fr/tools/plugin) — comment installer n'importe quel plugin
- [Créer des plugins](/fr/plugins/building-plugins) — créer le vôtre
- [Manifeste de plugin](/fr/plugins/manifest) — schéma du manifeste
