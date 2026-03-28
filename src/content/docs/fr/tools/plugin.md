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

Les plugins étendent OpenClaw avec de nouvelles capacités : canaux, fournisseurs de modèles, outils,
compétences, synthèse vocale, génération d'images, et plus encore. Certains plugins sont **core** (livrés
avec OpenClaw), d'autres sont **externes** (publiés sur npm par la communauté).

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

## Types de plugins

OpenClaw reconnaît deux formats de plugins :

| Format     | Fonctionnement                                                                   | Exemples                                               |
| ---------- | -------------------------------------------------------------------------------- | ------------------------------------------------------ |
| **Native** | `openclaw.plugin.json` + module d'exécution ; s'exécute dans le processus        | Plugins officiels, packages npm communautaires         |
| **Bundle** | Disposition compatible Codex/Claude/Cursor ; mappée aux fonctionnalités OpenClaw | `.codex-plugin/`, `.claude-plugin/`, `.cursor-plugin/` |

Les deux apparaissent sous `openclaw plugins list`. Consultez [Plugin Bundles](/fr/plugins/bundles) pour plus de détails sur les bundles.

Si vous écrivez un plugin natif, commencez par [Building Plugins](/fr/plugins/building-plugins)
et [Plugin SDK Overview](/fr/plugins/sdk-overview).

## Plugins officiels

### Installables (npm)

| Plugin          | Package                | Docs                                    |
| --------------- | ---------------------- | --------------------------------------- |
| Matrix          | `@openclaw/matrix`     | [Matrix](/fr/channels/matrix)           |
| Microsoft Teams | `@openclaw/msteams`    | [Microsoft Teams](/fr/channels/msteams) |
| Nostr           | `@openclaw/nostr`      | [Nostr](/fr/channels/nostr)             |
| Appel vocal     | `@openclaw/voice-call` | [Appel vocal](/fr/plugins/voice-call)   |
| Zalo            | `@openclaw/zalo`       | [Zalo](/fr/channels/zalo)               |
| Zalo Personal   | `@openclaw/zalouser`   | [Zalo Personal](/fr/plugins/zalouser)   |

### Core (livré avec OpenClaw)

<AccordionGroup>
  <Accordion title="Model providers (enabled by default)">
    `anthropic`, `byteplus`, `cloudflare-ai-gateway`, `github-copilot`, `google`,
    `huggingface`, `kilocode`, `kimi-coding`, `minimax`, `mistral`, `modelstudio`,
    `moonshot`, `nvidia`, `openai`, `opencode`, `opencode-go`, `openrouter`,
    `qianfan`, `qwen-portal-auth`, `synthetic`, `together`, `venice`,
    `vercel-ai-gateway`, `volcengine`, `xiaomi`, `zai`
  </Accordion>

<Accordion title="Plugins de mémoire">- `memory-core` — recherche de mémoire groupée (par défaut via `plugins.slots.memory`) - `memory-lancedb` — mémoire à long terme installée à la demande avec rappel/capture automatique (définir `plugins.slots.memory = "memory-lancedb"`)</Accordion>

<Accordion title="Fournisseurs de reconnaissance vocale (activés par défaut)">`elevenlabs`, `microsoft`</Accordion>

  <Accordion title="Autre">
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

