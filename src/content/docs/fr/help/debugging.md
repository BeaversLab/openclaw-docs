---
summary: "Outils de débogage : mode watch, flux bruts du modèle, et traçage des fuites de raisonnement"
read_when:
  - You need to inspect raw model output for reasoning leakage
  - You want to run the Gateway in watch mode while iterating
  - You need a repeatable debugging workflow
title: "Débogage"
---

# Débogage

Cette page couvre les aides au débogage pour la sortie en flux, en particulier lorsqu'un fournisseur mélange du raisonnement dans du texte normal.

## Remplacements de configuration de débogage à l'exécution

Utilisez `/debug` dans le chat pour définir des substitutions de configuration **uniquement lors de l'exécution** (en mémoire, pas sur le disque).
`/debug` est désactivé par défaut ; activez-le avec `commands.debug: true`.
C'est pratique lorsque vous devez basculer des paramètres obscurs sans modifier `openclaw.json`.

Exemples :

```
/debug show
/debug set messages.responsePrefix="[openclaw]"
/debug unset messages.responsePrefix
/debug reset
```

`/debug reset` efface toutes les substitutions et retourne à la configuration sur disque.

## Sortie du traçage de session

Utilisez `/trace` lorsque vous souhaitez voir les lignes de traçage/débogage détenues par des plugins dans une session
sans activer le mode complet de verbosité.

Exemples :

```text
/trace
/trace on
/trace off
```

Utilisez `/trace` pour les diagnostics de plugin tels que les résumés de débogage de la Mémoire Active.
Continuez à utiliser `/verbose` pour la sortie verbuse normale des outils/statuts, et continuez à utiliser
`/debug` pour les substitutions de configuration uniquement lors de l'exécution.

## Mode watch du Gateway

Pour une itération rapide, exécutez la passerelle sous le surveillanceur de fichiers :

```bash
pnpm gateway:watch
```

Cela correspond à :

```bash
node scripts/watch-node.mjs gateway --force
```

Le surveillanceur redémarre sur les fichiers pertinents pour la construction sous `src/`, les fichiers source des extensions,
les métadonnées `package.json` et `openclaw.plugin.json` des extensions, `tsconfig.json`,
`package.json`, et `tsdown.config.ts`. Les modifications des métadonnées des extensions redémarrent la
passerelle sans forcer une reconstruction `tsdown` ; les modifications de source et de configuration reconstruisent toujours
d'abord `dist`.

Ajoutez tous les indicateurs CLI de la passerelle après `gateway:watch` et ils seront transmis à chaque
redémarrage. La réexécution de la même commande watch pour le même ensemble de dépôt/indicateurs remplace
maintenant l'ancien surveillanceur au lieu de laisser des parents de surveillance en double.

## Profil dev + passerelle dev (--dev)

Utilisez le profil dev pour isoler l'état et lancer une configuration sûre et éphémère pour
le débogage. Il y a **deux** indicateurs `--dev` :

- **Global `--dev` (profile) :** isole l'état sous `~/.openclaw-dev` et
  définit le port de la passerelle par défaut à `19001` (les ports dérivés se décalent avec lui).
- **`gateway --dev` : indique à la Gateway de créer automatiquement une config par défaut +
  un workspace** lorsqu'ils sont manquants (et ignore BOOTSTRAP.md).

Flux recommandé (dev profile + dev bootstrap) :

```bash
pnpm gateway:dev
OPENCLAW_PROFILE=dev openclaw tui
```

Si vous n'avez pas encore d'installation globale, exécutez la CLI via `pnpm openclaw ...`.

Ce que cela fait :

1. **Isolement du profil** (global `--dev`)
   - `OPENCLAW_PROFILE=dev`
   - `OPENCLAW_STATE_DIR=~/.openclaw-dev`
   - `OPENCLAW_CONFIG_PATH=~/.openclaw-dev/openclaw.json`
   - `OPENCLAW_GATEWAY_PORT=19001` (le navigateur/canvas se décale en conséquence)

2. **Dev bootstrap** (`gateway --dev`)
   - Écrit une configuration minimale si manquante (`gateway.mode=local`, bind loopback).
   - Définit `agent.workspace` sur le workspace de dev.
   - Définit `agent.skipBootstrap=true` (pas de BOOTSTRAP.md).
   - Initialise les fichiers du workspace s'ils sont manquants :
     `AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`.
   - Identité par défaut : **C3‑PO** (droïde de protocole).
   - Ignore les fournisseurs de channel en mode dev (`OPENCLAW_SKIP_CHANNELS=1`).

Flux de réinitialisation (nouveau départ) :

```bash
pnpm gateway:dev:reset
```

Remarque : `--dev` est un indicateur de profil **global** qui est consommé par certains lanceurs.
Si vous devez l'écrire explicitement, utilisez le formulaire de variable d'environnement :

```bash
OPENCLAW_PROFILE=dev openclaw gateway --dev --reset
```

`--reset` efface la configuration, les identifiants, les sessions et le workspace de dev (en utilisant
`trash`, pas `rm`), puis recrée la configuration de dev par défaut.

Astuce : si une passerelle non-dev est déjà en cours d'exécution (launchd/systemd), arrêtez-la d'abord :

```bash
openclaw gateway stop
```

## Journalisation du flux brut (OpenClaw)

OpenClaw peut enregistrer le **flux brut de l'assistant** avant tout filtrage/formatage.
C'est le meilleur moyen de voir si le raisonnement arrive sous forme de deltas de texte brut
(ou sous forme de blocs de réflexion séparés).

Activez-le via la CLI :

```bash
pnpm gateway:watch --raw-stream
```

Remplacement facultatif du chemin :

```bash
pnpm gateway:watch --raw-stream --raw-stream-path ~/.openclaw/logs/raw-stream.jsonl
```

Variables d'environnement équivalentes :

```bash
OPENCLAW_RAW_STREAM=1
OPENCLAW_RAW_STREAM_PATH=~/.openclaw/logs/raw-stream.jsonl
```

Fichier par défaut :

`~/.openclaw/logs/raw-stream.jsonl`

## Journalisation des chunks bruts (pi-mono)

Pour capturer les chunks bruts compatibles OpenAI avant qu'ils ne soient analysés en blocs,
pi-mono expose un enregistreur séparé :

```bash
PI_RAW_STREAM=1
```

Chemin optionnel :

```bash
PI_RAW_STREAM_PATH=~/.pi-mono/logs/raw-openai-completions.jsonl
```

Fichier par défaut :

`~/.pi-mono/logs/raw-openai-completions.jsonl`

> Remarque : ceci n'est émis que par les processus utilisant le
> provider `openai-completions` de pi-mono.

## Notes de sécurité

- Les journaux de flux bruts peuvent inclure des invites complètes, la sortie des outils et les données utilisateur.
- Gardez les journaux en local et supprimez-les après le débogage.
- Si vous partagez des journaux, nettoyez d'abord les secrets et les données personnelles.
