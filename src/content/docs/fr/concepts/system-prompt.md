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

Le superposition de la famille OpenAI GPT-5 maintient la règle d'exécution principale petite et ajoute des conseils spécifiques au modèle pour l'accroche de la persona, la sortie concise, la discipline de l'outil, la recherche parallèle, la couverture des livrables, la vérification, le contexte manquant et l'hygiène des outils de terminal.

## Structure

Le prompt est intentionnellement compact et utilise des sections fixes :

- **Outils (Tooling)** : rappel de la source de vérité des outils structurés et conseils d'utilisation des outils à l'exécution.
- **Biais d'exécution** : conseils compacts de suivi : agir tour à tour sur les demandes actionnables, continuer jusqu'à ce que ce soit terminé ou bloqué, récupérer des résultats d'outil faibles, vérifier l'état modifiable en direct et vérifier avant de finaliser.
- **Sécurité** : court rappel des garde-fous pour éviter le comportement de recherche de pouvoir ou le contournement de la supervision.
- **Compétences (Skills)** (si disponibles) : indique au modèle comment charger les instructions des compétences à la demande.
- **Mise à jour automatique OpenClaw** : comment inspecter la configuration en toute sécurité avec `config.schema.lookup`, corriger la configuration avec `config.patch`, remplacer la configuration complète avec `config.apply` et exécuter `update.run` uniquement sur demande explicite de l'utilisateur. L'outil `gateway` réservé au propriétaire refuse également de réécrire `tools.exec.ask` / `tools.exec.security`, y compris les anciens alias `tools.bash.*` qui sont normalisés vers ces chemins d'exécution protégés.
- **Espace de travail (Workspace)** : répertoire de travail (`agents.defaults.workspace`).
- **Documentation** : chemin local vers les docs OpenClaw (dépôt ou package npm) et quand les lire.
- **Fichiers de l'espace de travail (injectés)** : indique que les fichiers d'amorçage sont inclus ci-dessous.
- **Bac à sable (Sandbox)** (si activé) : indique l'exécution en bac à sable, les chemins du bac à sable et si une exécution élevée est disponible.
- **Date et heure actuelles** : heure locale de l'utilisateur, fuseau horaire et format de l'heure.
- **Balises de réponse** : syntaxe de balise de réponse facultative pour les fournisseurs pris en charge.
- **Battements de cœur (Heartbeats)** : prompt de battement de cœur et comportement d'accusé de réception, lorsque les battements de cœur sont activés pour l'agent par défaut.
- **Exécution (Runtime)** : hôte, système d'exploitation, nœud, modèle, racine du dépôt (si détectée), niveau de réflexion (une ligne).
- **Raisonnement** : niveau de visibilité actuel + indice de basculement /reasoning.

La section Outils comprend également des conseils d'exécution pour les travaux de longue durée :

- utilisez cron pour le suivi futur (`check back later`, rappels, travail récurrent)
  au lieu des boucles `exec` sleep, des astuces de `yieldMs` delay, ou du `process`
  polling répété
- utilisez `exec` / `process` uniquement pour les commandes qui démarrent maintenant et continuent de s'exécuter
  en arrière-plan
- lorsque le réveil automatique à l'achèvement est activé, lancez la commande une seule fois et comptez sur
  le chemin de réveil basé sur le push lorsqu'elle émet une sortie ou échoue
- utilisez `process` pour les journaux, le statut, la saisie ou l'intervention lorsque vous devez
  inspecter une commande en cours d'exécution
- si la tâche est plus importante, préférez `sessions_spawn` ; l'achèvement du sous-agent est
  basé sur le push et s'annonce automatiquement au demandeur
- n'interrogez pas `subagents list` / `sessions_list` en boucle juste pour attendre
  l'achèvement

Lorsque l'outil expérimental `update_plan` est activé, Tooling indique également au
modèle de l'utiliser uniquement pour le travail non trivial en plusieurs étapes, de garder exactement une
étape `in_progress`, et d'éviter de répéter l'intégralité du plan après chaque mise à jour.

Les garde-fous de sécurité dans le système de prompt sont consultatifs. Ils guident le comportement du modèle mais n'appliquent pas la politique. Utilisez la stratégie d'outils, les approbations d'exécution, le sandboxing et les listes de canaux autorisés pour une application stricte ; les opérateurs peuvent les désactiver par conception.

Sur les canaux avec des cartes/boutons d'approbation natifs, le prompt d'exécution indique maintenant à
l'agent de s'appuyer d'abord sur cette interface d'approbation native. Il ne doit inclure une commande
`/approve` manuelle que lorsque le résultat de l'outil indique que les approbations par chat sont indisponibles ou
que l'approbation manuelle est le seul chemin.

## Modes de prompt

