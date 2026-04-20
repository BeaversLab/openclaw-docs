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

Les plugins de fournisseur peuvent contribuer à des directives de prompt conscientes du cache sans remplacer le prompt complet détenu par OpenClaw. Le runtime du fournisseur peut :

- remplacer un petit ensemble de sections principales nommées (`interaction_style`,
  `tool_call_style`, `execution_bias`)
- injecter un **préfixe stable** au-dessus de la limite du cache du prompt
- injecter un **suffixe dynamique** en dessous de la limite du cache du prompt

Utilisez les contributions détenues par le fournisseur pour un réglage spécifique à la famille de modèles. Conservez l'ancienne mutation de prompt `before_prompt_build` pour la compatibilité ou pour des modifications de prompt véritablement globales, et non pour le comportement normal du fournisseur.

## Structure

Le prompt est intentionnellement compact et utilise des sections fixes :

- **Outils (Tooling)** : rappel de la source de vérité de l'outil structuré plus directives d'utilisation de l'outil au runtime.
- **Sécurité** : rappel de garde-fou court pour éviter les comportements de recherche de pouvoir ou le contournement de la supervision.
- **Skills** (lorsque disponibles) : indique au modèle comment charger les instructions de compétences à la demande.
- **Mise à jour automatique OpenClaw** : comment inspecter la configuration en toute sécurité avec
  `config.schema.lookup`, modifier la configuration avec `config.patch`, remplacer la configuration complète
  par `config.apply` et exécuter `update.run` uniquement sur demande explicite de l'utilisateur. L'outil `gateway`, réservé au propriétaire, refuse également de réécrire
  `tools.exec.ask` / `tools.exec.security`, y compris les alias `tools.bash.*`
  hérités qui sont normalisés vers ces chemins d'exécution protégés.
