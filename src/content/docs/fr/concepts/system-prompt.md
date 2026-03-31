---
summary: "Contient le prompt système OpenClaw et comment il est assemblé"
read_when:
  - Editing system prompt text, tools list, or time/heartbeat sections
  - Changing workspace bootstrap or skills injection behavior
title: "System Prompt"
---

# System Prompt

OpenClaw construit un prompt système personnalisé pour chaque exécution d'agent. Le prompt est **la propriété de OpenClaw** et n'utilise pas le prompt par défaut de pi-coding-agent.

Le prompt est assemblé par OpenClaw et injecté dans chaque exécution d'agent.

## Structure

Le prompt est intentionnellement compact et utilise des sections fixes :

- **Outils** : liste des outils actuels + descriptions courtes.
- **Sécurité** : rappel court des garde-fous pour éviter les comportements de recherche de pouvoir ou le contournement de la supervision.
- **Skills** (lorsqu'elles sont disponibles) : indique au modèle comment charger les instructions des compétences à la demande.
- **Mise à jour automatique OpenClaw** : comment exécuter `config.apply` et `update.run`.
- **Espace de travail** : répertoire de travail (`agents.defaults.workspace`).
- **Documentation** : chemin local vers la documentation OpenClaw (dépôt ou package npm) et quand la lire.
- **Fichiers de l'espace de travail (injectés)** : indique que les fichiers d'amorçage sont inclus ci-dessous.
- **Sandbox** (lorsqu'activé) : indique l'exécution en bac à sable, les chemins du bac à sable, et si l'exécution élevée est disponible.
- **Date et heure actuelles** : heure locale de l'utilisateur, fuseau horaire et format de l'heure.
- **Balises de réponse** : syntaxe de balise de réponse optionnelle pour les fournisseurs pris en charge.
- **Battements de cœur** : prompt de battement de cœur et comportement d'accusé de réception.
- **Exécution** : hôte, système d'exploitation, nœud, modèle, racine du dépôt (lorsqu'elle est détectée), niveau de réflexion (une ligne).
- **Raisonnement** : niveau de visibilité actuel + indice de basculement /reasoning.

Les garde-fous de sécurité dans le prompt système sont consultatifs. Ils guident le comportement du modèle mais n'appliquent pas de stratégie. Utilisez la stratégie d'outil, les approbations d'exécution, le sandboxing et les listes d'autorisation de canal pour une application stricte ; les opérateurs peuvent les désactiver par conception.

## Modes de prompt

OpenClaw peut générer des prompts système plus petits pour les sous-agents. Le système d'exécution définit un
`promptMode` pour chaque exécution (pas une configuration utilisateur) :

- `full` (par défaut) : inclut toutes les sections ci-dessus.
- `minimal` : utilisé pour les sous-agents ; omet **Skills**, **Memory Recall**, **OpenClaw
  Self-Update**, **Model Aliases**, **User Identity**, **Reply Tags**,
  **Messaging**, **Silent Replies** et **Heartbeats**. Les outils, **Safety**,
  Workspace, Sandbox, la date et l'heure actuelles (si connues), le Runtime et le contexte injecté
  restent disponibles.
- `none` : renvoie uniquement la ligne d'identité de base.

Lorsque `promptMode=minimal`, les invites injectées supplémentaires sont étiquetées **Subagent
Context** au lieu de **Group Chat Context**.

## Injection du bootstrap de l'espace de travail

Les fichiers de bootstrap sont rognés et ajoutés sous **Project Context** afin que le modèle voie le contexte d'identité et de profil sans avoir besoin de lectures explicites :

- `AGENTS.md`
- `SOUL.md`
- `TOOLS.md`
- `IDENTITY.md`
- `USER.md`
- `HEARTBEAT.md`
- `BOOTSTRAP.md` (uniquement sur les espaces de travail tout nouveaux)
- `MEMORY.md` si présent, sinon `memory.md` comme solution de repli en minuscules

Tous ces fichiers sont **injectés dans la fenêtre de contexte** à chaque tour, ce
qui signifie qu'ils consomment des tokens. Gardez-les concis — notamment `MEMORY.md`, qui peut
augmenter avec le temps et entraîner une utilisation inattendue du contexte et des compactages
plus fréquents.

> **Note :** Les fichiers quotidiens `memory/*.md` ne sont **pas** injectés automatiquement. Ils
> sont accessibles à la demande via les outils `memory_search` et `memory_get` , ils ne
> comptent donc pas dans la fenêtre de contexte à moins que le modèle ne les lise explicitement.

Les fichiers volumineux sont tronqués à l'aide d'un marqueur. La taille maximale par fichier est contrôlée par `agents.defaults.bootstrapMaxChars` (par défaut : 20000). Le contenu total du bootstrap injecté sur tous les fichiers est plafonné par `agents.defaults.bootstrapTotalMaxChars` (par défaut : 150000). Les fichiers manquants injectent un marqueur court de fichier manquant. Lorsqu'une troncation se produit, OpenClaw peut injecter un bloc d'avertissement dans le contexte du projet ; contrôlez cela avec `agents.defaults.bootstrapPromptTruncationWarning` (`off`, `once`, `always` ; par défaut : `once`).

Les sessions de sous-agents n'injectent que `AGENTS.md` et `TOOLS.md` (les autres fichiers de bootstrap sont filtrés pour garder le contexte du sous-agent petit).

Les crochets internes peuvent intercepter cette étape via `agent:bootstrap` pour modifier ou remplacer les fichiers de bootstrap injectés (par exemple, échanger `SOUL.md` pour une personnalité alternative).

Pour inspecter la contribution de chaque fichier injecté (brut par rapport à injecté, troncation, plus la surcharge du schéma d'outil), utilisez `/context list` ou `/context detail`. Voir [Context](/en/concepts/context).

## Gestion du temps

Le prompt système comprend une section dédiée **Date et heure actuelles** lorsque le fuseau horaire de l'utilisateur est connu. Pour garder le cache du prompt stable, il n'inclut maintenant que le **fuseau horaire** (pas d'horloge dynamique ou de format d'heure).

Utilisez `session_status` lorsque l'agent a besoin de l'heure actuelle ; la carte de statut comprend une ligne d'horodatage.

Configurer avec :

- `agents.defaults.userTimezone`
- `agents.defaults.timeFormat` (`auto` | `12` | `24`)

Voir [Date & Time](/en/date-time) pour les détails complets du comportement.

## Skills

Lorsque des compétences éligibles existent, OpenClaw injecte une **liste de compétences disponibles** compacte (`formatSkillsForPrompt`) qui inclut le **chemin de fichier** pour chaque compétence. Le prompt instruit le modèle d'utiliser `read` pour charger le SKILL.md à l'emplacement indiqué (espace de travail, géré ou groupé). Si aucune compétence n'est éligible, la section Skills est omise.

```
<available_skills>
  <skill>
    <name>...</name>
    <description>...</description>
    <location>...</location>
  </skill>
</available_skills>
```

Cela permet de maintenir le prompt de base petit tout en permettant une utilisation ciblée des compétences.

## Documentation

Lorsqu'elle est disponible, le prompt système inclut une section **Documentation** qui pointe vers le répertoire de documentation local OpenClaw (soit `docs/` dans l'espace de travail du dépôt soit les docs du package npm groupé) et note également le miroir public, le dépôt source, la communauté Discord et ClawHub ([https://clawhub.com](https://clawhub.com)) pour la découverte de compétences. Le prompt instruit le modèle de consulter d'abord la documentation locale pour le comportement, les commandes, la configuration ou l'architecture d'OpenClaw, et d'exécuter `openclaw status` lui-même lorsque cela est possible (en demandant à l'utilisateur uniquement lorsqu'il n'y a pas d'accès).
