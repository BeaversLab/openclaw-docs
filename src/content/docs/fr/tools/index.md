---
summary: "OpenClawAperçu des outils et plugins d'OpenClaw : ce que l'agent peut faire et comment l'étendre"
read_when:
  - You want to understand what tools OpenClaw provides
  - You need to configure, allow, or deny tools
  - You are deciding between built-in tools, skills, and plugins
title: "Outils et plugins"
---

Tout ce que l'agent fait au-delà de la génération de texte se fait par le biais d'**outils**.
Les outils sont le moyen par lequel l'agent lit les fichiers, exécute des commandes, navigue sur le Web, envoie
messages et interagit avec les appareils.

## Outils, compétences et plugins

OpenClaw possède trois couches qui fonctionnent ensemble :

<Steps>
  <Step title="Les outils sont ce que l'agent appelle">
    Un outil est une fonction typée que l'agent peut invoquer (p. ex. `exec`, `browser`,
    `web_search`, `message`OpenClawAPI). OpenClaw fournit un ensemble d'**outils intégrés** et
    les plugins peuvent en enregistrer d'autres.

    L'agent perçoit les outils comme des définitions de fonctions structurées envoyées à l'API du modèle.

  </Step>

  <Step title="Les Skills enseignent à l'agent quand et comment">
    Une Skill est un fichier markdown (`SKILL.md`) injecté dans le prompt système.
    Les Skills fournissent à l'agent du contexte, des contraintes et des instructions étape par étape pour
    utiliser les outils efficacement. Les Skills résident dans votre espace de travail, dans des dossiers partagés,
    ou sont livrées dans les plugins.

    [Référence des Skills](/fr/tools/skills) | [Créer des Skills](/fr/tools/creating-skills)

  </Step>

  <Step title="Les plugins regroupent le tout"OpenClawnpm>
    Un plugin est un package qui peut enregistrer n'importe quelle combinaison de capacités :
    canaux, fournisseurs de modèles, outils, skills, synthèse vocale, transcription en temps réel,
    voix en temps réel, compréhension des médias, génération d'images, génération de vidéo,
    récupération web, recherche web, et plus encore. Certains plugins sont **core** (livrés avec
    OpenClaw), d'autres sont **externes** (publiés sur npm par la communauté).

    [Installer et configurer des plugins](/fr/tools/plugin) | [Créer le vôtre](/fr/plugins/building-plugins)

  </Step>
</Steps>

## Outils intégrés

Ces outils sont fournis avec OpenClaw et sont disponibles sans installer de plugins :

