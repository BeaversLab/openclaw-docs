---
summary: "Plugins/extensions OpenClaw : découverte, configuration et sécurité"
read_when:
  - Adding or modifying plugins/extensions
  - Documenting plugin install or load rules
title: "Plugins"
---

# Plugins (Extensions)

## Démarrage rapide (nouveau avec les plugins ?)

Un plugin est simplement un **petit module de code** qui étend OpenClaw avec des fonctionnalités supplémentaires (commandes, outils et Gateway RPC).

La plupart du temps, vous utiliserez des plugins lorsque vous voudrez une fonctionnalité qui n'est pas encore intégrée au cœur de OpenClaw (ou si vous voulez garder les fonctionnalités optionnelles hors de votre installation principale).

Accès rapide :

1. Voir ce qui est déjà chargé :

```bash
openclaw plugins list
```

2. Installer un plugin officiel (exemple : Appel vocal) :

```bash
openclaw plugins install @openclaw/voice-call
```

Les spécifications npm sont **uniquement pour le registre** (nom du package + **version exacte** facultative ou **dist-tag**). Les spécifications Git/URL/fichier et les plages semver sont rejetées.

Les spécifications nues et `@latest` restent sur la voie stable. Si npm résout l'un de ces éléments vers une préversion, OpenClaw s'arrête et vous demande de vous inscrire explicitement avec une balise de préversion telle que `@beta`/`@rc` ou une version de préversion exacte.

3. Redémarrez le Gateway, puis configurez sous `plugins.entries.<id>.config`.

Voir [Appel vocal](/fr/plugins/voice-call) pour un exemple concret de plugin.
Vous cherchez des listes tierces ? Voir [Plugins communautaires](/fr/plugins/community).

## Architecture

Le système de plugins de OpenClaw comporte quatre couches :

1. **Manifeste + découverte**
   OpenClaw trouve les plugins candidats à partir des chemins configurés, des racines de l'espace de travail, des racines d'extension globales et des extensions groupées. La découverte lit `openclaw.plugin.json` ainsi que les métadonnées du package en premier.
2. **Activation + validation**
   Le cœur décide si un plugin découvert est activé, désactivé, bloqué ou sélectionné pour un slot exclusif tel que la mémoire.
3. **Chargement au moment de l'exécution**
   Les plugins activés sont chargés en processus via jiti et enregistrent les capacités dans un registre central.
4. **Consommation de surface**
   Le reste d'OpenClaw lit le registre pour exposer les outils, les canaux, la configuration du provider,
   les hooks, les routes HTTP, les commandes CLI et les services.

La limite de conception importante :

- la découverte + la validation de la configuration doivent fonctionner à partir des **métadonnées de manifeste/schéma**
  sans exécuter le code du plugin
- le comportement d'exécution provient du chemin `register(api)` du module du plugin

Cette séparation permet à OpenClaw de valider la configuration, d'expliquer les plugins manquants/désactivés et de
construire des indices d'interface/schéma avant que le runtime complet ne soit actif.

## Modèle d'exécution

Les plugins s'exécutent **en cours de processus** avec le Gateway. Ils ne sont pas sandboxés. Un plugin chargé
a la même limite de confiance au niveau du processus que le code principal.

Implications :

- un plugin peut enregistrer des outils, des gestionnaires réseau, des hooks et des services
- un bogue de plugin peut planter ou déstabiliser la passerelle
- un plugin malveillant est équivalent à une exécution de code arbitraire à l'intérieur du
  processus OpenClaw

Utilisez des listes d'autorisation et des chemins d'installation/chargement explicites pour les plugins non inclus. Traitez
les plugins de l'espace de travail comme du code de temps de développement, et non par défaut pour la production.

Note importante sur la confiance :

- `plugins.allow` fait confiance aux **identifiants de plugin**, et non à la provenance de la source.
- Un plugin de l'espace de travail avec le même identifiant qu'un plugin inclus remplace intentionnellement
  la copie incluse lorsque ce plugin de l'espace de travail est activé/autorisé.
- Ceci est normal et utile pour le développement local, les tests de correctifs et les correctifs urgents.

## Plugins disponibles (officiels)

- Microsoft Teams est uniquement disponible sous forme de plugin à partir du 15/01/2026 ; installez `@openclaw/msteams` si vous utilisez Teams.
- Memory (Core) — plugin de recherche de mémoire inclus (activé par défaut via `plugins.slots.memory`)
- Memory (LanceDB) — plugin de mémoire à long terme inclus (rappel/capture automatique ; définir `plugins.slots.memory = "memory-lancedb"`)
- [Voice Call](/fr/plugins/voice-call) — `@openclaw/voice-call`
- [Zalo Personal](/fr/plugins/zalouser) — `@openclaw/zalouser`
- [Matrix](/fr/channels/matrix) — `@openclaw/matrix`
- [Nostr](/fr/channels/nostr) — `@openclaw/nostr`
- [Zalo](/fr/channels/zalo) — `@openclaw/zalo`
- [Microsoft Teams](/fr/channels/msteams) — `@openclaw/msteams`
- Google Antigravity OAuth (authentification du provider) — fourni sous la forme de `google-antigravity-auth` (désactivé par défaut)
- Gemini CLI OAuth (authentification du provider) — fourni sous la forme de `google-gemini-cli-auth` (désactivé par défaut)
- Qwen OAuth (authentification du provider) — fourni sous la forme de `qwen-portal-auth` (désactivé par défaut)
- Copilot Proxy (authentification du provider) — pont local pour le proxy VS Code Copilot ; distinct de la connexion appareil intégrée `github-copilot` (fourni, désactivé par défaut)

Les plugins OpenClaw sont des **modules TypeScript** chargés à l'exécution via jiti. **La validation de la configuration n'exécute pas le code du plugin** ; elle utilise à la place le manifeste du plugin et le schéma JSON. Voir [Plugin manifest](/fr/plugins/manifest).

Les plugins peuvent enregistrer :

- Méthodes RPC Gateway
- Routes HTTP Gateway
- Outils de l'agent
- Commandes CLI
- Services d'arrière-plan
- Moteurs de contexte
- Validation de configuration facultative
- **Skills** (en listant les répertoires `skills` dans le manifeste du plugin)
- **Commandes de réponse automatique** (s'exécutent sans invoquer l'agent IA)

Les plugins s'exécutent **dans le même processus** que le Gateway, traitez-les donc comme du code de confiance.
Guide de rédaction d'outils : [Plugin agent tools](/fr/plugins/agent-tools).

## Pipeline de chargement

Au démarrage, OpenClaw fait grosso modo ceci :

1. découvrir les racines candidates des plugins
2. lire `openclaw.plugin.json` et les métadonnées du package
3. rejeter les candidats non sûrs
4. normaliser la configuration du plugin (`plugins.enabled`, `allow`, `deny`, `entries`,
   `slots`, `load.paths`)
5. décider de l'activation pour chaque candidat
6. charger les modules activés via jiti
7. appeler `register(api)` et collecter les enregistrements dans le registre des plugins
8. exposer le registre aux commandes/surfaces d'exécution