| Champ            | Description                                                  |
| ---------------- | ------------------------------------------------------------ |
| `enabled`        | Commutateur principal (par défaut : `true`)                  |
| `allow`          | Liste d'autorisation des plugins (facultatif)                |
| `deny`           | Liste de refus des plugins (facultatif ; la refus l'emporte) |
| `load.paths`     | Fichiers/répertoires de plugins supplémentaires              |
| `slots`          | Sélecteurs de slot exclusifs (ex. `memory`, `contextEngine`) |
| `entries.\<id\>` | Commutateurs + configuration par plugin                      |

Les modifications de la configuration **nécessitent un redémarrage de la passerelle**. Si la passerelle fonctionne avec la surveillance de la configuration + le redémarrage en processus activés (le chemin par défaut `openclaw gateway`), ce redémarrage est généralement effectué automatiquement un instant après l'écriture de la configuration.

<Accordion title="États des plugins : désactivé vs manquant vs invalide">- **Désactivé** : le plugin existe mais les règles d'activation l'ont éteint. La configuration est conservée. - **Manquant** : la configuration fait référence à un identifiant de plugin que la découverte n'a pas trouvé. - **Invalide** : le plugin existe mais sa configuration ne correspond pas au schéma déclaré.</Accordion>

## Discovery et précédence

OpenClaw recherche les plugins dans cet ordre (la première correspondance l'emporte) :

<Steps>
  <Step title="Chemins de configuration">
    `plugins.load.paths` — chemins de fichiers ou de répertoires explicites.
  </Step>

  <Step title="Extensions de l'espace de travail">
    `\<workspace\>/.openclaw/extensions/*.ts` et `\<workspace\>/.openclaw/extensions/*/index.ts`.
  </Step>

<Step title="Extensions globales">`~/.openclaw/extensions/*.ts` et `~/.openclaw/extensions/*/index.ts`.</Step>

  <Step title="Plugins groupés">
    Livrés avec OpenClaw. Beaucoup sont activés par défaut (fournisseurs de model, parole).
    D'autres nécessitent une activation explicite.
  </Step>
</Steps>

### Règles d'activation

- `plugins.enabled: false` désactive tous les plugins
- `plugins.deny` l'emporte toujours sur la liste d'autorisation
- `plugins.entries.\<id\>.enabled: false` désactive ce plugin
- Les plugins d'origine espace de travail sont **désactivés par défaut** (doivent être explicitement activés)
- Les plugins groupés suivent l'ensemble intégré activé par défaut, sauf s'ils sont remplacés
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
openclaw plugins list                    # compact inventory
openclaw plugins inspect <id>            # deep detail
openclaw plugins inspect <id> --json     # machine-readable
openclaw plugins status                  # operational summary
openclaw plugins doctor                  # diagnostics

openclaw plugins install <package>        # install (ClawHub first, then npm)
openclaw plugins install clawhub:<pkg>   # install from ClawHub only
openclaw plugins install <path>          # install from local path
openclaw plugins install -l <path>       # link (no copy) for dev
openclaw plugins update <id>             # update one plugin
openclaw plugins update --all            # update all

openclaw plugins enable <id>
openclaw plugins disable <id>
```

Voir la [Référence CLI `openclaw plugins`](/fr/cli/plugins) pour plus de détails.

## Aperçu de API des plugins

Les plugins exportent soit une fonction, soit un objet avec `register(api)` :

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

Méthodes d'enregistrement courantes :

| Méthode                              | Ce qu'elle enregistre       |
| ------------------------------------ | --------------------------- |
| `registerProvider`                   | Fournisseur de modèle (LLM) |
| `registerChannel`                    | Salon de discussion         |
| `registerTool`                       | Outil d'agent               |
| `registerHook` / `on(...)`           | Crochets de cycle de vie    |
| `registerSpeechProvider`             | Synthèse vocale / STT       |
| `registerMediaUnderstandingProvider` | Analyse d'image/audio       |
| `registerImageGenerationProvider`    | Génération d'images         |
| `registerWebSearchProvider`          | Recherche Web               |
| `registerHttpRoute`                  | Point de terminaison HTTP   |
| `registerCommand` / `registerCli`    | CLI commandes               |
| `registerContextEngine`              | Moteur de contexte          |
| `registerService`                    | Service d'arrière-plan      |

Comportement de garde de hook pour les hooks de cycle de vie typés :

- `before_tool_call` : `{ block: true }` est terminal ; les gestionnaires de priorité inférieure sont ignorés.
- `before_tool_call` : `{ block: false }` est une opération vide et ne efface pas un bloc précédent.
- `message_sending` : `{ cancel: true }` est terminal ; les gestionnaires de priorité inférieure sont ignorés.
- `message_sending` : `{ cancel: false }` est une opération vide et ne efface pas une annulation précédente.

Pour le comportement complet des hooks typés, voir [Aperçu du SDK](/fr/plugins/sdk-overview#hook-decision-semantics).

## Connexes

- [Créer des plugins](/fr/plugins/building-plugins) — créer votre propre plugin
- [Bundles de plugins](/fr/plugins/bundles) — compatibilité des bundles Codex/Claude/Cursor
- [Manifeste de plugin](/fr/plugins/manifest) — schéma du manifeste
- [Enregistrement des outils](/fr/plugins/building-plugins#registering-agent-tools) — ajouter des outils d'agent dans un plugin
- [Fonctionnement interne des plugins](/fr/plugins/architecture) — modèle de capacité et pipeline de chargement
- [Plugins communautaires](/fr/plugins/community) — listes tierces
