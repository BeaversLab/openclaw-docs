---
summary: "Workflow Bun (expérimental) : installations et pièges vs pnpm"
read_when:
  - Vous souhaitez la boucle de dev locale la plus rapide (bun + watch)
  - Vous rencontrez des problèmes d'installation/patch/scripts de cycle de vie Bun
title: "Bun (Expérimental)"
---

# Bun (expérimental)

Objectif : exécuter ce dépôt avec **Bun** (optionnel, non recommandé pour WhatsApp/Telegram)
sans diverger des workflows pnpm.

⚠️ **Non recommandé pour le runtime Gateway** (bugs WhatsApp/Telegram). Utilisez Node pour la production.

## Statut

- Bun est un runtime local optionnel pour exécuter TypeScript directement (`bun run …`, `bun --watch …`).
- `pnpm` est la valeur par défaut pour les builds et reste entièrement pris en charge (et utilisé par certains outils de documentation).
- Bun ne peut pas utiliser `pnpm-lock.yaml` et l'ignorera.

## Installer

Par défaut :

```sh
bun install
```

Remarque : `bun.lock`/`bun.lockb` sont gitignorés, il n'y a donc pas de modifications inutiles dans le dépôt dans les deux cas. Si vous ne souhaitez _aucune écriture de fichier de verrouillage_ :

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

- `@whiskeysockets/baileys` `preinstall` : vérifie que Node major >= 20 (OpenClaw est défini par défaut sur Node 24 et prend toujours en charge Node 22 LTS, actuellement `22.16+`).
- `protobufjs` `postinstall` : émet des avertissements concernant les schémas de version incompatibles (pas d'artefacts de build).

Si vous rencontrez un vrai problème d'exécution nécessitant ces scripts, approuvez-les explicitement :

```sh
bun pm trust @whiskeysockets/baileys protobufjs
```

## Avertissements

- Certains scripts utilisent encore pnpm en dur (par ex. `docs:build`, `ui:*`, `protocol:check`). Exécutez-les via pnpm pour le moment.

import en from "/components/footer/en.mdx";

<en />
