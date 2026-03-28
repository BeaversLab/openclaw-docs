---
summary: "Plugins/extensions d'OpenClaw : découverte, configuration et sécurité"
read_when:
  - Adding or modifying plugins/extensions
  - Documenting plugin install or load rules
title: "Plugins"
---

# Plugins (Extensions)

## Quick start (nouveau avec les plugins ?)

Un plugin est simplement un **petit module de code** qui étend OpenClaw avec des
fonctionnalités supplémentaires (commandes, outils et Gateway RPC).

La plupart du temps, vous utiliserez des plugins lorsque vous voudrez une fonctionnalité qui n'est pas encore
intégrée au cœur d'OpenClaw (ou si vous souhaitez garder les fonctionnalités optionnelles hors de votre
installation principale).

Chemin rapide :

1. Voir ce qui est déjà chargé :

```bash
openclaw plugins list
```

2. Installer un plugin officiel (exemple : Voice Call) :

```bash
openclaw plugins install @openclaw/voice-call
```

3. Redémarrez la Gateway, puis configurez sous `plugins.entries.<id>.config`.

Voir [Voice Call](/fr/plugins/voice-call) pour un exemple concret de plugin.

## Plugins disponibles (officiels)

- Microsoft Teams est disponible uniquement sous forme de plugin depuis le 15/01/2026 ; installez `@openclaw/msteams` si vous utilisez Teams.
- Mémoire (Core) — plugin de recherche de mémoire inclus (activé par défaut via `plugins.slots.memory`)
- Mémoire (LanceDB) — plugin de mémoire à long terme inclus (rappel/capture automatique ; définissez `plugins.slots.memory = "memory-lancedb"`)
- [Voice Call](/fr/plugins/voice-call) — `@openclaw/voice-call`
- [Zalo Personal](/fr/plugins/zalouser) — `@openclaw/zalouser`
- [Matrix](/fr/channels/matrix) — `@openclaw/matrix`
- [Nostr](/fr/channels/nostr) — `@openclaw/nostr`
- [Zalo](/fr/channels/zalo) — `@openclaw/zalo`
- [Microsoft Teams](/fr/channels/msteams) — `@openclaw/msteams`
- Google Antigravity OAuth (auth provider) — inclus sous la forme `google-antigravity-auth` (désactivé par défaut)
- Gemini CLI OAuth (auth provider) — inclus sous la forme `google-gemini-cli-auth` (désactivé par défaut)
- Qwen OAuth (auth provider) — inclus sous la forme `qwen-portal-auth` (désactivé par défaut)
- Copilot Proxy (authentification du fournisseur) — pont proxy local Copilot VS Code ; distinct de la connexion de l'appareil `github-copilot` intégrée (regroupée, désactivée par défaut)

Les plugins OpenClaw sont des **modules TypeScript** chargés au moment de l'exécution via jiti. **La validation de la configuration n'exécute pas le code du plugin** ; elle utilise à la place le manifeste du plugin et le schéma JSON. Voir [Plugin manifest](/fr/plugins/manifest).

Les plugins peuvent enregistrer :

- Méthodes Gateway RPC
- Gestionnaires HTTP Gateway
- Outils d'agent
- Commandes CLI
- Services d'arrière-plan
- Validation de configuration facultative
- **Skills** (en listant les répertoires `skills` dans le manifeste du plugin)
- **Commandes de réponse automatique** (s'exécutent sans invoquer l'agent IA)

Les plugins s'exécutent **en cours de processus** avec le Gateway, traitez-les donc comme du code de confiance.
Guide de création d'outils : [Plugin agent tools](/fr/plugins/agent-tools).

## Assistants d'exécution

Les plugins peuvent accéder à certains assistants principaux via `api.runtime`. Pour la téléphonie TTS :

```ts
const result = await api.runtime.tts.textToSpeechTelephony({
  text: "Hello from OpenClaw",
  cfg: api.config,
});
```

Notes :

- Utilise la configuration principale `messages.tts` (OpenAI ou ElevenLabs).
- Renvoie le tampon audio PCM + le taux d'échantillonnage. Les plugins doivent rééchantillonner/encoder pour les fournisseurs.
- Edge TTS n'est pas pris en charge pour la téléphonie.

## Discovery & precedence

OpenClaw scanne, dans l'ordre :

1. Chemins de configuration

- `plugins.load.paths` (fichier ou répertoire)

