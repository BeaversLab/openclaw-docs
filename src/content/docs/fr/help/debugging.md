---
summary: "Outils de débogage : mode watch, flux bruts du model, et suivi des fuites de raisonnement"
read_when:
  - You need to inspect raw model output for reasoning leakage
  - You want to run the Gateway in watch mode while iterating
  - You need a repeatable debugging workflow
title: "Débogage"
---

Outils de débogage pour la sortie en continu, en particulier lorsqu'un fournisseur mélange le raisonnement au texte normal.

## Remplacements de configuration de débogage à l'exécution

Utilisez `/debug` dans le chat pour définir des remplacements de configuration **uniquement lors de l'exécution** (en mémoire, pas sur disque).
`/debug` est désactivé par défaut ; activez-le avec `commands.debug: true`.
Ceci est pratique lorsque vous devez basculer des paramètres obscurs sans modifier `openclaw.json`.

Exemples :

```
/debug show
/debug set messages.responsePrefix="[openclaw]"
/debug unset messages.responsePrefix
/debug reset
```

`/debug reset` efface tous les remplacements et retourne à la configuration sur disque.

## Sortie de trace de session

Utilisez `/trace` lorsque vous souhaitez voir les lignes de trace/débogage détenues par des plugins dans une session
sans activer le mode verbeux complet.

Exemples :

```text
/trace
/trace on
/trace off
```

Utilisez `/trace` pour les diagnostics de plugins tels que les résumés de débogage de la Mémoire Active.
Continuez à utiliser `/verbose` pour la sortie normale verbeuse status/tool, et continuez à utiliser
`/debug` pour les remplacements de configuration uniquement lors de l'exécution.

## Trace du cycle de vie du plugin

Utilisez `OPENCLAW_PLUGIN_LIFECYCLE_TRACE=1` lorsque les commandes du cycle de vie des plugins semblent lentes
et que vous avez besoin d'une décomposition de phase intégrée pour les métadonnées du plugin, la découverte, le registre,
le miroir d'exécution, la mutation de configuration et le travail de rafraîchissement. La trace est optionnelle et écrit
sur stderr, donc la sortie des commandes JSON reste analysable.

Exemple :

```bash
OPENCLAW_PLUGIN_LIFECYCLE_TRACE=1 openclaw plugins install tokenjuice --force
```

Exemple de sortie :

```text
[plugins:lifecycle] phase="config read" ms=6.83 status=ok command="install"
[plugins:lifecycle] phase="slot selection" ms=94.31 status=ok command="install" pluginId="tokenjuice"
[plugins:lifecycle] phase="registry refresh" ms=51.56 status=ok command="install" reason="source-changed"
```

Utilisez ceci pour l'enquête du cycle de vie des plugins avant de passer à un profileur CPU.
Si la commande s'exécute à partir d'une extraction des sources, préférez mesurer l'exécution
construite avec `node dist/entry.js ...` après `pnpm build` ; `pnpm openclaw ...`
mesure également la surcharge du source-runner.

## Profilage du démarrage et des commandes CLI

Utilisez le benchmark de démarrage intégré lorsqu'une commande semble lente :

```bash
pnpm test:startup:bench:smoke
pnpm tsx scripts/bench-cli-startup.ts --preset real --case status --runs 3
pnpm tsx scripts/bench-cli-startup.ts --preset real --cpu-prof-dir .artifacts/cli-cpu
```

Pour un profilage ponctuel via le source runner normal, définissez
`OPENCLAW_RUN_NODE_CPU_PROF_DIR` :

```bash
OPENCLAW_RUN_NODE_CPU_PROF_DIR=.artifacts/cli-cpu pnpm openclaw status
```

Le source runner ajoute les indicateurs de profilage CPU de Node et écrit un `.cpuprofile` pour la
commande. Utilisez ceci avant d'ajouter une instrumentation temporaire au code de la commande.

Pour les blocages au démarrage qui ressemblent à un travail de système de fichiers synchrone ou de chargeur de modules,
ajoutez l'indicateur de trace I/O synchrone de Node via le source runner :