| Outil                                      | Ce qu'il fait                                                                                | Page                                                                  |
| ------------------------------------------ | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `exec` / `process`                         | Exécuter des commandes shell, gérer les processus d'arrière-plan                             | [Exec](/fr/tools/exec), [Approbations Exec](/fr/tools/exec-approvals) |
| `code_execution`                           | Exécuter une analyse Python distante en bac à sable (sandboxed)                              | [Exécution de code](/fr/tools/code-execution)                         |
| `browser`                                  | Contrôler un navigateur Chromium (navigation, clic, capture d'écran)                         | [Navigateur](/fr/tools/browser)                                       |
| `web_search` / `x_search` / `web_fetch`    | Rechercher sur le web, rechercher des publications X, récupérer le contenu de la page        | [Web](/fr/tools/web), [Web Fetch](/fr/tools/web-fetch)                |
| `read` / `write` / `edit`                  | E/S de fichiers dans l'espace de travail                                                     |                                                                       |
| `apply_patch`                              | Correctifs de fichiers multi-blocs                                                           | [Apply Patch](/fr/tools/apply-patch)                                  |
| `message`                                  | Envoyer des messages sur tous les canaux                                                     | [Agent Send](/fr/tools/agent-send)                                    |
| `nodes`                                    | Découvrir et cibler les appareils couplés                                                    |                                                                       |
| `cron` / `gateway`                         | Gérer les tâches planifiées ; inspecter, corriger, redémarrer ou mettre à jour la passerelle |                                                                       |
| `image` / `image_generate`                 | Analyser ou générer des images                                                               | [Image Generation](/fr/tools/image-generation)                        |
| `music_generate`                           | Générer des pistes musicales                                                                 | [Music Generation](/fr/tools/music-generation)                        |
| `video_generate`                           | Générer des vidéos                                                                           | [Video Generation](/fr/tools/video-generation)                        |
| `tts`                                      | Conversion synthèse vocale ponctuelle                                                        | [TTS](/fr/tools/tts)                                                  |
| `sessions_*` / `subagents` / `agents_list` | Gestion de session, état et orchestration de sous-agents                                     | [Sub-agents](/fr/tools/subagents)                                     |
| `session_status`                           | Relecture légère de style `/status` et remplacement du modèle de session                     | [Session Tools](/fr/concepts/session-tool)                            |

Pour le travail d'image, utilisez `image` pour l'analyse et `image_generate` pour la génération ou l'édition. Si vous ciblez `openai/*`, `google/*`, `fal/*` ou un autre fournisseur d'images non par défaut, configurez d'abord la clé d'authentification/API de ce fournisseur.

Pour le travail musical, utilisez `music_generate`. Si vous ciblez `google/*`, `minimax/*` ou un autre fournisseur de musique non par défaut, configurez d'abord la clé d'authentification/API de ce fournisseur.

Pour le travail vidéo, utilisez `video_generate`. Si vous ciblez `qwen/*` ou un autre fournisseur vidéo non défini par défaut, configurez d'abord la clé d'authentification/API de ce fournisseur.

Pour la génération audio pilotée par un flux de travail, utilisez `music_generate` lorsqu'un plugin tel que
ComfyUI l'enregistre. Cela est distinct de `tts`, qui est une synthèse vocale.

`session_status` est l'outil léger de statut/lecture dans le groupe des sessions.
Il répond aux questions de type `/status` sur la session actuelle et peut
éventuellement définir une substitution de modèle par session ; `model=default` efface cette
substitution. Comme `/status`, il peut remplir les compteurs de jetons/cache dispersés et
l'étiquette du modèle d'exécution actif à partir de la dernière entrée d'utilisation de la transcription.

`gateway` est l'outil d'exécution réservé au propriétaire pour les opérations de passerelle :

- `config.schema.lookup` pour un sous-arbre de configuration délimité par un chemin avant les modifications
- `config.get` pour l'instantané de la configuration actuelle + le hachage
- `config.patch` pour les mises à jour partielles de la configuration avec redémarrage
- `config.apply` uniquement pour le remplacement complet de la configuration
- `update.run` pour une mise à jour explicite de soi-même + redémarrage

Pour les modifications partielles, préférez `config.schema.lookup` puis `config.patch`. Utilisez
`config.apply` uniquement lorsque vous remplacez intentionnellement l'intégralité de la configuration.
Pour une documentation plus large sur la configuration, lisez [Configuration](/fr/gateway/configuration) et
[Référence de configuration](/fr/gateway/configuration-reference).
L'outil refuse également de modifier `tools.exec.ask` ou `tools.exec.security` ;
les alias `tools.bash.*` hérités se normalisent vers les mêmes chemins d'exécution protégés.

### Outils fournis par les plugins

Les plugins peuvent enregistrer des outils supplémentaires. Quelques exemples :

- [Canvas](/fr/plugins/reference/canvas) — plugin groupé expérimental pour le contrôle de nœud Canvas et le rendu A2UI
- [Diffs](/fr/tools/diffs) — visionneuse et rendu de différences
- [LLM Task](/fr/tools/llm-task) — étape LLM JSON uniquement pour une sortie structurée
- [Lobster](/fr/tools/lobster) — runtime de workflow typé avec approbations reprises
- [Music Generation](/fr/tools/music-generation) — tool `music_generate` partagé avec des fournisseurs basés sur des workflows
- [OpenProse](/fr/prose) — orchestration de workflows centrée sur le markdown
- [Tokenjuice](/fr/tools/tokenjuice) — résultats de tool `exec` et `bash` bruités et compacts

Les outils de plugin sont toujours créés avec `api.registerTool(...)` et déclarés dans
la liste `contracts.tools` du manifeste du plugin. OpenClaw capture le
descripteur d'outil validé lors de la découverte et le met en cache par source de plugin et
contrat, permettant ainsi à la planification d'outils ultérieure de sauter le chargement du runtime
du plugin. L'exécution de l'outil charge toujours le plugin propriétaire et appelle
l'implémentation enregistrée en direct.

## Configuration de l'outil

### Listes d'autorisation et de refus

Contrôlez les outils que l'agent peut appeler via `tools.allow` / `tools.deny` dans
la configuration. Le refus l'emporte toujours sur l'autorisation.

```json5
{
  tools: {
    allow: ["group:fs", "browser", "web_search"],
    deny: ["exec"],
  },
}
```

OpenClaw échoue en mode fermé lorsqu'une liste d'autorisation explicite ne correspond à aucun
outil appelable. Par exemple, `tools.allow: ["query_db"]` ne fonctionne que si un plugin chargé
enregistre réellement `query_db`. Si aucun outil intégré, de plugin ou groupé MCP ne correspond
à la liste d'autorisation, l'exécution s'arrête avant l'appel au model au lieu de continuer en tant
qu'exécution texte uniquement qui pourrait halluciner des résultats d'outils.

### Profils d'outils

`tools.profile` définit une liste d'autorisation de base avant que `allow`/`deny` ne soit appliqué.
Remplacement par agent : `agents.list[].tools.profile`.

| Profil      | Ce qu'il inclut                                                                                                                                   |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `full`      | Tous les outils principaux et de plugin optionnels ; base non restreinte pour un accès commande/contrôle plus large                               |
| `coding`    | `group:fs`, `group:runtime`, `group:web`, `group:sessions`, `group:memory`, `cron`, `image`, `image_generate`, `music_generate`, `video_generate` |
| `messaging` | `group:messaging`, `sessions_list`, `sessions_history`, `sessions_send`, `session_status`                                                         |
| `minimal`   | `session_status` uniquement                                                                                                                       |

<Note>
  `tools.profile: "messaging"` est intentionnellement étroit pour les agents axés sur les canaux. Il exclut les outils de commande/contrôle plus larges tels que le système de fichiers, le runtime, le navigateur, le canvas, les nœuds, cron et le contrôle de passerelle. Utilisez `tools.profile: "full"` comme base non restreinte pour un accès commande/contrôle plus large, puis réduisez l'accès avec
  `tools.allow` / `tools.deny` si nécessaire.
</Note>

`coding` inclut des outils web légers (`web_search`, `web_fetch`, `x_search`)
mais pas l'outil complet de contrôle de navigateur. L'automatisation du navigateur peut piloter de vraies
sessions et des profils connectés, ajoutez-le donc explicitement avec
`tools.alsoAllow: ["browser"]` ou une `agents.list[].tools.alsoAllow: ["browser"]` par agent.

<Note>
  La configuration de `tools.exec` ou `tools.fs` sous un profil restrictif (`messaging`, `minimal`) n'élargit pas implicitement la liste d'autorisation du profil. Ajoutez des entrées `tools.alsoAllow` explicites (par exemple `["exec", "process"]` pour exec, ou `["read", "write", "edit"]` pour fs) lorsque vous souhaitez qu'un profil restrictif utilise ces sections configurées. OpenClaw enregistre
  un avertissement au démarrage lorsqu'une section de configuration est présente sans une autorisation `alsoAllow` correspondante.
</Note>

Les profils `coding` et `messaging` autorisent également les tools MCP de bundle configurés
sous la clé de plugin `bundle-mcp`. Ajoutez `tools.deny: ["bundle-mcp"]` lorsque vous
souhaitez qu'un profil conserve ses built-ins normaux mais masque tous les tools MCP configurés.
Le profil `minimal` n'inclut pas les tools MCP de bundle.

Exemple (surface de tool la plus large par défaut) :

```json5
{
  tools: {
    profile: "full",
  },
}
```

### Groupes de tools

Utilisez les raccourcis `group:*` dans les listes d'autorisation/d'interdiction :

| Groupe             | Tools                                                                                                     |
| ------------------ | --------------------------------------------------------------------------------------------------------- |
| `group:runtime`    | exec, process, code_execution (`bash` est accepté comme un alias pour `exec`)                             |
| `group:fs`         | read, write, edit, apply_patch                                                                            |
| `group:sessions`   | sessions_list, sessions_history, sessions_send, sessions_spawn, sessions_yield, subagents, session_status |
| `group:memory`     | memory_search, memory_get                                                                                 |
| `group:web`        | web_search, x_search, web_fetch                                                                           |
| `group:ui`         | browser, canvas lorsque le plugin Canvas fourni est activé                                                |
| `group:automation` | heartbeat_respond, cron, gateway                                                                          |
| `group:messaging`  | message                                                                                                   |
| `group:nodes`      | nodes                                                                                                     |
| `group:agents`     | agents_list, update_plan                                                                                  |
| `group:media`      | image, image_generate, music_generate, video_generate, tts                                                |
| `group:openclaw`   | Tous les tools intégrés d'OpenClaw (exclut les tools de plugin)                                           |

`sessions_history` renvoie une vue de rappel délimitée et filtrée pour la sécurité. Il supprime
les balises de réflexion, l'échafaudage `<relevant-memories>`, les charges utiles XML d'appel de tool en texte brut
(notamment `<tool_call>...</tool_call>`,
`<function_call>...</function_call>`, `<tool_calls>...</tool_calls>`,
`<function_calls>...</function_calls>`MiniMax et les blocs d'appel de tool tronqués),
l'échafaudage d'appel de tool rétrogradé, les jetons de contrôle de model ASCII/full-width divulgués
et les XML d'appel de tool MiniMax malformés du texte de l'assistant, puis applique
une révision/troncature et d'éventuels espaces réservés de ligne surdimensionnée au lieu d'agir
comme un vidage de transcription brut.

### Restrictions spécifiques au fournisseur

Utilisez `tools.byProvider` pour restreindre les outils pour des fournisseurs spécifiques sans modifier les paramètres globaux par défaut :

```json5
{
  tools: {
    profile: "coding",
    byProvider: {
      "google-antigravity": { profile: "minimal" },
    },
  },
}
```
