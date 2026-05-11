---
summary: "Contient le prompt système OpenClaw et comment il est assemblé"
read_when:
  - Editing system prompt text, tools list, or time/heartbeat sections
  - Changing workspace bootstrap or skills injection behavior
title: "System prompt"
---

OpenClaw construit un prompt système personnalisé pour chaque exécution d'agent. Le prompt est **propriété de OpenClaw** et n'utilise pas le prompt par défaut de pi-coding-agent.

Le prompt est assemblé par OpenClaw et injecté dans chaque exécution d'agent.

Les plugins de provider peuvent contribuer à des directives de prompt conscientes du cache sans remplacer le prompt complet propriété de OpenClaw. Le runtime du provider peut :

- remplacer un petit ensemble de sections principales nommées (`interaction_style`,
  `tool_call_style`, `execution_bias`)
- injecter un **préfixe stable** au-dessus de la limite du cache du prompt
- injecter un **suffixe dynamique** en dessous de la limite du cache du prompt

Utilisez les contributions propriétaires du provider pour un réglage spécifique à la famille de modèles. Conservez la mutation de prompt `before_prompt_build` héritée pour la compatibilité ou pour les modifications vraiment globales du prompt, et non pour le comportement normal du provider.

La superposition de la famille OpenAI GPT-5 maintient la règle d'exécution principale petite et ajoute des directives spécifiques au modèle pour l'accroche de la personnalité, la sortie concise, la discipline des outils, la recherche parallèle, la couverture des livrables, la vérification, le contexte manquant et l'hygiène des outils de terminal.

## Structure

Le prompt est intentionnellement compact et utilise des sections fixes :

- **Outils (Tooling)** : rappel de la source de vérité de l'outil structuré plus directives d'utilisation de l'outil au runtime.
- **Biais d'exécution** : directives concises de suivi : agir à tour de rôle sur les demandes actionnables, continuer jusqu'à ce que ce soit terminé ou bloqué, récupérer des résultats d'outil faibles, vérifier l'état mutable en direct et vérifier avant de finaliser.
- **Sécurité** : rappel court de garde-fou pour éviter le comportement de recherche de pouvoir ou le contournement de la supervision.
- **Skills** (lorsque disponibles) : indique au modèle comment charger les instructions de compétences à la demande.
- **Mise à jour automatique OpenClaw** : comment inspecter la configuration en toute sécurité avec
  `config.schema.lookup`, modifier la configuration avec `config.patch`, remplacer la configuration
  complète avec `config.apply`, et exécuter `update.run` uniquement sur demande explicite de l'utilisateur. L'outil `gateway` réservé au propriétaire refuse également de réécrire
  `tools.exec.ask` / `tools.exec.security`, y compris les alias `tools.bash.*`
  hérités qui sont normalisés vers ces chemins d'exécution protégés.
- **Espace de travail** : répertoire de travail (`agents.defaults.workspace`).
- **Documentation** : chemin local vers la documentation OpenClaw (dépôt ou package npm) et quand les lire.
- **Fichiers de l'espace de travail (injectés)** : indique que les fichiers d'amorçage sont inclus ci-dessous.
- **Sandbox** (lorsqu'activée) : indique l'environnement d'exécution sandboxé, les chemins de la sandbox, et si l'exécution élevée est disponible.
- **Date et heure actuelles** : heure locale de l'utilisateur, fuseau horaire et format de l'heure.
- **Balises de réponse** : syntaxe de balise de réponse optionnelle pour les fournisseurs pris en charge.
- **Battements de cœur (Heartbeats)** : comportement de prompt et d'accusé de réception des battements de cœur, lorsque ceux-ci sont activés pour l'agent par défaut.
- **Runtime** : hôte, système d'exploitation, nœud, model, racine du dépôt (lorsqu'elle est détectée), niveau de réflexion (une ligne).
- **Raisonnement** : niveau de visibilité actuel + indice de basculement /reasoning.

La section Outils (Tooling) inclut également des directives d'exécution pour les tâches de longue durée :

- utilisez cron pour les suivis futurs (`check back later`, rappels, tâches récurrentes)
  au lieu de `exec` boucles de sleep, `yieldMs` astuces de délai, ou `process`
  polling répété
- utilisez `exec` / `process` uniquement pour les commandes qui démarrent maintenant et continuent de s'exécuter
  en arrière-plan
- lorsque le réveil automatique à la fin (completion wake) est activé, lancez la commande une seule fois et comptez sur
  le chemin de réveil basé sur les push (push-based) lorsqu'elle émet une sortie ou échoue