```bash
OPENCLAW_TRACE_SYNC_IO=1 pnpm openclaw gateway --force
```

`pnpm gateway:watch` désactive ce drapeau par défaut pour le processus fils Gateway surveillé. Définissez `OPENCLAW_TRACE_SYNC_IO=1` lorsque vous souhaitez explicitement la sortie de trace des E/S synchrones Node en mode de surveillance.

## Mode de surveillance Gateway

Pour une itération rapide, lancez la passerelle sous le surveillant de fichiers :

```bash
pnpm gateway:watch
```

Par défaut, cela lance ou redémarre une session tmux nommée
`openclaw-gateway-watch-main` (ou une variante spécifique au profil/port telle que
`openclaw-gateway-watch-dev-19001`) et s'attache automatiquement depuis les terminaux interactifs.
Les shells non interactifs, l'intégration continue et les appels d'exécution d'agent restent détachés et impriment les instructions d'attachement à la place.
Attachez manuellement si nécessaire :

```bash
tmux attach -t openclaw-gateway-watch-main
```

Le volet tmux exécute le surveillant brut :

```bash
node scripts/watch-node.mjs gateway --force
```

Utilisez le mode de premier plan lorsque vous ne voulez pas de tmux :

```bash
pnpm gateway:watch:raw
# or
OPENCLAW_GATEWAY_WATCH_TMUX=0 pnpm gateway:watch
```

Désactivez l'attachement automatique tout en maintenant la gestion tmux :

```bash
OPENCLAW_GATEWAY_WATCH_ATTACH=0 pnpm gateway:watch
```

Profiliez le temps CPU du Gateway surveillé lors du débogage des points chauds de démarrage/exécution :

```bash
pnpm gateway:watch --benchmark
```

L'enveloppe de surveillance consomme `--benchmark` avant d'invoquer le Gateway et écrit
un V8 `.cpuprofile` par sortie du fils du Gateway sous
`.artifacts/gateway-watch-profiles/`. Arrêtez ou redémarrez la passerelle surveillée pour
vider le profil actuel, puis ouvrez-le avec Chrome DevTools ou Speedscope :

```bash
npx speedscope .artifacts/gateway-watch-profiles/*.cpuprofile
```

Utilisez `--benchmark-dir <path>` lorsque vous voulez les profils ailleurs.
Utilisez `--benchmark-no-force` lorsque vous voulez que le fils soumis aux tests ignore le
nettoyage du port par défaut `--force` et échoue rapidement si le port du Gateway est déjà
utilisé.
Le mode benchmark supprime par défaut le spam de trace synchrone I/O. Définissez
`OPENCLAW_TRACE_SYNC_IO=1` avec `--benchmark` lorsque vous souhaitez explicitement les deux profils
CPU et les traces de pile des E/S synchrones Node. En mode benchmark, ces blocs de trace
sont écrits dans `gateway-watch-output.log` sous le répertoire benchmark et
filtrés du volet de terminal ; les journaux normaux du Gateway restent visibles.

Le wrapper tmux transporte les sélecteurs d'exécution courants non secrets tels que
`OPENCLAW_PROFILE`, `OPENCLAW_CONFIG_PATH`, `OPENCLAW_STATE_DIR`,
`OPENCLAW_GATEWAY_PORT` et `OPENCLAW_SKIP_CHANNELS`Gateway dans le volet. Placez
les identifiants du provider dans votre profil/config normal, ou utilisez le mode
brut de premier plan pour des secrets éphémères ponctuels.
Si le Gateway surveillé quitte pendant le démarrage, l'observateur exécute
`openclaw doctor --fix --non-interactive`Gateway une fois et redémarre le processus enfant Gateway.
Utilisez `OPENCLAW_GATEWAY_WATCH_AUTO_DOCTOR=0`Gateway lorsque vous souhaitez l'échec de démarrage
original sans la tentative de réparation spécifique au dev.
Le volet tmux géré utilise par défaut des journaux Gateway colorés pour la lisibilité ;
définissez `FORCE_COLOR=0` lors du démarrage de `pnpm gateway:watch` pour désactiver la sortie ANSI.

