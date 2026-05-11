---
summary: "Installer, configurer et gérer les plugins OpenClaw"
read_when:
  - Installing or configuring plugins
  - Understanding plugin discovery and load rules
  - Working with Codex/Claude-compatible plugin bundles
title: "Plugins"
sidebarTitle: "Installation et configuration"
---

Les plugins étendent OpenClaw avec de nouvelles capacités : canaux, fournisseurs de modèles,
harnais d'agents, outils, compétences, parole, transcription en temps réel, voix
en temps réel, compréhension des médias, génération d'images, génération de vidéo,
récupération web, recherche web, et plus encore. Certains plugins sont **core** (livrés avec OpenClaw), d'autres
sont **externes** (publiés sur npm par la communauté).

## Démarrage rapide

<Steps>
  <Step title="Voir ce qui est chargé">
    ```bash
    openclaw plugins list
    ```
  </Step>

  <Step title="Installer un plugin">
    ```bash
    # From npm
    openclaw plugins install @openclaw/voice-call

    # From a local directory or archive
    openclaw plugins install ./my-plugin
    openclaw plugins install ./my-plugin.tgz
    ```

  </Step>

  <Step title="Redémarrez la Gateway">
    ```bash
    openclaw gateway restart
    ```

    Configurez ensuite sous `plugins.entries.\<id\>.config` dans votre fichier de configuration.

  </Step>
</Steps>

Si vous préférez un contrôle natif via le chat, activez `commands.plugins: true` et utilisez :

```text
/plugin install clawhub:@openclaw/voice-call
/plugin show voice-call
/plugin enable voice-call
```

Le chemin d'installation utilise le même résolveur que la CLI : chemin/archive local,
`clawhub:<pkg>` explicite, `npm:<pkg>` explicite, ou spécification de package nue (ClawHub en premier, puis
npm en secours).

Si la configuration n'est pas valide, l'installation échoue normalement de manière fermée et vous redirige vers `openclaw doctor --fix`. La seule exception de récupération est un chemin étroit de réinstallation de plugin groupé pour les plugins qui optent pour `openclaw.install.allowInvalidConfigRecovery`.
Lors du démarrage du Gateway, une configuration non valide pour un plugin est isolée à ce plugin : le démarrage enregistre le problème `plugins.entries.<id>.config`, ignore ce plugin lors du chargement, et maintient les autres plugins et canaux en ligne. Exécutez `openclaw doctor --fix` pour mettre en quarantaine la mauvaise configuration du plugin en désactivant cette entrée de plugin et en supprimant sa charge utile de configuration non valide ; la sauvegarde de configuration normale conserve les valeurs précédentes.
Lorsqu'une configuration de canal fait référence à un plugin qui n'est plus découvrable mais que le même identifiant de plugin périmé reste dans la configuration du plugin ou les enregistrements d'installation, le démarrage du Gateway enregistre des avertissements et ignore ce canal au lieu de bloquer tous les autres canaux.
Exécutez `openclaw doctor --fix` pour supprimer les entrées de canal/plugin périmées ; les clés de canal inconnues sans preuve de plugin périmé échouent toujours à la validation, de sorte que les fautes de frappe restent visibles.

Les installations packagées de OpenClaw n'installent pas précipitamment l'arborescence des dépendances d'exécution de chaque plugin groupé. Lorsqu'un plugin groupé appartenant à OpenClaw est actif via la configuration du plugin, la configuration de canal héritée, ou un manifeste activé par défaut, le démarrage répare uniquement les dépendances d'exécution déclarées de ce plugin avant de l'importer.
L'état d'authentification de canal persisté seul n'active pas un canal groupé pour la réparation des dépendances d'exécution au démarrage du Gateway.
La désactivation explicite l'emporte toujours : `plugins.entries.<id>.enabled: false`, `plugins.deny`, `plugins.enabled: false` et `channels.<id>.enabled: false` empêchent la réparation automatique des dépendances d'exécution groupées pour ce plugin/canal.
Un `plugins.allow` non vide limite également la réparation des dépendances d'exécution groupées activées par défaut ; l'activation explicite du canal groupé (`channels.<id>.enabled: true`) peut toujours réparer les dépendances de plugin de ce canal.
Les plugins externes et les chemins de chargement personnalisés doivent toujours être installés via `openclaw plugins install`.

## Types de plugins