- utilisez `process` pour les journaux, le statut, la saisie ou l'intervention lorsque vous devez
  inspecter une commande en cours d'exécution
- si la tâche est plus importante, préférez `sessions_spawn` ; l'achèvement du sous-agent est
  basé sur les push (push-based) et s'annonce automatiquement au demandeur
- n'interrogez pas `subagents list` / `sessions_list` en boucle juste pour attendre
  l'achèvement

Lorsque l'outil expérimental `update_plan` est activé, la section Outils indique également au
model de l'utiliser uniquement pour le travail non trivial en plusieurs étapes, de conserver exactement une
étape `in_progress`, et d'éviter de répéter le plan entier après chaque mise à jour.

Les garde-fous de sécurité dans le système de prompt sont consultatifs. Ils guident le comportement du model mais n'appliquent pas la stratégie. Utilisez la stratégie d'outil (tool policy), les approbations d'exécution, le sandboxing et les listes d'autorisation de channel pour une application stricte ; les opérateurs peuvent les désactiver par conception.

Sur les canaux avec des cartes/boutons d'approbation natifs, le message d'exécution (prompt) indique désormais à l'agent de s'appuyer d'abord sur cette interface d'approbation native. Il ne doit inclure une commande `/approve` manuelle que lorsque le résultat de l'outil indique que les approbations par chat sont indisponibles ou que l'approbation manuelle est la seule option possible.

## Modes de prompt

