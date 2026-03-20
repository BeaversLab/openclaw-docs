---
summary: "OpenClaw plugins/extensions: discovery, config, and safety"
read_when:
  - Adding or modifying plugins/extensions
  - Documenting plugin install or load rules
title: "Plugins"
---

# Plugins (Extensions)

## Quick start (new to plugins?)

A plugin is just a **small code module** that extends OpenClaw with extra
features (commands, tools, and Gateway RPC).

Most of the time, you’ll use plugins when you want a feature that’s not built
into core OpenClaw yet (or you want to keep optional features out of your main
install).

Fast path:

1. See what’s already loaded:

```bash
openclaw plugins list
```

2. Install an official plugin (example: Voice Call):

```bash
openclaw plugins install @openclaw/voice-call
```

3. Restart the Gateway, then configure under `plugins.entries.<id>.config`.

See [Voice Call](/fr/plugins/voice-call) for a concrete example plugin.

## Available plugins (official)

- Microsoft Teams is plugin-only as of 2026.1.15; install `@openclaw/msteams` if you use Teams.
- Memory (Core) — bundled memory search plugin (enabled by default via `plugins.slots.memory`)
- Memory (LanceDB) — bundled long-term memory plugin (auto-recall/capture; set `plugins.slots.memory = "memory-lancedb"`)
- [Voice Call](/fr/plugins/voice-call) — `@openclaw/voice-call`
- [Zalo Personal](/fr/plugins/zalouser) — `@openclaw/zalouser`
- [Matrix](/fr/channels/matrix) — `@openclaw/matrix`
- [Nostr](/fr/channels/nostr) — `@openclaw/nostr`
- [Zalo](/fr/channels/zalo) — `@openclaw/zalo`
- [Microsoft Teams](/fr/channels/msteams) — `@openclaw/msteams`
- Google Antigravity OAuth (provider auth) — bundled as `google-antigravity-auth` (disabled by default)
- Gemini CLI OAuth (provider auth) — bundled as `google-gemini-cli-auth` (disabled by default)
- Qwen OAuth (provider auth) — bundled as `qwen-portal-auth` (disabled by default)
- Copilot Proxy (provider auth) — local VS Code Copilot Proxy bridge; distinct from built-in `github-copilot` device login (bundled, disabled by default)

Les plugins OpenClaw sont des **modules TypeScript** chargés au moment de l'exécution via jiti. **La validation de la configuration n'exécute pas le code du plugin** ; elle utilise à la place le manifeste du plugin et le schéma JSON. Voir [Plugin manifest](/fr/plugins/manifest).

Les plugins peuvent enregistrer :

