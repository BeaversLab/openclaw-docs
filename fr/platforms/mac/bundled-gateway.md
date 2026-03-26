---
summary: "Runtime Gateway sur macOS (service launchd externe)"
read_when:
  - Packaging OpenClaw.app
  - Debugging the macOS gateway launchd service
  - Installing the gateway CLI for macOS
title: "Gateway sur macOS"
---

# Gateway sur macOS (launchd externe)

OpenClaw.app n'inclut plus Node/Bun ni le runtime Gateway. L'application macOS
s'attend à une installation `openclaw` CLI **externe**, ne lance pas le Gateway en tant que
processus enfant, et gère un service launchd par utilisateur pour garder le Gateway
actif (ou se connecte à un Gateway local existant si un est déjà en cours d'exécution).

## Installer le CLI (requis pour le mode local)

Node 24 est le runtime par défaut sur le Mac. Node 22 LTS, actuellement `22.16+`, fonctionne toujours pour la compatibilité. Installez ensuite `openclaw` globalement :

```bash
npm install -g openclaw@<version>
```

Le bouton **Installer le CLI** de l'application macOS exécute le même processus via npm/pnpm (bun n'est pas recommandé pour le runtime Gateway).

## Launchd (Gateway en tant que LaunchAgent)

Label :

- `ai.openclaw.gateway` (ou `ai.openclaw.<profile>` ; l'ancien `com.openclaw.*` peut subsister)

Emplacement du plist (par utilisateur) :

- `~/Library/LaunchAgents/ai.openclaw.gateway.plist`
  (ou `~/Library/LaunchAgents/ai.openclaw.<profile>.plist`)

Gestionnaire :

- L'application macOS gère l'installation/mise à jour de LaunchAgent en mode Local.
- Le CLI peut également l'installer : `openclaw gateway install`.

Comportement :

- « OpenClaw Actif » active/désactive le LaunchAgent.
- Quitter l'application n'arrête **pas** le gateway (launchd le maintient en vie).
- Si un Gateway est déjà en cours d'exécution sur le port configuré, l'application s'y connecte
  au lieu d'en démarrer un nouveau.

Journalisation :

- stdout/err launchd : `/tmp/openclaw/openclaw-gateway.log`

## Compatibilité des versions

L'application macOS vérifie la version du gateway par rapport à sa propre version. Si elles sont
incompatibles, mettez à jour le CLI global pour qu'il corresponde à la version de l'application.

## Vérification rapide

```bash
openclaw --version

OPENCLAW_SKIP_CHANNELS=1 \
OPENCLAW_SKIP_CANVAS_HOST=1 \
openclaw gateway --port 18999 --bind loopback
```

Ensuite :

```bash
openclaw gateway call health --url ws://127.0.0.1:18999 --timeout 3000
```

import fr from "/components/footer/fr.mdx";

<fr />
