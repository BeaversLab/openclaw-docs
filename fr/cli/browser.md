---
summary: "Référence de la CLI pour `openclaw browser` (profils, onglets, actions, Chrome MCP et CDP)"
read_when:
  - Vous utilisez `openclaw browser` et vous souhaitez des exemples pour les tâches courantes
  - Vous souhaitez contrôler un navigateur exécuté sur une autre machine via un hôte de nœud
  - Vous souhaitez vous connecter à votre Chrome local connecté via Chrome MCP
title: "browser"
---

# `openclaw browser`

Gérer le serveur de contrôle du navigateur d'OpenClaw et exécuter des actions de navigateur (onglets, instantanés, captures d'écran, navigation, clics, saisie).

Connexe :

- Outil de navigateur + API : [Outil de navigateur](/fr/tools/browser)

## Indicateurs communs

- `--url <gatewayWsUrl>` : URL WebSocket de la passerelle (valeur par défaut de la configuration).
- `--token <token>` : jeton de la passerelle (si requis).
- `--timeout <ms>` : délai d'expiration de la demande (ms).
- `--browser-profile <name>` : choisir un profil de navigateur (par défaut à partir de la configuration).
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

- `openclaw` : lance ou se connecte à une instance Chrome gérée dédiée par OpenClaw (répertoire de données utilisateur isolé).
- `user` : contrôle votre session Chrome connectée existante via Chrome DevTools MCP.
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

Naviguer/cliquer/taper (automatisation de l'interface utilisateur basée sur des références) :

```bash
openclaw browser navigate https://example.com
openclaw browser click <ref>
openclaw browser type <ref> "hello"
```

## Chrome existant via MCP

Utilisez le profil intégré `user` ou créez votre propre profil `existing-session` :

```bash
openclaw browser --browser-profile user tabs
openclaw browser create-profile --name chrome-live --driver existing-session
openclaw browser create-profile --name brave-live --driver existing-session --user-data-dir "~/Library/Application Support/BraveSoftware/Brave-Browser"
openclaw browser --browser-profile chrome-live tabs
```

Ce chemin est uniquement pour l'hôte. Pour Docker, les serveurs sans tête, Browserless ou d'autres configurations distantes, utilisez plutôt un profil CDP.

## Contrôle distant du navigateur (proxy node host)

Si la Gateway s'exécute sur une machine différente de celle du navigateur, exécutez un **node host** sur la machine qui dispose de Chrome/Brave/Edge/Chromium. La Gateway transmettra les actions du navigateur à ce nœud (aucun serveur de contrôle de navigateur distinct requis).

Utilisez `gateway.nodes.browser.mode` pour contrôler le routage automatique et `gateway.nodes.browser.node` pour épingler un nœud spécifique si plusieurs sont connectés.

Sécurité + configuration à distance : [Outil de navigateur](/fr/tools/browser), [Accès à distance](/fr/gateway/remote), [Tailscale](/fr/gateway/tailscale), [Sécurité](/fr/gateway/security)

import fr from "/components/footer/fr.mdx";

<fr />