- Méthodes Gateway RPC
- Gestionnaires HTTP Gateway
- Outils d'agent
- Commandes CLI
- Services d'arrière-plan
- Validation de configuration facultative
- **Skills** (en listant les répertoires `skills` dans le manifeste du plugin)
- **Commandes de réponse automatique** (exécuter sans invoquer l'agent IA)

Les plugins s'exécutent **in‑process** avec le Gateway, traitez-les donc comme un code de confiance.
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

- Utilise la configuration `messages.tts` principale (OpenAI ou ElevenLabs).
- Renvoie un tampon audio PCM + taux d'échantillonnage. Les plugins doivent rééchantillonner/encoder pour les fournisseurs.
- Edge TTS n'est pas pris en charge pour la téléphonie.

## Découverte et précédence

OpenClaw numérote, dans l'ordre :

1. Chemins de configuration

- `plugins.load.paths` (fichier ou répertoire)

2. Extensions de l'espace de travail

- `<workspace>/.openclaw/extensions/*.ts`
- `<workspace>/.openclaw/extensions/*/index.ts`

3. Extensions globales

- `~/.openclaw/extensions/*.ts`
- `~/.openclaw/extensions/*/index.ts`

4. Extensions groupées (livrées avec OpenClaw, **désactivées par défaut**)

- `<openclaw>/extensions/*`

Les plugins groupés doivent être explicitement activés via `plugins.entries.<id>.enabled`
ou `openclaw plugins enable <id>`. Les plugins installés sont activés par défaut,
mais peuvent être désactivés de la même manière.

Chaque plugin doit inclure un fichier `openclaw.plugin.json` à sa racine. Si un chemin
désigne un fichier, la racine du plugin est le répertoire du fichier et doit contenir le
manifeste.

Si plusieurs plugins correspondent au même identifiant, la première correspondance dans l'ordre ci-dessus
l'emporte et les copies de moindre précédence sont ignorées.

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

Chaque entrée devient un plugin. Si le pack liste plusieurs extensions, l'identifiant du plugin
devient `name/<fileBase>`.

Si votre plugin importe des dépendances npm, installez-les dans ce répertoire pour que `node_modules` soit disponible (`npm install` / `pnpm install`).

### Métadonnées du catalogue de canaux

Les plugins de canal peuvent annoncer des métadonnées d'intégration via `openclaw.channel` et des indices d'installation via `openclaw.install`. Cela maintient le catalogue principal sans données.

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

Ou pointez `OPENCLAW_PLUGIN_CATALOG_PATHS` (ou `OPENCLAW_MPM_CATALOG_PATHS`) vers un ou plusieurs fichiers JSON (délimités par des virgules, des points-virgules ou `PATH`). Chaque fichier doit contenir `{ "entries": [ { "name": "@scope/pkg", "openclaw": { "channel": {...}, "install": {...} } } ] }`.

## Identifiants de plugin

Identifiants de plugin par défaut :

- Paquets de packages : `package.json` `name`
- Fichier autonome : nom de base du fichier (`~/.../voice-call.ts` → `voice-call`)

Si un plugin exporte `id`, OpenClaw l'utilise mais avertit lorsqu'il ne correspond pas à l'identifiant configuré.

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
- `allow` : liste d'autorisation (facultatif)
- `deny` : liste de refus (facultatif ; le refus prime)
- `load.paths` : fichiers/répertoires de plugins supplémentaires
- `entries.<id>` : interrupteurs + config par plugin

Les modifications de la configuration **nécessitent un redémarrage de la passerelle**.

Règles de validation (strictes) :

- Les identifiants de plugin inconnus dans `entries`, `allow`, `deny` ou `slots` sont des **erreurs**.
- Les clés `channels.<id>` inconnues sont des **erreurs**, sauf si un manifeste de plugin déclare l'identifiant de canal.
- La configuration du plugin est validée à l'aide du schéma JSON intégré dans `openclaw.plugin.json` (`configSchema`).
- Si un plugin est désactivé, sa configuration est conservée et un **avertissement** est émis.

## Emplacements de plugin (catégories exclusives)

Certaines catégories de plugins sont **exclusives** (une seule active à la fois). Utilisez
`plugins.slots` pour sélectionner quel plugin possède l'emplacement :

```json5
{
  plugins: {
    slots: {
      memory: "memory-core", // or "none" to disable memory plugins
    },
  },
}
```

Si plusieurs plugins déclarent `kind: "memory"`, seul celui qui est sélectionné est chargé. Les autres
sont désactivés avec des diagnostics.

## Interface de contrôle (schéma + étiquettes)

L'interface de contrôle utilise `config.schema` (Schéma JSON + `uiHints`) pour afficher de meilleurs formulaires.

OpenClaw complète `uiHints` à l'exécution en fonction des plugins découverts :

- Ajoute des étiquettes par plugin pour `plugins.entries.<id>` / `.enabled` / `.config`
- Fusionne les indications facultatives de champs de configuration fournies par le plugin sous :
  `plugins.entries.<id>.config.<field>`

Si vous souhaitez que les champs de configuration de votre plugin affichent de bonnes étiquettes/espaces réservés (et marquer les secrets comme sensibles),
fournissez `uiHints` aux côtés de votre schéma JSON dans le manifeste du plugin.

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

Les plugins peuvent également enregistrer leurs propres commandes de niveau supérieur (exemple : `openclaw voicecall`).

## Plugin API (aperçu)

Les plugins exportent soit :

- Une fonction : `(api) => { ... }`
- Un objet : `{ id, name, configSchema, register(api) { ... } }`

## Points d' crochet (hooks) du plugin

Les plugins peuvent inclure des points d' crochet (hooks) et les enregistrer lors de l'exécution. Cela permet à un plugin de regrouper
l'automatisation basée sur les événements sans installation de pack de hooks séparé.

### Exemple

```
import { registerPluginHooksFromDir } from "openclaw/plugin-sdk";

export default function register(api) {
  registerPluginHooksFromDir(api, "./hooks");
}
```

Notes :

- Les répertoires de hooks suivent la structure normale des hooks (`HOOK.md` + `handler.ts`).
- Les règles d'éligibilité des hooks s'appliquent toujours (exigences OS/bins/env/config).
- Les hooks gérés par le plugin apparaissent dans `openclaw hooks list` avec `plugin:<id>`.
- Vous ne pouvez pas activer/désactiver les hooks gérés par le plugin via `openclaw hooks` ; activez/désactivez plutôt le plugin.

## Plugins de fournisseur (auth du modèle)

Les plugins peuvent enregistrer des flux d' **authentification de fournisseur de modèle** afin que les utilisateurs puissent exécuter OAuth ou
la configuration de clé API dans OpenClaw (aucun script externe nécessaire).

Enregistrez un fournisseur via `api.registerProvider(...)`. Chaque fournisseur expose une
ou plusieurs méthodes d'authentification (OAuth, clé API, code d'appareil, etc.). Ces méthodes permettent :

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