2. Extensions de l'espace de travail

- `<workspace>/.openclaw/extensions/*.ts`
- `<workspace>/.openclaw/extensions/*/index.ts`

3. Extensions globales

- `~/.openclaw/extensions/*.ts`
- `~/.openclaw/extensions/*/index.ts`

4. Extensions regroupées (livrées avec OpenClaw, **désactivées par défaut**)

- `<openclaw>/extensions/*`

Les plugins regroupés doivent être activés explicitement via `plugins.entries.<id>.enabled`
ou `openclaw plugins enable <id>`. Les plugins installés sont activés par défaut,
mais peuvent être désactivés de la même manière.

Chaque plugin doit inclure un fichier `openclaw.plugin.json` à sa racine. Si un chemin
pointe vers un fichier, la racine du plugin est le répertoire du fichier et doit contenir le
manifeste.

Si plusieurs plugins résolvent vers le même identifiant, la première correspondance selon l'ordre ci-dessus l'emporte et les copies de moindre priorité sont ignorées.

### Packs de packages

Un répertoire de plugins peut inclure un `package.json` avec `openclaw.extensions` :

```json
{
  "name": "my-pack",
  "openclaw": {
    "extensions": ["./src/safety.ts", "./src/tools.ts"]
  }
}
```

Chaque entrée devient un plugin. Si le pack liste plusieurs extensions, l'identifiant du plugin devient `name/<fileBase>`.

Si votre plugin importe des dépendances npm, installez-les dans ce répertoire afin que `node_modules` soit disponible (`npm install` / `pnpm install`).

### Métadonnées du catalogue de canaux

Les plugins de canal peuvent publier des métadonnées d'intégration via `openclaw.channel` et des indices d'installation via `openclaw.install`. Cela maintient le catalogue principal exempt de données.

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

OpenClaw peut également fusionner des catalogues de canaux externes (par exemple, un export de registre MPM). Déposez un fichier JSON à l'un des emplacements suivants :

- `~/.openclaw/mpm/plugins.json`
- `~/.openclaw/mpm/catalog.json`
- `~/.openclaw/plugins/catalog.json`

Ou pointez `OPENCLAW_PLUGIN_CATALOG_PATHS` (ou `OPENCLAW_MPM_CATALOG_PATHS`) vers un ou plusieurs fichiers JSON (délimités par des virgules, des points-virgules ou `PATH`). Chaque fichier doit contenir `{ "entries": [ { "name": "@scope/pkg", "openclaw": { "channel": {...}, "install": {...} } } ] }`.

## Identifiants de plugin

Identifiants de plugin par défaut :

- Packs de packages : `package.json` `name`
- Fichier autonome : nom de base du fichier (`~/.../voice-call.ts` → `voice-call`)

Si un plugin exporte `id`, OpenClaw l'utilise mais avertit s'il ne correspond pas à l'identifiant configuré.

## Configuration

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
- `deny` : liste de refus (optionnel ; le refus prime)
- `load.paths` : fichiers/répertoires de plugins supplémentaires
- `entries.<id>` : interrupteurs + configuration par plugin

Les modifications de la configuration **nécessitent un redémarrage de la passerelle**.

Règles de validation (strictes) :

- Les IDs de plugin inconnus dans `entries`, `allow`, `deny` ou `slots` sont des **erreurs**.
- Les clés `channels.<id>` inconnues sont des **erreurs**, sauf si un manifeste de plugin déclare l'ID de channel.
- La configuration du plugin est validée à l'aide du JSON Schema intégré dans `openclaw.plugin.json` (`configSchema`).
- Si un plugin est désactivé, sa configuration est conservée et un **avertissement** est émis.

## Emplacements de plugin (catégories exclusives)

Certaines catégories de plugins sont **exclusives** (une seule active à la fois). Utilisez `plugins.slots` pour sélectionner quel plugin possède l'emplacement :

```json5
{
  plugins: {
    slots: {
      memory: "memory-core", // or "none" to disable memory plugins
    },
  },
}
```

Si plusieurs plugins déclarent `kind: "memory"`, seul celui sélectionné est chargé. Les autres sont désactivés avec des diagnostics.

## Interface de contrôle (schéma + étiquettes)

L'interface de contrôle utilise `config.schema` (JSON Schema + `uiHints`) pour afficher de meilleurs formulaires.

