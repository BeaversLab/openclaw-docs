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

  <Step title="Redémarrer le Gateway">
    ```bash
    openclaw gateway restart
    ```

    Configurez ensuite sous `plugins.entries.\<id\>.config` dans votre fichier de configuration.

  </Step>
</Steps>

Si vous préférez un contrôle natif par chat, activez `commands.plugins: true` et utilisez :

```text
/plugin install clawhub:@openclaw/voice-call
/plugin show voice-call
/plugin enable voice-call
```

Le chemin d'installation utilise le même résolveur que la CLI : chemin/archif local, `clawhub:<pkg>` explicite, ou spécification de package brute (ClawHub d'abord, puis repli sur npm).

Si la configuration est invalide, l'installation échoue normalement de manière fermée et vous dirige vers `openclaw doctor --fix`. La seule exception de récupération est un chemin étroit de réinstallation de plugin groupé pour les plugins qui optent pour `openclaw.install.allowInvalidConfigRecovery`.

Les installations packagées d'OpenClaw n'installent pas précipitamment l'arborescence des dépendances d'exécution de chaque plugin inclus. Lorsqu'un plugin inclus appartenant à OpenClaw est actif via la configuration des plugins, la configuration héritée du canal, ou un manifeste activé par défaut, le démarrage répare uniquement les dépendances d'exécution déclarées de ce plugin avant de l'importer. Les plugins externes et les chemins de chargement personnalisés doivent toujours être installés via `openclaw plugins install`.

## Types de plugins

OpenClaw reconnaît deux formats de plugins :

| Format     | Fonctionnement                                                                          | Exemples                                               |
| ---------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| **Natif**  | `openclaw.plugin.json` + module d'exécution ; s'exécute en cours de processus           | Plugins officiels, packages communautaires npm         |
| **Bundle** | Disposition compatible avec Codex/Claude/Cursor ; mappée aux fonctionnalités d'OpenClaw | `.codex-plugin/`, `.claude-plugin/`, `.cursor-plugin/` |

Les deux apparaissent sous `openclaw plugins list`. Voir [Plugin Bundles](/fr/plugins/bundles) pour plus de détails sur les bundles.

Si vous rédigez un plugin natif, commencez par [Building Plugins](/fr/plugins/building-plugins)
et la [Plugin SDK Overview](/fr/plugins/sdk-overview).

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
  <Accordion title="Fournisseurs de modèles (activés par défaut)">
    `anthropic`, `byteplus`, `cloudflare-ai-gateway`, `github-copilot`, `google`,
    `huggingface`, `kilocode`, `kimi-coding`, `minimax`, `mistral`, `qwen`,
    `moonshot`, `nvidia`, `openai`, `opencode`, `opencode-go`, `openrouter`,
    `qianfan`, `synthetic`, `together`, `venice`,
    `vercel-ai-gateway`, `volcengine`, `xiaomi`, `zai`
  </Accordion>

<Accordion title="Plugins de mémoire">- `memory-core` — recherche de mémoire intégrée (par défaut via `plugins.slots.memory`) - `memory-lancedb` — mémoire à long terme installée à la demande avec rappel/capture automatiques (définir `plugins.slots.memory = "memory-lancedb"`)</Accordion>

<Accordion title="Fournisseurs de synthèse vocale (activés par défaut)">`elevenlabs`, `microsoft`</Accordion>

  <Accordion title="Autres">
    - `browser` — plugin navigateur intégré pour l'outil navigateur, `openclaw browser` CLI, méthode de passerelle `browser.request`, runtime du navigateur et service de contrôle de navigateur par défaut (activé par défaut ; désactiver avant de le remplacer)
    - `copilot-proxy` — pont proxy VS Code Copilot (désactivé par défaut)
  </Accordion>
</AccordionGroup>

Vous cherchez des plugins tiers ? Voir [Community Plugins](/fr/plugins/community).

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