Les dispositifs de sécurité se produisent **avant** l'exécution du runtime. Les candidats sont bloqués lorsque l'entrée échappe à la racine du plugin, que le chemin est accessible en écriture par tous, ou que la propriété du chemin semble suspecte pour les plugins non groupés.

### Comportement basé sur le manifeste

Le manifeste est la source de vérité du plan de contrôle. OpenClaw l'utilise pour :

- identifier le plugin
- découvrir les canaux/compétences/schémas de configuration déclarés
- valider `plugins.entries.<id>.config`
- augmenter les étiquettes/espaces réservés de l'interface de contrôle
- afficher les métadonnées d'installation/catalogue

Le module d'exécution est la partie du plan de données. Il enregistre le comportement réel tel que les crochets, les outils, les commandes ou les flux de provider.

### Ce que le chargeur met en cache

OpenClaw conserve des caches courts en processus pour :

- les résultats de découverte
- les données du registre de manifestes
- les registres de plugins chargés

Ces caches réduisent la surcharge du démarrage par rafales et des commandes répétées. Il est prudent de les considérer comme des caches de performance à court terme, et non comme une persistance.

## Assistants d'exécution

Les plugins peuvent accéder à certains assistants de base via `api.runtime`. Pour la téléphonie TTS :

```ts
const result = await api.runtime.tts.textToSpeechTelephony({
  text: "Hello from OpenClaw",
  cfg: api.config,
});
```

Notes :

- Utilise la configuration `messages.tts` de base (OpenAI ou ElevenLabs).
- Renvoie le tampon audio PCM + le taux d'échantillonnage. Les plugins doivent rééchantillonner/encoder pour les providers.
- Edge TTS n'est pas pris en charge pour la téléphonie.

Pour la STT/transcription, les plugins peuvent appeler :

```ts
const { text } = await api.runtime.stt.transcribeAudioFile({
  filePath: "/tmp/inbound-audio.ogg",
  cfg: api.config,
  // Optional when MIME cannot be inferred reliably:
  mime: "audio/ogg",
});
```

Notes :

- Utilise la configuration audio de compréhension des médias de base (`tools.media.audio`) et l'ordre de repli du provider.
- Renvoie `{ text: undefined }` lorsqu'aucune sortie de transcription n'est produite (par exemple entrée ignorée/non prise en charge).

## Routes HTTP Gateway

Les plugins peuvent exposer des points de terminaison HTTP avec `api.registerHttpRoute(...)`.

```ts
api.registerHttpRoute({
  path: "/acme/webhook",
  auth: "plugin",
  match: "exact",
  handler: async (_req, res) => {
    res.statusCode = 200;
    res.end("ok");
    return true;
  },
});
```

Champs de route :

- `path` : chemin de route sous le serveur HTTP de la passerelle.
- `auth` : requis. Utilisez `"gateway"` pour exiger l'authentification normale de la passerelle, ou `"plugin"` pour l'authentification/la vérification de webhook gérée par le plugin.
- `match` : facultatif. `"exact"` (par défaut) ou `"prefix"`.
- `replaceExisting` : facultatif. Permet au même plugin de remplacer sa propre inscription de route existante.
- `handler` : renvoyez `true` lorsque la route a géré la requête.

Notes :

- `api.registerHttpHandler(...)` est obsolète. Utilisez `api.registerHttpRoute(...)`.
- Les routes des plugins doivent déclarer `auth` explicitement.
- Les conflits exacts de `path + match` sont rejetés, sauf si `replaceExisting: true`, et un plugin ne peut pas remplacer la route d'un autre plugin.
- Les routes qui se chevauchent avec différents niveaux `auth` sont rejetées. Gardez les chaînes de `exact`/`prefix` uniquement sur le même niveau d'auth.

## Chemins d'importation du SDK de plugin

Utilisez les sous-chemins du SDK au lieu de l'import monolithique `openclaw/plugin-sdk` lors
de la création de plugins :

- `openclaw/plugin-sdk/core` pour les API de plugin génériques, les types d'authentification de fournisseur et les helpers partagés.
- `openclaw/plugin-sdk/compat` pour le code de plugin groupé/internal qui nécessite des helpers d'exécution partagés plus larges que `core`.
- `openclaw/plugin-sdk/telegram` pour les plugins de canal Telegram.
- `openclaw/plugin-sdk/discord` pour les plugins de canal Discord.
- `openclaw/plugin-sdk/slack` pour les plugins de canal Slack.
- `openclaw/plugin-sdk/signal` pour les plugins de canal Signal.
- `openclaw/plugin-sdk/imessage` pour les plugins de canal iMessage.
- `openclaw/plugin-sdk/whatsapp` pour les plugins de canal WhatsApp.
- `openclaw/plugin-sdk/line` pour les plugins de canal LINE.
- `openclaw/plugin-sdk/msteams` pour la surface de plugin Microsoft Teams groupée.
- Les sous-chemins spécifiques aux extensions groupées sont également disponibles :
  `openclaw/plugin-sdk/acpx`, `openclaw/plugin-sdk/bluebubbles`,
  `openclaw/plugin-sdk/copilot-proxy`, `openclaw/plugin-sdk/device-pair`,
  `openclaw/plugin-sdk/diagnostics-otel`, `openclaw/plugin-sdk/diffs`,
  `openclaw/plugin-sdk/feishu`,
  `openclaw/plugin-sdk/google-gemini-cli-auth`, `openclaw/plugin-sdk/googlechat`,
  `openclaw/plugin-sdk/irc`, `openclaw/plugin-sdk/llm-task`,
  `openclaw/plugin-sdk/lobster`, `openclaw/plugin-sdk/matrix`,
  `openclaw/plugin-sdk/mattermost`, `openclaw/plugin-sdk/memory-core`,
  `openclaw/plugin-sdk/memory-lancedb`,
  `openclaw/plugin-sdk/minimax-portal-auth`,
  `openclaw/plugin-sdk/nextcloud-talk`, `openclaw/plugin-sdk/nostr`,
  `openclaw/plugin-sdk/open-prose`, `openclaw/plugin-sdk/phone-control`,
  `openclaw/plugin-sdk/qwen-portal-auth`, `openclaw/plugin-sdk/synology-chat`,
  `openclaw/plugin-sdk/talk-voice`, `openclaw/plugin-sdk/test-utils`,
  `openclaw/plugin-sdk/thread-ownership`, `openclaw/plugin-sdk/tlon`,
  `openclaw/plugin-sdk/twitch`, `openclaw/plugin-sdk/voice-call`,
  `openclaw/plugin-sdk/zalo` et `openclaw/plugin-sdk/zalouser`.

Note de compatibilité :

- `openclaw/plugin-sdk` reste pris en charge pour les plugins externes existants.
- Les nouveaux plugins groupés et ceux qui ont été migrés doivent utiliser des sous-chemins spécifiques au canal ou à l'extension ; utilisez `core` pour les surfaces génériques et `compat` uniquement lorsque des assistants partagés plus larges sont nécessaires.

