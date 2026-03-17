---
summary: "Référence CLI pour `openclaw browser` (profils, onglets, actions, Chrome MCP et CDP)"
read_when:
  - You use `openclaw browser` and want examples for common tasks
  - You want to control a browser running on another machine via a node host
  - You want to attach to your local signed-in Chrome via Chrome MCP
title: "browser"
---

# `openclaw browser`

Gérer le serveur de contrôle de navigateur de OpenClaw et exécuter des actions de navigateur (onglets, instantanés, captures d'écran, navigation, clics, saisie).

Connexes :

- Outil de navigateur + API : [Outil de navigateur](/fr/tools/browser)

## Drapeaux courants

- `--url <gatewayWsUrl>` : URL WebSocket du Gateway (par défaut depuis la configuration).
- `--token <token>` : jeton du Gateway (si requis).
- `--timeout <ms>` : délai d'expiration de la requête (ms).
- `--browser-profile <name>` : choisir un profil de navigateur (celui par défaut depuis la configuration).
- `--json` : sortie lisible par machine (lorsque pris en charge).

## Démarrage rapide (local)

```bash
openclaw browser profiles
openclaw browser --browser-profile openclaw start
openclaw browser --browser-profile openclaw open https://example.com
openclaw browser --browser-profile openclaw snapshot
```

## Profils

Les profils sont des configurations de routage de navigateur nommées. En pratique :

- `openclaw` : lance ou se connecte à une instance Chrome dédiée gérée par OpenClaw (répertoire de données utilisateur isolé).
- `user` : contrôle votre session Chrome existante et connectée via Chrome DevTools MCP.
- profils CDP personnalisés : pointent vers un point de terminaison CDP local ou distant.

```bash
openclaw browser profiles
openclaw browser create-profile --name work --color "#FF5A36"
openclaw browser create-profile --name chrome-live --driver existing-session
openclaw browser delete-profile --name work
```

Utiliser un profil spécifique :

```bash
openclaw browser --browser-profile work tabs
```

## Onglets

```bash
openclaw browser tabs
openclaw browser open https://docs.openclaw.ai
openclaw browser focus <targetId>
openclaw browser close <targetId>
```

## Instantané / capture d'écran / actions

Instantané :

```bash
openclaw browser snapshot
```

Capture d'écran :

```bash
openclaw browser screenshot
```

Naviguer/cliquer/saisir (automatisation de l'interface utilisateur basée sur des références) :

```bash
openclaw browser navigate https://example.com
openclaw browser click <ref>
openclaw browser type <ref> "hello"
```

## Chrome existant via MCP

Utilisez le profil intégré `user`, ou créez votre propre profil `existing-session` :

```bash
openclaw browser --browser-profile user tabs
openclaw browser create-profile --name chrome-live --driver existing-session
openclaw browser create-profile --name brave-live --driver existing-session --user-data-dir "~/Library/Application Support/BraveSoftware/Brave-Browser"
openclaw browser --browser-profile chrome-live tabs
```

Ce chemin est réservé à l'hôte. Pour Docker, les serveurs sans tête (headless), Browserless ou d'autres configurations distantes, utilisez plutôt un profil CDP.

## Contrôle distant du navigateur (proxy d'hôte de nœud)

Si le Gateway s'exécute sur une machine différente de celle du navigateur, exécutez un **node host** sur la machine qui dispose de Chrome/Brave/Edge/Chromium. Le Gateway transmettra les actions du navigateur à ce nœud (aucun serveur de contrôle de navigateur distinct requis).

Utilisez `gateway.nodes.browser.mode` pour contrôler le routage automatique et `gateway.nodes.browser.node` pour épingler un nœud spécifique si plusieurs sont connectés.

Sécurité + configuration à distance : [Outil de navigateur](/fr/tools/browser), [Accès distant](/fr/gateway/remote), [Tailscale](/fr/gateway/tailscale), [Sécurité](/fr/gateway/security)

import fr from "/components/footer/fr.mdx";

<fr />
