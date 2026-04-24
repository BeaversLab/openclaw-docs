---
summary: "Mise à jour sécurisée d'OpenClaw (installation globale ou source), plus stratégie de retour"
read_when:
  - Updating OpenClaw
  - Something breaks after an update
title: "Mise à jour"
---

# Mise à jour

Gardez OpenClaw à jour.

## Recommandé : `openclaw update`

Le moyen le plus rapide de mettre à jour. Il détecte votre type d'installation (npm ou git), récupère la dernière version, exécute `openclaw doctor` et redémarre la passerelle.

```bash
openclaw update
```

Pour changer de canal ou cibler une version spécifique :

```bash
openclaw update --channel beta
openclaw update --tag main
openclaw update --dry-run   # preview without applying
```

`--channel beta` préfère la version bêta, mais le moteur revient à stable/latest lorsque
le tag bêta est manquant ou plus ancien que la dernière version stable. Utilisez `--tag beta`
si vous souhaitez le tag de distribution bêta brut de npm pour une mise à jour ponctuelle de package.

Voir [Canaux de développement](/fr/install/development-channels) pour la sémantique des canaux.

## Alternative : réexécuter l'installateur

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

Ajoutez `--no-onboard` pour sauter l'intégration. Pour les installations source, passez `--install-method git --no-onboard`.

## Alternative : npm manuel, pnpm ou bun

```bash
npm i -g openclaw@latest
```

```bash
pnpm add -g openclaw@latest
```

```bash
bun add -g openclaw@latest
```

### Installations globales npm appartenant à root

Certaines configurations npm Linux installent les packages globaux dans des répertoires appartenant à root, tels que
`/usr/lib/node_modules/openclaw`. OpenClaw prend en charge cette disposition : le package
installé est traité en lecture seule lors de l'exécution, et les dépendances d'exécution
des plugins groupés sont mises en place dans un répertoire d'exécution accessible en écriture au lieu de modifier l'arborescence
des packages.

Pour les unités systemd renforcées, définissez un répertoire de mise en scène accessible en écriture qui est inclus dans
`ReadWritePaths` :

```ini
Environment=OPENCLAW_PLUGIN_STAGE_DIR=/var/lib/openclaw/plugin-runtime-deps
ReadWritePaths=/var/lib/openclaw /home/openclaw/.openclaw /tmp
```

Si `OPENCLAW_PLUGIN_STAGE_DIR` n'est pas défini, OpenClaw utilise `$STATE_DIRECTORY` lorsque
systemd le fournit, puis revient à `~/.openclaw/plugin-runtime-deps`.

## Mise à jour automatique

La mise à jour automatique est désactivée par défaut. Activez-la dans `~/.openclaw/openclaw.json` :

```json5
{
  update: {
    channel: "stable",
    auto: {
      enabled: true,
      stableDelayHours: 6,
      stableJitterHours: 12,
      betaCheckIntervalHours: 1,
    },
  },
}
```

| Canal    | Comportement                                                                                                           |
| -------- | ---------------------------------------------------------------------------------------------------------------------- |
| `stable` | Attend `stableDelayHours`, puis applique avec une gigue déterministe sur `stableJitterHours` (déploiement progressif). |
| `beta`   | Vérifie toutes les `betaCheckIntervalHours` (par défaut : toutes les heures) et applique immédiatement.                |
| `dev`    | Aucune application automatique. Utilisez `openclaw update` manuellement.                                               |

La passerelle enregistre également un indice de mise à jour au démarrage (désactivez avec `update.checkOnStart: false`).

## Après la mise à jour

<Steps>

### Exécuter le docteur

```bash
openclaw doctor
```

Migre la configuration, audite les stratégies DM et vérifie l'état de la passerelle. Détails : [Doctor](/fr/gateway/doctor)

### Redémarrez la passerelle

```bash
openclaw gateway restart
```

### Vérifier

```bash
openclaw health
```

</Steps>

## Restauration (Rollback)

### Épingler une version (npm)

```bash
npm i -g openclaw@<version>
openclaw doctor
openclaw gateway restart
```

Astuce : `npm view openclaw version` affiche la version publiée actuelle.

### Épingler un commit (source)

```bash
git fetch origin
git checkout "$(git rev-list -n 1 --before=\"2026-01-01\" origin/main)"
pnpm install && pnpm build
openclaw gateway restart
```

Pour revenir à la dernière version : `git checkout main && git pull`.

## Si vous êtes bloqué

- Exécutez `openclaw doctor` à nouveau et lisez attentivement la sortie.
- Pour `openclaw update --channel dev` sur les extraits de source, le programme de mise à jour amorce automatiquement `pnpm` si nécessaire. Si vous voyez une erreur d'amorçage pnpm/corepack, installez `pnpm` manuellement (ou réactivez `corepack`) et relancez la mise à jour.
- Vérifiez : [Dépannage](/fr/gateway/troubleshooting)
- Demandez sur Discord : [https://discord.gg/clawd](https://discord.gg/clawd)

## Connexes

- [Vue d'ensemble de l'installation](/fr/install) — toutes les méthodes d'installation
- [Doctor](/fr/gateway/doctor) — vérifications de l'état après les mises à jour
- [Migration](/fr/install/migrating) — guides de migration pour les versions majeures