## Inspection en lecture seule du canal

Si votre plugin enregistre un canal, il est préférable d'implémenter
`plugin.config.inspectAccount(cfg, accountId)` parallèlement à `resolveAccount(...)`.

Pourquoi :

- `resolveAccount(...)` est le chemin d'exécution. Il est autorisé à supposer que les informations d'identification
  sont entièrement matérialisées et peut échouer rapidement lorsque les secrets requis sont manquants.
- Les chemins de commande en lecture seule tels que `openclaw status`, `openclaw status --all`,
  `openclaw channels status`, `openclaw channels resolve` et les flux de réparation
  doctor/config ne devraient pas avoir besoin de matérialiser les informations d'identification d'exécution juste pour
  décrire la configuration.

Comportement `inspectAccount(...)` recommandé :

- Ne renvoyer que l'état descriptif du compte.
- Conserver `enabled` et `configured`.
- Inclure les champs de source/statut des informations d'identification lorsque cela est pertinent, tels que :
  - `tokenSource`, `tokenStatus`
  - `botTokenSource`, `botTokenStatus`
  - `appTokenSource`, `appTokenStatus`
  - `signingSecretSource`, `signingSecretStatus`
- Il n'est pas nécessaire de renvoyer les valeurs brutes des jetons juste pour signaler la disponibilité en
  lecture seule. Le renvoi de `tokenStatus: "available"` (et du champ source correspondant)
  suffit pour les commandes de type statut.
- Utilisez `configured_unavailable` lorsqu'une information d'identification est configurée via SecretRef mais
  indisponible dans le chemin de commande actuel.

Cela permet aux commandes en lecture seule de signaler « configuré mais indisponible dans ce chemin de
commande » au lieu de planter ou de signaler incorrectement que le compte n'est pas configuré.

Note de performance :

- La découverte de plugins et les métadonnées du manifeste utilisent des caches courts en cours de processus pour réduire
  le travail de démarrage/rechargement par rafales.
- Définissez `OPENCLAW_DISABLE_PLUGIN_DISCOVERY_CACHE=1` ou
  `OPENCLAW_DISABLE_PLUGIN_MANIFEST_CACHE=1` pour désactiver ces caches.
- Ajustez les fenêtres de cache avec `OPENCLAW_PLUGIN_DISCOVERY_CACHE_MS` et
  `OPENCLAW_PLUGIN_MANIFEST_CACHE_MS`.

## Découverte et priorité

OpenClaw analyse, dans l'ordre :

1. Chemins de configuration

- `plugins.load.paths` (fichier ou répertoire)

2. Extensions de l'espace de travail

- `<workspace>/.openclaw/extensions/*.ts`
- `<workspace>/.openclaw/extensions/*/index.ts`

3. Extensions globales

- `~/.openclaw/extensions/*.ts`
- `~/.openclaw/extensions/*/index.ts`

4. Extensions groupées (fournies avec OpenClaw, principalement désactivées par défaut)

- `<openclaw>/extensions/*`

La plupart des plugins groupés doivent être activés explicitement via
`plugins.entries.<id>.enabled` ou `openclaw plugins enable <id>`.

Exceptions aux plugins groupés activés par défaut :

- `device-pair`
- `phone-control`
- `talk-voice`
- plugin de slot de mémoire actif (slot par défaut : `memory-core`)

Les plugins installés sont activés par défaut, mais peuvent être désactivés de la même manière.

Les plugins de l'espace de travail sont **désactivés par défaut**, sauf si vous les activez
explicitement ou les ajoutez à une liste autorisée. C'est intentionnel : un dépôt
extrait ne doit pas devenir silencieusement du code de passerelle de production.

Notes de durcissement :

- Si `plugins.allow` est vide et que des plugins non groupés sont découvrables, OpenClaw enregistre un avertissement de démarrage avec les identifiants et sources des plugins.
- Les chemins candidats sont vérifiés pour la sécurité avant l'admission à la découverte. OpenClaw bloque les candidats lorsque :
  - l'entrée de l'extension est résolue en dehors de la racine du plugin (y compris les échappements de lien symbolique/traversée de chemin),
  - le chemin racine/source du plugin est accessible en écriture par tous,
  - la propriété du chemin est suspecte pour les plugins non groupés (le propriétaire POSIX n'est ni l'uid actuel ni root).
- Les plugins non groupés chargés sans provenance d'installation/chemin de chargement émettent un avertissement afin que vous puissiez épingler la confiance (`plugins.allow`) ou le suivi de l'installation (`plugins.installs`).

Chaque plugin doit inclure un fichier `openclaw.plugin.json` à sa racine. Si un chemin
pointe vers un fichier, la racine du plugin est le répertoire du fichier et doit contenir le
manifeste.

Si plusieurs plugins résolvent vers le même identifiant, la première correspondance dans l'ordre ci-dessus
l'emporte et les copies de priorité inférieure sont ignorées.

Cela signifie :

- les plugins de l'espace de travail masquent intentionnellement les plugins groupés avec le même identifiant
- `plugins.allow: ["foo"]` autorise le plugin `foo` actif par identifiant, même lorsque
  la copie active provient de l'espace de travail au lieu de la racine de l'extension groupée
- si vous avez besoin d'un contrôle plus strict de la provenance, utilisez des chemins d'installation/chargement explicites et
  inspectez la source du plugin résolu avant de l'activer

### Règles d'activation

L'activation est résolue après la découverte :

- `plugins.enabled: false` désactive tous les plugins
- `plugins.deny` gagne toujours
- `plugins.entries.<id>.enabled: false` désactive ce plugin
- les plugins d'origine de l'espace de travail sont désactivés par défaut
- les listes d'autorisation restreignent l'ensemble actif lorsque `plugins.allow` n'est pas vide
- les listes d'autorisation sont basées sur l'**id**, et non sur la source
- les plugins groupés sont désactivés par défaut sauf si :
  - l'identifiant groupé fait partie de l'ensemble activé par défaut intégré, ou
  - vous l'activez explicitement, ou
  - la configuration du channel active implicitement le plugin de channel groupé
- les emplacements exclusifs peuvent forcer l'activation du plugin sélectionné pour cet emplacement

Dans le cœur actuel, les identifiants activés par défaut groupés incluent les assistants locaux/de provider tels que
`ollama`, `sglang`, `vllm`, ainsi que `device-pair`, `phone-control` et
`talk-voice`.

### Packs de paquets

Un répertoire de plugins peut inclure un `package.json` avec `openclaw.extensions` :

```json
{
  "name": "my-pack",
  "openclaw": {
    "extensions": ["./src/safety.ts", "./src/tools.ts"]
  }
}
```

Chaque entrée devient un plugin. Si le pack liste plusieurs extensions, l'identifiant du plugin
devient `name/<fileBase>`.

Si votre plugin importe des dépendances npm, installez-les dans ce répertoire afin que
`node_modules` soit disponible (`npm install` / `pnpm install`).