- `run` reçoit un `ProviderAuthContext` avec les assistants `prompter`, `runtime`,
  `openUrl` et `oauth.createVpsAwareHandlers`.
- Retournez `configPatch` lorsque vous devez ajouter des modèles par défaut ou une configuration de provider.
- Retournez `defaultModel` pour que `--set-default` puisse mettre à jour les valeurs par défaut de l'agent.

### Enregistrer un channel de messagerie

Les plugins peuvent enregistrer des **plugins de channel** qui se comportent comme des channels intégrés
(WhatsApp, Telegram, etc.). La configuration du channel se trouve sous `channels.<id>` et est
validée par votre code de plugin de channel.

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
- `meta.preferOver` liste les identifiants de channel à ignorer pour l'activation automatique lorsque les deux sont configurés.
- `meta.detailLabel` et `meta.systemImage` permettent aux UI d'afficher des étiquettes/icônes de channel plus riches.

### Écrire un nouveau channel de messagerie (étape par étape)

Utilisez ceci lorsque vous voulez une **nouvelle surface de chat** (un « channel de messagerie »), et non un provider de modèle.
La documentation du provider de modèle se trouve sous `/providers/*`.

1. Choisir un identifiant + une forme de configuration

- Toute la configuration de channel se trouve sous `channels.<id>`.
- Privilégiez `channels.<id>.accounts.<accountId>` pour les configurations multi-comptes.

2. Définir les métadonnées du channel

