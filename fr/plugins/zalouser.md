---
summary: "Plugin Zalo Personal : connexion QR + messagerie via zca-js natif (installation du plugin + configuration du channel + tool)"
read_when:
  - You want Zalo Personal (unofficial) support in OpenClaw
  - You are configuring or developing the zalouser plugin
title: "Plugin Zalo Personnel"
---

# Zalo Personnel (plugin)

Support Zalo Personnel pour OpenClaw via un plugin, utilisant `zca-js` natif pour automatiser un compte utilisateur Zalo normal.

> **Avertissement :** L'automatisation non officielle peut entraîner une suspension ou un bannissement de compte. Utilisation à vos propres risques.

## Nommage

L'ID de channel est `zalouser` pour préciser explicitement que cela automatise un **compte utilisateur Zalo personnel** (non officiel). Nous conservons `zalo` réservé pour une future intégration officielle de l'API Zalo.

## Où il s'exécute

Ce plugin s'exécute **dans le processus Gateway**.

Si vous utilisez une Gateway distante, installez/configurez-la sur la **machine exécutant la Gateway**, puis redémarrez la Gateway.

Aucun binaire CLI `zca`/`openzca` externe n'est requis.

## Installation

### Option A : installer depuis npm

```bash
openclaw plugins install @openclaw/zalouser
```

Redémarrez la Gateway ensuite.

### Option B : installer depuis un dossier local (dev)

```bash
openclaw plugins install ./extensions/zalouser
cd ./extensions/zalouser && pnpm install
```

Redémarrez la Gateway ensuite.

## Configuration

La configuration du channel se trouve sous `channels.zalouser` (et non `plugins.entries.*`) :

```json5
{
  channels: {
    zalouser: {
      enabled: true,
      dmPolicy: "pairing",
    },
  },
}
```

## CLI

```bash
openclaw channels login --channel zalouser
openclaw channels logout --channel zalouser
openclaw channels status --probe
openclaw message send --channel zalouser --target <threadId> --message "Hello from OpenClaw"
openclaw directory peers list --channel zalouser --query "name"
```

## Outil d'agent

Nom de l'outil : `zalouser`

Actions : `send`, `image`, `link`, `friends`, `groups`, `me`, `status`

Les actions de message du channel prennent également en charge `react` pour les réactions aux messages.

import fr from '/components/footer/fr.mdx';

<fr />