Garde-fou de sécurité : chaque entrée `openclaw.extensions` doit rester à l'intérieur du répertoire du plugin
après la résolution des liens symboliques. Les entrées qui s'échappent du répertoire du paquet sont
rejetées.

Note de sécurité : `openclaw plugins install` installe les dépendances des plugins avec
`npm install --ignore-scripts` (pas de scripts de cycle de vie). Gardez les arbres de dépendances des plugins "en JS/TS pur" et évitez les paquets qui nécessitent des builds `postinstall`.

### Métadonnées du catalogue de channel

Les plugins de channel peuvent publier des métadonnées d'intégration via `openclaw.channel` et
des indices d'installation via `openclaw.install`. Cela permet de garder le catalogue principal sans données.

Exemple :

```json
{
  "name": "@openclaw/nextcloud-talk",
  "openclaw": {
    "extensions": ["./index.ts"],
    "channel": {
      "id": "nextcloud-talk",
      "label": "Nextcloud Talk",
      "selectionLabel": "Nextcloud Talk (self-hosted)",
      "docsPath": "/channels/nextcloud-talk",
      "docsLabel": "nextcloud-talk",
      "blurb": "Self-hosted chat via Nextcloud Talk webhook bots.",
      "order": 65,
      "aliases": ["nc-talk", "nc"]
    },
    "install": {
      "npmSpec": "@openclaw/nextcloud-talk",
      "localPath": "extensions/nextcloud-talk",
      "defaultChoice": "npm"
    }
  }
}
```

OpenClaw peut également fusionner des **catalogues de canaux externes** (par exemple, un export de registre MPM). Déposez un fichier JSON à l'un des emplacements suivants :

- `~/.openclaw/mpm/plugins.json`
- `~/.openclaw/mpm/catalog.json`
- `~/.openclaw/plugins/catalog.json`

Ou pointez `OPENCLAW_PLUGIN_CATALOG_PATHS` (ou `OPENCLAW_MPM_CATALOG_PATHS`) vers
un ou plusieurs fichiers JSON (délimités par des virgules, des points-virgules ou `PATH`). Chaque fichier doit
contenir `{ "entries": [ { "name": "@scope/pkg", "openclaw": { "channel": {...}, "install": {...} } } ] }`.

## Identifiants de plugin

Identifiants de plugin par défaut :

- Paquets de packages : `package.json` `name`
- Fichier autonome : nom de base du fichier (`~/.../voice-call.ts` → `voice-call`)

Si un plugin exporte `id`, OpenClaw l'utilise mais avertit lorsqu'il ne correspond pas à
l'identifiant configuré.

## Modèle de registre

Les plugins chargés ne modifient pas directement les variables globales principales aléatoires. Ils s'inscrivent dans un
registre central de plugins.

Le registre suit :

- les enregistrements de plugins (identité, source, origine, statut, diagnostics)
- les outils
- les hooks legacy et les hooks typés
- les canaux
- les fournisseurs
- les gestionnaires de passerelle RPC
- les routes HTTP
- les enregistreurs CLI
- les services d'arrière-plan
- les commandes appartenant au plugin

Les fonctionnalités principales lisent ensuite ce registre au lieu de communiquer directement avec les modules de
plugin. Cela maintient le chargement unidirectionnel :

- module de plugin -> enregistrement dans le registre
- runtime principal -> consommation du registre

Cette séparation est importante pour la maintenabilité. Cela signifie que la plupart des surfaces principales n'ont
besoin que d'un point d'intégration : "lire le registre", et non "cas particuliers pour chaque module de
plugin".

## Config

```json5
{
  plugins: {
    enabled: true,
    allow: ["voice-call"],
    deny: ["untrusted-plugin"],
    load: { paths: ["~/Projects/oss/voice-call-extension"] },
    entries: {
      "voice-call": { enabled: true, config: { provider: "twilio" } },
    },
  },
}
```

Champs :

