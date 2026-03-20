---
summary: "Android app (node) : manuel de connexion + surface de commande Connect/Chat/Voice/Canvas"
read_when:
  - Appairage ou reconnexion du nœud Android
  - Débogage de la découverte ou de l'authentification de la passerelle Android
  - Vérification de la parité de l'historique des discussions entre les clients
title: "App Android"
---

# App Android (Node)

> **Remarque :** L'application Android n'a pas encore été publiée publiquement. Le code source est disponible dans le [dépôt OpenClaw](https://github.com/openclaw/openclaw) sous `apps/android`. Vous pouvez la compiler vous-même en utilisant Java 17 et le SDK Android (`./gradlew :app:assembleDebug`). Consultez [apps/android/README.md](https://github.com/openclaw/openclaw/blob/main/apps/android/README.md) pour les instructions de compilation.

## Support snapshot

- Rôle : application de nœud compagnon (Android n'héberge pas la passerelle).
- Passerelle requise : oui (exécutez-la sur macOS, Linux ou Windows via WSL2).
- Installation : [Getting Started](/fr/start/getting-started) + [Pairing](/fr/channels/pairing).
- Passerelle : [Runbook](/fr/gateway) + [Configuration](/fr/gateway/configuration).
  - Protocoles : [Protocole de la passerelle](/fr/gateway/protocol) (nœuds + plan de contrôle).

## Contrôle système

Le contrôle système (launchd/systemd) réside sur l'hôte de la passerelle. Voir [Passerelle](/fr/gateway).

## Manuel de connexion

App nœud Android ⇄ (mDNS/NSD + WebSocket) ⇄ **Passerelle**

Android se connecte directement au WebSocket de la passerelle (par défaut `ws://<host>:18789`) et utilise l'appairage d'appareils (`role: node`).

### Prérequis

- Vous pouvez exécuter la passerelle sur la machine « maître ».
- L'appareil/l'émulateur Android peut atteindre le WebSocket de la passerelle :
  - Même réseau local avec mDNS/NSD, **ou**
  - Même réseau privé Tailscale utilisant Bonjour étendu / DNS-SD unicast (voir ci-dessous), **ou**
  - Hôte/port de la passerelle manuel (solution de repli)
- Vous pouvez exécuter la CLI (`openclaw`) sur la machine de la passerelle (ou via SSH).

### 1) Démarrer la passerelle

```bash
openclaw gateway --port 18789 --verbose
```

Confirmez dans les journaux que vous voyez quelque chose comme :

- `listening on ws://0.0.0.0:18789`

Pour les configurations exclusivement en réseau privé (recommandé pour Vienne ⇄ Londres), liez la passerelle à l'IP du réseau privé :

- Définissez `gateway.bind: "tailnet"` dans `~/.openclaw/openclaw.json` sur l'hôte de la passerelle.
- Redémarrez la passerelle / l'application de la barre de menus macOS.

### 2) Vérifier la découverte (facultatif)

Depuis la machine de la passerelle :

```bash
dns-sd -B _openclaw-gw._tcp local.
```

Notes de débogage supplémentaires : [Bonjour](/fr/gateway/bonjour).

#### Découverte Tailnet (Vienne ⇄ Londres) via unicast DNS-SD

La découverte Android NSD/mDNS ne fonctionne pas entre différents réseaux. Si votre nœud Android et la passerelle sont sur des réseaux différents mais connectés via Tailscale, utilisez plutôt Wide-Area Bonjour / unicast DNS-SD :

1. Configurez une zone DNS-SD (exemple `openclaw.internal.`) sur l'hôte de la passerelle et publiez des enregistrements `_openclaw-gw._tcp`.
2. Configurez le DNS divisé Tailscale pour votre domaine choisi pointant vers ce serveur DNS.

Détails et exemple de configuration CoreDNS : [Bonjour](/fr/gateway/bonjour).

### 3) Se connecter depuis Android

Dans l'application Android :

- L'application maintient sa connexion à la passerelle active via un **service de premier plan** (notification persistante).
- Ouvrez l'onglet **Connect**.
- Utilisez le mode **Setup Code** ou **Manual**.
- Si la découverte est bloquée, utilisez l'hôte/port manuel (et TLS/jeton/mot de passe si nécessaire) dans **Advanced controls**.

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

Détails de l'appairage : [Pairing](/fr/channels/pairing).

### 5) Vérifier que le nœud est connecté

- Via l'état des nœuds :

  ```bash
  openclaw nodes status
  ```

- Via la passerelle :

  ```bash
  openclaw gateway call node.list --params "{}"
  ```

### 6) Chat + historique

L'onglet Chat Android prend en charge la sélection de session (par défaut `main`, ainsi que les autres sessions existantes) :

- Historique : `chat.history`
- Envoyer : `chat.send`
- Mises à jour push (au mieux) : `chat.subscribe` → `event:"chat"`

### 7) Canvas + caméra

#### Hôte de passerelle Canvas (recommandé pour le contenu web)

Si vous souhaitez que le nœud affiche du HTML/CSS/JS réel que l'agent peut modifier sur le disque, pointez le nœud vers l'hôte canvas de la passerelle.

Remarque : les nœuds chargent le canvas à partir du serveur HTTP de la passerelle (même port que `gateway.port`, par défaut `18789`).

1. Créez `~/.openclaw/workspace/canvas/index.html` sur l'hôte de la passerelle.

2. Naviguez le nœud vers celui-ci (LAN) :

```bash
openclaw nodes invoke --node "<Android Node>" --command canvas.navigate --params '{"url":"http://<gateway-hostname>.local:18789/__openclaw__/canvas/"}'
```

Tailnet (optionnel) : si les deux appareils sont sur Tailscale, utilisez un nom MagicDNS ou une adresse IP tailnet au lieu de `.local`, par ex. `http://<gateway-magicdns>:18789/__openclaw__/canvas/`.

Ce serveur injecte un client de rechargement en direct dans le HTML et recharge lors des modifications de fichiers.
L'hôte A2UI se trouve à `http://<gateway-host>:18789/__openclaw__/a2ui/`.

Commandes Canvas (premier plan uniquement) :

- `canvas.eval`, `canvas.snapshot`, `canvas.navigate` (utilisez `{"url":""}` ou `{"url":"/"}` pour revenir à l'échafaudage par défaut). `canvas.snapshot` renvoie `{ format, base64 }` (par défaut `format="jpeg"`).
- A2UI : `canvas.a2ui.push`, `canvas.a2ui.reset` (`canvas.a2ui.pushJSONL` alias hérité)

Commandes de caméra (premier plan uniquement ; soumises à autorisation) :

- `camera.snap` (jpg)
- `camera.clip` (mp4)

Voir [Camera node](/fr/nodes/camera) pour les paramètres et les assistants CLI.

### 8) Voice + surface de commande étendue Android

- Voice : Android utilise un flux unique d'activation/désactivation du microphone dans l'onglet Voice avec capture de transcription et lecture TTS (ElevenLabs si configuré, repli vers le TTS système). Voice s'arrête lorsque l'application quitte le premier plan.
- Les boutons de basculement du mode de réveil/discussion de Voice sont actuellement supprimés de l'UX/le runtime Android.
- Familles de commandes supplémentaires Android (la disponibilité dépend de l'appareil et des autorisations) :
  - `device.status`, `device.info`, `device.permissions`, `device.health`
  - `notifications.list`, `notifications.actions`
  - `photos.latest`
  - `contacts.search`, `contacts.add`
  - `calendar.events`, `calendar.add`
  - `callLog.search`
  - `motion.activity`, `motion.pedometer`

import fr from "/components/footer/fr.mdx";

<fr />