- `meta.label`, `meta.selectionLabel`, `meta.docsPath`, `meta.blurb` contrôlent les listes CLI/UI.
- `meta.docsPath` doit pointer vers une page de documentation comme `/channels/<id>`.
- `meta.preferOver` permet à un plugin de remplacer un autre channel (l'activation automatique le privilégie).
- `meta.detailLabel` et `meta.systemImage` sont utilisés par les UI pour le texte de détail/les icônes.

3. Implémenter les adaptateurs requis

- `config.listAccountIds` + `config.resolveAccount`
- `capabilities` (types de chat, médias, fils de discussion, etc.)
- `outbound.deliveryMode` + `outbound.sendText` (pour l'envoi basique)

4. Ajoutez des adaptateurs optionnels selon les besoins

- `setup` (assistant), `security` (stratégie DM), `status` (santé/diagnostic)
- `gateway` (démarrage/arrêt/connexion), `mentions`, `threading`, `streaming`
- `actions` (actions de message), `commands` (comportement de commande native)

5. Enregistrez le canal dans votre plugin

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

### Outils d'agent

Voir le guide dédié : [Outils d'agent de plugin](/fr/plugins/agent-tools).

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

Les plugins peuvent enregistrer des commandes slash personnalisées qui s'exécutent **sans appeler
l'agent IA**. C'est utile pour les commandes de basculement, les vérifications de statut ou les actions rapides
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
- `config` : La configuration actuelle d'OpenClaw

Options de commande :

- `name` : Nom de la commande (sans le `/` au début)
- `description` : Texte d'aide affiché dans les listes de commandes
- `acceptsArgs` : Si la commande accepte des arguments (par défaut : false). Si c'est false et que des arguments sont fournis, la commande ne correspondra pas et le message sera transmis aux autres gestionnaires
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

- Les commandes des plugins sont traitées **avant** les commandes intégrées et l'agent IA
- Les commandes sont enregistrées globalement et fonctionnent sur tous les canaux
- Les noms de commandes ne sont pas sensibles à la casse (`/MyStatus` correspond à `/mystatus`)
- Les noms de commandes doivent commencer par une lettre et contenir uniquement des lettres, des chiffres, des traits d'union et des traits de soulignement
- Les noms de commandes réservés (tels que `help`, `status`, `reset`, etc.) ne peuvent pas être remplacés par des plugins
- L'enregistrement de commandes en double entre plusieurs plugins échouera avec une erreur de diagnostic

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

## Conventions de nommage

- Méthodes du Gateway : `pluginId.action` (exemple : `voicecall.status`)
- Outils : `snake_case` (exemple : `voice_call`)
- Commandes CLI : kebab ou camel, mais évitez les conflits avec les commandes principales

## Skills

Les plugins peuvent inclure une compétence (skill) dans le dépôt (`skills/<name>/SKILL.md`).
Activez-la avec `plugins.entries.<id>.enabled` (ou d'autres portes de configuration) et assurez-vous
qu'elle est présente dans vos espaces de travail/emplacements de compétences gérés.

## Distribution (npm)

Empaquetage recommandé :

- Paquet principal : `openclaw` (ce dépôt)
- Plugins : paquets npm distincts sous `@openclaw/*` (exemple : `@openclaw/voice-call`)

Contrat de publication :

- Le `package.json` du plugin doit inclure `openclaw.extensions` avec un ou plusieurs fichiers d'entrée.
- Les fichiers d'entrée peuvent être `.js` ou `.ts` (jiti charge le TS à l'exécution).
- `openclaw plugins install <npm-spec>` utilise `npm pack`, l'extrait dans `~/.openclaw/extensions/<id>/` et l'active dans la configuration.
- Stabilité des clés de configuration : les paquets portés (scoped) sont normalisés vers l'id **non porté** pour `plugins.entries.*`.

## Exemple de plugin : Appel vocal

Ce dépôt comprend un plugin d'appel vocal (Twilio ou secours par journalisation) :

- Source : `extensions/voice-call`
- Compétence (Skill) : `skills/voice-call`
- CLI : `openclaw voicecall start|status`
- Outil : `voice_call`
- RPC : `voicecall.start`, `voicecall.status`
- Config (twilio) : `provider: "twilio"` + `twilio.accountSid/authToken/from` (`statusCallbackUrl` facultatif, `twimlUrl`)
- Config (dev) : `provider: "log"` (pas de réseau)

Voir [Voice Call](/fr/plugins/voice-call) et `extensions/voice-call/README.md` pour la configuration et l'utilisation.

## Remarques de sécurité

Les plugins s'exécutent dans le même processus que le Gateway. Traitez-les comme du code de confiance :

- N'installez que les plugins auxquels vous faites confiance.
- Privilégiez les listes blanches `plugins.allow`.
- Redémarrez le Gateway après avoir effectué des modifications.

## Tester les plugins

Les plugins peuvent (et doivent) inclure des tests :

- Les plugins dans le dépôt peuvent conserver les tests Vitest sous `src/**` (exemple : `src/plugins/voice-call.plugin.test.ts`).
- Les plugins publiés séparément doivent exécuter leur propre CI (lint/build/test) et valider que `openclaw.extensions` pointe vers le point d'entrée construit (`dist/index.js`).

import fr from "/components/footer/fr.mdx";

<fr />