L'observateur redémarre sur les fichiers pertinents pour la construction sous `src/`, les fichiers sources de l'extension,
les métadonnées `package.json` et `openclaw.plugin.json` de l'extension, `tsconfig.json`,
`package.json` et `tsdown.config.ts`. Les modifications des métadonnées de l'extension redémarrent
la passerelle sans forcer une reconstruction `tsdown` ; les modifications de la source et de la configuration reconstruisent
toujours `dist` d'abord.

Ajoutez tous les indicateurs CLI du gateway après CLI`gateway:watch` et ils seront transmis à chaque
redémarrage. La réexécution de la même commande de surveillance régénère le volet tmux nommé, et
l'observateur brut conserve son verrou d'observateur unique, de sorte que les parents observateurs en double
sont remplacés au lieu de s'accumuler.

## Profil de dev + gateway de dev (--dev)

Utilisez le profil de dev pour isoler l'état et lancer une configuration sûre et jetable pour
le débogage. Il y a **deux** indicateurs `--dev` :

- **`--dev` global (profil) :** isole l'état sous `~/.openclaw-dev` et
  définit le port du gateway par défaut sur `19001` (les ports dérivés se décalent avec lui).
- **`gateway --dev`Gateway : indique au Gateway de créer automatiquement une config par défaut +
  un espace de travail** en cas d'absence (et ignore BOOTSTRAP.md).

Flux recommandé (profil de dev + amorçage dev) :

```bash
pnpm gateway:dev
OPENCLAW_PROFILE=dev openclaw tui
```

Si vous n'avez pas encore d'installation globale, exécutez la CLI via `pnpm openclaw ...`.

Ce que cela fait :

1. **Isolation du profil** (`--dev` global)
   - `OPENCLAW_PROFILE=dev`
   - `OPENCLAW_STATE_DIR=~/.openclaw-dev`
   - `OPENCLAW_CONFIG_PATH=~/.openclaw-dev/openclaw.json`
   - `OPENCLAW_GATEWAY_PORT=19001` (le navigateur/canvas se décale en conséquence)

2. **Amorçage de dev** (`gateway --dev`)
   - Écrit une configuration minimale si manquante (`gateway.mode=local`, liaison loopback).
   - Définit `agent.workspace` sur l'espace de travail dev.
   - Définit `agent.skipBootstrap=true` (pas de BOOTSTRAP.md).
   - Initialise les fichiers de l'espace de travail s'ils sont manquants :
     `AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`.
   - Identité par défaut : **C3-PO** (droïde de protocole).
   - Ignore les fournisseurs de channel en mode dev (`OPENCLAW_SKIP_CHANNELS=1`).

Réinitialisation du flux (nouveau départ) :

```bash
pnpm gateway:dev:reset
```

<Note>
`--dev` est un indicateur de profil **global** et est consommé par certains lanceurs. Si vous devez l'épeler explicitement, utilisez le formulaire de variable d'environnement :

```bash
OPENCLAW_PROFILE=dev openclaw gateway --dev --reset
```

</Note>

`--reset` efface la configuration, les informations d'identification, les sessions et l'espace de travail dev (en utilisant
`trash`, et non `rm`), puis recrée la configuration dev par défaut.

<Tip>
Si une passerelle non-dev est déjà en cours d'exécution (launchd ou systemd), arrêtez-la d'abord :

```bash
openclaw gateway stop
```

</Tip>

## Journalisation du flux brut (OpenClaw)

OpenClaw peut enregistrer le **flux brut de l'assistant** avant tout filtrage/formatage.
C'est le meilleur moyen de voir si le raisonnement arrive sous forme de deltas de texte brut
(ou sous forme de blocs de réflexion séparés).

Activez-le via la CLI :

```bash
pnpm gateway:watch --raw-stream
```

Remplacement de chemin optionnel :

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

