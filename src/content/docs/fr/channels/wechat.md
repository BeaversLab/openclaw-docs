---
summary: "Configuration du canal WeChat via le plugin externe openclaw-weixin"
read_when:
  - You want to connect OpenClaw to WeChat or Weixin
  - You are installing or troubleshooting the openclaw-weixin channel plugin
  - You need to understand how external channel plugins run beside the Gateway
title: "WeChat"
---

OpenClaw se connecte à WeChat via le plugin de canal externe
`@tencent-weixin/openclaw-weixin` de Tencent.

Statut : plugin externe. Les discussions directes et les médias sont pris en charge. Les discussions de groupe ne sont pas
annoncées par les métadonnées de capacité actuelles du plugin.

## Appellation

- **WeChat** est le destiné à l'utilisateur dans ces documents.
- **Weixin** est le nom utilisé par le paquet de Tencent et par l'identifiant du plugin.
- `openclaw-weixin` est l'identifiant de canal OpenClaw.
- `@tencent-weixin/openclaw-weixin` est le paquet npm.

Utilisez `openclaw-weixin` dans les commandes CLI et les chemins de configuration.

## Fonctionnement

Le code WeChat ne réside pas dans le dépôt principal d'OpenClaw. OpenClaw fournit le
contrat de plugin de canal générique, et le plugin externe fournit le
runtime spécifique à WeChat :

1. `openclaw plugins install` installe `@tencent-weixin/openclaw-weixin`.
2. La Gateway découvre le manifeste du plugin et charge le point d'entrée du plugin.
3. Le plugin enregistre l'identifiant de canal `openclaw-weixin`.
4. `openclaw channels login --channel openclaw-weixin` lance la connexion QR.
5. Le plugin stocke les informations d'identification du compte dans le répertoire d'état d'OpenClaw.
6. Lorsque la Gateway démarre, le plugin lance son moniteur Weixin pour chaque
   compte configuré.
7. Les messages entrants de WeChat sont normalisés via le contrat de canal, acheminés vers
   l'agent OpenClaw sélectionné, et renvoyés via le chemin de sortie du plugin.

Cette séparation est importante : le cœur d'OpenClaw doit rester agnostique aux canaux. La connexion WeChat,
les appels à l'API Tencent iLink, le téléchargement/téléversement de médias, les jetons de contexte et la surveillance
des comptes sont gérés par le plugin externe.

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

Redémarrez la Gateway après l'installation :

```bash
openclaw gateway restart
```

## Connexion

Lancez la connexion QR sur la même machine que celle exécutant la Gateway :

```bash
openclaw channels login --channel openclaw-weixin
```

Scannez le code QR avec WeChat sur votre téléphone et confirmez la connexion. Le plugin enregistre
le jeton du compte localement après un scan réussi.

Pour ajouter un autre compte WeChat, relancez la même commande de connexion. Pour plusieurs
comptes, isolez les sessions de messages directs par compte, canal et expéditeur :

```bash
openclaw config set session.dmScope per-account-channel-peer
```

## Contrôle d'accès

Les messages directs utilisent le modèle d'appariement et de liste d'autorisation normal d'OpenClaw pour les plugins
de canal.

Approuver les nouveaux expéditeurs :

```bash
openclaw pairing list openclaw-weixin
openclaw pairing approve openclaw-weixin <CODE>
```

Pour le modèle complet de contrôle d'accès, voir [Pairing](/fr/channels/pairing).

## Compatibilité

Le plugin vérifie la version de l'hôte OpenClaw au démarrage.

| Ligne de plugin | version d'OpenClaw      | étiquette npm |
| --------------- | ----------------------- | ------------- |
| `2.x`           | `>=2026.3.22`           | `latest`      |
| `1.x`           | `>=2026.1.0 <2026.3.22` | `legacy`      |

Si le plugin signale que votre version d'OpenClaw est trop ancienne, mettez à jour
OpenClaw ou installez la ligne de plugin héritée :

```bash
openclaw plugins install @tencent-weixin/openclaw-weixin@legacy
```

## Processus sidecar

Le plugin WeChat peut exécuter des tâches d'assistance à côté du Gateway pendant qu'il surveille l'API iLink de Tencent. Dans le ticket #68451, ce chemin d'assistance a exposé un bogue dans le nettoyage générique du OpenClaw périmé d'Gateway : un processus enfant pouvait tenter de nettoyer le processus parent
Gateway, provoquant des boucles de redémarrage sous les gestionnaires de processus tels que systemd.

Le nettoyage au démarrage de l'OpenClaw actuel exclut le processus actuel et ses ancêtres,
donc un assistant de canal ne doit pas tuer le Gateway qui l'a lancé. Cette correction est
générique ; ce n'est pas un chemin spécifique à WeChat dans le cœur.

## Dépannage

Vérifiez l'installation et l'état :

```bash
openclaw plugins list
openclaw channels status --probe
openclaw --version
```

Si le canal apparaît comme installé mais ne se connecte pas, confirmez que le plugin est
activé et redémarrez :

```bash
openclaw config set plugins.entries.openclaw-weixin.enabled true
openclaw gateway restart
```

Si le Gateway redémarre de manière répétée après l'activation de WeChat, mettez à jour à la fois OpenClaw et
le plugin :

```bash
npm view @tencent-weixin/openclaw-weixin version
openclaw plugins install "@tencent-weixin/openclaw-weixin" --force
openclaw gateway restart
```

Si le démarrage signale que le paquet du plugin installé `requires compiled runtime
output for TypeScript entry`, le paquet npm a été publié sans les fichiers d'exécution
JavaScript compilés dont OpenClaw a besoin. Mettez à jour/réinstallez une fois que l'éditeur
du plugin a livré un paquet corrigé, ou désinstallez/désactivez temporairement le plugin.

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