OpenClaw augmente `uiHints` à l'exécution en fonction des plugins découverts :

- Ajoute des étiquettes par plugin pour `plugins.entries.<id>` / `.enabled` / `.config`
- Fusionne les indications de champ de configuration optionnelles fournies par le plugin sous :
  `plugins.entries.<id>.config.<field>`

Si vous souhaitez que les champs de configuration de votre plugin affichent de bonnes étiquettes/espaces réservés (et marquer les secrets comme sensibles), fournissez `uiHints` avec votre JSON Schema dans le manifeste du plugin.

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
openclaw plugins update <id>
openclaw plugins update --all
openclaw plugins enable <id>
openclaw plugins disable <id>
openclaw plugins doctor
```

`plugins update` ne fonctionne que pour les installations npm suivies sous `plugins.installs`.

Les plugins peuvent également enregistrer leurs propres commandes de premier niveau (exemple : `openclaw voicecall`).

## API de plugin (aperçu)

Les plugins exportent soit :

- Une fonction : `(api) => { ... }`
- Un objet : `{ id, name, configSchema, register(api) { ... } }`

## Points d'ancrage de plugin

Les plugins peuvent fournir des points d'ancrage (hooks) et les enregistrer au moment de l'exécution. Cela permet à un plugin de regrouper l'automatisation pilotée par les événements sans installation séparée d'un pack de points d'ancrage.

### Exemple

```
import { registerPluginHooksFromDir } from "openclaw/plugin-sdk";

export default function register(api) {
  registerPluginHooksFromDir(api, "./hooks");
}
```

Notes :

- Les répertoires de hooks suivent la structure de hook normale (`HOOK.md` + `handler.ts`).
- Les règles d'éligibilité des hooks s'appliquent toujours (exigences OS/bins/env/config).
- Les hooks gérés par des plugins apparaissent dans `openclaw hooks list` avec `plugin:<id>`.
- Vous ne pouvez pas activer/désactiver les hooks gérés par des plugins via `openclaw hooks` ; activez/désactivez plutôt le plugin.

## Plugins de fournisseur (auth model)

Les plugins peuvent enregistrer des flux d'**authentification de fournisseur de model** afin que les utilisateurs puissent exécuter OAuth ou
la configuration de clé API dans OpenClaw (aucun script externe nécessaire).

Enregistrez un fournisseur via `api.registerProvider(...)`. Chaque fournisseur expose une
ou plusieurs méthodes d'authentification (OAuth, clé API, code d'appareil, etc.). Ces méthodes alimentent :

- `openclaw models auth login --provider <id> [--method <id>]`

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
});
```

Notes :

- `run` reçoit un `ProviderAuthContext` avec les aides `prompter`, `runtime`,
  `openUrl` et `oauth.createVpsAwareHandlers`.
- Retournez `configPatch` lorsque vous devez ajouter des modèles par défaut ou une configuration de fournisseur.
- Retournez `defaultModel` afin que `--set-default` puisse mettre à jour les valeurs par défaut de l'agent.

### Enregistrer un channel de messagerie

Les plugins peuvent enregistrer des **plugins de channel** qui se comportent comme des channels intégrés
(WhatsApp, Telegram, etc.). La configuration du channel réside sous `channels.<id>` et est
validée par le code de votre plugin de channel.

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

- Placez la configuration sous `channels.<id>` (et non `plugins.entries`).
- `meta.label` est utilisé pour les étiquettes dans les listes CLI/UI.
- `meta.aliases` ajoute des identifiants alternatifs pour la normalisation et les entrées CLI.
- `meta.preferOver` répertorie les identifiants de channel à sauter lors de l'auto-activation lorsque les deux sont configurés.
- `meta.detailLabel` et `meta.systemImage` permettent aux UI d'afficher des étiquettes/icônes de channel plus riches.

### Écrire un nouveau channel de messagerie (étape par étape)

Utilisez ceci lorsque vous souhaitez une **nouvelle interface de chat** (un « channel de messagerie »), et non un fournisseur de modèle.
La documentation du fournisseur de modèle se trouve sous `/providers/*`.

1. Choisissez un identifiant + une structure de configuration

- Toute la configuration du channel se trouve sous `channels.<id>`.
- Privilégiez `channels.<id>.accounts.<accountId>` pour les configurations multi-comptes.

2. Définir les métadonnées du channel

