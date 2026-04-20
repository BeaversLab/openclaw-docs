---
summary: "Installer, configurer et gérer les plugins OpenClaw"
read_when:
  - Installing or configuring plugins
  - Understanding plugin discovery and load rules
  - Working with Codex/Claude-compatible plugin bundles
title: "Plugins"
sidebarTitle: "Installer et configurer"
---

# Plugins

Les plugins étendent OpenClaw avec de nouvelles capacités : canaux, fournisseurs de modèles, outils, compétences, synthèse vocale, transcription en temps réel, voix en temps réel, compréhension des médias, génération d'images, génération de vidéos, récupération web, recherche web, et plus encore. Certains plugins sont **core** (livrés avec OpenClaw), d'autres sont **externes** (publiés sur npm par la communauté).

## Quick start

<Steps>
  <Step title="See what is loaded">
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

  <Step title="Redémarrer la passerelle">
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

Le chemin d'installation utilise le même résolveur que la CLI : chemin/archive local, spécification explicite
`clawhub:<pkg>`, ou spécification de package nue (ClawHub en premier, puis repli sur npm).

Si la configuration n'est pas valide, l'installation échoue normalement de manière sécurisée et vous redirige vers `openclaw doctor --fix`. La seule exception de récupération est un chemin étroit de réinstallation de plugin groupé pour les plugins qui optent pour `openclaw.install.allowInvalidConfigRecovery`.

## Types de plugins

OpenClaw reconnaît deux formats de plugins :

| Format     | Fonctionnement                                                                   | Exemples                                               |
| ---------- | -------------------------------------------------------------------------------- | ------------------------------------------------------ |
| **Natif**  | `openclaw.plugin.json` + module d'exécution ; s'exécute dans le processus        | Plugins officiels, paquets communautaires npm          |
| **Groupé** | Mise en page compatible Codex/Claude/Cursor ; mappé aux fonctionnalités OpenClaw | `.codex-plugin/`, `.claude-plugin/`, `.cursor-plugin/` |

Les deux apparaissent sous `openclaw plugins list`. Voir [Plugin Bundles](/fr/plugins/bundles) pour les détails des groupements.

Si vous écrivez un plugin natif, commencez par [Building Plugins](/fr/plugins/building-plugins)
et le [Plugin SDK Overview](/fr/plugins/sdk-overview).

## Plugins officiels

### Installable (npm)

| Plugin          | Paquet                 | Docs                                    |
| --------------- | ---------------------- | --------------------------------------- |
| Matrix          | `@openclaw/matrix`     | [Matrix](/fr/channels/matrix)           |
| Microsoft Teams | `@openclaw/msteams`    | [Microsoft Teams](/fr/channels/msteams) |
| Nostr           | `@openclaw/nostr`      | [Nostr](/fr/channels/nostr)             |
| Appel vocal     | `@openclaw/voice-call` | [Voice Call](/fr/plugins/voice-call)    |
| Zalo            | `@openclaw/zalo`       | [Zalo](/fr/channels/zalo)               |
| Zalo Personnel  | `@openclaw/zalouser`   | [Zalo Personal](/fr/plugins/zalouser)   |

### Core (livré avec OpenClaw)

<AccordionGroup>
  <Accordion title="Model providers (enabled by default)">
    `anthropic`, `byteplus`, `cloudflare-ai-gateway`, `github-copilot`, `google`,
    `huggingface`, `kilocode`, `kimi-coding`, `minimax`, `mistral`, `qwen`,
    `moonshot`, `nvidia`, `openai`, `opencode`, `opencode-go`, `openrouter`,
    `qianfan`, `synthetic`, `together`, `venice`,
    `vercel-ai-gateway`, `volcengine`, `xiaomi`, `zai`
  </Accordion>

<Accordion title="Plugins de mémoire">- `memory-core` — recherche de mémoire intégrée (par défaut via `plugins.slots.memory`) - `memory-lancedb` — mémoire à long terme installée à la demande avec rappel/capture automatiques (définir `plugins.slots.memory = "memory-lancedb"`)</Accordion>

<Accordion title="Fournisseurs de synthèse vocale (activés par défaut)">`elevenlabs`, `microsoft`</Accordion>

  <Accordion title="Autre">
    - `browser` — plugin navigateur intégré pour l'outil de navigateur, `openclaw browser` CLI, méthode de CLI `browser.request`, runtime du navigateur et service de contrôle du navigateur par défaut (activé par défaut ; désactiver avant de le remplacer)
    - `copilot-proxy` — pont proxy VS Code Copilot (désactivé par défaut)
  </Accordion>
</AccordionGroup>

Vous cherchez des plugins tiers ? Voir [Plugins communautaires](/fr/plugins/community).

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

