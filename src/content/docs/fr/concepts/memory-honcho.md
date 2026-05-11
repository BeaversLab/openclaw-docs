---
summary: "Mémoire inter-sessions native IA via le plugin Honcho"
title: "Mémoire Honcho"
read_when:
  - You want persistent memory that works across sessions and channels
  - You want AI-powered recall and user modeling
---

[Honcho](https://honcho.dev) ajoute une mémoire native IA à OpenClaw. Il persiste les conversations vers un service dédié et construit des modèles d'utilisateur et d'agent au fil du temps, donnant à votre agent un contexte inter-sessions qui va au-delà des fichiers Markdown de l'espace de travail.

## Ce qu'il fournit

- **Mémoire inter-sessions** -- les conversations sont persistées après chaque tour, donc le contexte se maintient à travers les réinitialisations de session, la compaction et les changements de channel.
- **Modélisation utilisateur** -- Honcho maintient un profil pour chaque utilisateur (préférences, faits, style de communication) et pour l'agent (personnalité, comportements appris).
- **Recherche sémantique** -- recherche sur les observations des conversations passées, et pas seulement la session actuelle.
- **Conscience multi-agent** -- les agents parents suivent automatiquement les sous-agents générés, les parents étant ajoutés comme observateurs dans les sessions enfants.

## Outils disponibles

Honcho enregistre des outils que l'agent peut utiliser pendant la conversation :

**Récupération de données (rapide, sans appel LLM) :**

| Outil                       | Ce qu'il fait                                                              |
| --------------------------- | -------------------------------------------------------------------------- |
| `honcho_context`            | Représentation complète de l'utilisateur à travers les sessions            |
| `honcho_search_conclusions` | Recherche sémantique sur les conclusions stockées                          |
| `honcho_search_messages`    | Trouver des messages à travers les sessions (filtrer par expéditeur, date) |
| `honcho_session`            | Historique et résumé de la session actuelle                                |

**Q&R (propulsé par LLM) :**

| Outil        | Ce qu'il fait                                                                                        |
| ------------ | ---------------------------------------------------------------------------------------------------- |
| `honcho_ask` | Poser des questions sur l'utilisateur. `depth='quick'` pour les faits, `'thorough'` pour la synthèse |

## Getting started

Installez le plugin et lancez la configuration :

```bash
openclaw plugins install @honcho-ai/openclaw-honcho
openclaw honcho setup
openclaw gateway --force
```

La commande de configuration demande vos identifiants API, écrit la configuration, et migre facultativement les fichiers de mémoire de l'espace de travail existants.

<Info>Honcho peut fonctionner entièrement localement (auto-hébergé) ou via l'API gérée à `api.honcho.dev`. Aucune dépendance externe n'est requise pour l'option auto-hébergée.</Info>

## Configuration

Les paramètres se trouvent sous `plugins.entries["openclaw-honcho"].config` :

```json5
{
  plugins: {
    entries: {
      "openclaw-honcho": {
        config: {
          apiKey: "your-api-key", // omit for self-hosted
          workspaceId: "openclaw", // memory isolation
          baseUrl: "https://api.honcho.dev",
        },
      },
    },
  },
}
```

Pour les instances auto-hébergées, pointez `baseUrl` vers votre serveur local (par exemple
`http://localhost:8000`) et omettez la clé API.

## Migrating existing memory

If you have existing workspace memory files (`USER.md`, `MEMORY.md`,
`IDENTITY.md`, `memory/`, `canvas/`), `openclaw honcho setup` detects and
offers to migrate them.

<Info>Migration is non-destructive -- files are uploaded to Honcho. Originals are never deleted or moved.</Info>

## How it works

After every AI turn, the conversation is persisted to Honcho. Both user and
agent messages are observed, allowing Honcho to build and refine its models over
time.

During conversation, Honcho tools query the service in the `before_prompt_build`
phase, injecting relevant context before the model sees the prompt. This ensures
accurate turn boundaries and relevant recall.

## Honcho vs builtin memory

|                   | Builtin / QMD                | Honcho                              |
| ----------------- | ---------------------------- | ----------------------------------- |
| **Storage**       | Workspace Markdown files     | Dedicated service (local or hosted) |
| **Cross-session** | Via memory files             | Automatic, built-in                 |
| **User modeling** | Manual (write to MEMORY.md)  | Automatic profiles                  |
| **Search**        | Vector + keyword (hybrid)    | Semantic over observations          |
| **Multi-agent**   | Not tracked                  | Parent/child awareness              |
| **Dependencies**  | None (builtin) or QMD binary | Plugin install                      |

Honcho and the builtin memory system can work together. When QMD is configured,
additional tools become available for searching local Markdown files alongside
Honcho's cross-session memory.

## CLI commands

```bash
openclaw honcho setup                        # Configure API key and migrate files
openclaw honcho status                       # Check connection status
openclaw honcho ask <question>               # Query Honcho about the user
openclaw honcho search <query> [-k N] [-d D] # Semantic search over memory
```

## Further reading

- [Plugin source code](https://github.com/plastic-labs/openclaw-honcho)
- [Honcho documentation](https://docs.honcho.dev)
- [Honcho OpenClaw integration guide](https://docs.honcho.dev/v3/guides/integrations/openclaw)
- [Memory](/fr/concepts/memory) -- OpenClaw memory overview
- [Context Engines](/fr/concepts/context-engine) -- how plugin context engines work

## Related

- [Memory overview](/fr/concepts/memory)
- [Builtin memory engine](/fr/concepts/memory-builtin)
- [QMD memory engine](/fr/concepts/memory-qmd)
