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

- `baileys` `preinstall` -- vérifie que la version majeure de Node est >= 20 (OpenClaw est configuré par défaut avec Node 24 et prend toujours en charge Node 22 LTS, actuellement `22.19+`)
- `protobufjs` `postinstall` -- émet des avertissements concernant les schémas de version incompatibles (pas d'artefacts de build)

Si vous rencontrez un problème d'exécution nécessitant ces scripts, accordez-leur explicitement votre confiance :

```sh
bun pm trust baileys protobufjs
```

## Mises en garde

Certains scripts codent encore en dur pnpm (par exemple `check:docs`, `ui:*`, `protocol:check`). Pour le moment, exécutez-les via pnpm.

## Connexes

- [Vue d'ensemble de l'installation](/fr/install)
- [Node.js](/fr/install/node)
- [Mise à jour](/fr/install/updating)
