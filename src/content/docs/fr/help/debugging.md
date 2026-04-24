---
summary: "Outils de débogage : mode watch, flux bruts du modèle et traçage des fuites de raisonnement"
read_when:
  - You need to inspect raw model output for reasoning leakage
  - You want to run the Gateway in watch mode while iterating
  - You need a repeatable debugging workflow
title: "Débogage"
---

# Débogage

Cette page couvre les aides au débogage pour la sortie en flux, en particulier lorsqu'un fournisseur mélange du raisonnement dans du texte normal.

## Remplacements de configuration de débogage à l'exécution

Utilisez `/debug` dans le chat pour définir des remplacements de configuration **uniquement à l'exécution** (en mémoire, pas sur le disque).
`/debug` est désactivé par défaut ; activez-le avec `commands.debug: true`.
C'est pratique lorsque vous devez activer des paramètres obscurs sans modifier `openclaw.json`.

Exemples :

```
/debug show
/debug set messages.responsePrefix="[openclaw]"
/debug unset messages.responsePrefix
/debug reset
```

`/debug reset` efface tous les remplacements et retourne à la configuration sur le disque.

## Sortie du traçage de session

Utilisez `/trace` lorsque vous souhaitez voir les lignes de trace/débogage appartenant aux plugins dans une session
sans activer le mode complet de verbosité.

Exemples :

```text
/trace
/trace on
/trace off
```

Utilisez `/trace` pour les diagnostics de plugins tels que les résumés de débogage de la Mémoire Active.
Continuez à utiliser `/verbose` pour la sortie de verbosité normale/d'outil, et continuez à utiliser
`/debug` pour les remplacements de configuration uniquement à l'exécution.

## Minutage de débogage temporaire CLI

OpenClaw conserve `src/cli/debug-timing.ts` comme un petit assistant pour l'enquête
locale. Il n'est intentionnellement pas connecté au démarrage de la CLI, au routage des commandes,
ou à une commande par défaut. Utilisez-le uniquement lors du débogage d'une commande lente, puis
supprimez l'importation et les intervalles avant de valider le changement de comportement.

Utilisez ceci lorsqu'une commande est lente et que vous avez besoin d'une répartition rapide des phases avant
décider d'utiliser un profileur CPU ou de corriger un sous-système spécifique.

### Ajouter des intervalles temporaires

Ajoutez l'assistant près du code que vous investigatez. Par exemple, lors du débogage
de `openclaw models list`, un correctif temporaire dans
`src/commands/models/list.list-command.ts` pourrait ressembler à ceci :

```ts
// Temporary debugging only. Remove before landing.
import { createCliDebugTiming } from "../../cli/debug-timing.js";

const timing = createCliDebugTiming({ command: "models list" });

const authStore = timing.time("debug:models:list:auth_store", () => ensureAuthProfileStore());

const loaded = await timing.timeAsync(
  "debug:models:list:registry",
  () => loadListModelRegistry(cfg, { sourceConfig }),
  (result) => ({
    models: result.models.length,
    discoveredKeys: result.discoveredKeys.size,
  }),
);
```

Directives :

- Préfixez les noms de phases temporaires avec `debug:`.
- Ajoutez seulement quelques intervalles autour des sections lentes suspectées.
- Préférez des phases larges telles que `registry`, `auth_store` ou `rows` aux noms
  d'assistants.
- Utilisez `time()` pour le travail synchrone et `timeAsync()` pour les promesses.
- Gardez stdout propre. L'assistant écrit sur stderr, donc la sortie JSON de la commande reste
  analysable.
- Supprimez les importations et les intervalles temporaires avant d'ouvrir la PR de correction finale.
- Incluez la sortie de chronométrage ou un bref résumé dans le ticket ou la PR qui explique
  l'optimisation.

### Exécuter avec une sortie lisible

Le mode lisible est idéal pour le débogage en direct :

```bash
OPENCLAW_DEBUG_TIMING=1 pnpm openclaw models list --all --provider moonshot
```

Exemple de sortie d'une enquête `models list` temporaire :