OpenClaw peut générer des prompts système plus petits pour les sous-agents. L'environnement d'exécution définit un `promptMode` pour chaque exécution (pas une configuration visible par l'utilisateur) :

- `full` (par défaut) : inclut toutes les sections ci-dessus.
- `minimal` : utilisé pour les sous-agents ; omet les **Compétences**, la **Récupération de mémoire**, la **Mise à jour automatique OpenClaw**, les **Alias de modèle**, l'**Identité de l'utilisateur**, les **Balises de réponse**, la **Messagerie**, les **Réponses silencieuses** et les **Cycles de vie (Heartbeats)**. Les outils, la **Sécurité**, l'Espace de travail, le Bac à sable (Sandbox), la Date et l'heure actuelles (lorsqu'elles sont connues), l'environnement d'exécution et le contexte injecté restent disponibles.
- `none` : renvoie uniquement la ligne d'identité de base.

Lorsque `promptMode=minimal`, les prompts injectés supplémentaires sont étiquetés **Contexte de sous-agent** au lieu de **Contexte de chat de groupe**.

## Injection d'amorçage de l'espace de travail

Les fichiers d'amorçage sont coupés et ajoutés sous **Contexte du projet** afin que le modèle voie le contexte d'identité et de profil sans avoir besoin de lectures explicites :

- `AGENTS.md`
- `SOUL.md`
- `TOOLS.md`
- `IDENTITY.md`
- `USER.md`
- `HEARTBEAT.md`
- `BOOTSTRAP.md` (uniquement sur les espaces de travail tout neufs)
- `MEMORY.md` lorsqu'il est présent

Tous ces fichiers sont **injectés dans la fenêtre de contexte** à chaque tour, sauf si une porte (gate) spécifique à un fichier s'applique. `HEARTBEAT.md` est omis lors des exécutions normales lorsque les cycles de vie sont désactivés pour l'agent par défaut ou que `agents.defaults.heartbeat.includeSystemPromptSection` est faux. Gardez les fichiers injectés concis — en particulier `MEMORY.md`, qui peut augmenter avec le temps et entraîner une utilisation du contexte inattendument élevée et des compactages plus fréquents.

<Note>
  `memory/*.md` daily files are **not** part of the normal bootstrap Project Context. On ordinary turns they are accessed on demand via the `memory_search` and `memory_get` tools, so they do not count against the context window unless the model explicitly reads them. Bare `/new` and `/reset` turns are the exception: the runtime can prepend recent daily memory as a one-shot startup-context block
  for that first turn.
</Note>

Les fichiers volumineux sont tronqués à l'aide d'un marqueur. La taille maximale par fichier est contrôlée par
`agents.defaults.bootstrapMaxChars` (par défaut : 12000). Le contenu total de bootstrap injecté
sur tous les fichiers est plafonné par `agents.defaults.bootstrapTotalMaxChars`
(par défaut : 60000). Les fichiers manquants injectent un marqueur court de fichier manquant. Lorsqu'une troncation
survient, OpenClaw peut injecter un bloc d'avertissement dans le contexte du projet ; contrôlez ceci avec
`agents.defaults.bootstrapPromptTruncationWarning` (`off`, `once`, `always` ;
par défaut : `once`).

Les sessions de sous-agents n'injectent que `AGENTS.md` et `TOOLS.md` (les autres fichiers de bootstrap
sont filtrés pour garder le contexte du sous-agent petit).

Les hooks internes peuvent intercepter cette étape via `agent:bootstrap` pour modifier ou remplacer
les fichiers de bootstrap injectés (par exemple en échangeant `SOUL.md` pour une personnalité alternative).

Si vous souhaitez rendre l'agent moins générique, commencez par
le [Guide de personnalité SOUL.md](/fr/concepts/soul).

Pour inspecter la contribution de chaque fichier injecté (brut vs injecté, troncation, plus la surcharge du schéma d'outils), utilisez `/context list` ou `/context detail`. Voir [Contexte](/fr/concepts/context).

## Gestion du temps

Le système de prompt inclut une section dédiée **Date et heure actuelles** lorsque le
fuseau horaire de l'utilisateur est connu. Pour garder le cache du prompt stable, il n'inclut désormais que
le **fuseau horaire** (pas d'horloge dynamique ni de format d'heure).

Utilisez `session_status` lorsque l'agent a besoin de l'heure actuelle ; la carte de statut
inclut une ligne d'horodatage. Le même outil peut définir optionnellement une substitution de model par session
(`model=default` l'efface).

Configurer avec :

- `agents.defaults.userTimezone`
- `agents.defaults.timeFormat` (`auto` | `12` | `24`)

Voir [Date & Heure](/fr/date-time) pour plus de détails sur le comportement.

## Skills

Lorsque des compétences éligibles existent, OpenClaw injecte une **liste de compétences disponibles** compacte
(`formatSkillsForPrompt`) qui inclut le **chemin de fichier** pour chaque compétence. Le
prompt instruit le model d'utiliser `read` pour charger le SKILL.md à l'emplacement
répertorié (espace de travail, géré ou groupé). Si aucune compétence n'est éligible, la
section Skills est omise.

L'éligibilité comprend les portes de métadonnées de compétence, les vérifications de l'environnement d'exécution/de configuration,
et la liste d'autorisation effective des compétences de l'agent lorsque `agents.defaults.skills` ou
`agents.list[].skills` est configuré.

Les compétences groupées par plugin ne sont éligibles que lorsque leur plugin propriétaire est activé.
Cela permet aux plugins d'outil d'exposer des guides d'exploitation plus approfondis sans intégrer tous ces
guides directement dans chaque description d'outil.

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

- Valeur par défaut globale : `skills.limits.maxSkillsPromptChars`
- Remplacement par agent : `agents.list[].skillsLimits.maxSkillsPromptChars`

Les extraits d'exécution bornés génériques utilisent une surface différente :

- `agents.defaults.contextLimits.*`
- `agents.list[].contextLimits.*`

Cette séparation maintient le dimensionnement des compétences distinct du dimensionnement de la lecture/injection à l'exécution, tel
que `memory_get`, les résultats en direct des outils et les actualisations AGENTS.md post-compaction.

## Documentation

Le système de prompt comprend une section **Documentation**. Lorsque la documentation locale est disponible, il
pointe vers le répertoire de documentation local OpenClaw (`docs/` dans un extrait Git ou le paquet npm
groupé). Si la documentation locale n'est pas disponible, il revient à
[https://docs.openclaw.ai](https://docs.openclaw.ai).

La même section inclut également l'emplacement source OpenClaw. Les extraits Git exposent la racine source locale afin que l'agent puisse inspecter le code directement. Les installations de package incluent l'URL source GitHub et indiquent à l'agent d'examiner la source à cet endroit lorsque la documentation est incomplète ou obsolète. Le prompt mentionne également le miroir de la documentation publique, le Discord communautaire et ClawHub ([https://clawhub.ai](https://clawhub.ai)) pour la découverte de compétences. Il indique au modèle de consulter d'abord la documentation concernant le comportement, les commandes, la configuration ou l'architecture d'OpenClaw, et d'exécuter `openclaw status` lui-même lorsque cela est possible (en demandant à l'utilisateur uniquement lorsqu'il n'a pas accès). Pour la configuration spécifiquement, il dirige les agents vers l'action d'outil `gateway` `config.schema.lookup` pour une documentation exacte au niveau des champs et des contraintes, puis vers `docs/gateway/configuration.md` et `docs/gateway/configuration-reference.md` pour des orientations plus générales.

## Connexes

- [Runtime de l'agent](/fr/concepts/agent)
- [Espace de travail de l'agent](/fr/concepts/agent-workspace)
- [Moteur de contexte](/fr/concepts/context-engine)