| Champ            | Description                                                      |
| ---------------- | ---------------------------------------------------------------- |
| `enabled`        | Interrupteur principal (par défaut : `true`)                     |
| `allow`          | Liste blanche de plugins (optionnelle)                           |
| `deny`           | Liste noire de plugins (optionnelle ; la liste noire l'emporte)  |
| `load.paths`     | Fichiers/répertoires de plugins supplémentaires                  |
| `slots`          | Sélecteurs de créneaux exclusifs (ex. `memory`, `contextEngine`) |
| `entries.\<id\>` | Interrupteurs + configuration par plugin                         |

Les modifications de la configuration **nécessitent un redémarrage de la passerelle**. Si la Gateway fonctionne avec la surveillance de la configuration + le redémarrage en processus activés (le chemin par défaut `openclaw gateway`), ce redémarrage est généralement effectué automatiquement un instant après l'écriture de la configuration.

<Accordion title="États des plugins : désactivé vs manquant vs invalide">- **Désactivé** : le plugin existe mais les règles d'activation l'ont désactivé. La configuration est conservée. - **Manquant** : la configuration fait référence à un id de plugin que la découverte n'a pas trouvé. - **Invalide** : le plugin existe mais sa configuration ne correspond pas au schéma déclaré.</Accordion>

## Discovery et priorité

OpenClaw recherche les plugins dans cet ordre (la première correspondance l'emporte) :

<Steps>
  <Step title="Chemins de configuration">
    `plugins.load.paths` — chemins de fichiers ou de répertoires explicites.
  </Step>

  <Step title="Extensions de l'espace de travail">
    `\<workspace\>/.openclaw/<plugin-root>/*.ts` et `\<workspace\>/.openclaw/<plugin-root>/*/index.ts`.
  </Step>

  <Step title="Extensions globales">
    `~/.openclaw/<plugin-root>/*.ts` et `~/.openclaw/<plugin-root>/*/index.ts`.
  </Step>

  <Step title="Plugins groupés">
    Livrés avec OpenClaw. Beaucoup sont activés par défaut (fournisseurs de modèles, synthèse vocale).
    D'autres nécessitent une activation explicite.
  </Step>
</Steps>

### Règles d'activation

- `plugins.enabled: false` désactive tous les plugins
- `plugins.deny` l'emporte toujours sur la liste d'autorisation
- `plugins.entries.\<id\>.enabled: false` désactive ce plugin
- Les plugins originaires de l'espace de travail sont **désactivés par défaut** (doivent être activés explicitement)
- Les plugins groupés suivent l'ensemble par défaut activé intégré, sauf en cas de substitution
- Les emplacements exclusifs peuvent forcer l'activation du plugin sélectionné pour cet emplacement

## Emplacements de plugins (catégories exclusives)

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
| `memory`        | Plugin de mémoire active | `memory-core`      |
| `contextEngine` | Moteur de contexte actif | `legacy` (intégré) |

## Référence CLI

```bash
openclaw plugins list                       # compact inventory
openclaw plugins list --enabled            # only loaded plugins
openclaw plugins list --verbose            # per-plugin detail lines
openclaw plugins list --json               # machine-readable inventory
openclaw plugins inspect <id>              # deep detail
openclaw plugins inspect <id> --json       # machine-readable
openclaw plugins inspect --all             # fleet-wide table
openclaw plugins info <id>                 # inspect alias
openclaw plugins doctor                    # diagnostics

openclaw plugins install <package>         # install (ClawHub first, then npm)
openclaw plugins install clawhub:<pkg>     # install from ClawHub only
openclaw plugins install <spec> --force    # overwrite existing install
openclaw plugins install <path>            # install from local path
openclaw plugins install -l <path>         # link (no copy) for dev
openclaw plugins install <plugin> --marketplace <source>
openclaw plugins install <plugin> --marketplace https://github.com/<owner>/<repo>
openclaw plugins install <spec> --pin      # record exact resolved npm spec
openclaw plugins install <spec> --dangerously-force-unsafe-install
openclaw plugins update <id>             # update one plugin
openclaw plugins update <id> --dangerously-force-unsafe-install
openclaw plugins update --all            # update all
openclaw plugins uninstall <id>          # remove config/install records
openclaw plugins uninstall <id> --keep-files
openclaw plugins marketplace list <source>
openclaw plugins marketplace list <source> --json

openclaw plugins enable <id>
openclaw plugins disable <id>
```

Les plugins groupés sont livrés avec OpenClaw. Beaucoup sont activés par défaut (par exemple
les fournisseurs de modèles groupés, les fournisseurs de synthèse vocale groupés et le plugin de
navigateur groupé). D'autres plugins groupés nécessitent encore `openclaw plugins enable <id>`.

`--force` écrase un plugin installé existant ou un pack de crochets (hook pack) sur place.
Il n'est pas pris en charge avec `--link`, qui réutilise le chemin source au lieu de
copier vers une cible d'installation gérée.

`--pin` est réservé à npm. Il n'est pas pris en charge avec `--marketplace`, car
les installations depuis la marketplace conservent les métadonnées source de la marketplace au lieu d'une spécification npm.

`--dangerously-force-unsafe-install` est une priorité de type « break-glass » pour les faux positifs du scanner de code dangereux intégré. Il permet aux installations et mises à jour de plugins de continuer au-delà des résultats `critical` intégrés, mais ne contourne toujours pas les blocages de politique de plugin `before_install` ou le blocage en cas d'échec du scan.

Ce drapeau CLI s'applique uniquement aux flux d'installation/mise à jour de plugins. Les installations de dépendances de compétences prises en charge par Gateway utilisent plutôt la priorité de requête `dangerouslyForceUnsafeInstall` correspondante, tandis que `openclaw skills install` reste le flux de téléchargement/installation de compétences ClawHub distinct.

Les bundles compatibles participent au même flux de liste/inspection/activation/désactivation de plugins. La prise en charge de l'exécution actuelle inclut les compétences de bundle, les compétences de commande Claude, les valeurs par défaut `settings.json` de Claude, `.lsp.json` de Claude et les valeurs par défaut `lspServers` déclarées dans le manifeste, les compétences de commande Cursor et les répertoires de hooks Codex compatibles.

`openclaw plugins inspect <id>` signale également les capacités de bundle détectées ainsi que les entrées de serveur MCP et LSP prises en charge ou non prises en charge pour les plugins pris en charge par un bundle.

Les sources de la place de marché peuvent être un nom de place de marché connue de Claude issu de `~/.claude/plugins/known_marketplaces.json`, un répertoire racine de place de marché local ou un chemin `marketplace.json`, un raccourci GitHub tel que `owner/repo`, une URL de dépôt GitHub ou une URL git. Pour les places de marché distantes, les entrées de plugins doivent rester à l'intérieur du dépôt de place de marché cloné et utiliser uniquement des sources de chemin relatif.

Consultez la référence de CLI `openclaw plugins` (/en/cli/plugins) pour plus de détails.

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

OpenClaw charge l'objet d'entrée et appelle `register(api)` lors de l'activation du plugin. Le chargeur revient encore à `activate(api)` pour les plugins plus anciens, mais les plugins groupés et les nouveaux plugins externes doivent considérer `register` comme le contrat public.

Méthodes d'enregistrement courantes :

| Méthode                                 | Ce qu'il enregistre         |
| --------------------------------------- | --------------------------- |
| `registerProvider`                      | Model provider (LLM)        |
| `registerChannel`                       | Chat channel                |
| `registerTool`                          | Agent tool                  |
| `registerHook` / `on(...)`              | Lifecycle hooks             |
| `registerSpeechProvider`                | Text-to-speech / STT        |
| `registerRealtimeTranscriptionProvider` | Streaming STT               |
| `registerRealtimeVoiceProvider`         | Duplex realtime voice       |
| `registerMediaUnderstandingProvider`    | Image/audio analysis        |
| `registerImageGenerationProvider`       | Image generation            |
| `registerMusicGenerationProvider`       | Music generation            |
| `registerVideoGenerationProvider`       | Video generation            |
| `registerWebFetchProvider`              | Web fetch / scrape provider |
| `registerWebSearchProvider`             | Web search                  |
| `registerHttpRoute`                     | HTTP endpoint               |
| `registerCommand` / `registerCli`       | CLI commands                |
| `registerContextEngine`                 | Context engine              |
| `registerService`                       | Background service          |

Hook guard behavior for typed lifecycle hooks:

- `before_tool_call`: `{ block: true }` is terminal; lower-priority handlers are skipped.
- `before_tool_call`: `{ block: false }` is a no-op and does not clear an earlier block.
- `before_install`: `{ block: true }` is terminal; lower-priority handlers are skipped.
- `before_install`: `{ block: false }` is a no-op and does not clear an earlier block.
- `message_sending`: `{ cancel: true }` is terminal; lower-priority handlers are skipped.
- `message_sending`: `{ cancel: false }` is a no-op and does not clear an earlier cancel.

For full typed hook behavior, see [SDK Overview](/fr/plugins/sdk-overview#hook-decision-semantics).

## Related

- [Building Plugins](/fr/plugins/building-plugins) — create your own plugin
- [Plugin Bundles](/fr/plugins/bundles) — Codex/Claude/Cursor bundle compatibility
- [Plugin Manifest](/fr/plugins/manifest) — manifest schema
- [Registering Tools](/fr/plugins/building-plugins#registering-agent-tools) — add agent tools in a plugin
- [Plugin Internals](/fr/plugins/architecture) — modèle de capacité et pipeline de chargement
- [Community Plugins](/fr/plugins/community) — listes tierces