```text
OpenClaw CLI debug timing: models list
     0ms     +0ms start all=true json=false local=false plain=false provider="moonshot"
     2ms     +2ms debug:models:list:import_runtime duration=2ms
    17ms    +14ms debug:models:list:load_config duration=14ms sourceConfig=true
  20.3s  +20.3s debug:models:list:auth_store duration=20.3s
  20.3s     +0ms debug:models:list:resolve_agent_dir duration=0ms agentDir=true
  20.3s     +0ms debug:models:list:resolve_provider_filter duration=0ms
  25.3s   +5.0s debug:models:list:ensure_models_json duration=5.0s
  31.2s   +5.9s debug:models:list:load_model_registry duration=5.9s models=869 availableKeys=38 discoveredKeys=868 availabilityError=false
  31.2s     +0ms debug:models:list:resolve_configured_entries duration=0ms entries=1
  31.2s     +0ms debug:models:list:build_configured_lookup duration=0ms entries=1
  33.6s   +2.4s debug:models:list:read_registry_models duration=2.4s models=871
  35.2s   +1.5s debug:models:list:append_discovered_rows duration=1.5s seenKeys=0 rows=0
  36.9s   +1.7s debug:models:list:append_catalog_supplement_rows duration=1.7s seenKeys=5 rows=5

Model                                      Input       Ctx   Local Auth  Tags
moonshot/kimi-k2-thinking                  text        256k  no    no
moonshot/kimi-k2-thinking-turbo            text        256k  no    no
moonshot/kimi-k2-turbo                     text        250k  no    no
moonshot/kimi-k2.5                         text+image  256k  no    no
moonshot/kimi-k2.6                         text+image  256k  no    no

  36.9s     +0ms debug:models:list:print_model_table duration=0ms rows=5
  36.9s     +0ms complete rows=5
```

Résultats de cette sortie :

| Phase                                    |          Temps | Signification                                                                                                                      |
| ---------------------------------------- | -------------: | ---------------------------------------------------------------------------------------------------------------------------------- |
| `debug:models:list:auth_store`           |         20,3 s | Le chargement du magasin de profils d'authentification est le coût le plus important et doit être étudié en premier.               |
| `debug:models:list:ensure_models_json`   |          5,0 s | La synchronisation de `models.json` est suffisamment coûteuse pour être inspectée pour la mise en cache ou les conditions de saut. |
| `debug:models:list:load_model_registry`  |          5,9 s | La construction du registre et les travaux de disponibilité du provider sont également des coûts significatifs.                    |
| `debug:models:list:read_registry_models` |          2,4 s | Lire tous les modèles du registre n'est pas gratuit et peut avoir de l'importance pour `--all`.                                    |
| phases d'ajout de lignes                 | 3,2 s au total | Construire cinq lignes affichées prend encore plusieurs secondes, le chemin de filtrage mérite donc un examen plus approfondi.     |
| `debug:models:list:print_model_table`    |           0 ms | Le rendu n'est pas le goulot d'étranglement.                                                                                       |

Ces résultats suffisent à guider le prochain correctif sans conserver le code de chronométrage dans
les chemins de production.

### Exécuter avec une sortie JSON

Utilisez le mode JSON lorsque vous souhaitez enregistrer ou comparer les données de chronométrage :

```bash
OPENCLAW_DEBUG_TIMING=json pnpm openclaw models list --all --provider moonshot \
  2> .artifacts/models-list-timing.jsonl
```

Chaque ligne stderr est un objet JSON :

```json
{
  "command": "models list",
  "phase": "debug:models:list:registry",
  "elapsedMs": 31200,
  "deltaMs": 5900,
  "durationMs": 5900,
  "models": 869,
  "discoveredKeys": 868
}
```

### Nettoyer avant l'intégration

Avant d'ouvrir la PR finale :

```bash
rg 'createCliDebugTiming|debug:[a-z0-9_-]+:' src/commands src/cli \
  --glob '!src/cli/debug-timing.*' \
  --glob '!*.test.ts'
```

La commande ne doit renvoyer aucun site d'appel d'instrumentation temporaire, sauf si la PR
ajoute explicitement une surface de diagnostic permanente. Pour les correctifs de performance
normaux, ne gardez que le changement de comportement, les tests et une courte note avec les preuves
de chronométrage.

Pour les points chauds CPU plus profonds, utilisez le profilage Node (`--cpu-prof`) ou un profileur
externe au lieu d'ajouter davantage de wrappers de chronométrage.

## Mode surveillance Gateway

Pour une itération rapide, exécutez la passerelle sous le surveillant de fichiers :

```bash
pnpm gateway:watch
```

Cela correspond à :

```bash
node scripts/watch-node.mjs gateway --force
```