OpenClaw reconnaît deux formats de plugins :

| Format              | Fonctionnement                                                                   | Exemples                                               |
| ------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------ |
| **Natif**           | `openclaw.plugin.json` + module d'exécution ; s'exécute dans le processus        | Plugins officiels, packages communautaires npm         |
| **Groupé (Bundle)** | Disposition compatible Codex/Claude/Cursor ; mappée aux fonctionnalités OpenClaw | `.codex-plugin/`, `.claude-plugin/`, `.cursor-plugin/` |

Les deux apparaissent sous `openclaw plugins list`. Consultez [Plugin Bundles](/fr/plugins/bundles) pour plus de détails sur les bundles.

Si vous écrivez un plugin natif, commencez par [Building Plugins](/fr/plugins/building-plugins)
et la [Plugin SDK Overview](/fr/plugins/sdk-overview).

## Points d'entrée de package

Les packages de plugins natifs npm doivent déclarer `openclaw.extensions` dans `package.json`.
Chaque entrée doit rester dans le répertoire du package et résoudre vers un fichier
runtime lisible, ou vers un fichier source TypeScript avec un homologue JavaScript
construit déduit tel que `src/index.ts` vers `dist/index.js`.

Utilisez `openclaw.runtimeExtensions` lorsque les fichiers runtime publiés ne se trouvent pas aux
mêmes chemins que les entrées sources. Lorsqu'elle est présente, `runtimeExtensions` doit contenir
exactement une entrée pour chaque entrée `extensions`. Les listes non concordantes font échouer l'installation et
la découverte de plugins plutôt que de revenir silencieusement aux chemins sources.

```json
{
  "name": "@acme/openclaw-plugin",
  "openclaw": {
    "extensions": ["./src/index.ts"],
    "runtimeExtensions": ["./dist/index.js"]
  }
}
```

## Plugins officiels

### Installables (npm)

| Plugin          | Package                | Docs                                    |
| --------------- | ---------------------- | --------------------------------------- |
| Matrix          | `@openclaw/matrix`     | [Matrix](/fr/channels/matrix)           |
| Microsoft Teams | `@openclaw/msteams`    | [Microsoft Teams](/fr/channels/msteams) |
| Nostr           | `@openclaw/nostr`      | [Nostr](/fr/channels/nostr)             |
| Appel vocal     | `@openclaw/voice-call` | [Voice Call](/fr/plugins/voice-call)    |
| Zalo            | `@openclaw/zalo`       | [Zalo](/fr/channels/zalo)               |
| Zalo Personnel  | `@openclaw/zalouser`   | [Zalo Personal](/fr/plugins/zalouser)   |

### Core (livré avec OpenClaw)

<AccordionGroup>
  <Accordion title="Fournisseurs de modèles (activés par défaut)">
    `anthropic`, `byteplus`, `cloudflare-ai-gateway`, `github-copilot`, `google`,
    `huggingface`, `kilocode`, `kimi-coding`, `minimax`, `mistral`, `qwen`,
    `moonshot`, `nvidia`, `openai`, `opencode`, `opencode-go`, `openrouter`,
    `qianfan`, `synthetic`, `together`, `venice`,
    `vercel-ai-gateway`, `volcengine`, `xiaomi`, `zai`
  </Accordion>

<Accordion title="Plugins de mémoire">- `memory-core` — recherche de mémoire intégrée (par défaut via `plugins.slots.memory`) - `memory-lancedb` — mémoire à long terme à la demande avec rappel/capture automatique (définir `plugins.slots.memory = "memory-lancedb"`)</Accordion>

<Accordion title="Fournisseurs de reconnaissance vocale (activés par défaut)">`elevenlabs`, `microsoft`</Accordion>

  <Accordion title="Autres">
    - `browser` — plugin navigateur intégré pour l'outil navigateur, `openclaw browser` CLI, méthode de passerelle `browser.request`, runtime du navigateur et service de contrôle de navigateur par défaut (activé par défaut ; désactivez-le avant de le remplacer)
    - `copilot-proxy` — pont proxy VS Code Copilot (désactivé par défaut)
  </Accordion>
</AccordionGroup>

Vous recherchez des plugins tiers ? Voir [Plugins communautaires](/fr/plugins/community).

## Configuration