OpenClaw peut restituer des systèmes de prompt plus petits pour les sous-agents. Le runtime définit un
`promptMode` pour chaque exécution (pas une configuration visible par l'utilisateur) :

- `full` (par défaut) : inclut toutes les sections ci-dessus.
- `minimal` : utilisé pour les sous-agents ; omet **Skills**, **Memory Recall**, **OpenClaw
  Self-Update**, **Model Aliases**, **User Identity**, **Reply Tags**,
  **Messaging**, **Silent Replies** et **Heartbeats**. Tooling, **Safety**,
  Workspace, Sandbox, Current Date & Time (lorsqu'elles sont connues), Runtime et le contexte
  injecté restent disponibles.
- `none` : renvoie uniquement la ligne d'identité de base.

Lorsque `promptMode=minimal`, les invites injectées supplémentaires sont étiquetées **Contexte de sous-agent** au lieu de **Contexte de conversation de groupe**.

## Injection de l'amorçage de l'espace de travail

Les fichiers d'amorçage sont rognés et ajoutés sous **Contexte du projet** afin que le modèle voie le contexte d'identité et de profil sans avoir besoin de lectures explicites :

- `AGENTS.md`
- `SOUL.md`
- `TOOLS.md`
- `IDENTITY.md`
- `USER.md`
- `HEARTBEAT.md`
- `BOOTSTRAP.md` (uniquement sur les espaces de travail tout neufs)
- `MEMORY.md` si présent, sinon `memory.md` comme solution de repli en minuscules

Tous ces fichiers sont **injectés dans la fenêtre de contexte** à chaque tour, sauf si une porte spécifique au fichier s'applique. `HEARTBEAT.md` est omis lors des exécutions normales lorsque les battements de cœur sont désactivés pour l'agent par défaut ou que `agents.defaults.heartbeat.includeSystemPromptSection` est faux. Gardez les fichiers injectés concis — en particulier `MEMORY.md`, qui peut augmenter avec le temps et entraîner une utilisation du contexte inattendu et des compactages plus fréquents.

> **Remarque :** Les fichiers quotidiens `memory/*.md` ne font **pas** partie de l'amorçage normal
> du Contexte du projet. Lors des tours ordinaires, ils sont consultés à la demande via les
> outils `memory_search` et `memory_get`, ils ne comptent donc pas contre la
> fenêtre de contexte, sauf si le modèle les lit explicitement. Les tours `/new` et
> `/reset` nus font exception : le runtime peut ajouter en tête la mémoire quotidienne récente
> sous forme de bloc de contexte de démarrage ponctuel pour ce premier tour.

Les fichiers volumineux sont tronqués avec un marqueur. La taille maximale par fichier est contrôlée par
`agents.defaults.bootstrapMaxChars` (par défaut : 12000). Le contenu total du bootstrap injecté
sur tous les fichiers est plafonné par `agents.defaults.bootstrapTotalMaxChars`
(par défaut : 60000). Les fichiers manquants injectent un marqueur court de fichier manquant. Lorsqu'une troncation
se produit, OpenClaw peut injecter un bloc d'avertissement dans le contexte du projet ; contrôlez cela avec
`agents.defaults.bootstrapPromptTruncationWarning` (`off`, `once`, `always` ;
par défaut : `once`).

Les sessions de sous-agents n'injectent que `AGENTS.md` et `TOOLS.md` (les autres fichiers de bootstrap
sont filtrés pour garder le contexte du sous-agent petit).

Les crochets internes peuvent intercepter cette étape via `agent:bootstrap` pour modifier ou remplacer
les fichiers de bootstrap injectés (par exemple en échangeant `SOUL.md` pour une persona alternative).

Si vous souhaitez rendre l'agent moins générique, commencez par
le guide de personnalité [SOUL.md](/fr/concepts/soul).

Pour inspecter la contribution de chaque fichier injecté (brut par rapport à injecté, troncature, plus la surcharge du schéma d'outil), utilisez `/context list` ou `/context detail`. Voir [Contexte](/fr/concepts/context).

## Gestion du temps

Le prompt système comprend une section dédiée **Date et heure actuelles** lorsque le
fuseau horaire de l'utilisateur est connu. Pour garder le cache du prompt stable, il n'inclut désormais que
le **fuseau horaire** (pas d'horloge dynamique ni de format d'heure).

Utilisez `session_status` lorsque l'agent a besoin de l'heure actuelle ; la carte de statut
comprend une ligne d'horodatage. Le même outil peut éventuellement définir une substitution de model
par session (`model=default` l'efface).

Configurer avec :

- `agents.defaults.userTimezone`
- `agents.defaults.timeFormat` (`auto` | `12` | `24`)

Voir [Date et heure](/fr/date-time) pour tous les détails sur le comportement.

## Skills

Lorsque des compétences éligibles existent, OpenClaw injecte une **liste de compétences disponibles** compacte
(`formatSkillsForPrompt`) qui inclut le **chemin de fichier** pour chaque compétence. Le
prompt demande au modèle d'utiliser `read` pour charger le SKILL.md à l'emplacement
répertorié (espace de travail, géré ou groupé). Si aucune compétence n'est éligible, la
section Skills est omise.

L'éligibilité comprend les portes de métadonnées de compétence, les vérifications de l'environnement/de configuration d'exécution,
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

Le budget de la liste des compétences est détenu par le sous-système de compétences :

- Défaut global : `skills.limits.maxSkillsPromptChars`
- Remplacement par agent : `agents.list[].skillsLimits.maxSkillsPromptChars`

Les extraits d'exécution bornés génériques utilisent une surface différente :

- `agents.defaults.contextLimits.*`
- `agents.list[].contextLimits.*`

Cette séparation maintient le dimensionnement des compétences distinct du dimensionnement de la lecture/injection d'exécution tel
que `memory_get`, les résultats des outils en direct et les actualisations AGENTS.md post-compaction.

## Documentation

Lorsqu'elle est disponible, le prompt système inclut une section **Documentation** qui pointe vers le
répertoire de documentation local OpenClaw (soit `docs/` dans l'espace de travail du dépôt ou le package npm
groupé) et note également le miroir public, le dépôt source, la communauté Discord, et
le ClawHub ([https://clawhub.ai](https://clawhub.ai)) pour la découverte de compétences. Le prompt demande au modèle de consulter d'abord la documentation locale
pour le comportement, les commandes, la configuration ou l'architecture de OpenClaw, et d'exécuter
`openclaw status` lui-même lorsque cela est possible (demandant à l'utilisateur uniquement en cas d'accès manquant).
