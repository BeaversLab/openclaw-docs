---
summary: "Application Android (nœud) : manuel de connexion + surface de commande Connect/Chat/Voice/Android"
read_when:
  - Pairing or reconnecting the Android node
  - Debugging Android gateway discovery or auth
  - Verifying chat history parity across clients
title: "Application Android"
---

# Application Android (Nœud)

> **Remarque :** L'application Android n'a pas encore été publiquement publiée. Le code source est disponible dans le [dépôt OpenClaw](https://github.com/openclaw/openclaw) sous `apps/android`. Vous pouvez la compiler vous-même en utilisant Java 17 et le SDK Android (`./gradlew :app:assembleDebug`). Consultez [apps/android/README.md](https://github.com/openclaw/openclaw/blob/main/apps/android/README.md) pour les instructions de compilation.

## Instantané de la prise en charge

- Rôle : application de nœud compagnon (Android n'héberge pas le Gateway).
- Gateway requis : oui (exécutez-le sur macOS, Linux ou Windows via WSL2).
- Installer : [Getting Started](/fr/start/getting-started) + [Pairing](/fr/channels/pairing).
- Gateway : [Runbook](/fr/gateway) + [Configuration](/fr/gateway/configuration).
  - Protocoles : [protocole Gateway](/fr/gateway/protocol) (nœuds + plan de contrôle).

## Contrôle système

Le contrôle système (launchd/systemd) réside sur l'hôte Gateway. Voir [Gateway](/fr/gateway).

## Manuel de connexion

Application nœud Android ⇄ (mDNS/NSD + WebSocket) ⇄ **Gateway**

Android se connecte directement au WebSocket du Gateway (par défaut `ws://<host>:18789`) et utilise l'appareillage des appareils (`role: node`).

### Prérequis

- Vous pouvez exécuter le Gateway sur la machine « maître ».
- L'appareil/émulateur Android peut atteindre le WebSocket de la passerelle :
  - Même réseau local avec mDNS/NSD, **ou**
  - Même réseau tailnet Tailscale en utilisant Bonjour étendu / DNS-SD monodiffusion (voir ci-dessous), **ou**
  - Hôte/port de la passerelle manuel (solution de repli)
- Vous pouvez exécuter la CLI (`openclaw`) sur la machine de la passerelle (ou via SSH).

### 1) Démarrer le Gateway

```bash
openclaw gateway --port 18789 --verbose
```

Confirmez dans les journaux que vous voyez quelque chose comme :

- `listening on ws://0.0.0.0:18789`

Pour les configurations exclusivement tailnet (recommandé pour Vienne ⇄ Londres), liez la passerelle à l'IP du tailnet :

- Définissez `gateway.bind: "tailnet"` dans `~/.openclaw/openclaw.json` sur l'hôte de la passerelle.
- Redémarrez l'application de menu barre Gateway / macOS.

### 2) Vérifier la découverte (facultatif)

Depuis la machine passerelle :

```bash
dns-sd -B _openclaw-gw._tcp local.
```

Plus de notes de débogage : [Bonjour](/fr/gateway/bonjour).

#### Découverte Tailnet (Vienne ⇄ Londres) via DNS-SD monodiffusion (unicast)

La découverte NSD/mDNS Android ne traverse pas les réseaux. Si votre nœud Android et la passerelle sont sur des réseaux différents mais connectés via Tailscale, utilisez plutôt Bonjour étendu / DNS-SD monodiffusion (unicast) :

1. Configurez une zone DNS-SD (exemple `openclaw.internal.`) sur l'hôte de la passerelle et publiez des enregistrements `_openclaw-gw._tcp`.
2. Configurez le DNS fractionné Tailscale pour votre domaine choisi pointant vers ce serveur DNS.

Détails et exemple de configuration CoreDNS : [Bonjour](/fr/gateway/bonjour).

### 3) Se connecter depuis Android

Dans l'application Android :

- L'application maintient sa connexion passerelle active via un **service de premier plan** (notification persistante).
- Ouvrez l'onglet **Connect**.
- Utilisez le mode **Code de configuration** ou **Manuel**.
- Si la découverte est bloquée, utilisez l'hôte/port manuel (et TLS/jeton/mot de passe si nécessaire) dans **Contrôles avancés**.

Après le premier appairage réussi, Android se reconnecte automatiquement au lancement :

- Point de terminaison manuel (si activé), sinon
- La dernière passerelle découverte (au mieux).

### 4) Approuver l'appairage (CLI)

Sur la machine passerelle :

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
```

Détails sur l'appairage : [Pairing](/fr/channels/pairing).

### 5) Vérifier que le nœud est connecté

- Via le statut des nœuds :

  ```bash
  openclaw nodes status
  ```

- Via la Gateway :

  ```bash
  openclaw gateway call node.list --params "{}"
  ```

### 6) Chat + historique

L'onglet Chat Android prend en charge la sélection de session (par défaut `main`, plus autres sessions existantes) :

- Historique : `chat.history`
- Envoyer : `chat.send`
- Mises à jour push (au mieux) : `chat.subscribe` → `event:"chat"`

### 7) Canvas + caméra

#### Hôte Gateway de Canvas (recommandé pour le contenu web)

Si vous souhaitez que le nœud affiche du vrai HTML/CSS/JS que l'agent peut modifier sur le disque, pointez le nœud vers l'hôte canvas de la Gateway.

Remarque : les nœuds chargent le canvas depuis le serveur HTTP de la Gateway (même port que `gateway.port`, par défaut `18789`).

1. Créez `~/.openclaw/workspace/canvas/index.html` sur l'hôte de la passerelle.

2. Naviguez vers ce dernier via le nœud (LAN) :

```bash
openclaw nodes invoke --node "<Android Node>" --command canvas.navigate --params '{"url":"http://<gateway-hostname>.local:18789/__openclaw__/canvas/"}'
```

Tailnet (optionnel) : si les deux appareils sont sur Tailscale, utilisez un nom MagicDNS ou une IP tailnet au lieu de `.local`, par ex. `http://<gateway-magicdns>:18789/__openclaw__/canvas/`.

Ce serveur injecte un client de rechargement en direct dans le HTML et recharge lors des modifications de fichiers.
L'hôte A2UI se trouve à `http://<gateway-host>:18789/__openclaw__/a2ui/`.

Commandes Canvas (premier plan uniquement) :

- `canvas.eval`, `canvas.snapshot`, `canvas.navigate` (utilisez `{"url":""}` ou `{"url":"/"}` pour revenir à l'échafaudage par défaut). `canvas.snapshot` renvoie `{ format, base64 }` (par défaut `format="jpeg"`).
- A2UI : `canvas.a2ui.push`, `canvas.a2ui.reset` (`canvas.a2ui.pushJSONL` alias legacy)

Commandes de caméra (premier plan uniquement ; soumises aux permissions) :

- `camera.snap` (jpg)
- `camera.clip` (mp4)

Consultez [Camera node](/fr/nodes/camera) pour les paramètres et les assistants CLI.

### 8) Voix + surface de commande Android étendue

- Voix : Android utilise un flux unique d'activation/désactivation du micro dans l'onglet Voix avec capture de transcription et lecture TTS (ElevenLabs si configuré, secours TTS système). La voix s'arrête lorsque l'application quitte le premier plan.
- Les bascules de réveil/mode de parole de la voix sont actuellement supprimées de l'UX/runtime Android.
- Familles de commandes Android supplémentaires (la disponibilité dépend de l'appareil + des permissions) :
  - `device.status`, `device.info`, `device.permissions`, `device.health`
  - `notifications.list`, `notifications.actions`
  - `photos.latest`
  - `contacts.search`, `contacts.add`
  - `calendar.events`, `calendar.add`
  - `callLog.search`
  - `motion.activity`, `motion.pedometer`

import fr from "/components/footer/fr.mdx";

<fr />
