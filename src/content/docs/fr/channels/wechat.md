---
summary: "Configuration du canal WeChat via le plugin externe openclaw-weixin"
read_when:
  - You want to connect OpenClaw to WeChat or Weixin
  - You are installing or troubleshooting the openclaw-weixin channel plugin
  - You need to understand how external channel plugins run beside the Gateway
title: "WeChat"
---

# WeChat

OpenClaw se connecte à WeChat via le plugin de canal externe de Tencent
`@tencent-weixin/openclaw-weixin`.

Statut : plugin externe. Les chats directs et les médias sont pris en charge. Les chats de groupe ne sont pas
annoncés par les métadonnées de capacité actuelles du plugin.

## Dénomination

- **WeChat** est le nom orienté utilisateur dans cette documentation.
- **Weixin** est le nom utilisé par le package de Tencent et par l'identifiant du plugin.
- `openclaw-weixin` est l'identifiant de canal OpenClaw.
- `@tencent-weixin/openclaw-weixin` est le package npm.

Utilisez `openclaw-weixin` dans les commandes CLI et les chemins de configuration.

## Fonctionnement

Le code WeChat ne réside pas dans le dépôt central de OpenClaw. OpenClaw fournit le
contrat générique de plugin de canal, et le plugin externe fournit le
runtime spécifique à WeChat :

1. `openclaw plugins install` installe `@tencent-weixin/openclaw-weixin`.
2. Le Gateway détecte le manifeste du plugin et charge le point d'entrée du plugin.
3. Le plugin enregistre l'identifiant de canal `openclaw-weixin`.
4. `openclaw channels login --channel openclaw-weixin` lance la connexion QR.
5. Le plugin stocke les informations d'identification du compte dans le répertoire d'état de OpenClaw.
6. Lorsque le Gateway démarre, le plugin lance son moniteur Weixin pour chaque
   compte configuré.
7. Les messages WeChat entrants sont normalisés via le contrat de canal, acheminés vers
   l'agent OpenClaw sélectionné, et renvoyés via le chemin sortant du plugin.

Cette séparation est importante : le cœur de OpenClaw doit rester agnostique au canal. La connexion WeChat,
les appels à l'API Tencent iLink API, le téléchargement de médias, les jetons de contexte et la surveillance
de compte sont gérés par le plugin externe.

## Installation

Installation rapide :

```bash
npx -y @tencent-weixin/openclaw-weixin-cli install
```

Installation manuelle :

```bash
openclaw plugins install "@tencent-weixin/openclaw-weixin"
openclaw config set plugins.entries.openclaw-weixin.enabled true
```

Redémarrez le Gateway après l'installation :

```bash
openclaw gateway restart
```

## Connexion

Exécutez la connexion QR sur la même machine que celle exécutant le Gateway :

```bash
openclaw channels login --channel openclaw-weixin
```

Scannez le code QR avec WeChat sur votre téléphone et confirmez la connexion. Le plugin enregistre
le jeton du compte localement après un scan réussi.

Pour ajouter un autre compte WeChat, exécutez à nouveau la même commande de connexion. Pour plusieurs
comptes, isolez les sessions de messages directs par compte, canal et expéditeur :

```bash
openclaw config set session.dmScope per-account-channel-peer
```

## Contrôle d'accès

Les messages directs utilisent le modèle de jumelage et de liste blanche normal de OpenClaw pour les plugins
de canal.

Approuver les nouveaux expéditeurs :

```bash
openclaw pairing list openclaw-weixin
openclaw pairing approve openclaw-weixin <CODE>
```

Pour le modèle complet de contrôle d'accès, voir [Appairage](/fr/channels/pairing).

## Compatibilité

Le plugin vérifie la version de l'hôte OpenClaw au démarrage.

| Ligne de plugin | Version OpenClaw        | Tag npm  |
| --------------- | ----------------------- | -------- |
| `2.x`           | `>=2026.3.22`           | `latest` |
| `1.x`           | `>=2026.1.0 <2026.3.22` | `legacy` |

Si le plugin signale que votre version OpenClaw est trop ancienne, mettez à jour
OpenClaw ou installez la ligne de plugin héritée :

```bash
openclaw plugins install @tencent-weixin/openclaw-weixin@legacy
```

## Processus Sidecar

Le plugin WeChat peut exécuter des tâches d'assistance à côté du Gateway pendant qu'il surveille l'API iLink de Tencent. Dans le ticket #68451, ce chemin d'assistance a révélé un bug dans le nettoyage générique du OpenClaw périmé d'Gateway : un processus enfant pouvait tenter de nettoyer le processus parent
Gateway, provoquant des boucles de redémarrage sous des gestionnaires de processus tels que systemd.

Le nettoyage au démarrage actuel d'OpenClaw exclut le processus actuel et ses ancêtres,
donc un assistant de channel ne doit pas tuer le Gateway qui l'a lancé. Cette correction est
générique ; ce n'est pas un chemin spécifique à WeChat dans le cœur.

## Dépannage

Vérifier l'installation et l'état :

```bash
openclaw plugins list
openclaw channels status --probe
openclaw --version
```

Si le channel apparaît comme installé mais ne se connecte pas, confirmez que le plugin est
activé et redémarrez :

```bash
openclaw config set plugins.entries.openclaw-weixin.enabled true
openclaw gateway restart
```

Si le Gateway redémarre répétitivement après avoir activé WeChat, mettez à jour à la fois OpenClaw et
le plugin :

```bash
npm view @tencent-weixin/openclaw-weixin version
openclaw plugins install "@tencent-weixin/openclaw-weixin" --force
openclaw gateway restart
```

Désactivation temporaire :

```bash
openclaw config set plugins.entries.openclaw-weixin.enabled false
openclaw gateway restart
```

## Documentation connexe

- Aperçu des channels : [Channels de chat](/fr/channels)
- Appairage : [Appairage](/fr/channels/pairing)
- Routage de channel : [Routage de channel](/fr/channels/channel-routing)
- Architecture de plugin : [Architecture de plugin](/fr/plugins/architecture)
- SDK de plugin de channel : [SDK de plugin de channel](/fr/plugins/sdk-channel-plugins)
- Package externe : [@tencent-weixin/openclaw-weixin](https://www.npmjs.com/package/@tencent-weixin/openclaw-weixin)
