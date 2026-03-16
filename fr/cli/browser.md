---
summary: "Référence de la CLI pour `openclaw browser` (profils, onglets, actions, relais d'extension)"
read_when:
  - You use `openclaw browser` and want examples for common tasks
  - You want to control a browser running on another machine via a node host
  - You want to use the Chrome extension relay (attach/detach via toolbar button)
title: "browser"
---

# `openclaw browser`

Gérer le serveur de contrôle de navigateur de OpenClaw et exécuter des actions de navigateur (onglets, instantanés, captures d'écran, navigation, clics, saisie).

Connexes :

- Outil de navigateur + API : [Outil de navigateur](/fr/tools/browser)
- Relais d'extension Chrome : [Extension Chrome](/fr/tools/chrome-extension)

## Indicateurs communs

- `--url <gatewayWsUrl>` : URL WebSocket de la Gateway (valeur par défaut à partir de la configuration).
- `--token <token>` : jeton de la Gateway (si requis).
- `--timeout <ms>` : délai d'expiration de la requête (ms).
- `--browser-profile <name>` : choisir un profil de navigateur (par défaut à partir de la configuration).
- `--json` : sortie lisible par machine (si pris en charge).

## Quick start (local)

```bash
openclaw browser profiles
openclaw browser --browser-profile openclaw start
openclaw browser --browser-profile openclaw open https://example.com
openclaw browser --browser-profile openclaw snapshot
```

## Profils

Les profils sont des configurations de routage de navigateur nommées. En pratique :

- `openclaw` : lance/attache à une instance Chrome dédiée gérée par OpenClaw (répertoire de données utilisateur isolé).
- `user` : contrôle votre session Chrome connectée existante via Chrome DevTools MCP.
- `chrome-relay` : contrôle vos onglets Chrome existants via le relais de l'extension Chrome.

```bash
openclaw browser profiles
openclaw browser create-profile --name work --color "#FF5A36"
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

Navigation / clic / saisie (automatisation de l'interface utilisateur basée sur des références) :

```bash
openclaw browser navigate https://example.com
openclaw browser click <ref>
openclaw browser type <ref> "hello"
```

## Relais d'extension Chrome (attacher via le bouton de la barre d'outils)

Ce mode permet à l'agent de contrôler un onglet Chrome existant que vous attachez manuellement (il ne s'attache pas automatiquement).

Installez l'extension décompressée dans un chemin stable :

```bash
openclaw browser extension install
openclaw browser extension path
```

Ensuite Chrome → `chrome://extensions` → activer « Mode développeur » → « Charger l'extension non empaquetée » → sélectionner le dossier imprimé.

Guide complet : [Extension Chrome](/fr/tools/chrome-extension)

## Contrôle distant du navigateur (proxy hôte de nœud)

Si la Gateway s'exécute sur une machine différente de celle du navigateur, exécutez un **node host** sur la machine qui dispose de Chrome/Brave/Edge/Chromium. La Gateway proxera les actions du navigateur vers ce nœud (aucun serveur de contrôle de navigateur distinct n'est requis).

Utilisez `gateway.nodes.browser.mode` pour contrôler le routage automatique et `gateway.nodes.browser.node` pour épingler un nœud spécifique si plusieurs sont connectés.

Sécurité + configuration à distance : [Outil de navigateur](/fr/tools/browser), [Accès à distance](/fr/gateway/remote), [Tailscale](/fr/gateway/tailscale), [Sécurité](/fr/gateway/security)

import fr from "/components/footer/fr.mdx";

<fr />
