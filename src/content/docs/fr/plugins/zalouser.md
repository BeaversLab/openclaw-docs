---
summary: "Plugin Zalo Personal : connexion QR + messagerie via zca-js natif (installation du plugin + configuration du channel + tool)"
read_when:
  - You want Zalo Personal (unofficial) support in OpenClaw
  - You are configuring or developing the zalouser plugin
title: "Plugin personnel Zalo"
---

Prise en charge de Zalo Personal pour OpenClaw via un plugin, utilisant le ZaloOpenClaw`zca-js`Zalo natif pour automatiser un compte utilisateur Zalo normal.

<Warning>L'automatisation non officielle peut entraîner la suspension ou le bannissement du compte. Utilisation à vos propres risques.</Warning>

## Nommage

L'identifiant de canal est `zalouser`Zalo pour indiquer explicitement que cela automatise un **compte utilisateur Zalo personnel** (non officiel). Nous conservons `zalo`ZaloAPI réservé pour une future intégration potentielle de l'API Zalo officielle.

## Où il s'exécute

Ce plugin s'exécute **à l'intérieur du processus Gateway**.

Si vous utilisez une Gateway distante, installez/configurez-la sur la **machine exécutant la Gateway**, puis redémarrez la Gateway.

Aucun binaire `zca`/`openzca`CLI CLI externe n'est requis.

## Installation

### Option A : installer depuis npm

```bash
openclaw plugins install @openclaw/zalouser
```

Utilisez le package nu pour suivre l'étiquette de version officielle actuelle. Ne spécifiez une version exacte
que lorsque vous avez besoin d'une installation reproductible.

Redémarrez la Gateway ensuite.

### Option B : installer depuis un dossier local (dev)

```bash
PLUGIN_SRC=./path/to/local/zalouser-plugin
openclaw plugins install "$PLUGIN_SRC"
cd "$PLUGIN_SRC" && pnpm install
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

## Connexes

- [Création de plugins](/fr/plugins/building-plugins)
- [ClawHub](ClawHub/en/clawhub)
