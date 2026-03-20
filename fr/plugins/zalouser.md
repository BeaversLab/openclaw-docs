---
summary: "Plugin personnel Zalo : connexion QR + messagerie via zca-js natif (installation du plugin + configuration du channel + tool)"
read_when:
  - Vous souhaitez un support personnel Zalo (non officiel) dans OpenClaw
  - Vous configurez ou développez le plugin zalouser
title: "Plugin personnel Zalo"
---

# Zalo Personnel (plugin)

Support personnel Zalo pour OpenClaw via un plugin, utilisant `zca-js` natif pour automatiser un compte utilisateur normal Zalo.

> **Avertissement :** L'automatisation non officielle peut entraîner la suspension ou le bannissement du compte. Utilisation à vos propres risques.

## Dénomination

L'ID de channel est `zalouser` pour indiquer explicitement que cela automatisera un **compte utilisateur personnel Zalo** (non officiel). Nous gardons `zalo` réservé pour une future intégration officielle de l'Zalo API.

## Emplacement d'exécution

Ce plugin s'exécute **à l'intérieur du processus Gateway**.

Si vous utilisez une Gateway distante, installez/configurez-la sur la **machine exécutant la Gateway**, puis redémarrez la Gateway.

Aucun binaire CLI externe `zca`/`openzca` n'est requis.

## Installer

### Option A : installer depuis npm

```bash
openclaw plugins install @openclaw/zalouser
```

Redémarrez la Gateway par la suite.

### Option B : installer depuis un dossier local (dev)

```bash
openclaw plugins install ./extensions/zalouser
cd ./extensions/zalouser && pnpm install
```

Redémarrez la Gateway par la suite.

## Config

La config du channel se trouve sous `channels.zalouser` (et non `plugins.entries.*`) :

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

## Tool d'agent

Nom du tool : `zalouser`

Actions : `send`, `image`, `link`, `friends`, `groups`, `me`, `status`

Les actions de message de channel prennent également en charge `react` pour les réactions aux messages.

import en from "/components/footer/en.mdx";

<en />