- `enabled` : interrupteur principal (par défaut : true)
- `allow` : liste d'autorisation (optionnel)
- `deny` : liste de refus (optionnel ; le refus l'emporte)
- `load.paths` : fichiers/répertoires de plugins supplémentaires
- `slots` : sélecteurs de slot exclusifs tels que `memory` et `contextEngine`
- `entries.<id>` : interrupteurs + config par plugin

Les modifications de configuration **nécessitent un redémarrage de la passerelle**.

Validation rules (strict) :

- Unknown plugin ids in `entries`, `allow`, `deny`, or `slots` are **errors**.
- Unknown `channels.<id>` keys are **errors** unless a plugin manifest declares
  the channel id.
- Plugin config is validated using the JSON Schema embedded in
  `openclaw.plugin.json` (`configSchema`).
- If a plugin is disabled, its config is preserved and a **warning** is emitted.

### Disabled vs missing vs invalid

These states are intentionally different :

- **disabled** : plugin exists, but enablement rules turned it off
- **missing** : config references a plugin id that discovery did not find
- **invalid** : plugin exists, but its config does not match the declared schema

OpenClaw preserves config for disabled plugins so toggling them back on is not
destructive.

## Plugin slots (exclusive categories)

Some plugin categories are **exclusive** (only one active at a time). Use
`plugins.slots` to select which plugin owns the slot :

```json5
{
  plugins: {
    slots: {
      memory: "memory-core", // or "none" to disable memory plugins
      contextEngine: "legacy", // or a plugin id such as "lossless-claw"
    },
  },
}
```

Supported exclusive slots :

- `memory` : active memory plugin (`"none"` disables memory plugins)
- `contextEngine` : active context engine plugin (`"legacy"` is the built-in default)

If multiple plugins declare `kind: "memory"` or `kind: "context-engine"`, only
the selected plugin loads for that slot. Others are disabled with diagnostics.

### Context engine plugins

Context engine plugins own session context orchestration for ingest, assembly,
and compaction. Register them from your plugin with
`api.registerContextEngine(id, factory)`, then select the active engine with
`plugins.slots.contextEngine`.

Use this when your plugin needs to replace or extend the default context
pipeline rather than just add memory search or hooks.

## Control UI (schema + labels)

L'interface de contrôle utilise `config.schema` (JSON Schema + `uiHints`) pour afficher de meilleurs formulaires.

OpenClaw augmente `uiHints` au moment de l'exécution en fonction des plugins découverts :

- Ajoute des étiquettes spécifiques à chaque plugin pour `plugins.entries.<id>` / `.enabled` / `.config`
- Fusionne les indices de champ de configuration facultatifs fournis par le plugin sous :
  `plugins.entries.<id>.config.<field>`

Si vous souhaitez que les champs de configuration de votre plugin affichent de bonnes étiquettes/espaces réservés (et marquer les secrets comme sensibles),
fournissez `uiHints` avec votre JSON Schema dans le manifeste du plugin.

Exemple :

```json
{
  "id": "my-plugin",
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {
      "apiKey": { "type": "string" },
      "region": { "type": "string" }
    }
  },
  "uiHints": {
    "apiKey": { "label": "API Key", "sensitive": true },
    "region": { "label": "Region", "placeholder": "us-east-1" }
  }
}
```

## CLI

```bash
openclaw plugins list
openclaw plugins info <id>
openclaw plugins install <path>                 # copy a local file/dir into ~/.openclaw/extensions/<id>
openclaw plugins install ./extensions/voice-call # relative path ok
openclaw plugins install ./plugin.tgz           # install from a local tarball
openclaw plugins install ./plugin.zip           # install from a local zip
openclaw plugins install -l ./extensions/voice-call # link (no copy) for dev
openclaw plugins install @openclaw/voice-call # install from npm
openclaw plugins install @openclaw/voice-call --pin # store exact resolved name@version
openclaw plugins update <id>
openclaw plugins update --all
openclaw plugins enable <id>
openclaw plugins disable <id>
openclaw plugins doctor
```

`plugins update` ne fonctionne que pour les installations npm suivies sous `plugins.installs`.
Si les métadonnées d'intégrité stockées changent entre les mises à jour, OpenClaw avertit et demande une confirmation (utilisez `--yes` global pour contourner les invites).

Les plugins peuvent également enregistrer leurs propres commandes de premier niveau (exemple : `openclaw voicecall`).

## API des plugins (aperçu)

Les plugins exportent soit :

- Une fonction : `(api) => { ... }`
- Un objet : `{ id, name, configSchema, register(api) { ... } }`

`register(api)` est l'endroit où les plugins attachent des comportements. Les enregistrements courants incluent :

- `registerTool`
- `registerHook`
- `on(...)` pour les hooks de cycle de vie typés
- `registerChannel`
- `registerProvider`
- `registerHttpRoute`
- `registerCommand`
- `registerCli`
- `registerContextEngine`
- `registerService`

Les plugins du moteur de contexte peuvent également enregistrer un gestionnaire de contexte owned by runtime :

```ts
export default function (api) {
  api.registerContextEngine("lossless-claw", () => ({
    info: { id: "lossless-claw", name: "Lossless Claw", ownsCompaction: true },
    async ingest() {
      return { ingested: true };
    },
    async assemble({ messages }) {
      return { messages, estimatedTokens: 0 };
    },
    async compact() {
      return { ok: true, compacted: false };
    },
  }));
}
```

Activez-le ensuite dans la configuration :

```json5
{
  plugins: {
    slots: {
      contextEngine: "lossless-claw",
    },
  },
}
```

## Hooks de plugin

Les plugins peuvent enregistrer des hooks au moment de l'exécution. Cela permet à un plugin de regrouper une automation
dirigée par les événements sans avoir besoin d'une installation séparée de pack de hooks.

### Exemple

```ts
export default function register(api) {
  api.registerHook(
    "command:new",
    async () => {
      // Hook logic here.
    },
    {
      name: "my-plugin.command-new",
      description: "Runs when /new is invoked",
    },
  );
}
```

Notes :

- Enregistrez les hooks explicitement via `api.registerHook(...)`.
- Les règles d'éligibilité des hooks s'appliquent toujours (exigences OS/bins/env/config).
- Les hooks gérés par les plugins apparaissent dans `openclaw hooks list` avec `plugin:<id>`.
- Vous ne pouvez pas activer/désactiver les hooks gérés par les plugins via `openclaw hooks` ; activez/désactivez plutôt le plugin.

### Hooks de cycle de vie de l'agent (`api.on`)

Pour les hooks de cycle de vie d'exécution typés, utilisez `api.on(...)` :

```ts
export default function register(api) {
  api.on(
    "before_prompt_build",
    (event, ctx) => {
      return {
        prependSystemContext: "Follow company style guide.",
      };
    },
    { priority: 10 },
  );
}
```

Hooks importants pour la construction de l'invite :

- `before_model_resolve` : s'exécute avant le chargement de la session (`messages` ne sont pas disponibles). Utilisez ceci pour remplacer de manière déterministe `modelOverride` ou `providerOverride`.
- `before_prompt_build` : s'exécute après le chargement de la session (`messages` sont disponibles). Utilisez ceci pour façonner l'entrée de l'invite.
- `before_agent_start` : hook de compatibilité héritée. Préférez les deux hooks explicites ci-dessus.

Politique de hook appliquée par le cœur :

- Les opérateurs peuvent désactiver les hooks de mutation d'invite par plugin via `plugins.entries.<id>.hooks.allowPromptInjection: false`.
- Lorsqu'ils sont désactivés, OpenClaw bloque `before_prompt_build` et ignore les champs de mutation d'invite renvoyés par l'héritage `before_agent_start` tout en préservant l'héritage `modelOverride` et `providerOverride`.

Champs de résultat `before_prompt_build` :

- `prependContext` : ajoute du texte avant l'invite utilisateur pour cette exécution. Idéal pour le contenu spécifique au tour ou dynamique.
- `systemPrompt` : remplacement complet de l'invite système.
- `prependSystemContext` : ajoute du texte avant l'invite système actuelle.
- `appendSystemContext` : ajoute du texte après l'invite système actuelle.

Ordre de construction de l'invite dans le runtime intégré :

1. Appliquer `prependContext` à l'invite utilisateur.
2. Appliquer le remplacement `systemPrompt` lorsqu'il est fourni.
3. Appliquer `prependSystemContext + current system prompt + appendSystemContext`.

Notes de fusion et de priorité :

- Les gestionnaires de hooks s'exécutent par priorité (la plus haute en premier).
- Pour les champs de contexte fusionnés, les valeurs sont concaténées dans l'ordre d'exécution.
- Les valeurs `before_prompt_build` sont appliquées avant les valeurs de repli `before_agent_start` héritées.

Conseils de migration :

- Déplacez les instructions statiques de `prependContext` vers `prependSystemContext` (ou `appendSystemContext`) afin que les fournisseurs puissent mettre en cache le contenu stable du préfixe système.
- Conservez `prependContext` pour le contexte dynamique par tour qui doit rester lié au message de l'utilisateur.

## Plugins de fournisseur (auth model)

Les plugins peuvent enregistrer des **fournisseurs de modèles** afin que les utilisateurs puissent effectuer une configuration OAuth ou par clé API
à l'intérieur de OpenClaw, afficher la configuration du fournisseur dans les assistants d'intégration/sélecteurs de modèles, et
contribuer à la découverte implicite de fournisseurs.

Les plugins de fournisseur constituent la jonction d'extension modulaire pour la configuration des fournisseurs de modèles. Ils
ne sont plus simplement des « aides OAuth ».

### Cycle de vie du plugin de fournisseur

Un plugin de fournisseur peut participer à cinq phases distinctes :

1. **Auth**
   `auth[].run(ctx)` effectue une OAuth, la capture de clé API, de code d'appareil, ou une configuration personnalisée
   et renvoie des profils d'authentification ainsi que des correctifs de configuration facultatifs.
2. **Configuration non interactive**
   `auth[].runNonInteractive(ctx)` gère `openclaw onboard --non-interactive`
   sans invite de commande. Utilisez ceci lorsque le fournisseur a besoin d'une configuration sans tête personnalisée
   au-delà des chemins intégrés simples de clé API.
3. **Intégration de l'assistant**
   `wizard.onboarding` ajoute une entrée à `openclaw onboard`.
   `wizard.modelPicker` ajoute une entrée de configuration au sélecteur de modèles.
4. **Découverte implicite**
   `discovery.run(ctx)` peut contribuer automatiquement à la configuration du fournisseur lors
   de la résolution/énumération des modèles.
5. **Suivi post-sélection**
   `onModelSelected(ctx)` s'exécute après qu'un modèle a été choisi. Utilisez ceci pour des tâches
   spécifiques au fournisseur telles que le téléchargement d'un modèle local.

C'est la répartition recommandée car ces phases ont des exigences de cycle de vie
différentes :

- l'authentification est interactive et écrit les informations d'identification/configuration
- la configuration non interactive est pilotée par des indicateurs/variables d'environnement et ne doit pas solliciter
- les métadonnées de l'assistant sont statiques et orientées interface utilisateur
- la découverte doit être sûre, rapide et tolérante aux pannes
- les crochets post-sélection sont des effets secondaires liés au modèle choisi

### Contrat d'authentification du fournisseur

`auth[].run(ctx)` renvoie :

- `profiles` : profils d'authentification à écrire
- `configPatch` : modifications `openclaw.json` facultatives
- `defaultModel` : ref `provider/model` facultative
- `notes` : notes destinées à l'utilisateur facultatives

Le cœur ensuite :

1. écrit les profils d'authentification renvoyés
2. applique le câblage de la configuration du profil d'authentification
3. fusionne le correctif de configuration
4. applique facultativement le modèle par défaut
5. exécute le crochet `onModelSelected` du fournisseur si nécessaire

Cela signifie qu'un plugin de fournisseur possède la logique de configuration spécifique au fournisseur, tandis que le cœur
possède le chemin générique de persistance et de fusion de configuration.

### Contrat non interactif du fournisseur

`auth[].runNonInteractive(ctx)` est facultatif. Implémentez-le lorsque le fournisseur
a besoin d'une configuration sans tête qui ne peut pas être exprimée via les flux génériques intégrés
de clé API.

Le contexte non interactif comprend :

- la configuration actuelle et de base
- options CLI d'intégration analysées
- assistants de journalisation/d'erreur d'exécution
- répertoires agent/workspace
- `resolveApiKey(...)` pour lire les clés du fournisseur à partir des indicateurs, des variables d'environnement ou des profils d'authentification
  existants tout en respectant `--secret-input-mode`
- `toApiKeyCredential(...)` pour convertir une clé résolue en informations d'identification de profil d'authentification
  avec le bon stockage en texte brut vs secret-ref

Utilisez cette surface pour les fournisseurs tels que :

- runtimes compatibles avec OpenAI auto-hébergés qui nécessitent `--custom-base-url` +
  `--custom-model-id`
- vérification ou synthèse de configuration non interactive spécifique au fournisseur

Ne demandez pas d'invite à partir de `runNonInteractive`. Rejetez les entrées manquantes avec des erreurs
actionnables à la place.

### Métadonnées de l'assistant du fournisseur

`wizard.onboarding` contrôle l'apparence du fournisseur dans l'intégration groupée :

- `choiceId` : valeur de choix d'authentification
- `choiceLabel` : libellé de l'option
- `choiceHint` : indication courte
- `groupId` : id du groupe de compartiments
- `groupLabel` : libellé du groupe
- `groupHint` : indication du groupe
- `methodId` : méthode d'authentification à exécuter

`wizard.modelPicker` contrôle la façon dont un provider apparaît en tant qu'entrée
« configurez-le maintenant » dans la sélection de model :

- `label`
- `hint`
- `methodId`

Lorsqu'un provider a plusieurs méthodes d'authentification, l'assistant peut soit pointer vers une
méthode explicite soit laisser OpenClaw synthétiser les choix par méthode.

OpenClaw valide les métadonnées de l'assistant provider lors de l'enregistrement du plugin :

- les ids de méthode d'authentification en double ou vides sont rejetés
- les métadonnées de l'assistant sont ignorées lorsque le provider n'a pas de méthodes d'authentification
- les liaisons `methodId` non valides sont rétrogradées en avertissements et reviennent aux
  méthodes d'authentification restantes du provider

### Contrat de discovery provider

`discovery.run(ctx)` renvoie l'un des éléments suivants :

- `{ provider }`
- `{ providers }`
- `null`

Utilisez `{ provider }` pour le cas courant où le plugin possède un id provider.
Utilisez `{ providers }` lorsqu'un plugin découvre plusieurs entrées provider.

Le contexte de discovery comprend :

- la configuration actuelle
- répertoires agent/espace de travail
- env du processus
- un assistant pour résoudre la clé API provider et une valeur de clé API sûre pour la discovery

La discovery doit être :

- rapide
- best-effort
- sûre à ignorer en cas d'échec
- prudente concernant les effets secondaires

Elle ne doit pas dépendre de invites ou d'une configuration de longue durée.

### Ordre de discovery

La discovery provider s'exécute en phases ordonnées :

- `simple`
- `profile`
- `paired`
- `late`

Utilisez :

- `simple` pour une discovery peu coûteuse limitée à l'environnement
- `profile` lorsque la discovery dépend des profils d'authentification
- `paired` pour les providers qui doivent se coordonner avec une autre étape de discovery
- `late` pour les sondages coûteux ou sur le réseau local

La plupart des fournisseurs auto-hébergés devraient utiliser `late`.

### Bonnes limites pour les plugins de fournisseur

Bon ajustement pour les plugins de fournisseur :

- fournisseurs locaux/auto-hébergés avec des flux de configuration personnalisés
- connexion par code d'appareil/OAuth spécifique au fournisseur
- découverte implicite des serveurs de modèles locaux
- effets secondaires après sélection, tels que les tirages de modèles

Moins pertinent :

- fournisseurs triviaux avec uniquement clé API qui ne diffèrent que par la variable d'environnement, l'URL de base et un
  modèle par défaut

Ceux-ci peuvent toujours devenir des plugins, mais le principal gain de modularité provient de
l'extraction d'abord des fournisseurs riches en comportement.

Enregistrez un fournisseur via `api.registerProvider(...)`. Chaque fournisseur expose une
ou plusieurs méthodes d'authentification (OAuth, clé API, code d'appareil, etc.). Ces méthodes peuvent
alimenter :

