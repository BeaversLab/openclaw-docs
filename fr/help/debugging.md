---
summary: "Outils de débogage : mode surveillance, flux bruts du modèle et traçage des fuites de raisonnement"
read_when:
  - Vous devez inspecter la sortie brute du modèle pour détecter des fuites de raisonnement
  - Vous souhaitez exécuter le Gateway en mode surveillance lors de l'itération
  - Vous avez besoin d'un flux de travail de débogage reproductible
title: "Débogage"
---

# Débogage

Cette page couvre les aides au débogage pour la sortie en flux continu, particulièrement lorsqu'un fournisseur mélange le raisonnement au texte normal.

## Remplacements de configuration de débogage à l'exécution

Utilisez `/debug` dans le chat pour définir des remplacements de configuration **uniquement à l'exécution** (en mémoire, pas sur le disque).
`/debug` est désactivé par défaut ; activez-le avec `commands.debug: true`.
C'est utile lorsque vous devez basculer des paramètres obscurs sans modifier `openclaw.json`.

Exemples :

```
/debug show
/debug set messages.responsePrefix="[openclaw]"
/debug unset messages.responsePrefix
/debug reset
```

`/debug reset` efface tous les remplacements et revient à la configuration sur disque.

## Mode surveillance du Gateway

Pour une itération rapide, exécutez la passerelle sous le surveillant de fichiers :

```bash
pnpm gateway:watch
```

Cela correspond à :

```bash
node scripts/watch-node.mjs gateway --force
```

Le surveillant redémarre lors de modifications de fichiers pertinents pour la construction sous `src/`, les fichiers source des extensions,
les métadonnées `package.json` et `openclaw.plugin.json` des extensions, `tsconfig.json`,
`package.json`, et `tsdown.config.ts`. Les modifications des métadonnées d'extension redémarrent la
passerelle sans forcer une reconstruction `tsdown` ; les modifications de source et de configuration reconstruisent
toujours `dist` d'abord.

Ajoutez tous les indicateurs CLI de la passerelle après `gateway:watch` et ils seront transmis à chaque
redémarrage.

## Profil dev + passerelle dev (--dev)

Utilisez le profil dev pour isoler l'état et lancer une configuration sûre et jetable pour
le débogage. Il y a **deux** indicateurs `--dev` :

- **`--dev` global (profil) :** isole l'état sous `~/.openclaw-dev` et
  définit par défaut le port de la passerelle à `19001` (les ports dérivés se décalent avec lui).
- **`gateway --dev` :** indique au Gateway de créer automatiquement une configuration par défaut +
  un espace de travail\*\* en cas d'absence (et ignore BOOTSTRAP.md).

Flux recommandé (profil dev + amorçage dev) :

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

2. **Amorçage de développement** (`gateway --dev`)
   - Écrit une configuration minimale si elle est manquante (`gateway.mode=local`, liaison de boucle locale).
   - Définit `agent.workspace` sur l'espace de travail de développement.
   - Définit `agent.skipBootstrap=true` (pas de BOOTSTRAP.md).
   - Génère les fichiers de l'espace de travail s'ils sont manquants :
     `AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`.
   - Identité par défaut : **C3‑PO** (droïde de protocole).
   - Ignore les fournisseurs de canal en mode développement (`OPENCLAW_SKIP_CHANNELS=1`).

Flux de réinitialisation (nouveau départ) :

```bash
pnpm gateway:dev:reset
```

Remarque : `--dev` est un indicateur de profil **global** et est consommé par certains lanceurs.
Si vous devez l'écrire explicitement, utilisez le format de variable d'environnement :

```bash
OPENCLAW_PROFILE=dev openclaw gateway --dev --reset
```

`--reset` efface la configuration, les identifiants, les sessions et l'espace de travail de développement (en utilisant
`trash`, et non `rm`), puis recrée la configuration de développement par défaut.

Astuce : si une passerelle non-développement est déjà en cours d'exécution (launchd/systemd), arrêtez-la d'abord :

```bash
openclaw gateway stop
```

## Journalisation du flux brut (OpenClaw)

OpenClaw peut journaliser le **flux brut de l'assistant** avant tout filtrage/formatage.
C'est le meilleur moyen de voir si le raisonnement arrive sous forme de deltas de texte brut
(ou sous forme de blocs de pensée distincts).

Activez-le via CLI :

```bash
pnpm gateway:watch --raw-stream
```

Remplacement de chemin facultatif :

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

Pour capturer les **chunks bruts compatibles OpenAI** avant qu'ils ne soient analysés en blocs,
pi-mono expose un journaliseur distinct :

```bash
PI_RAW_STREAM=1
```

Chemin facultatif :

```bash
PI_RAW_STREAM_PATH=~/.pi-mono/logs/raw-openai-completions.jsonl
```

Fichier par défaut :

`~/.pi-mono/logs/raw-openai-completions.jsonl`

> Remarque : cela n'est émis que par les processus utilisant le fournisseur
> `openai-completions` de pi-mono.

## Notes de sécurité

- Les journaux de flux bruts peuvent inclure des invites complètes, des sorties d'outils et des données utilisateur.
- Gardez les journaux en local et supprimez-les après le débogage.
- Si vous partagez des journaux, nettoyez d'abord les secrets et les données personnelles.

import fr from "/components/footer/fr.mdx";

<fr />
