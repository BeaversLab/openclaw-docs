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

`--channel beta` préfère la version bêta, mais l'exécution revient à stable/latest lorsque
le tag bêta est manquant ou plus ancien que la dernière version stable. Utilisez `--tag beta`
si vous souhaitez le tag de dist bêta npm brut pour une mise à jour de package ponctuelle.

Voir [Canaux de développement](/en/install/development-channels) pour la sémantique des canaux.

## Alternative : réexécuter l'installateur

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

Ajoutez `--no-onboard` pour ignorer l'intégration (onboarding). Pour les installations à partir des sources, passez `--install-method git --no-onboard`.

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

| Canal    | Comportement                                                                                                      |
| -------- | ----------------------------------------------------------------------------------------------------------------- |
| `stable` | Attend `stableDelayHours`, puis applique avec une gigue déterministe sur `stableJitterHours` (déploiement étalé). |
| `beta`   | Vérifie toutes les `betaCheckIntervalHours` (par défaut : toutes les heures) et applique immédiatement.           |
| `dev`    | Pas d'application automatique. Utilisez `openclaw update` manuellement.                                           |

La passerelle enregistre également un indice de mise à jour au démarrage (désactivez avec `update.checkOnStart: false`).

## Après la mise à jour

<Steps>

### Exécuter le médecin (doctor)

```bash
openclaw doctor
```

Migration de la configuration, audit des stratégies DM et vérification de la santé de la passerelle. Détails : [Docteur](/en/gateway/doctor)

### Redémarrer la passerelle

```bash
openclaw gateway restart
```

### Vérifier

```bash
openclaw health
```

</Steps>

## Retour en arrière (Rollback)

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
- Pour `openclaw update --channel dev` sur les sources extraites, le programme de mise à jour amorce automatiquement `pnpm` si nécessaire. Si vous rencontrez une erreur d'amorçage pnpm/corepack, installez `pnpm` manuellement (ou réactivez `corepack`) et relancez la mise à jour.
- Vérifiez : [Dépannage](/en/gateway/troubleshooting)
- Demandez sur Discord : [https://discord.gg/clawd](https://discord.gg/clawd)

## Connexes

- [Vue d'ensemble de l'installation](/en/install) — toutes les méthodes d'installation
- [Docteur](/en/gateway/doctor) — vérifications de santé après les mises à jour
- [Migration](/en/install/migrating) — guides de migration pour les versions majeures