- `openclaw models auth login --provider <id> [--method <id>]`
- `openclaw onboard`
- entrées de configuration « fournisseur personnalisé » du sélecteur de modèles
- découverte implicite du fournisseur lors de la résolution/liste des modèles

Exemple :

```ts
api.registerProvider({
  id: "acme",
  label: "AcmeAI",
  auth: [
    {
      id: "oauth",
      label: "OAuth",
      kind: "oauth",
      run: async (ctx) => {
        // Run OAuth flow and return auth profiles.
        return {
          profiles: [
            {
              profileId: "acme:default",
              credential: {
                type: "oauth",
                provider: "acme",
                access: "...",
                refresh: "...",
                expires: Date.now() + 3600 * 1000,
              },
            },
          ],
          defaultModel: "acme/opus-1",
        };
      },
    },
  ],
  wizard: {
    onboarding: {
      choiceId: "acme",
      choiceLabel: "AcmeAI",
      groupId: "acme",
      groupLabel: "AcmeAI",
      methodId: "oauth",
    },
    modelPicker: {
      label: "AcmeAI (custom)",
      hint: "Connect a self-hosted AcmeAI endpoint",
      methodId: "oauth",
    },
  },
  discovery: {
    order: "late",
    run: async () => ({
      provider: {
        baseUrl: "https://acme.example/v1",
        api: "openai-completions",
        apiKey: "${ACME_API_KEY}",
        models: [],
      },
    }),
  },
});
```

