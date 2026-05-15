---
summary: "Workflow Bun (expérimental) : installations et pièges par rapport à pnpm"
read_when:
  - You want the fastest local dev loop (bun + watch)
  - You hit Bun install/patch/lifecycle script issues
title: "Bun (expérimental)"
---

<Warning>Bun n'est **pas recommandé pour le runtime de passerelle** (problèmes connus avec WhatsApp et Telegram). Utilisez Node pour la production.</Warning>

Bun est un runtime local optionnel pour exécuter TypeScript directement (`bun run ...`, `bun --watch ...`). Le gestionnaire de packages par défaut reste `pnpm`, qui est entièrement pris en charge et utilisé par les outils de documentation. Bun ne peut pas utiliser `pnpm-lock.yaml` et l'ignorera.

## Installer

<Steps>
  <Step title="Installer les dépendances">
    ```sh
    bun install
    ```

    `bun.lock` / `bun.lockb` sont ignorés par git, il n'y a donc pas de turnover dans le dépôt. Pour sauter complètement les écritures de fichiers de verrouillage :

    ```sh
    bun install --no-save
    ```

  </Step>
  <Step title="Construire et tester">
    ```sh
    bun run build
    bun run vitest run
    ```
  </Step>
</Steps>

## Scripts de cycle de vie

Bun bloque les scripts de cycle de vie des dépendances à moins qu'ils ne soient explicitement approuvés. Pour ce dépôt, les scripts couramment bloqués ne sont pas requis :

- `@whiskeysockets/baileys` `preinstall`OpenClaw -- vérifie que la version principale de Node est >= 20 (OpenClaw est basé sur Node 24 par défaut et prend toujours en charge Node 22 LTS, actuellement `22.16+`)
- `protobufjs` `postinstall` -- émet des avertissements concernant les schémas de version incompatibles (pas d'artefacts de build)

Si vous rencontrez un problème d'exécution nécessitant ces scripts, accordez-leur explicitement votre confiance :

```sh
bun pm trust @whiskeysockets/baileys protobufjs
```

## Mises en garde

Certains scripts codent encore en dur pnpm (par exemple `docs:build`, `ui:*`, `protocol:check`). Exécutez ceux-ci via pnpm pour l'instant.

## Connexes

- [Vue d'ensemble de l'installation](/fr/install)
- [Node.js](/fr/install/node)
- [Mise à jour](/fr/install/updating)
