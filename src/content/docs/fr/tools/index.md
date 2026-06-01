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

Il s'agit d'une page d'aperçu et de routage. Pour une stratégie d'outil exhaustive, les valeurs par défaut, l'appartenance aux groupes, les restrictions de provider et les champs de configuration, utilisez [Outils et providers personnalisés](/fr/gateway/config-tools).

## Commencer ici

Pour la plupart des agents, commencez par les catégories d'outils intégrés, puis ajustez la stratégie uniquement lorsque l'agent doit voir moins d'outils ou a besoin d'un accès explicite à l'hôte.

| Si vous devez...                                                       | Utilisez ceci d'abord                                | Puis lisez                                                                              |
| ---------------------------------------------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Permettre à un agent d'agir avec des fonctionnalités existantes        | [Outils intégrés](#built-in-tool-categories)         | [Catégories d'outils](#built-in-tool-categories)                                        |
| Contrôler ce qu'un agent peut appeler                                  | [Stratégie d'outil](#configure-access-and-approvals) | [Outils et providers personnalisés](/fr/gateway/config-tools)                           |
| Enseigner un flux de travail à un agent                                | [Compétences](#choose-tools-skills-or-plugins)       | [Compétences](/fr/tools/skills) et [Création de compétences](/fr/tools/creating-skills) |
| Ajouter une nouvelle intégration ou une nouvelle interface d'exécution | [Plugins](#extend-capabilities)                      | [Plugins](/fr/tools/plugin) et [Créer des plugins](/fr/plugins/building-plugins)        |
| Exécuter du travail plus tard ou en arrière-plan                       | [Automatisation](/fr/automation)                     | [Aperçu de l'automatisation](/fr/automation)                                            |
| Coordonner plusieurs agents ou harnais                                 | [Sous-agents](/fr/tools/subagents)                   | [Agents ACP](/fr/tools/acp-agents) et [Envoi d'agent](/fr/tools/agent-send)             |
| Rechercher dans un vaste catalogue d'outils OpenClaw                   | [Recherche d'outils](/fr/tools/tool-search)          | [Recherche d'outils](/fr/tools/tool-search)                                             |

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

  <Step title="Utilisez une compétence lorsque l'agent a besoin d'instructions">
    Une compétence est un pack d'instructions `SKILL.md` chargé dans le prompt de l'agent. Utilisez une
    compétence lorsque l'agent possède déjà les outils dont il a besoin, mais a besoin d'un workflow
    répétable, d'une grille d'évaluation, d'une séquence de commandes, ou d'une contrainte opérationnelle.

    Les compétences peuvent résider dans un espace de travail, un répertoire de compétences partagé, la racine de compétences
    gérée par OpenClaw, ou un package de plugin.

    [Compétences](/fr/tools/skills) | [Création de compétences](/fr/tools/creating-skills) | [Configuration des compétences](/fr/tools/skills-config)

  </Step>

  <Step title="Utilisez un plugin lorsque OpenClaw a besoin d'une nouvelle capacité">
    Un plugin peut ajouter des outils, des compétences, des channels, des providers de model, de la parole, de la voix
    en temps réel, de la génération de média, de la recherche web, de la récupération web, des hooks, et d'autres capacités
    d'exécution. Utilisez un plugin lorsque la capacité possède du code, des identifiants,
    des hooks de cycle de vie, des métadonnées de manifeste, ou un conditionnement installable. Les plugins
    existants peuvent être installés depuis ClawHub, npm, git, des répertoires locaux, ou
    des archives.

    [Installer et configurer des plugins](/fr/tools/plugin) | [Créer des plugins](/fr/plugins/building-plugins) | [SDK Plugin](/fr/plugins/sdk-overview)

  </Step>
</Steps>

## Catégories d'outils intégrés

Le tableau répertorie des outils représentatifs afin que vous puissiez reconnaître la surface. Il ne s'agit pas de la référence complète de la stratégie. Pour les groupes exacts, les valeurs par défaut et la sémantique d'autorisation/refus, consultez [Outils et fournisseurs personnalisés](/fr/gateway/config-tools).

| Catégorie                  | Utiliser lorsque l'agent a besoin de...                                                                     | Outils représentatifs                                                | À lire ensuite                                                                    |
| -------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Runtime                    | Exécuter des commandes, gérer des processus ou utiliser l'analyse Python prise en charge par un fournisseur | `exec`, `process`, `code_execution`                                  | [Exec](/fr/tools/exec), [Exécution de code](/fr/tools/code-execution)             |
| Fichiers                   | Lire et modifier les fichiers de l'espace de travail                                                        | `read`, `write`, `edit`, `apply_patch`                               | [Appliquer un patch](/fr/tools/apply-patch)                                       |
| Web                        | Rechercher sur le web, rechercher des publications X ou récupérer le contenu lisible d'une page             | `web_search`, `x_search`, `web_fetch`                                | [Outils Web](/fr/tools/web), [Récupération Web](/fr/tools/web-fetch)              |
| Navigateur                 | Gérer une session de navigateur                                                                             | `browser`                                                            | [Navigateur](/fr/tools/browser)                                                   |
| Messagerie et channels     | Envoyer des réponses ou des actions de channel                                                              | `message`                                                            | [Envoi par l'agent](/fr/tools/agent-send)                                         |
| Sessions et agents         | Inspecter les sessions, déléguer le travail, orienter une autre exécution ou signaler le statut             | `sessions_*`, `subagents`, `agents_list`, `session_status`           | [Sous-agents](/fr/tools/subagents), [Outil de session](/fr/concepts/session-tool) |
| Automatisation             | Planifier le travail ou répondre aux événements en arrière-plan                                             | `cron`, `heartbeat_respond`                                          | [Automatisation](/fr/automation)                                                  |
| Gateway et nœuds           | Inspecter l'état du Gateway ou des appareils cibles jumelés                                                 | `gateway`, `nodes`                                                   | [Configuration du Gateway](/fr/gateway/configuration), [Nœuds](/fr/nodes)         |
| Médias                     | Analyser, générer ou prononcer des médias                                                                   | `image`, `image_generate`, `music_generate`, `video_generate`, `tts` | [Aperçu des médias](/fr/tools/media-overview)                                     |
| Vastes catalogues OpenClaw | Rechercher et appeler de nombreux outils éligibles sans envoyer chaque schéma au model                      | `tool_search_code`, `tool_search`, `tool_describe`                   | [Recherche d'outils](/fr/tools/tool-search)                                       |

<Note>La recherche d'outils est une surface expérimentale d'agent OpenClaw. Les exécutions du harnais Codex utilisent le mode de code natif Codex, la recherche d'outils native, les outils dynamiques différés et les appels d'outils imbriqués au lieu de `tools.toolSearch`.</Note>

## Outils fournis par des plugins

Les plugins peuvent enregistrer des outils supplémentaires. Les auteurs de plugins connectent les outils via
`api.registerTool(...)` et le `contracts.tools` du manifeste ; utilisez
le [Plugin SDK](/fr/plugins/sdk-overview) et le [Plugin manifest](/fr/plugins/manifest)
pour les détails du contrat.

Les outils courants fournis par des plugins incluent :

- [Diffs](/fr/tools/diffs) pour le rendu des différences de fichiers et de markdown
- [Tâche LLM](/fr/tools/llm-task) pour les étapes de workflow JSON uniquement
- [Lobster](/fr/tools/lobster) pour les workflows typés avec des approbations repriseables
- [Tokenjuice](/fr/tools/tokenjuice) pour compacter la sortie bruyante des outils `exec` et `bash`
- [Recherche d'outils](/fr/tools/tool-search) pour découvrir et appeler de vastes catalogues d'outils
  sans mettre chaque schéma dans le prompt
- [Canvas](/fr/plugins/reference/canvas) pour le contrôle de Canvas de nœud et le rendu A2UI

## Configurer l'accès et les approbations

La stratégie relative aux tools est appliquée avant l'appel au modèle. Si la stratégie supprime un tool, le modèle ne reçoit pas le schéma de ce tool pour ce tour. Une exécution peut perdre des tools en raison de la configuration globale, de la configuration par agent, de la stratégie de channel, des restrictions de provider, des règles de sandbox, de la stratégie de channel/runtime, ou de la disponibilité des plugins.

- [Outils et providers personnalisés](/fr/gateway/config-tools) documentent les profils d'outils,
  les listes d'autorisation/refus, les restrictions spécifiques aux providers, la détection de boucles et
  les paramètres d'outils backing par provider.
- [Approbations Exec](/fr/tools/exec-approvals) documentent la politique d'approbation
  des commandes de l'hôte.
- [Exec élevé](/fr/tools/elevated) documente l'exécution contrôlée en dehors du
  sandbox.
- [Sandbox vs politique d'outil vs élevé](/fr/gateway/sandbox-vs-tool-policy-vs-elevated) explique quelle couche contrôle l'accès aux fichiers et aux processus.
- [Restrictions de sandbox et d'outils par agent](/fr/tools/multi-agent-sandbox-tools)
  documentent les restrictions spécifiques aux agents pour les exécutions déléguées.

## Étendre les capacités

Choisissez le chemin d'extension en fonction de la tâche que vous devez faire accomplir à OpenClaw :

- Installez ou gérez un plugin existant avec [Plugins](/fr/tools/plugin).
- Créez une nouvelle intégration, un provider, un channel, un outil ou un hook avec
  [Créer des plugins](/fr/plugins/building-plugins).
- Ajoutez ou ajustez des instructions d'agent réutilisables avec [Skills](/fr/tools/skills) et
  [Créer des skills](/fr/tools/creating-skills).
- Empaquetez du matériel de workflow réutilisable avec
  [Skill workshop](/fr/plugins/skill-workshop) lorsque le workflow appartient à un
  bundle de skills distribué par plugin.
- Utilisez [Plugin SDK](/fr/plugins/sdk-overview) et [Plugin manifest](/fr/plugins/manifest) lorsque vous avez besoin de contrats d'implémentation.

## Dépanner les outils manquants

Si le modèle ne peut pas voir ou appeler un outil, commencez par la stratégie effective pour le
tour actuel :

1. Vérifiez le profil actif, `tools.allow`, et `tools.deny` dans
   [Outils et providers personnalisés](/fr/gateway/config-tools).
2. Vérifiez les restrictions spécifiques aux providers dans
   [Outils et providers personnalisés](/fr/gateway/config-tools) et confirmez que le
   [model provider](/fr/concepts/model-providers) sélectionné prend en charge la forme de l'outil.
3. Vérifiez les permissions du channel, l'état du sandbox et l'accès élevé avec
   [Sandbox vs politique d'outil vs élevé](/fr/gateway/sandbox-vs-tool-policy-vs-elevated) et [Exec élevé](/fr/tools/elevated).
4. Vérifiez si le plugin propriétaire est installé et activé dans
   [Plugins](/fr/tools/plugin).
5. Pour les exécutions déléguées, vérifiez les restrictions par agent dans
   [Restrictions de bac à sable et d'outils par agent](/fr/tools/multi-agent-sandbox-tools).
6. Pour les vastes catalogues OpenClaw, vérifiez si l'exécution utilise une exposition directe des outils ou
   [la recherche d'outils](/fr/tools/tool-search).

## Connexes

- [Automatisation](/fr/automation) pour cron, tâches, heartbeat, engagements, hooks, ordres permanents et Task Flow
- [Agents](/fr/concepts/agent) pour le modèle d'agent, les sessions, la mémoire et la coordination multi-agent
- [Outils et fournisseurs personnalisés](/fr/gateway/config-tools) pour la référence canonique de la stratégie d'outils
- [Plugins](/fr/tools/plugin) pour l'installation et la gestion des plugins
- [Plugin SDK](/fr/plugins/sdk-overview) pour la référence de l'auteur de plugin
- [Skills](/fr/tools/skills) pour l'ordre de chargement, le filtrage et la configuration des compétences
- [Recherche d'outils](/fr/tools/tool-search) pour la découverte de catalogues d'outils OpenClaw compacts