Notes :

- `run` reçoit un `ProviderAuthContext` avec les assistants `prompter`, `runtime`,
  `openUrl` et `oauth.createVpsAwareHandlers`.
- `runNonInteractive` reçoit un `ProviderAuthMethodNonInteractiveContext`
  avec les assistants `opts`, `resolveApiKey` et `toApiKeyCredential` pour
  un onboarding sans interface (headless).
- Retournez `configPatch` lorsque vous devez ajouter des modèles par défaut ou une configuration de fournisseur.
- Retournez `defaultModel` pour que `--set-default` puisse mettre à jour les valeurs par défaut de l'agent.
- `wizard.onboarding` ajoute un choix de fournisseur à `openclaw onboard`.
- `wizard.modelPicker` ajoute une entrée « configurer ce fournisseur » au sélecteur de modèles.
- `discovery.run` renvoie soit `{ provider }` pour l'ID de fournisseur du plugin lui-même,
  soit `{ providers }` pour la découverte multi-fournisseurs.
- `discovery.order` contrôle le moment où le provider s'exécute par rapport aux phases de découverte intégrées : `simple`, `profile`, `paired` ou `late`.
- `onModelSelected` est le hook post-sélection pour les tâches de suivi spécifiques au provider, telles que la récupération d'un modèle local.

### Enregistrer un canal de messagerie

Les plugins peuvent enregistrer des **plugins de canal** qui se comportent comme les canaux intégrés (WhatsApp, Telegram, etc.). La configuration du canal se trouve sous `channels.<id>` et est validée par le code de votre plugin de canal.

```ts
const myChannel = {
  id: "acmechat",
  meta: {
    id: "acmechat",
    label: "AcmeChat",
    selectionLabel: "AcmeChat (API)",
    docsPath: "/channels/acmechat",
    blurb: "demo channel plugin.",
    aliases: ["acme"],
  },
  capabilities: { chatTypes: ["direct"] },
  config: {
    listAccountIds: (cfg) => Object.keys(cfg.channels?.acmechat?.accounts ?? {}),
    resolveAccount: (cfg, accountId) =>
      cfg.channels?.acmechat?.accounts?.[accountId ?? "default"] ?? {
        accountId,
      },
  },
  outbound: {
    deliveryMode: "direct",
    sendText: async () => ({ ok: true }),
  },
};

export default function (api) {
  api.registerChannel({ plugin: myChannel });
}
```

Notes :

- Mettez la configuration sous `channels.<id>` (et non `plugins.entries`).
- `meta.label` est utilisé pour les étiquettes dans les listes CLI/UI.
- `meta.aliases` ajoute des identifiants alternatifs pour la normalisation et les entrées CLI.
- `meta.preferOver` répertorie les identifiants de canal à ne pas activer automatiquement lorsque les deux sont configurés.
- `meta.detailLabel` et `meta.systemImage` permettent aux UI d'afficher des étiquettes/icônes de canal plus riches.

### Hooks d'intégration de canal

Les plugins de canal peuvent définir des hooks d'intégration facultatifs sur `plugin.onboarding` :

- `configure(ctx)` est le flux de configuration de base.
- `configureInteractive(ctx)` peut entièrement prendre en charge la configuration interactive pour les états configurés et non configurés.
- `configureWhenConfigured(ctx)` peut remplacer le comportement uniquement pour les canaux déjà configurés.

Priorité des hooks dans l'assistant :