- `meta.label`, `meta.selectionLabel`, `meta.docsPath` et `meta.blurb` contrôlent les listes CLI/UI.
- `meta.docsPath` doit pointer vers une page de documentation comme `/channels/<id>`.
- `meta.preferOver` permet à un plugin de remplacer un autre channel (l'activation automatique le privilégie).
- `meta.detailLabel` et `meta.systemImage` sont utilisés par les interfaces pour le texte détaillé/les icônes.

3. Implémenter les adaptateurs requis

- `config.listAccountIds` + `config.resolveAccount`
- `capabilities` (types de chat, médias, fils de discussion, etc.)
- `outbound.deliveryMode` + `outbound.sendText` (pour l'envoi basique)

4. Ajouter des adaptateurs optionnels si nécessaire

- `setup` (assistant), `security` (politique DM), `status` (santé/diagnostiques)
- `gateway` (démarrage/arrêt/connexion), `mentions`, `threading`, `streaming`
- `actions` (actions de message), `commands` (comportement de commande native)

5. Enregistrer le channel dans votre plugin

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

Plugin de channel minimal (sortie uniquement) :

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

### Outils d'agent

Voir le guide dédié : [Plugin agent tools](/fr/plugins/agent-tools).

### Enregistrer une méthode de passerelle RPC

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

Les plugins peuvent enregistrer des commandes slash personnalisées qui s'exécutent **sans invoquer l'agent IA**. C'est utile pour les commandes de basculement, les vérifications de statut ou les actions rapides qui ne nécessitent pas de traitement LLM.

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
- `channel` : Le channel où la commande a été envoyée
- `isAuthorizedSender` : Si l'expéditeur est un utilisateur autorisé
- `args` : Arguments passés après la commande (si `acceptsArgs: true`)
- `commandBody` : Le texte complet de la commande
- `config` : La configuration actuelle de OpenClaw

Options de commande :

- `name` : Nom de la commande (sans le `/` de début)
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

Notes :

- Les commandes du plugin sont traitées **avant** les commandes intégrées et l'agent IA
- Les commandes sont enregistrées globalement et fonctionnent sur tous les channels
- Les noms de commandes ne sont pas sensibles à la casse (`/MyStatus` correspond à `/mystatus`)
- Les noms de commandes doivent commencer par une lettre et contenir uniquement des lettres, des chiffres, des traits d'union et des traits de soulignement
- Les noms de commandes réservés (comme `help`, `status`, `reset`, etc.) ne peuvent pas être remplacés par des plugins
- L'enregistrement en double de commandes entre plusieurs plugins échouera avec une erreur de diagnostic

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

- Méthodes du Gateway : `pluginId.action` (exemple : `voicecall.status`)
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
- `openclaw plugins install <npm-spec>` utilise `npm pack`, l'extrait dans `~/.openclaw/extensions/<id>/` et l'active dans la configuration.
- Stabilité de la clé de configuration : les packages avec portée sont normalisés vers l'identifiant **sans portée** pour `plugins.entries.*`.

## Exemple de plugin : Appel vocal

Ce dépôt comprend un plugin d'appel vocal (Twilio ou repli sur journal) :

- Source : `extensions/voice-call`
- Skill : `skills/voice-call`
- CLI : `openclaw voicecall start|status`
- Outil : `voice_call`
- RPC : `voicecall.start`, `voicecall.status`
- Config (twilio) : `provider: "twilio"` + `twilio.accountSid/authToken/from` (optionnel `statusCallbackUrl`, `twimlUrl`)
- Config (dev) : `provider: "log"` (pas de réseau)

Voir [Appel vocal](/fr/plugins/voice-call) et `extensions/voice-call/README.md` pour la configuration et l'utilisation.

## Notes de sécurité

Les plugins s'exécutent dans le même processus que le Gateway. Traitez-les comme du code de confiance :

- N'installez que des plugins en qui vous avez confiance.
- Préférez les listes blanches (allowlists) `plugins.allow`.
- Redémarrez le Gateway après les modifications.

## Tester les plugins

Les plugins peuvent (et doivent) inclure des tests :

- Les plugins dans le dépôt peuvent conserver les tests Vitest sous `src/**` (exemple : `src/plugins/voice-call.plugin.test.ts`).
- Les plugins publiés séparément doivent exécuter leur propre CI (lint/build/test) et vérifier que `openclaw.extensions` pointe vers le point d'entrée construit (`dist/index.js`).