## Journalisation des blocs bruts compatibles OpenAI

Pour capturer les **blocs bruts compatibles OpenAI** avant qu'ils ne soient analysés en blocs,
activez le journalleur de transport :

```bash
OPENCLAW_RAW_STREAM=1
```

Chemin optionnel :

```bash
OPENCLAW_RAW_STREAM_PATH=~/.openclaw/logs/raw-openai-completions.jsonl
```

Fichier par défaut :

`~/.openclaw/logs/raw-openai-completions.jsonl`

## Notes de sécurité

- Les journaux de flux bruts peuvent inclure des invites complètes, des sorties d'outils et des données utilisateur.
- Gardez les journaux en local et supprimez-les après le débogage.
- Si vous partagez des journaux, nettoyez d'abord les secrets et les données personnelles.

## Débogage dans VSCode

Les source maps sont nécessaires pour activer le débogage dans les IDE basés sur VSCode, car de nombreux fichiers générés finissent par des noms hachés dans le cadre du processus de construction. Les configurations `launch.json` incluses ciblent le service Gateway, mais peuvent être rapidement adaptées à d'autres fins :

1. **Reconstruire et déboguer Gateway** - Débogue le service Gateway après avoir créé une nouvelle build
2. **Déboguer Gateway** - Débogue le service Gateway d'une build existante

### Configuration

La configuration par défaut **Reconstruire et déboguer Gateway** est prête à l'emploi, elle supprimera automatiquement le dossier `/dist` et reconstruira le projet avec le débogage activé :

1. Ouvrez le panneau **Exécuter et déboguer** à partir de la barre d'activité ou appuyez sur `Ctrl`+`Shift`+`D`
2. Dans l'IDE, assurez-vous que **Reconstruire et déboguer Gateway** est sélectionné dans le menu déroulant de configuration, puis appuyez sur le bouton **Démarrer le débogage**

Alternativement - si vous préférez gérer les processus de construction et de débogage manuellement :

1. Ouvrez un terminal et activez les source maps :
   - **Linux/macOS** : `export OUTPUT_SOURCE_MAPS=1`
   - **Windows (PowerShell)** : `$env:OUTPUT_SOURCE_MAPS="1"`
   - **Windows (CMD)** : `set OUTPUT_SOURCE_MAPS=1`
2. Dans le même terminal, reconstruisez le projet : `pnpm clean:dist && pnpm build`
3. Dans l'IDE, sélectionnez l'option **Déboguer Gateway** dans le menu déroulant de configuration **Exécuter et déboguer**, puis appuyez sur le bouton **Démarrer le débogage**

Vous pouvez maintenant définir des points d'arrêt dans vos fichiers sources TypeScript (répertoire `src/`) et le débogueur mappera correctement les points d'arrêt vers le JavaScript compilé via les source maps. Vous pourrez inspecter les variables, parcourir le code pas à pas et examiner les piles d'appels comme prévu.

### Notes

- Si vous utilisez l'option **« Rebuild and Debug Gateway »** - chaque fois que le débogueur est lancé, il supprimera complètement le dossier `/dist` et exécutera une complète `pnpm build` avec les source maps activés avant de démarrer le Gateway
- Si vous utilisez l'option **« Debug Gateway »** - les sessions de débogage peuvent être démarrées et arrêtées à tout moment sans affecter le dossier `/dist`, mais vous devez utiliser un processus de terminal séparé pour activer le débogage et gérer le cycle de construction
- Modifiez les paramètres `launch.json` pour `args` afin de déboguer d'autres sections du projet
- Si vous devez utiliser le OpenClaw CLI construit pour d'autres tâches (c'est-à-dire `dashboard --no-open` si votre session de débogage génère un nouveau jeton d'authentification), vous pouvez l'exécuter dans un autre terminal en tant que `node ./openclaw.mjs` ou créer un alias de shell comme `alias openclaw-build="node $(pwd)/openclaw.mjs"`

## Connexes

- [Dépannage](/fr/help/troubleshooting)
- [FAQ](/fr/help/faq)