| Champ            | Description                                                  |
| ---------------- | ------------------------------------------------------------ |
| `enabled`        | Commutateur principal (par défaut : `true`)                  |
| `allow`          | Liste blanche de plugins (facultatif)                        |
| `deny`           | Liste noire de plugins (facultatif ; deny l'emporte)         |
| `load.paths`     | Fichiers/répertoires de plugins supplémentaires              |
| `slots`          | Sélecteurs de slot exclusifs (ex. `memory`, `contextEngine`) |
| `entries.\<id\>` | Commutateurs et config par plugin                            |

Les modifications de config **nécessitent un redémarrage de la passerelle**. Si le Gateway fonctionne avec la surveillance de la config + le redémarrage en cours de processus activé (le chemin `openclaw gateway` par défaut), ce redémarrage est généralement effectué automatiquement un instant après l'écriture de la config.

<Accordion title="Plugin states: disabled vs missing vs invalid">- **Disabled** : le plugin existe mais les règles d'activation l'ont désactivé. La config est préservée. - **Missing** : la config fait référence à un id de plugin que la découverte n'a pas trouvé. - **Invalid** : le plugin existe mais sa config ne correspond pas au schéma déclaré.</Accordion>

## Découverte et priorité

OpenClaw recherche les plugins dans cet ordre (la première correspondance l'emporte) :

<Steps>
  <Step title="Config paths">
    `plugins.load.paths` — chemins de fichiers ou de répertoires explicites.
  </Step>

  <Step title="Plugins d'espace de travail">
    `\<workspace\>/.openclaw/<plugin-root>/*.ts` et `\<workspace\>/.openclaw/<plugin-root>/*/index.ts`.
  </Step>

  <Step title="Plugins globaux">
    `~/.openclaw/<plugin-root>/*.ts` et `~/.openclaw/<plugin-root>/*/index.ts`.
  </Step>

  <Step title="Bundled plugins">
    Livrés avec OpenClaw. Beaucoup sont activés par défaut (fournisseurs de model, speech).
    D'autres nécessitent une activation explicite.
  </Step>
</Steps>

### Règles d'activation

- `plugins.enabled: false` désactive tous les plugins
- `plugins.deny` l'emporte toujours sur allow
- `plugins.entries.\<id\>.enabled: false` désactive ce plugin
- Les plugins d'origine Workspace sont **désactivés par défaut** (doivent être explicitement activés)
- Les plugins groupés suivent l'ensemble intégré activé par défaut, sauf en cas de substitution
- Les slots exclusifs peuvent forcer l'activation du plugin sélectionné pour ce slot

## Slots de plugins (catégories exclusives)

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
openclaw plugins update <id-or-npm-spec> # update one plugin
openclaw plugins update <id-or-npm-spec> --dangerously-force-unsafe-install
openclaw plugins update --all            # update all
openclaw plugins uninstall <id>          # remove config/install records
openclaw plugins uninstall <id> --keep-files
openclaw plugins marketplace list <source>
openclaw plugins marketplace list <source> --json

openclaw plugins enable <id>
openclaw plugins disable <id>
```

Les plugins groupés sont livrés avec OpenClaw. Beaucoup sont activés par défaut (par exemple
les fournisseurs de model groupés, les fournisseurs de reconnaissance vocale groupés, et le plugin
de navigateur groupé). D'autres plugins groupés nécessitent encore `openclaw plugins enable <id>`.

`--force` écrase un plugin installé existant ou un pack de hooks sur place. Utilisez
`openclaw plugins update <id-or-npm-spec>` pour les mises à niveau de routine des plugins npm
suivis. Cela n'est pas pris en charge avec `--link`, qui réutilise le chemin source au lieu
de copier sur une cible d'installation gérée.

`openclaw plugins update <id-or-npm-spec>` s'applique aux installations suivies. Le fait de passer
une spécification de paquet npm avec un dist-tag ou une version exacte résout le nom du paquet
retour vers l'enregistrement du plugin suivi et enregistre la nouvelle spécification pour les futures mises à jour.
Passer le nom du paquet sans version ramène une installation exacte épinglée à la ligne de publication par défaut du registre. Si le plugin npm installé correspond déjà
à la version résolue et à l'identité de l'artefact enregistré, OpenClaw ignore la mise à jour
sans télécharger, réinstaller ou réécrire la configuration.

`--pin` est réservé à npm. Il n'est pas pris en charge avec `--marketplace`, car
les installations de la marketplace persistent les métadonnées sources de la marketplace au lieu d'une spécification npm.

`--dangerously-force-unsafe-install` est une option de contournement de dernière instance pour les faux positifs du scanneur de code dangereux intégré. Elle permet aux installations et mises à jour de plugins de se poursuivre malgré les résultats `critical` intégrés, mais elle ne contourne toujours pas les blocages de stratégie de plugin `before_install` ou le blocage en cas d'échec du scan.

Ce drapeau CLI s'applique uniquement aux flux d'installation et de mise à jour de plugins. Les installations de dépendances de compétences prises en charge par Gateway utilisent plutôt la substitution de requête `dangerouslyForceUnsafeInstall` correspondante, tandis que `openclaw skills install` reste le flux de téléchargement et d'installation de compétences distinct sur ClawHub.

Les bundles compatibles participent au même flux de liste/inspection/activation/désactivation de plugins. La prise en charge de l'exécution actuelle inclut les compétences de bundle, les compétences de commande Claude, les valeurs par défaut `settings.json` Claude, les `.lsp.json` Claude et les valeurs par défaut `lspServers` déclarées dans le manifeste, les compétences de commande Cursor et les répertoires de hooks Codex compatibles.

`openclaw plugins inspect <id>` signale également les capacités de bundle détectées ainsi que les entrées de serveur MCP et LSP prises en charge ou non prises en charge pour les plugins basés sur des bundles.

Les sources de la place de marché peuvent être un nom de place de marché connue de Claude provenant de `~/.claude/plugins/known_marketplaces.json`, un chemin racine de place de marché local ou un chemin `marketplace.json`, un raccourci GitHub tel que `owner/repo`, une URL de dépôt GitHub ou une URL git. Pour les places de marché distantes, les entrées de plugin doivent rester à l'intérieur du dépôt de la place de marché cloné et utiliser uniquement des sources de chemin relatif.

Consultez la [référence CLI `openclaw plugins`](/fr/cli/plugins) pour plus de détails.

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

Méthodes d'enregistrement courantes :

| Méthode                                 | Ce qu'il enregistre                        |
| --------------------------------------- | ------------------------------------------ |
| `registerProvider`                      | Modèle de fournisseur (LLM)                |
| `registerChannel`                       | Canal de chat                              |
| `registerTool`                          | Outil d'agent                              |
| `registerHook` / `on(...)`              | Crochets de cycle de vie                   |
| `registerSpeechProvider`                | Synthèse vocale / STT                      |
| `registerRealtimeTranscriptionProvider` | STT en continu                             |
| `registerRealtimeVoiceProvider`         | Voix en temps réel duplex                  |
| `registerMediaUnderstandingProvider`    | Analyse d'image/audio                      |
| `registerImageGenerationProvider`       | Génération d'images                        |
| `registerMusicGenerationProvider`       | Génération de musique                      |
| `registerVideoGenerationProvider`       | Génération vidéo                           |
| `registerWebFetchProvider`              | Fournisseur de récupération/extraction Web |
| `registerWebSearchProvider`             | Recherche Web                              |
| `registerHttpRoute`                     | Point de terminaison HTTP                  |
| `registerCommand` / `registerCli`       | Commandes CLI                              |
| `registerContextEngine`                 | Moteur de contexte                         |
| `registerService`                       | Service d'arrière-plan                     |

Comportement de garde de crochet pour les crochets de cycle de vie typés :

- `before_tool_call` : `{ block: true }` est terminal ; les gestionnaires de priorité inférieure sont ignorés.
- `before_tool_call` : `{ block: false }` est une opération vide et ne efface pas un bloc précédent.
- `before_install` : `{ block: true }` est terminal ; les gestionnaires de priorité inférieure sont ignorés.
- `before_install` : `{ block: false }` est une opération vide et ne efface pas un bloc précédent.
- `message_sending` : `{ cancel: true }` est terminal ; les gestionnaires de priorité inférieure sont ignorés.
- `message_sending` : `{ cancel: false }` est une opération vide et ne efface pas une annulation précédente.

Pour le comportement complet des crochets typés, voir [Aperçu du SDK](/fr/plugins/sdk-overview#hook-decision-semantics).

## Connexes

- [Création de plugins](/fr/plugins/building-plugins) — créer votre propre plugin
- [Lots de plugins](/fr/plugins/bundles) — compatibilité des lots Codex/Claude/Cursor
- [Manifeste de plugin](/fr/plugins/manifest) — schéma de manifeste
- [Enregistrement des outils](/fr/plugins/building-plugins#registering-agent-tools) — ajouter des outils d'agent dans un plugin
- [Plugin Internals](/fr/plugins/architecture) — modèle de capacité et pipeline de chargement
- [Community Plugins](/fr/plugins/community) — listes de plugins tiers