```json5
{
  plugins: {
    enabled: true,
    allow: ["voice-call"],
    deny: ["untrusted-plugin"],
    load: { paths: ["~/Projects/oss/voice-call-plugin"] },
    entries: {
      "voice-call": { enabled: true, config: { provider: "twilio" } },
    },
  },
}
```

| Champ            | Description                                                               |
| ---------------- | ------------------------------------------------------------------------- |
| `enabled`        | Commutateur principal (par défaut : `true`)                               |
| `allow`          | Liste d'autorisation de plugins (optionnelle)                             |
| `deny`           | Liste de refus de plugins (optionnelle ; la priorité est donnée au refus) |
| `load.paths`     | Fichiers/répertoires de plugins supplémentaires                           |
| `slots`          | Sélecteurs de slot exclusifs (ex. `memory`, `contextEngine`)              |
| `entries.\<id\>` | Commutateurs + configuration par plugin                                   |

Les modifications de configuration **nécessitent un redémarrage de la passerelle**. Si le Gateway fonctionne avec la surveillance de la configuration + le redémarrage en processus activé (le chemin par défaut `openclaw gateway`), ce redémarrage est généralement effectué automatiquement un instant après l'écriture de la configuration. Il n'existe aucun chemin de rechargement à chaud pris en charge pour le code d'exécution du plugin natif ou les crochets de cycle de vie ; redémarrez le processus Gateway qui sert le channel en direct avant de vous attendre à ce que le code `register(api)` mis à jour, les crochets `api.on(...)`, les outils, les services ou les crochets provider/runtime s'exécutent.

`openclaw plugins list` est un instantané local du registre/de configuration des plugins. Un plugin `enabled` présent signifie que le registre persistant et la configuration actuelle autorisent la participation du plugin. Cela ne prouve pas qu'un enfant distant Gateway déjà en cours d'exécution a redémarré avec le même code de plugin. Sur les configurations VPS/conteneur avec processus wrappers, envoyez des redémarrages au processus `openclaw gateway run` réel, ou utilisez `openclaw gateway restart` contre le Gateway en cours d'exécution.

<Accordion title="États des plugins : désactivé, manquant ou invalide">
  - **Disabled** : le plugin existe mais les règles d'activation l'ont désactivé. La configuration est conservée. - **Missing** : la configuration fait référence à un id de plugin que la découverte n'a pas trouvé. - **Invalid** : le plugin existe mais sa configuration ne correspond pas au schéma déclaré. Le démarrage du Gateway ignore uniquement ce plugin ; `openclaw doctor --fix` peut mettre en
  quarantaine l'entrée invalide en la désactivant et en supprimant sa charge utile de configuration.
</Accordion>

## Découverte et priorité

