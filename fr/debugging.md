---
summary: "Outils de débogage : mode watch, flux bruts du modèle, et traçage des fuites de raisonnement"
read_when:
  - Vous devez inspecter la sortie brute du modèle pour détecter des fuites de raisonnement
  - Vous souhaitez exécuter la Gateway en mode watch pendant les itérations
  - Vous avez besoin d'un workflow de débogage reproductible
title: "Débogage"
---

# Débogage

Cette page couvre les assistants de débogage pour la sortie en flux continu, en particulier lorsqu'un fournisseur mélange le raisonnement au texte normal.

## Remplacements de débogage à l'exécution

Utilisez `/debug` dans le chat pour définir des remplacements de configuration **uniquement à l'exécution** (en mémoire, pas sur disque).
`/debug` est désactivé par défaut ; activez-le avec `commands.debug: true`.
C'est pratique lorsque vous devez basculer des paramètres obscurs sans modifier `openclaw.json`.

Exemples :

```
/debug show
/debug set messages.responsePrefix="[openclaw]"
/debug unset messages.responsePrefix
/debug reset
```

`/debug reset` efface tous les remplacements et revient à la configuration sur disque.

## Mode watch de Gateway

Pour une itération rapide, exécutez la passerelle sous le surveillateur de fichiers :

```bash
pnpm gateway:watch --force
```

Cela correspond à :

```bash
tsx watch src/entry.ts gateway --force
```

Ajoutez tous les indicateurs CLI de la passerelle après `gateway:watch` et ils seront transmis
à chaque redémarrage.

## Profil dev + passerelle dev (--dev)

Utilisez le profil dev pour isoler l'état et lancer une configuration sûre et jetable pour
le débogage. Il y a **deux** indicateurs `--dev` :

- **Global `--dev` (profile) :** isole l'état sous `~/.openclaw-dev` et
  définit le port de la passerelle par défaut à `19001` (les ports dérivés se décalent avec lui).
- **`gateway --dev` :** indique à la Gateway de créer automatiquement une configuration par défaut +
  un espace de travail** lorsqu'ils sont manquants (et ignore BOOTSTRAP.md).

Flux recommandé (profil dev + amorçage dev) :

```bash
pnpm gateway:dev
OPENCLAW_PROFILE=dev openclaw tui
```

Si vous n'avez pas encore d'installation globale, exécutez la CLI via `pnpm openclaw ...`.

Ce que cela fait :

1. **Isolement de profil** (global `--dev`)
   - `OPENCLAW_PROFILE=dev`
   - `OPENCLAW_STATE_DIR=~/.openclaw-dev`
   - `OPENCLAW_CONFIG_PATH=~/.openclaw-dev/openclaw.json`
   - `OPENCLAW_GATEWAY_PORT=19001` (navigateur/canvas se décalent en conséquence)

2. **Amorçage dev** (`gateway --dev`)
   - Écrit une configuration minimale si elle est manquante (`gateway.mode=local`, liaison loopback).
   - Définit `agent.workspace` à l'espace de travail dev.
   - Définit `agent.skipBootstrap=true` (pas de BOOTSTRAP.md).
   - Génère les fichiers de l'espace de travail s'ils sont manquants:
     `AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`.
   - Identité par défaut : **C3‑PO** (droïde de protocole).
   - Ignore les fournisseurs de channel en mode dev (`OPENCLAW_SKIP_CHANNELS=1`).

Réinitialiser le flux (nouveau départ) :

```bash
pnpm gateway:dev:reset
```

Remarque : `--dev` est un indicateur de profil **global** et est consommé par certains lanceurs.
Si vous devez l'épeler, utilisez la forme de variable d'environnement :

```bash
OPENCLAW_PROFILE=dev openclaw gateway --dev --reset
```

`--reset` efface la configuration, les identifiants, les sessions et l'espace de travail de développement (en utilisant
`trash`, et non `rm`), puis recrée la configuration de développement par défaut.

Astuce : si une passerelle non-dev est déjà en cours d'exécution (launchd/systemd), arrêtez-la d'abord :

```bash
openclaw gateway stop
```

## Journalisation du flux brut (OpenClaw)

OpenClaw peut journaliser le **flux brut de l'assistant** avant tout filtrage/formatage.
C'est le meilleur moyen de voir si le raisonnement arrive sous forme de deltas de texte brut
(ou sous forme de blocs de réflexion distincts).

Activez-le via CLI :

```bash
pnpm gateway:watch --force --raw-stream
```

Remplacement de chemin facultatif :

```bash
pnpm gateway:watch --force --raw-stream --raw-stream-path ~/.openclaw/logs/raw-stream.jsonl
```

Variables d'environnement équivalentes :

```bash
OPENCLAW_RAW_STREAM=1
OPENCLAW_RAW_STREAM_PATH=~/.openclaw/logs/raw-stream.jsonl
```

Fichier par défaut :

`~/.openclaw/logs/raw-stream.jsonl`

## Journalisation des chunks bruts (pi-mono)

Pour capturer les **chunks bruts compatibles OpenAI** avant qu'ils ne soient analysés en blocs,
pi-mono expose un enregistreur séparé :

```bash
PI_RAW_STREAM=1
```

Chemin facultatif :

```bash
PI_RAW_STREAM_PATH=~/.pi-mono/logs/raw-openai-completions.jsonl
```

Fichier par défaut :

`~/.pi-mono/logs/raw-openai-completions.jsonl`

> Remarque : cela n'est émis que par les processus utilisant le
> fournisseur `openai-completions` de pi-mono.

## Notes de sécurité

- Les journaux de flux bruts peuvent inclure des invites complètes, des sorties d'outils et des données utilisateur.
- Gardez les journaux en local et supprimez-les après le débogage.
- Si vous partagez des journaux, nettoyez d'abord les secrets et les données personnelles.

import en from "/components/footer/en.mdx";

<en />