Le surveillant redémarre sur les fichiers pertinents pour la construction sous `src/`, les fichiers source des
extensions, les métadonnées d'extension `package.json` et `openclaw.plugin.json`, `tsconfig.json`,
`package.json`, et `tsdown.config.ts`. Les modifications des métadonnées d'extension redémarrent la
passerelle sans forcer une reconstruction `tsdown` ; les modifications de source et de configuration reconstruisent
toujours `dist` d'abord.

Ajoutez tous les indicateurs CLI du Gateway après `gateway:watch` et ils seront transmis à chaque redémarrage. La réexécution de la même commande de surveillance pour le même dépôt/ensemble d'indicateurs remplace désormais l'ancien observateur au lieu de laisser des parents d'observateur en double derrière.

## Profil dev + gateway dev (--dev)

Utilisez le profil dev pour isoler l'état et démarrer une configuration sûre et éphémère pour le débogage. Il y a **deux** indicateurs `--dev` :

- **`--dev` global (profile) :** isole l'état sous `~/.openclaw-dev` et définit le port du Gateway par défaut à `19001` (les ports dérivés se décalent avec lui).
- **`gateway --dev` : indique au Gateway de créer automatiquement une configuration par défaut + un espace de travail** en cas d'absence (et ignore BOOTSTRAP.md).

Flux recommandé (dev profile + dev bootstrap) :

```bash
pnpm gateway:dev
OPENCLAW_PROFILE=dev openclaw tui
```

Si vous n'avez pas encore d'installation globale, exécutez la CLI via `pnpm openclaw ...`.

Ce que cela fait :

1. **Isolement du profil** (`--dev` global)
   - `OPENCLAW_PROFILE=dev`
   - `OPENCLAW_STATE_DIR=~/.openclaw-dev`
   - `OPENCLAW_CONFIG_PATH=~/.openclaw-dev/openclaw.json`
   - `OPENCLAW_GATEWAY_PORT=19001` (le navigateur/canvas se décale en conséquence)

2. **Dev bootstrap** (`gateway --dev`)
   - Écrit une configuration minimale si elle est manquante (`gateway.mode=local`, bouclage de liaison).
   - Définit `agent.workspace` sur l'espace de travail dev.
   - Définit `agent.skipBootstrap=true` (pas de BOOTSTRAP.md).
   - Génère les fichiers de l'espace de travail s'ils sont manquants :
     `AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`.
   - Identité par défaut : **C3‑PO** (droïde de protocole).
   - Ignore les fournisseurs de channel en mode dev (`OPENCLAW_SKIP_CHANNELS=1`).

Flux de réinitialisation (nouveau départ) :

```bash
pnpm gateway:dev:reset
```

Remarque : `--dev` est un indicateur de profil **global** et est consommé par certains lanceurs. Si vous devez l'épeler explicitement, utilisez le formulaire de variable d'environnement :

```bash
OPENCLAW_PROFILE=dev openclaw gateway --dev --reset
```

`--reset` efface la configuration, les informations d'identification, les sessions et l'espace de travail dev (en utilisant `trash`, et non `rm`), puis recrée la configuration dev par défaut.

Astuce : si un Gateway non-dev est déjà en cours d'exécution (launchd/systemd), arrêtez-le d'abord :

```bash
openclaw gateway stop
```

## Journalisation du flux brut (OpenClaw)

OpenClaw peut journaliser le **flux brut de l'assistant** avant tout filtrage ou formatage.
C'est le meilleur moyen de vérifier si le raisonnement arrive sous forme de deltas de texte brut
(ou sous forme de blocs de pensée distincts).

Activez-le via CLI :

```bash
pnpm gateway:watch --raw-stream
```

Option de substitution de chemin :

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

Chemin optionnel :

```bash
PI_RAW_STREAM_PATH=~/.pi-mono/logs/raw-openai-completions.jsonl
```

Fichier par défaut :

`~/.pi-mono/logs/raw-openai-completions.jsonl`

> Remarque : cela n'est émis que par les processus utilisant le
> fournisseur `openai-completions` de pi-mono.

## Notes de sécurité

- Les journaux de flux bruts peuvent inclure des invites complètes, des sorties d'outils et des données utilisateur.
- Conservez les journaux localement et supprimez-les après le débogage.
- Si vous partagez des journaux, nettoyez d'abord les secrets et les données personnelles.