OpenClaw recherche les plugins dans cet ordre (la première correspondance l'emporte) :

<Steps>
  <Step title="Config paths">
    `plugins.load.paths` — chemins de fichiers ou de répertoires explicites. Les chemins qui pointent
    vers les propres répertoires de plugins groupés d'OpenClaw sont ignorés ;
    exécutez `openclaw doctor --fix` pour supprimer ces alias obsolètes.
  </Step>

  <Step title="Workspace plugins">
    `\<workspace\>/.openclaw/<plugin-root>/*.ts` et `\<workspace\>/.openclaw/<plugin-root>/*/index.ts`.
  </Step>

  <Step title="Global plugins">
    `~/.openclaw/<plugin-root>/*.ts` et `~/.openclaw/<plugin-root>/*/index.ts`.
  </Step>

  <Step title="Bundled plugins">
    Livré avec OpenClaw. Beaucoup sont activés par défaut (fournisseurs de modèles, parole).
    D'autres nécessitent une activation explicite.
  </Step>
</Steps>

Les installations packagées et les images Docker résolvent généralement les plugins groupés à partir de
l'arborescence `dist/extensions` compilée. Si un répertoire source de plugin groupé est
monté par liaison (bind-mount) sur le chemin source packagé correspondant, par exemple
`/app/extensions/synology-chat`, OpenClaw traite ce répertoire source monté
comme une superposition source groupée et le découvre avant le bundle packagé
`/app/dist/extensions/synology-chat`. Cela permet aux boucles de conteneur des mainteneurs
de fonctionner sans avoir à remettre chaque plugin groupé en source TypeScript.
Définissez `OPENCLAW_DISABLE_BUNDLED_SOURCE_OVERLAYS=1` pour forcer les bundles dist packagés
même lorsque des montages de superposition source sont présents.

### Règles d'activation

- `plugins.enabled: false` désactive tous les plugins
- `plugins.deny` prime toujours sur allow
- `plugins.entries.\<id\>.enabled: false` désactive ce plugin
- Les plugins d'origine Workspace sont **désactivés par défaut** (doivent être explicitement activés)
- Les plugins groupés suivent l'ensemble activé par défaut intégré, sauf en cas de substitution
- Les emplacements exclusifs peuvent forcer l'activation du plugin sélectionné pour cet emplacement
- Certains plugins groupés optionnels sont activés automatiquement lorsque la configuration nomme une
  surface appartenant à un plugin, telle qu'une référence de modèle de fournisseur, une configuration de canal, ou un runtime
  de harnais
- Les routes Codex de la famille OpenAI conservent des limites de plugin distinctes :
  `openai-codex/*` appartient au plugin OpenAI, tandis que le plugin
  app-server Codex groupé est sélectionné par `agentRuntime.id: "codex"` ou les références
  de modèle `codex/*` héritées

## Dépannage des hooks d'exécution

Si un plugin apparaît dans `plugins list` mais que les effets secondaires ou les hooks `register(api)`
ne s'exécutent pas dans le trafic de chat en direct, vérifiez d'abord ceci :

- Exécutez `openclaw gateway status --deep --require-rpc` et confirmez que l'URL, le profil, le chemin de
  configuration et le processus Gateway actifs sont bien ceux que vous modifiez.
- Redémarrez le Gateway en direct après l'installation, la configuration
  ou la modification du code du plugin. Dans les conteneurs d'encapsulation, PID 1 peut
  n'être qu'un superviseur ; redémarrez ou envoyez un signal au processus enfant
  `openclaw gateway run`.
- Utilisez `openclaw plugins inspect <id> --json` pour confirmer les enregistrements de hooks
  et les diagnostics. Les hooks de conversation non groupés tels que `llm_input`,
  `llm_output`, `before_agent_finalize` et `agent_end` ont besoin
  de `plugins.entries.<id>.hooks.allowConversationAccess=true`.
- Pour le changement de modèle, préférez `before_model_resolve`. Il s'exécute avant la
  résolution du modèle pour les tours de l'agent ; `llm_output` ne s'exécute
  qu'après qu'une tentative de modèle a produit une sortie de l'assistant.
- Pour la preuve du modèle de session effectif, utilisez `openclaw sessions` ou
  les surfaces de session/statut du Gateway et, lors du débogage des
  payloads du provider, démarrez le Gateway avec `--raw-stream --raw-stream-path <path>`.

### Propriété dupliquée de canal ou d'outil

Symptômes :

- `channel already registered: <channel-id> (<plugin-id>)`
- `channel setup already registered: <channel-id> (<plugin-id>)`
- `plugin tool name conflict (<plugin-id>): <tool-name>`

Cela signifie que plus d'un plugin activé essaie de posséder le même canal,
le même flux de configuration ou le même nom d'outil. La cause la plus fréquente
est un plugin de canal externe installé à côté d'un plugin groupé qui fournit
désormais le même identifiant de canal.

Étapes de débogage :

- Exécutez `openclaw plugins list --enabled --verbose` pour voir chaque plugin activé
  et son origine.
- Exécutez `openclaw plugins inspect <id> --json` pour chaque plugin suspect et
  comparez `channels`, `channelConfigs`, `tools` et les diagnostics.
- Exécutez `openclaw plugins registry --refresh` après l'installation ou la suppression de packages de plugins afin que les métadonnées persistantes reflètent l'installation actuelle.
- Redémarrez la Gateway après une modification de l'installation, du registre ou de la configuration.

Options de correction :

- Si un plugin remplace intentionnellement un autre pour le même identifiant de canal, le plugin préféré doit déclarer `channelConfigs.<channel-id>.preferOver` avec l'identifiant du plugin de moindre priorité. Consultez [/plugins/manifest#replacing-another-channel-plugin](/fr/plugins/manifest#replacing-another-channel-plugin).
- Si le doublon est accidentel, désactivez l'un des côtés avec `plugins.entries.<plugin-id>.enabled: false` ou supprimez l'installation obsolète du plugin.
- Si vous avez explicitement activé les deux plugins, OpenClaw conserve cette demande et signale le conflit. Choisissez un seul propriétaire pour le canal ou renommez les outils appartenant au plugin afin que la surface d'exécution soit sans ambiguïté.

## Emplacements de plugin (catégories exclusives)

Certaines catégories sont exclusives (une seule active à la fois) :

```json5
{
  plugins: {
    slots: {
      memory: "memory-core", // or "none" to disable
      contextEngine: "legacy", // or a plugin id
    },
  },
}
```

| Emplacement     | Ce qu'il contrôle        | Par défaut         |
| --------------- | ------------------------ | ------------------ |
| `memory`        | Plugin de mémoire actif  | `memory-core`      |
| `contextEngine` | Moteur de contexte actif | `legacy` (intégré) |

## Référence CLI

```bash
openclaw plugins list                       # compact inventory
openclaw plugins list --enabled            # only enabled plugins
openclaw plugins list --verbose            # per-plugin detail lines
openclaw plugins list --json               # machine-readable inventory
openclaw plugins inspect <id>              # deep detail
openclaw plugins inspect <id> --json       # machine-readable
openclaw plugins inspect --all             # fleet-wide table
openclaw plugins info <id>                 # inspect alias
openclaw plugins doctor                    # diagnostics
openclaw plugins registry                  # inspect persisted registry state
openclaw plugins registry --refresh        # rebuild persisted registry
openclaw doctor --fix                      # repair plugin registry state

openclaw plugins install <package>         # install (ClawHub first, then npm)
openclaw plugins install clawhub:<pkg>     # install from ClawHub only
openclaw plugins install npm:<pkg>         # install from npm only
openclaw plugins install <spec> --force    # overwrite existing install
openclaw plugins install <path>            # install from local path
openclaw plugins install -l <path>         # link (no copy) for dev
openclaw plugins install <plugin> --marketplace <source>
openclaw plugins install <plugin> --marketplace https://github.com/<owner>/<repo>
openclaw plugins install <spec> --pin      # record exact resolved npm spec
openclaw plugins install <spec> --dangerously-force-unsafe-install
openclaw plugins update <id-or-npm-spec> # update one plugin
openclaw plugins update <id-or-npm-spec> --dangerously-force-unsafe-install
openclaw plugins update --all            # update all
openclaw plugins uninstall <id>          # remove config and plugin index records
openclaw plugins uninstall <id> --keep-files
openclaw plugins marketplace list <source>
openclaw plugins marketplace list <source> --json

openclaw plugins enable <id>
openclaw plugins disable <id>
```

Les plugins groupés sont livrés avec OpenClaw. Beaucoup sont activés par défaut (par exemple, les fournisseurs de modèles groupés, les fournisseurs de reconnaissance vocale groupés et le plugin de navigateur groupé). D'autres plugins groupés nécessitent encore `openclaw plugins enable <id>`.

`--force` écrase un plugin installé existant ou un pack de hooks sur place. Utilisez `openclaw plugins update <id-or-npm-spec>` pour les mises à jour de routine des plugins npm suivis. Il n'est pas pris en charge avec `--link`, qui réutilise le chemin source au lieu de copier sur une cible d'installation gérée.

Lorsque `plugins.allow` est déjà défini, `openclaw plugins install` ajoute l'identifiant du plugin installé à cette liste d'autorisation avant de l'activer. Si le même identifiant de plugin est présent dans `plugins.deny`, l'installation supprime cette entrée de refus obsolète afin que l'installation explicite soit immédiatement chargeable après redémarrage.

OpenClaw conserve un registre de plugins local persistant en tant que modèle de lecture à froid pour l'inventaire des plugins, la propriété des contributions et la planification du démarrage. Les flux d'installation, de mise à jour, de désinstallation, d'activation et de désactivation actualisent ce registre après modification de l'état du plugin. Le même fichier `plugins/installs.json` conserve les métadonnées d'installation durables dans `installRecords` de premier niveau et les métadonnées de manifeste reconstructibles dans `plugins`. Si le registre est manquant, obsolète ou invalide, `openclaw plugins registry --refresh` reconstruit sa vue du manifeste à partir des enregistrements d'installation, de la stratégie de configuration et des métadonnées de manifeste/colis sans charger les modules d'exécution du plugin. `openclaw plugins update <id-or-npm-spec>` s'applique aux installations suivies. Le fait de passer une spécification de package npm avec une balise de distribution (dist-tag) ou une version exacte résout le nom du package vers l'enregistrement du plugin suivi et enregistre la nouvelle spécification pour les futures mises à jour. Passer le nom du package sans version ramène une installation épinglée exacte à la ligne de publication par défaut du registre. Si le plugin npm installé correspond déjà à la version résolue et à l'identité de l'artefact enregistré, OpenClaw ignore la mise à jour sans télécharger, réinstaller ou réécrire la configuration.

`--pin` est uniquement réservé à npm. Il n'est pas pris en charge avec `--marketplace`, car les installations à partir de la place de marché (marketplace) conservent les métadonnées de source de la place de marché au lieu d'une spécification npm.

`--dangerously-force-unsafe-install` est une mesure de contournement de dernier recours pour les faux positifs du scanner de code dangereux intégré. Il permet aux installations et mises à jour de plugins de continuer malgré les résultats `critical` intégrés, mais il ne contourne toujours pas les blocages de stratégie de plugin `before_install` ni les blocages en cas d'échec de l'analyse. Les analyses d'installation ignorent les fichiers et répertoires de test courants tels que `tests/`, `__tests__/`, `*.test.*` et `*.spec.*` pour éviter de bloquer les simulations de test empaquetées ; les points d'entrée d'exécution du plugin déclarés sont toujours analysés même s'ils utilisent l'un de ces noms.

Ce drapeau CLI s'applique uniquement aux flux d'installation/de mise à jour de plugins. Les installations de dépendances de compétences soutenues par Gateway utilisent plutôt la substitution de requête `dangerouslyForceUnsafeInstall` correspondante, tandis que `openclaw skills install` reste le flux distinct de téléchargement/installation de compétences ClawHub.

Les bundles compatibles participent au même flux de liste/inspection/activation/désactivation de plugins. Le support d'exécution actuel inclut les compétences de bundle, les commandes Claude, les valeurs par défaut Claude `settings.json`, `.lsp.json` et les valeurs par défaut `lspServers` déclarées dans le manifeste, les commandes Cursor, et les répertoires de hooks Codex compatibles.

`openclaw plugins inspect <id>` signale également les capacités de bundle détectées ainsi que les entrées de serveur MCP et LSP prises en charge ou non pour les plugins soutenus par un bundle.

Les sources de la Marketplace peuvent être un nom de Marketplace connu de Claude provenant de `~/.claude/plugins/known_marketplaces.json`, un chemin racine vers une Marketplace locale ou un chemin `marketplace.json`, une abréviation GitHub telle que `owner/repo`, une URL de dépôt GitHub, ou une URL git. Pour les Marketplaces distantes, les entrées de plugins doivent rester à l'intérieur du dépôt cloné de la Marketplace et utiliser uniquement des sources de chemin relatif.

Consultez la [référence CLI de `openclaw plugins`](/fr/cli/plugins) pour plus de détails.

## Aperçu de l'API des plugins

Les plugins natifs exportent un objet d'entrée qui expose `register(api)`. Les plugins plus anciens peuvent encore utiliser `activate(api)` comme alias hérité, mais les nouveaux plugins devraient utiliser `register`.

```typescript
export default definePluginEntry({
  id: "my-plugin",
  name: "My Plugin",
  register(api) {
    api.registerProvider({
      /* ... */
    });
    api.registerTool({
      /* ... */
    });
    api.registerChannel({
      /* ... */
    });
  },
});
```

OpenClaw charge l'objet d'entrée et appelle `register(api)` lors de l'activation du plugin. Le chargeur revient encore à `activate(api)` pour les plugins plus anciens, mais les plugins groupés et les nouveaux plugins externes devraient considérer `register` comme le contrat public.

`api.registrationMode` indique à un plugin la raison pour laquelle son entrée est chargée :

| Mode            | Signification                                                                                                                                                                                                  |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `full`          | Activation lors de l'exécution. Enregistrez les outils, les hooks, les services, les commandes, les routes et autres effets secondaires en direct.                                                             |
| `discovery`     | Découverte des capacités en lecture seule. Enregistrez les fournisseurs et les métadonnées ; le code d'entrée de plugin approuvé peut être chargé, mais les effets secondaires en direct doivent être ignorés. |
| `setup-only`    | Chargement des métadonnées de configuration du canal via une entrée de configuration légère.                                                                                                                   |
| `setup-runtime` | Chargement de la configuration du canal qui nécessite également l'entrée d'exécution.                                                                                                                          |
| `cli-metadata`  | Collecte des métadonnées des commandes CLI uniquement.                                                                                                                                                         |

Les entrées de plugin qui ouvrent des sockets, des bases de données, des processus d'arrière-plan ou des clients de longue durée doivent protéger ces effets secondaires avec `api.registrationMode === "full"`.
Les chargements de Discovery sont mis en cache séparément des chargements d'activation et ne remplacent pas le registre Gateway en cours d'exécution. La découverte est non activante et non sans importation :
OpenClaw peut évaluer l'entrée de plugin de confiance ou le module de plugin de canal pour construire
l'instantané. Gardez les niveaux supérieurs des modules légers et sans effets secondaires, et déplacez
les clients réseau, les sous-processus, les écouteurs, les lectures d'informations d'identification et le démarrage des services
derrière les chemins d'exécution complète.

Méthodes d'enregistrement courantes :

| Méthode                                 | Ce qu'il enregistre                      |
| --------------------------------------- | ---------------------------------------- |
| `registerProvider`                      | Fournisseur de modèle (LLM)              |
| `registerChannel`                       | Canal de chat                            |
| `registerTool`                          | Outil d'agent                            |
| `registerHook` / `on(...)`              | Crochets de cycle de vie                 |
| `registerSpeechProvider`                | Synthèse vocale / STT                    |
| `registerRealtimeTranscriptionProvider` | STT en continu                           |
| `registerRealtimeVoiceProvider`         | Voix en temps réel duplex                |
| `registerMediaUnderstandingProvider`    | Analyse d'image/audio                    |
| `registerImageGenerationProvider`       | Génération d'images                      |
| `registerMusicGenerationProvider`       | Génération de musique                    |
| `registerVideoGenerationProvider`       | Génération vidéo                         |
| `registerWebFetchProvider`              | Fournisseur de récupération/scraping Web |
| `registerWebSearchProvider`             | Recherche Web                            |
| `registerHttpRoute`                     | Point de terminaison HTTP                |
| `registerCommand` / `registerCli`       | Commandes CLI                            |
| `registerContextEngine`                 | Moteur de contexte                       |
| `registerService`                       | Service d'arrière-plan                   |

Comportement de garde de crochet pour les crochets de cycle de vie typés :

- `before_tool_call` : `{ block: true }` est terminal ; les gestionnaires de priorité inférieure sont ignorés.
- `before_tool_call` : `{ block: false }` est une opération vide et ne efface pas un bloc antérieur.
- `before_install` : `{ block: true }` est terminal ; les gestionnaires de moindre priorité sont ignorés.
- `before_install` : `{ block: false }` est une opération vide (no-op) et ne efface pas un bloc antérieur.
- `message_sending` : `{ cancel: true }` est terminal ; les gestionnaires de moindre priorité sont ignorés.
- `message_sending` `{ cancel: false }` est une opération vide (no-op) et ne efface pas une annulation antérieure.

Le serveur d'application Codex natif exécute un pont qui renvoie les événements d'outil natifs Codex vers cette surface de hook. Les plugins peuvent bloquer les outils natifs Codex via `before_tool_call`, observer les résultats via `after_tool_call`, et participer aux approbations Codex `PermissionRequest`. Le pont ne réécrit pas encore les arguments des outils natifs Codex. La limite exacte du support d'exécution Codex se trouve dans le [Contrat de support du harnais Codex v1](/fr/plugins/codex-harness#v1-support-contract).

Pour le comportement complet des hooks typés, voir [Vue d'ensemble du SDK](/fr/plugins/sdk-overview#hook-decision-semantics).

## Connexes

- [Créer des plugins](/fr/plugins/building-plugins) — créer votre propre plugin
- [Ensembles de plugins (Plugin bundles)](/fr/plugins/bundles) — compatibilité des ensembles Codex/Claude/Cursor
- [Manifeste de plugin](/fr/plugins/manifest) — schéma du manifeste
- [Enregistrement des outils](/fr/plugins/building-plugins#registering-agent-tools) — ajouter des outils d'agent dans un plugin
- [Fonctionnement interne des plugins](/fr/plugins/architecture) — modèle de capacité et pipeline de chargement
- [Plugins communautaires](/fr/plugins/community) — listes tierces