1. `configureInteractive` (si présent)
2. `configureWhenConfigured` (uniquement lorsque l'état du canal est déjà configuré)
3. retour à `configure`

Détails du contexte :

- `configureInteractive` et `configureWhenConfigured` reçoivent :
  - `configured` (`true` ou `false`)
  - `label` (nom du canal orienté utilisateur utilisé par les invites)
  - plus les champs partagés config/runtime/prompter/options
- Le renvoi de `"skip"` laisse la sélection et le suivi des compte inchangés.
- Le renvoi de `{ cfg, accountId? }` applique les mises à jour de la configuration et enregistre la sélection du compte.

### Écrire un nouveau canal de messagerie (étape par étape)

Utilisez ceci lorsque vous souhaitez une **nouvelle interface de discussion** (un « canal de messagerie »), et non un fournisseur de modèle.
La documentation des fournisseurs de modèles se trouve sous `/providers/*`.

1. Choisir un identifiant + une forme de configuration

- Toute la configuration du canal se trouve sous `channels.<id>`.
- Privilégiez `channels.<id>.accounts.<accountId>` pour les configurations multi-comptes.

2. Définir les métadonnées du canal

- `meta.label`, `meta.selectionLabel`, `meta.docsPath`, `meta.blurb` contrôlent les listes CLI/UI.
- `meta.docsPath` doit pointer vers une page de documentation comme `/channels/<id>`.
- `meta.preferOver` permet à un plugin de remplacer un autre canal (l'activation automatique le privilégie).
- `meta.detailLabel` et `meta.systemImage` sont utilisés par les interfaces pour le texte de détail/icônes.

3. Implémenter les adaptateurs requis

- `config.listAccountIds` + `config.resolveAccount`
- `capabilities` (types de chat, média, fils de discussion, etc.)
- `outbound.deliveryMode` + `outbound.sendText` (pour l'envoi de base)

4. Ajouter des adaptateurs facultatifs si nécessaire

- `setup` (assistant), `security` (stratégie DM), `status` (santé/diagnostics)
- `gateway` (démarrage/arrêt/connexion), `mentions`, `threading`, `streaming`
- `actions` (actions de message), `commands` (comportement des commandes natives)

5. Enregistrer le canal dans votre plugin

- `api.registerChannel({ plugin })`

Exemple de configuration minimale :

```json5
{
  channels: {
    acmechat: {
      accounts: {
        default: { token: "ACME_TOKEN", enabled: true },
      },
    },
  },
}
```

Plugin de canal minimal (sortie uniquement) :

```ts
const plugin = {
  id: "acmechat",
  meta: {
    id: "acmechat",
    label: "AcmeChat",
    selectionLabel: "AcmeChat (API)",
    docsPath: "/channels/acmechat",
    blurb: "AcmeChat messaging channel.",
    aliases: ["acme"],
  },
  capabilities: { chatTypes: ["direct"] },
  config: {
    listAccountIds: (cfg) => Object.keys(cfg.channels?.acmechat?.accounts ?? {}),
    resolveAccount: (cfg, accountId) =>
      cfg.channels?.acmechat?.accounts?.[accountId ?? "default"] ?? {
        accountId,
      },
  },
  outbound: {
    deliveryMode: "direct",
    sendText: async ({ text }) => {
      // deliver `text` to your channel here
      return { ok: true };
    },
  },
};

export default function (api) {
  api.registerChannel({ plugin });
}
```

Chargez le plugin (répertoire des extensions ou `plugins.load.paths`), redémarrez la passerelle,
puis configurez `channels.<id>` dans votre configuration.

### Outils de l'agent

Voir le guide dédié : [Plugin agent tools](/fr/plugins/agent-tools).

### Enregistrer une méthode RPC de passerelle

```ts
export default function (api) {
  api.registerGatewayMethod("myplugin.status", ({ respond }) => {
    respond(true, { ok: true });
  });
}
```

### Enregistrer les commandes CLI

```ts
export default function (api) {
  api.registerCli(
    ({ program }) => {
      program.command("mycmd").action(() => {
        console.log("Hello");
      });
    },
    { commands: ["mycmd"] },
  );
}
```

### Enregistrer les commandes de réponse automatique

Les plugins peuvent enregistrer des commandes slash personnalisées qui s'exécutent **sans invoquer
l'agent IA**. Ceci est utile pour les commandes de basculement, les vérifications de statut ou les actions rapides
qui ne nécessitent pas de traitement LLM.

```ts
export default function (api) {
  api.registerCommand({
    name: "mystatus",
    description: "Show plugin status",
    handler: (ctx) => ({
      text: `Plugin is running! Channel: ${ctx.channel}`,
    }),
  });
}
```

Contexte du gestionnaire de commande :

- `senderId` : L'ID de l'expéditeur (si disponible)
- `channel` : Le canal où la commande a été envoyée
- `isAuthorizedSender` : Si l'expéditeur est un utilisateur autorisé
- `args` : Arguments passés après la commande (si `acceptsArgs: true`)
- `commandBody` : Le texte complet de la commande
- `config` : La configuration actuelle de OpenClaw

Options de commande :

- `name` : Nom de la commande (sans le `/` au début)
- `nativeNames` : Alias de commande native optionnels pour les interfaces slash/menu. Utilisez `default` pour tous les fournisseurs natifs, ou des clés spécifiques au fournisseur comme `discord`
- `description` : Texte d'aide affiché dans les listes de commandes
- `acceptsArgs` : Si la commande accepte des arguments (par défaut : false). Si false et que des arguments sont fournis, la commande ne correspondra pas et le message passera aux autres gestionnaires
- `requireAuth` : S'il faut exiger un expéditeur autorisé (par défaut : true)
- `handler` : Fonction qui renvoie `{ text: string }` (peut être asynchrone)

Exemple avec autorisation et arguments :

```ts
api.registerCommand({
  name: "setmode",
  description: "Set plugin mode",
  acceptsArgs: true,
  requireAuth: true,
  handler: async (ctx) => {
    const mode = ctx.args?.trim() || "default";
    await saveMode(mode);
    return { text: `Mode set to: ${mode}` };
  },
});
```

Remarques :

- Les commandes du plugin sont traitées **avant** les commandes intégrées et l'agent IA
- Les commandes sont enregistrées globalement et fonctionnent sur tous les canaux
- Les noms de commandes ne sont pas sensibles à la casse (`/MyStatus` correspond à `/mystatus`)
- Les noms de commande doivent commencer par une lettre et ne contenir que des lettres, des chiffres, des tirets et des traits de soulignement
- Les noms de commande réservés (tels que `help`, `status`, `reset`, etc.) ne peuvent pas être remplacés par des plugins
- L'enregistrement de commandes en double entre les plugins échouera avec une erreur de diagnostic

### Enregistrer les services d'arrière-plan

```ts
export default function (api) {
  api.registerService({
    id: "my-service",
    start: () => api.logger.info("ready"),
    stop: () => api.logger.info("bye"),
  });
}
```

## Conventions de dénomination

- Méthodes Gateway : `pluginId.action` (exemple : `voicecall.status`)
- Outils : `snake_case` (exemple : `voice_call`)
- Commandes CLI : kebab ou camel, mais évitez les conflits avec les commandes principales

## Skills

Les plugins peuvent inclure un skill dans le dépôt (`skills/<name>/SKILL.md`).
Activez-le avec `plugins.entries.<id>.enabled` (ou d'autres portes de configuration) et assurez-vous
qu'il est présent dans vos emplacements de skills gérés/espace de travail.

## Distribution (npm)

Empaquetage recommandé :

- Package principal : `openclaw` (ce dépôt)
- Plugins : packages npm séparés sous `@openclaw/*` (exemple : `@openclaw/voice-call`)

Contrat de publication :

- Le `package.json` du plugin doit inclure `openclaw.extensions` avec un ou plusieurs fichiers d'entrée.
- Les fichiers d'entrée peuvent être `.js` ou `.ts` (jiti charge le TS à l'exécution).
- `openclaw plugins install <npm-spec>` utilise `npm pack`, extrait dans `~/.openclaw/extensions/<id>/` et l'active dans la configuration.
- Stabilité des clés de configuration : les packages avec portée sont normalisés vers l'identifiant **sans portée** pour `plugins.entries.*`.

## Exemple de plugin : Appel vocal

Ce dépôt comprend un plugin d'appel vocal (Twilio ou repli vers le journal) :

- Source : `extensions/voice-call`
- Skill : `skills/voice-call`
- CLI : `openclaw voicecall start|status`
- Outil : `voice_call`
- RPC : `voicecall.start`, `voicecall.status`
- Config (twilio) : `provider: "twilio"` + `twilio.accountSid/authToken/from` (facultatif `statusCallbackUrl`, `twimlUrl`)
- Config (dev) : `provider: "log"` (pas de réseau)

Voir [Voice Call](/fr/plugins/voice-call) et `extensions/voice-call/README.md` pour la configuration et l'utilisation.

## Notes de sécurité

Les plugins s'exécutent dans le même processus que le Gateway. Traitez-les comme du code de confiance :

- N'installez que des plugins en qui vous avez confiance.
- Préférez les listes blanches `plugins.allow`.
- Rappelez-vous que `plugins.allow` est basé sur l'ID, donc un plugin d'espace de travail activé peut
  intentionnellement masquer un plugin intégré avec le même ID.
- Redémarrez le Gateway après des modifications.

## Tester les plugins

Les plugins peuvent (et devraient) inclure des tests :

- Les plugins dans le dépôt peuvent conserver les tests Vitest sous `src/**` (exemple : `src/plugins/voice-call.plugin.test.ts`).
- Les plugins publiés séparément devraient exécuter leur propre CI (lint/build/test) et valider que `openclaw.extensions` pointe vers le point d'entrée construit (`dist/index.js`).

import fr from '/components/footer/fr.mdx';

<fr />
