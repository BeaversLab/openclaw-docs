---
doc-schema-version: 1
summary: "OpenClawAperçu des outils, des compétences et des plugins OpenClaw : ce que les agents peuvent appeler et comment les étendre"
read_when:
  - You want to understand what tools OpenClaw provides
  - You are deciding between built-in tools, skills, and plugins
  - You need the right docs entry point for tool policy, automation, or agent coordination
title: "Aperçu"
---

Utilisez cette page pour choisir la bonne interface de fonctionnalités. Les **outils** sont des actions appelables, les **compétences** enseignent aux agents comment travailler, et les **plugins** ajoutent des fonctionnalités d'exécution telles que des outils, des providers, des canaux, des hooks et des compétences empaquetées.

Il s'agit d'une page de présentation et d'orientation. Pour une politique d'outil exhaustive, les valeurs par défaut,
l'appartenance au groupe, les restrictions de provider et les champs de configuration, utilisez
[Outils et providers personnalisés](/fr/gateway/config-tools).

## Commencer ici

Pour la plupart des agents, commencez par les catégories d'outils intégrés, puis ajustez la stratégie uniquement lorsque l'agent doit voir moins d'outils ou a besoin d'un accès explicite à l'hôte.

| Si vous devez...                                                       | Utilisez ceci d'abord                                | Puis lisez                                                                                                             |
| ---------------------------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Permettre à un agent d'agir avec des fonctionnalités existantes        | [Outils intégrés](#built-in-tool-categories)         | [Catégories d'outils](#built-in-tool-categories)                                                                       |
| Contrôler ce qu'un agent peut appeler                                  | [Politique d'outil](#configure-access-and-approvals) | [Outils et providers personnalisés](/fr/gateway/config-tools)                                                          |
| Enseigner un flux de travail à un agent                                | [Skills](#choose-tools-skills-or-plugins)            | [Skills](/fr/tools/skills), [Creating skills](/fr/tools/creating-skills) et [Skill Workshop](/fr/tools/skill-workshop) |
| Ajouter une nouvelle intégration ou une nouvelle interface d'exécution | [Plugins](#extend-capabilities)                      | [Plugins](/fr/tools/plugin) et [Build plugins](/fr/plugins/building-plugins)                                           |
| Exécuter du travail plus tard ou en arrière-plan                       | [Automation](/fr/automation)                         | [Automation overview](/fr/automation)                                                                                  |
| Coordonner plusieurs agents ou harnais                                 | [Sub-agents](/fr/tools/subagents)                    | [ACP agents](/fr/tools/acp-agents) et [Agent send](/fr/tools/agent-send)                                               |
| Rechercher dans un vaste catalogue d'outils OpenClaw                   | [Tool Search](/fr/tools/tool-search)                 | [Tool Search](/fr/tools/tool-search)                                                                                   |

## Choisir des outils, des compétences ou des plugins

<Steps>
  <Step title="Utilisez un outil lorsque l'agent doit agir">
    Un outil est une fonction typée que l'agent peut appeler, telle que `exec`, `browser`,
    `web_search`, `message`, ou `image_generate`. Utilisez des outils lorsque l'agent
    doit lire des données, modifier des fichiers, envoyer des messages, appeler un provider, ou exploiter
    un autre système. Les outils visibles sont envoyés au model sous forme de définitions de fonctions structurées.

    Le model ne voit que les outils qui survivent au profil actif, à la politique d'autorisation/refus,
    aux restrictions du provider, à l'état du bac à sable, aux autorisations du channel, et à la
    disponibilité des plugins.

  </Step>

  <Step title="Use a skill when the agent needs instructions">
    Un skill est un `SKILL.md` pack d'instructions chargé dans le prompt de l'agent. Utilisez un
    skill lorsque l'agent dispose déjà des outils nécessaires, mais a besoin d'un
    workflow répétable, d'une grille d'évaluation, d'une séquence de commandes ou d'une contrainte opérationnelle.

    Les skills peuvent résider dans un espace de travail, un répertoire de skills partagé, une racine de skill OpenClaw
    gérée, ou un package de plugin.

    [Skills](/fr/tools/skills) | [Skill Workshop](/fr/tools/skill-workshop) | [Creating skills](/fr/tools/creating-skills) | [Skills config](/fr/tools/skills-config)

  </Step>

  <Step title="Use a plugin when OpenClaw needs a new capability">
    Un plugin peut ajouter des outils, des skills, des canaux, des fournisseurs de modèles, de la parole, de la voix
    en temps réel, de la génération de médias, de la recherche web, de la récupération web, des hooks et d'autres capacités
    d'exécution. Utilisez un plugin lorsque la capacité a du code, des informations d'identification,
    des hooks de cycle de vie, des métadonnées de manifeste ou un conditionnement installable. Les plugins
    existants peuvent être installés depuis ClawHub, npm, git, des répertoires locaux ou
    des archives.

    [Install and configure plugins](/fr/tools/plugin) | [Build plugins](/fr/plugins/building-plugins) | [Plugin SDK](/fr/plugins/sdk-overview)

  </Step>
</Steps>

## Catégories d'outils intégrés

Le tableau répertorie des outils représentatifs afin que vous puissiez reconnaître la surface. Il ne s'agit pas de la référence complète de la stratégie. Pour les groupes exacts, les valeurs par défaut et la sémantique d'autorisation/refus, utilisez [Outils et fournisseurs personnalisés](/fr/gateway/config-tools).

| Catégorie                  | Utiliser lorsque l'agent a besoin de...                                                                     | Outils représentatifs                                                | À lire ensuite                                                                                                |
| -------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Runtime                    | Exécuter des commandes, gérer des processus ou utiliser l'analyse Python prise en charge par un fournisseur | `exec`, `process`, `code_execution`                                  | [Exec](/fr/tools/exec), [Exécution de code](/fr/tools/code-execution)                                         |
| Fichiers                   | Lire et modifier les fichiers de l'espace de travail                                                        | `read`, `write`, `edit`, `apply_patch`                               | [Appliquer le correctif](/fr/tools/apply-patch)                                                               |
| Web                        | Rechercher sur le web, rechercher des publications X ou récupérer le contenu lisible d'une page             | `web_search`, `x_search`, `web_fetch`                                | [Outils Web](/fr/tools/web), [Récupération Web](/fr/tools/web-fetch)                                          |
| Navigateur                 | Gérer une session de navigateur                                                                             | `browser`                                                            | [Navigateur](/fr/tools/browser)                                                                               |
| Messagerie et channels     | Envoyer des réponses ou des actions de channel                                                              | `message`                                                            | [Envoi d'agent](/fr/tools/agent-send)                                                                         |
| Sessions et agents         | Inspecter les sessions, déléguer le travail, orienter une autre exécution ou signaler le statut             | `sessions_*`, `subagents`, `agents_list`, `session_status`, `goal`   | [Objectif](/fr/tools/goal), [Sous-agents](/fr/tools/subagents), [Outil de session](/fr/concepts/session-tool) |
| Automatisation             | Planifier le travail ou répondre aux événements en arrière-plan                                             | `cron`, `heartbeat_respond`                                          | [Automatisation](/fr/automation)                                                                              |
| Gateway et nœuds           | Inspecter l'état du Gateway ou des appareils cibles jumelés                                                 | `gateway`, `nodes`                                                   | [Gateway configuration](/fr/gateway/configuration), [Nodes](/fr/nodes)                                        |
| Médias                     | Analyser, générer ou prononcer des médias                                                                   | `image`, `image_generate`, `music_generate`, `video_generate`, `tts` | [Aperçu des médias](/fr/tools/media-overview)                                                                 |
| Vastes catalogues OpenClaw | Rechercher et appeler de nombreux outils éligibles sans envoyer chaque schéma au model                      | `tool_search_code`, `tool_search`, `tool_describe`                   | [Recherche de tool](/fr/tools/tool-search)                                                                    |

<Note>La recherche d'outils est une surface d'agent expérimentale OpenClaw. Les exécutions de harnais Codex utilisent le mode de code natif Codex, la recherche d'outils native, les outils dynamiques différés et les appels d'outils imbriqués au lieu de OpenClaw`tools.toolSearch`.</Note>

## Outils fournis par des plugins

Les plugins peuvent enregistrer des tools supplémentaires. Les auteurs de plugins connectent les tools via
`api.registerTool(...)` et le `contracts.tools` du manifeste ; utilisez
le [Plugin SDK](/fr/plugins/sdk-overview) et le [Plugin manifest](/fr/plugins/manifest)
pour les détails du contrat.

Les outils courants fournis par des plugins incluent :

- [Diffs](/fr/tools/diffs) pour le rendu des diffs de fichiers et de markdown
- [Tâche LLM](/fr/tools/llm-task) pour les étapes de workflow JSON uniquement
- [Lobster](/fr/tools/lobster) pour les workflows typés avec des approbations reprises
- [Tokenjuice](/fr/tools/tokenjuice) pour compacter les outils `exec` et `bash` bruyants
  en sortie
- [Tool Search](/fr/tools/tool-search) pour découvrir et appeler de vastes catalogues d'outils sans inclure chaque schéma dans l'invite
- [Canvas](Canvas/en/plugins/reference/canvasCanvas) pour le contrôle du Canvas de nœud et le rendu A2UI

## Configurer l'accès et les approbations

La stratégie relative aux tools est appliquée avant l'appel au modèle. Si la stratégie supprime un tool, le modèle ne reçoit pas le schéma de ce tool pour ce tour. Une exécution peut perdre des tools en raison de la configuration globale, de la configuration par agent, de la stratégie de channel, des restrictions de provider, des règles de sandbox, de la stratégie de channel/runtime, ou de la disponibilité des plugins.

- [Tools and custom providers](/fr/gateway/config-tools) documente les profils d'outils, les listes d'autorisation/refus, les restrictions spécifiques au provider, la détection de boucles et les paramètres d'outils soutenus par le provider.
- [Exec approvals](/fr/tools/exec-approvals) documents la stratégie d'approbation
  des commandes de l'hôte.
- [Elevated exec](/fr/tools/elevated) documents l'exécution contrôlée en dehors du
  sandbox.
- [Sandbox vs tool policy vs elevated](/fr/gateway/sandbox-vs-tool-policy-vs-elevated) explique quelle couche contrôle l'accès aux fichiers et aux processus.
- [Per-agent sandbox and tool restrictions](/fr/tools/multi-agent-sandbox-tools)
  documente les restrictions spécifiques aux agents pour les exécutions déléguées.

## Étendre les capacités

Choisissez le chemin d'extension en fonction de la tâche que vous devez faire accomplir à OpenClaw :

- Installez ou gérez un plugin existant avec [Plugins](/fr/tools/plugin).
- Créez une nouvelle intégration, un provider, un channel, un tool ou un hook avec
  [Build plugins](/fr/plugins/building-plugins).
- Ajoutez ou ajustez des instructions d'agent réutilisables avec [Skills](/fr/tools/skills) et
  [Creating skills](/fr/tools/creating-skills).
- Utilisez [Plugin SDK](/fr/plugins/sdk-overview) et [Plugin manifest](/fr/plugins/manifest) lorsque vous avez besoin de contrats d'implémentation.

## Dépanner les outils manquants

Si le modèle ne peut pas voir ou appeler un outil, commencez par la stratégie effective pour le
tour actuel :

1. Vérifiez le profil actif, `tools.allow`, et `tools.deny` dans
   [Tools and custom providers](/fr/gateway/config-tools).
2. Vérifiez les restrictions spécifiques au provider dans
   [Tools and custom providers](/fr/gateway/config-tools) et confirmez que le
   [model provider](/fr/concepts/model-providers) sélectionné prend en charge la forme du tool.
3. Vérifiez les autorisations du channel, l'état du sandbox et l'accès élevé avec
   [Sandbox vs tool policy vs elevated](/fr/gateway/sandbox-vs-tool-policy-vs-elevated) et [Elevated exec](/fr/tools/elevated).
4. Vérifiez si le plugin propriétaire est installé et activé dans
   [Plugins](/fr/tools/plugin).
5. Pour les exécutions déléguées, vérifiez les restrictions par agent dans
   [Per-agent sandbox and tool restrictions](/fr/tools/multi-agent-sandbox-tools).
6. Pour les grands catalogues OpenClaw, confirmez si l'exécution utilise une exposition directe des outils ou
   [Tool Search](/fr/tools/tool-search).

## Connexes

- [Automation](/fr/automation) pour cron, tâches, heartbeat, engagements, hooks, ordres permanents et Task Flow
- [Agents](/fr/concepts/agent) pour le model d'agent, les sessions, la mémoire et la coordination multi-agent
- [Outils et fournisseurs personnalisés](/fr/gateway/config-tools) pour la référence de stratégie tool canonique
- [Plugins](/fr/tools/plugin) pour l'installation et la gestion des plugins
- [Plugin SDK](/fr/plugins/sdk-overview) pour la référence de création de plugins
- [Skills](/fr/tools/skills) pour l'ordre de chargement, la restriction et la configuration des skills
- [Skill Workshop](/fr/tools/skill-workshop) pour la création de skills générée et vérifiée
- [Tool Search](/fr/tools/tool-search) pour la découverte compacte du catalogue tool OpenClaw