- **Espace de travail (Workspace)** : répertoire de travail (`agents.defaults.workspace`).
- **Documentation** : chemin local vers la documentation OpenClaw (dépôt ou paquet npm) et quand les lire.
- **Fichiers de l'espace de travail (injectés)** : indique que les fichiers d'amorçage sont inclus ci-dessous.
- **Sandbox** (lorsqu'activé) : indique le runtime sandboxé, les chemins du bac à sable, et si l'exécution élevée est disponible.
- **Date et heure actuelles** : heure locale de l'utilisateur, fuseau horaire et format de l'heure.
- **Balises de réponse** : syntaxe facultative des balises de réponse pour les fournisseurs pris en charge.
- **Battements de cœur** : comportement du prompt de battement de cœur et de l'accusé de réception, lorsque les battements de cœur sont activés pour l'agent par défaut.
- **Runtime** : hôte, système d'exploitation, nœud, modèle, racine du dépôt (lorsque détectée), niveau de réflexion (une ligne).
- **Raisonnement** : niveau de visibilité actuel + indice de basculement /reasoning.

La section Outils inclut également des directives de runtime pour le travail de longue durée :

- utilisez cron pour le suivi futur (`check back later`, rappels, travail récurrent)
  au lieu des boucles `exec` sleep, des astuces de délai `yieldMs` ou d'un `process`
  polling répété
- utilisez `exec` / `process` uniquement pour les commandes qui commencent maintenant et continuent de s'exécuter
  en arrière-plan
- lorsque le réveil automatique à l'achèvement est activé, lancez la commande une seule fois et comptez sur
  le chemin de réveil basé sur la poussée (push) lorsqu'elle émet une sortie ou échoue
- utilisez `process` pour les journaux, le statut, la saisie ou l'intervention lorsque vous avez besoin de
  inspecter une commande en cours d'exécution
- si la tâche est plus importante, préférez `sessions_spawn` ; l'achèvement du sous-agent est
  basé sur la poussée (push) et s'annonce automatiquement au demandeur
- n'interrogez pas (poll) `subagents list` / `sessions_list` en boucle juste pour attendre
  l'achèvement

Lorsque l'outil expérimental `update_plan` est activé, l'outillage indique également au
modèle de l'utiliser uniquement pour le travail non trivial en plusieurs étapes, de garder exactement une
étape `in_progress`, et d'éviter de répéter l'intégralité du plan après chaque mise à jour.

Les garde-fous de sécurité dans le système de prompt sont consultatifs. Ils guident le comportement du modèle mais n'appliquent pas la politique. Utilisez la stratégie d'outil, les approbations d'exécution, le sandboxing et les listes d'autorisation de canal pour une application stricte ; les opérateurs peuvent les désactiver par conception.

Sur les canaux avec des cartes/boutons d'approbation natifs, le prompt d'exécution indique maintenant à
l'agent de s'appuyer d'abord sur cette interface d'approbation native. Il ne doit inclure une commande manuelle
`/approve` que lorsque le résultat de l'outil indique que les approbations par chat sont indisponibles ou
que l'approbation manuelle est le seul chemin possible.

## Modes de prompt

OpenClaw peut générer des prompts système plus petits pour les sous-agents. Le temps d'exécution définit un
`promptMode` pour chaque exécution (pas une configuration visible par l'utilisateur) :

- `full` (par défaut) : inclut toutes les sections ci-dessus.
- `minimal` : utilisé pour les sous-agents ; omet **Skills**, **Memory Recall**, **OpenClaw
  Self-Update**, **Model Aliases**, **User Identity**, **Reply Tags**,
  **Messaging**, **Silent Replies**, et **Heartbeats**. L'outillage, la **Sécurité**,
  l'espace de travail, le bac à sable (Sandbox), la date et l'heure actuelles (si connues), le temps d'exécution et le contexte
  injecté restent disponibles.
- `none` : renvoie uniquement la ligne d'identité de base.

Lorsque `promptMode=minimal`, les invites supplémentaires injectées sont étiquetées **Subagent
Context** au lieu de **Group Chat Context**.

## Injection de l'amorçage de l'espace de travail

Les fichiers d'amorçage sont rognés et ajoutés sous **Project Context** afin que le modèle voie le contexte d'identité et de profil sans avoir besoin de lectures explicites :

- `AGENTS.md`
- `SOUL.md`
- `TOOLS.md`
- `IDENTITY.md`
- `USER.md`
- `HEARTBEAT.md`
- `BOOTSTRAP.md` (uniquement sur les espaces de travail tout nouveaux)
- `MEMORY.md` si présent, sinon `memory.md` comme repli en minuscules

Tous ces fichiers sont **injectés dans la fenêtre de contexte** à chaque tour, sauf si une porte spécifique au fichier s'applique. `HEARTBEAT.md` est omis lors des exécutions normales lorsque les battements de cœur sont désactivés pour l'agent par défaut ou que `agents.defaults.heartbeat.includeSystemPromptSection` est faux. Gardez les fichiers injectés concis — en particulier `MEMORY.md`, qui peut augmenter au fil du temps et entraîner une utilisation inattendue du contexte et des compactages plus fréquents.

> **Remarque :** Les fichiers quotidiens `memory/*.md` ne font **pas** partie du
> Project Context de démarrage normal. Lors des tours ordinaires, ils sont consultés à la demande via les
> outils `memory_search` et `memory_get`, ils ne comptent donc pas dans la
> fenêtre de contexte à moins que le modèle ne les lise explicitement. Les tours `/new` et
> `/reset` nus font exception : le runtime peut prépender la mémoire quotidienne récente
> sous forme d'un bloc de contexte de démarrage ponctuel pour ce premier tour.

Les fichiers volumineux sont tronqués avec un marqueur. La taille maximale par fichier est contrôlée par
`agents.defaults.bootstrapMaxChars` (par défaut : 12000). Le contenu total de l'amorçage injecté
sur les fichiers est plafonné par `agents.defaults.bootstrapTotalMaxChars`
(par défaut : 60000). Les fichiers manquants injectent un marqueur court de fichier manquant. Lorsqu'une troncation
se produit, OpenClaw peut injecter un bloc d'avertissement dans le contexte du projet ; contrôlez ceci avec
`agents.defaults.bootstrapPromptTruncationWarning` (`off`, `once`, `always` ;
par défaut : `once`).

Les sessions de sous-agents n'injectent que `AGENTS.md` et `TOOLS.md` (les autres fichiers de démarrage
sont filtrés pour garder le contexte du sous-agent petit).

Les hooks internes peuvent intercepter cette étape via `agent:bootstrap` pour modifier ou remplacer
les fichiers de démarrage injectés (par exemple, échanger `SOUL.md` pour une personnalité alternative).

Si vous souhaitez rendre l'agent moins générique, commencez par
[SOUL.md Personality Guide](/fr/concepts/soul).

Pour inspecter la contribution de chaque fichier injecté (brut vs injecté, troncation, ainsi que la surcharge du schéma d'outils), utilisez `/context list` ou `/context detail`. Voir [Context](/fr/concepts/context).

## Gestion de l'heure

Le prompt système inclut une section dédiée **Date et heure actuelles** lorsque le
fuseau horaire de l'utilisateur est connu. Pour garder le prompt stable en cache, il n'inclut désormais
que le **fuseau horaire** (pas d'horloge dynamique ni de format d'heure).

Utilisez `session_status` lorsque l'agent a besoin de l'heure actuelle ; la carte de statut
comprend une ligne d'horodatage. Le même outil peut optionnellement définir une substitution de modèle
par session (`model=default` l'efface).

Configurer avec :

- `agents.defaults.userTimezone`
- `agents.defaults.timeFormat` (`auto` | `12` | `24`)

Voir [Date & Time](/fr/date-time) pour les détails complets du comportement.

## Skills

Lorsque des compétences éligibles existent, OpenClaw injecte une **liste des compétences disponibles** compacte
(`formatSkillsForPrompt`) qui inclut le **chemin de fichier** pour chaque compétence. Le
prompt instruit le model d'utiliser `read` pour charger le SKILL.md à l'emplacement
répertorié (espace de travail, géré ou groupé). Si aucune compétence n'est éligible, la
section Skills est omise.

L'éligibilité comprend les portes de métadonnées de compétence, les vérifications de l'environnement d'exécution/de configuration,
et la liste d'autorisation effective des compétences de l'agent lorsque `agents.defaults.skills` ou
`agents.list[].skills` est configuré.

```
<available_skills>
  <skill>
    <name>...</name>
    <description>...</description>
    <location>...</location>
  </skill>
</available_skills>
```

Cela permet de garder le prompt de base petit tout en permettant une utilisation ciblée des compétences.

Le budget de la liste des compétences appartient au sous-système de compétences :

- Par défaut global : `skills.limits.maxSkillsPromptChars`
- Remplacement par agent : `agents.list[].skillsLimits.maxSkillsPromptChars`

Les extraits d'exécution bornés génériques utilisent une surface différente :

- `agents.defaults.contextLimits.*`
- `agents.list[].contextLimits.*`

Cette séparation garde le dimensionnement des compétences distinct du dimensionnement de la lecture/injection à l'exécution tel
que `memory_get`, les résultats en direct des outils, et les actualisations de l'AGENTS.md post-compaction.

## Documentation

Lorsqu'elle est disponible, le prompt système inclut une section **Documentation** qui pointe vers le
répertoire local de la documentation OpenClaw (soit `docs/` dans l'espace de travail du dépôt ou le npm
bundled package docs) et note également le miroir public, le dépôt source, la communauté Discord, et
le ClawHub ([https://clawhub.ai](https://clawhub.ai)) pour la découverte de compétences. Le prompt instruit le model de consulter d'abord la documentation locale
pour le comportement, les commandes, la configuration ou l'architecture de OpenClaw, et d'exécuter
`openclaw status` lui-même lorsque cela est possible (demandant à l'utilisateur uniquement lorsqu'il n'y a pas d'accès).
