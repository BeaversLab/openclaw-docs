---
summary: "Workflow Bun (expérimental) : installations et pièges par rapport à pnpm"
read_when:
  - You want the fastest local dev loop (bun + watch)
  - You hit Bun install/patch/lifecycle script issues
title: "Bun (Expérimental)"
---

# Bun (expérimental)

Objectif : exécuter ce dépôt avec **Bun** (facultatif, non recommandé pour WhatsApp/Telegram)
sans diverger des workflows pnpm.

⚠️ **Non recommandé pour le runtime Gateway** (bugs WhatsApp/Telegram). Utilisez Node pour la production.

## Statut

- Bun est un runtime local facultatif pour exécuter TypeScript directement (`bun run …`, `bun --watch …`).
- `pnpm` est la valeur par défaut pour les builds et reste entièrement pris en charge (et utilisé par certains outils de documentation).
- Bun ne peut pas utiliser `pnpm-lock.yaml` et l'ignorera.

## Installation

Par défaut :

```sh
bun install
```

Remarque : `bun.lock`/`bun.lockb` sont ignorés par git, il n'y a donc pas d'encombrement du dépôt dans les deux cas. Si vous ne voulez _aucune écriture de fichier de verrouillage_ :

```sh
bun install --no-save
```

## Build / Test (Bun)

```sh
bun run build
bun run vitest run
```

## Scripts de cycle de vie Bun (bloqués par défaut)

Bun peut bloquer les scripts de cycle de vie des dépendances sauf s'ils sont explicitement approuvés (`bun pm untrusted` / `bun pm trust`).
Pour ce dépôt, les scripts couramment bloqués ne sont pas requis :

- `@whiskeysockets/baileys` `preinstall` : vérifie que Node major >= 20 (OpenClaw utilise par défaut Node 24 et prend toujours en charge Node 22 LTS, actuellement `22.16+`).
- `protobufjs` `postinstall` : émet des avertissements concernant les schémas de version incompatibles (pas d'artefacts de build).

Si vous rencontrez un vrai problème d'exécution qui nécessite ces scripts, approuvez-les explicitement :

```sh
bun pm trust @whiskeysockets/baileys protobufjs
```

## Avertissements

- Certains scripts codent toujours pnpm en dur (ex. `docs:build`, `ui:*`, `protocol:check`). Exécutez-les via pnpm pour l'instant.

import fr from '/components/footer/fr.mdx';

<fr />
