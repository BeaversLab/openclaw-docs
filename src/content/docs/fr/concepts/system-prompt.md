---
summary: "Contient le prompt système OpenClaw et comment il est assemblé"
read_when:
  - Editing system prompt text, tools list, or time/heartbeat sections
  - Changing workspace bootstrap or skills injection behavior
title: "System prompt"
---

OpenClaw construit un prompt système personnalisé pour chaque exécution d'agent. Le prompt est **propriété de OpenClaw** et n'utilise pas le prompt par défaut de pi-coding-agent.

Le prompt est assemblé par OpenClaw et injecté dans chaque exécution d'agent.

L'assemblage du prompt comporte trois couches :

- `buildAgentSystemPrompt` génère le prompt à partir d'entrées explicites. Il doit
  rester un générateur pur et ne pas lire la configuration globale directement.
- `resolveAgentSystemPromptConfig` résout les paramètres de prompt basés sur la configuration, tels que
  l'affichage du propriétaire, les indices TTS, les alias de modèle, le mode de citation de mémoire et le mode de délégation
  de sous-agent pour un agent spécifique.
- Les adaptateurs d'exécution (intégré, CLI, aperçus de commande/exportation, compactage) rassemblent
  des faits en direct tels que les outils, l'état du bac à sable, les capacités du canal, les fichiers de contexte,
  et les contributions de prompt du fournisseur, puis appellent la façade de prompt configurée.

Cela permet de maintenir les surfaces de prompt exportées/déboguées alignées avec les exécutions en direct sans
transformer chaque détail spécifique à l'exécution en un constructeur monolithique.

Les plugins de fournisseur peuvent contribuer à des directives de prompt conscientes du cache sans remplacer
le prompt entier propriété de OpenClaw. Le runtime du fournisseur peut :

- remplacer un petit ensemble de sections principales nommées (`interaction_style`,
  `tool_call_style`, `execution_bias`)
- injecter un **préfixe stable** au-dessus de la limite du cache de prompt
- injecter un **suffixe dynamique** en dessous de la limite du cache de prompt

Utilisez les contributions propriétaires du fournisseur pour un réglage spécifique à la famille de modèles. Conservez la
mutation de prompt `before_prompt_build` héritée pour la compatibilité ou les modifications de prompt
véritablement globales, et non pour le comportement normal du fournisseur.

La superposition de la famille OpenAI GPT-5 garde la règle d'exécution principale petite et ajoute
des directives spécifiques au modèle pour l'accrochage de la persona, la sortie concise, la discipline des outils,
la recherche parallèle, la couverture des livrables, la vérification, le contexte manquant et
l'hygiène des outils de terminal.

## Structure

Le prompt est intentionnellement compact et utilise des sections fixes :

- **Outils** : rappel de la source de vérité des outils structurés plus directives d'utilisation des outils à l'exécution.
- **Biais d'exécution** : directives compactes de suivi : agir à tour de rôle sur
  les demandes actionnables, continuer jusqu'à ce que ce soit terminé ou bloqué, récupérer des résultats d'outils
  faibles, vérifier l'état mutable en direct et vérifier avant de finaliser.
- **Sécurité** : court rappel des garde-fous pour éviter les comportements de recherche de pouvoir ou le contournement de la supervision.
- **Skills** (lorsqu'elles sont disponibles) : indique au modèle comment charger les instructions de skills à la demande.
- **Mise à jour automatique d'OpenClaw** : comment inspecter la configuration en toute sécurité avec
  OpenClaw`config.schema.lookup`, modifier la configuration avec `config.patch`, remplacer la configuration
  complète par `config.apply` et exécuter `update.run` uniquement sur demande explicite de
  l'utilisateur. L'outil `gateway` réservé au propriétaire refuse également de réécrire
  `tools.exec.ask` / `tools.exec.security`, y compris les alias `tools.bash.*`
  hérités qui sont normalisés vers ces chemins d'exécution protégés.
- **Espace de travail** : répertoire de travail (`agents.defaults.workspace`).
- **Documentation** : chemin local vers la documentation d'OpenClaw (dépôt ou package npm) et quand les lire.
- **Fichiers de l'espace de travail (injectés)** : indique que les fichiers d'amorçage sont inclus ci-dessous.
- **Bac à sable** (Sandbox) (lorsqu'il est activé) : indique l'exécution en bac à sable, les chemins du bac à sable et si une exécution élevée est disponible.
- **Date et heure actuelles** : fuseau horaire uniquement (stable dans le cache ; l'horloge en direct provient de `session_status`).
- **Balises de réponse** : syntaxe de balise de réponse optionnelle pour les fournisseurs pris en charge.
- **Battements de cœur** (Heartbeats) : comportement du prompt et de l'accusé de réception des battements de cœur, lorsqu'ils sont activés pour l'agent par défaut.
- **Exécution** (Runtime) : hôte, système d'exploitation, nœud, modèle, racine du dépôt (lorsqu'elle est détectée), niveau de réflexion (une ligne).
- **Raisonnement** : niveau de visibilité actuel + indice de basculement /reasoning.

OpenClaw conserve le contenu stable de grande taille, y compris **Contexte du projet**, au-dessus de
la limite du cache de prompt interne. Les sections volatiles de canal/session telles que
les conseils intégrés de l'interface de contrôle, **Messagerie**, **Voix**, **Contexte de conversation de groupe**,
**Réactions**, **Battements de cœur**, et **Exécution** sont ajoutées en dessous de cette limite
afin que les backends locaux avec des préfixes de cache puissent réutiliser le préfixe stable de l'espace de travail
à travers les tours de canal. Les descriptions des outils devraient également éviter d'intégrer les noms de
canal actuels lorsque le schéma accepté transporte déjà ce détail d'exécution.

La section Outils (Tooling) comprend également des conseils d'exécution pour le travail de longue durée :

- utilisez cron pour le suivi futur (`check back later`, rappels, travail récurrent)
  au lieu des boucles de sommeil `exec`, des astuces de délai `yieldMs` ou du `process`
  polling répété
- utilisez `exec` / `process` uniquement pour les commandes qui démarrent maintenant et continuent de s'exécuter
  en arrière-plan
- lorsque le réveil automatique à l'achèvement est activé, lancez la commande une seule fois et comptez sur
  le chemin de réveil basé sur le push (push) lorsqu'elle émet une sortie ou échoue
- utilisez `process` pour les journaux, le statut, la saisie ou l'intervention lorsque vous devez
  inspecter une commande en cours d'exécution
- si la tâche est plus importante, préférez `sessions_spawn` ; l'achèvement du sous-agent est
  basé sur le push et s'annonce automatiquement au demandeur
- n'interrogez pas `subagents list` / `sessions_list` en boucle juste pour attendre
  l'achèvement

`agents.defaults.subagents.delegationMode` peut renforcer cette orientation. Le
mode `suggest` par défaut conserve le rappel de base (nudge). `prefer` ajoute une section
dédiée **Délégation de sous-agent** (Sub-Agent Delegation) indiquant à l'agent principal d'agir en tant que coordinateur
réactif et de transmettre tout ce qui dépasse une réponse directe via
`sessions_spawn`. Cela concerne uniquement le prompt ; la stratégie d'outil (tool policy) contrôle toujours si
`sessions_spawn` est disponible.

Lorsque l'outil expérimental `update_plan` est activé, la section Outils (Tooling) indique également au
modèle de l'utiliser uniquement pour le travail multi-étapes non trivial, de garder exactement une
étape `in_progress`, et d'éviter de répéter l'ensemble du plan après chaque mise à jour.

Les garde-fous de sécurité dans le prompt système sont consultatifs. Ils guident le comportement du modèle mais n'appliquent pas la stratégie. Utilisez la stratégie d'outil, les approbations d'exécution, la mise en bac à sable et les listes d'autorisation de canal (channel allowlists) pour une application stricte ; les opérateurs peuvent les désactiver par conception.

Sur les canaux dotés de cartes/boutons d'approbation natifs, le prompt d'exécution indique désormais à
l'agent de s'appuyer d'abord sur cette interface d'approbation native. Il ne doit inclure une commande manuelle
`/approve` que lorsque le résultat de l'outil indique que les approbations par chat sont indisponibles ou
que l'approbation manuelle est le seul chemin possible.

## Modes de prompt

OpenClaw peut générer des invites système plus petites pour les sous-agents. Le runtime définit un
`promptMode` pour chaque exécution (pas une configuration visible par l'utilisateur) :

- `full` (par défaut) : inclut toutes les sections ci-dessus.
- `minimal` : utilisé pour les sous-agents ; omet **Skills**, **Memory Recall**, **OpenClaw
  Self-Update**, **Model Aliases**, **User Identity**, **Reply Tags**,
  **Messaging**, **Silent Replies** et **Heartbeats**. Les outils, **Safety**,
  l'espace de travail, Sandbox, la date et l'heure actuelles (lorsqu'elles sont connues), le runtime et le contexte
  injecté restent disponibles.
- `none` : renvoie uniquement la ligne d'identité de base.

Lorsque `promptMode=minimal`, les invites injectées supplémentaires sont étiquetées **Subagent
Context** au lieu de **Group Chat Context**.

Pour les exécutions de réponse automatique sur un channel, OpenClaw peut omettre la section générique **Silent Replies**
lorsque le contexte de conversation directe/groupe inclut déjà le comportement résolu
spécifique à la conversation `NO_REPLY`. Cela évite de répéter la mécanique des jetons
dans l'invite système globale et le contexte du channel.

## Instantanés d'invite

OpenClaw conserve des instantanés d'invite validés pour le chemin heureux du runtime Codex sous
`test/fixtures/agents/prompt-snapshots/codex-runtime-happy-path/`. Ils génèrent
les paramètres de fil/tour de serveur d'application sélectionnés plus une pile de calques d'invite liée au modèle reconstruite pour les tours directs Telegram, les groupes Discord et les battements de cœur. Cette pile
inclut une fixture d'invite de modèle Codex `gpt-5.5` épinglée générée à partir de la forme du catalogue/cache de modèle de Codex,
le texte de développeur d'autorisation du chemin heureux de Codex,
les instructions de développeur OpenClaw, les instructions de mode de collaboration étendues au tour
lorsque OpenClaw les fournit, l'entrée utilisateur du tour et des références aux spécifications d'outils dynamiques.

Actualisez la fixture de prompt de modèle Codex épinglée avec
`pnpm prompt:snapshots:sync-codex-model`. Par défaut, le script recherche
le cache d'exécution de Codex à `$CODEX_HOME/models_cache.json`, puis
`~/.codex/models_cache.json`, et ne revient ensuite à la convention de checkout
du mainteneur Codex à `~/code/codex/codex-rs/models-manager/models.json` que si nécessaire. Si
aucune de ces sources n'existe, la commande se termine sans modifier la fixture
validée. Passez `--catalog <path>` pour actualiser à partir d'un `models_cache.json`
spécifique ou d'un fichier `models.json`.

Ces instantanés ne sont toujours pas une capture brute octet par octet d'une requête OpenAI. Codex
peut ajouter un contexte d'espace de travail propriétaire de l'exécution tel que `AGENTS.md`, le contexte
d'environnement, les mémoires, les instructions de l'application/plugin et les instructions intégrées
de mode de collaboration par défaut dans le runtime Codex après que OpenClaw a envoyé
les paramètres de fil et de tour.

Régénérez-les avec `pnpm prompt:snapshots:gen` et vérifiez la dérive avec
`pnpm prompt:snapshots:check`. Le CI exécute la vérification de dérive dans le shard de
frontière supplémentaire afin que les modifications de prompt et les mises à jour d'instantanés restent attachées à la même
PR.

## Injection du bootstrap de l'espace de travail

Les fichiers de bootstrap sont rognés et ajoutés sous **Contexte du projet** afin que le modèle voie le contexte d'identité et de profil sans avoir besoin de lectures explicites :

- `AGENTS.md`
- `SOUL.md`
- `TOOLS.md`
- `IDENTITY.md`
- `USER.md`
- `HEARTBEAT.md`
- `BOOTSTRAP.md` (uniquement sur les espaces de travail tout neufs)
- `MEMORY.md` lorsque présent

Tous ces fichiers sont **injectés dans la fenêtre de contexte** à chaque tour, sauf si une porte spécifique au fichier s'applique. `HEARTBEAT.md` est omis lors des exécutions normales lorsque les battements de cœur sont désactivés pour l'agent par défaut ou que `agents.defaults.heartbeat.includeSystemPromptSection` est faux. Gardez les fichiers injectés concis, en particulier `MEMORY.md`. `MEMORY.md` est destiné à rester un résumé à long terme soigné ; les notes quotidiennes détaillées appartiennent à `memory/*.md` où `memory_search` et `memory_get` peuvent les récupérer à la demande. Les fichiers `MEMORY.md` trop volumineux augmentent l'utilisation du prompt et peuvent être partiellement injectés en raison des limites des fichiers de démarrage ci-dessous.

Lorsqu'une session s'exécute sur le harnais natif Codex, Codex charge `AGENTS.md` via sa propre découverte de documents de projet. OpenClaw résout toujours les fichiers de démarrage restants et les transmet en tant qu'instructions de configuration Codex, donc `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`, `BOOTSTRAP.md` et `MEMORY.md` conservent le même rôle de contexte de l'espace de travail sans dupliquer `AGENTS.md`.

<Note>
  Les fichiers quotidiens `memory/*.md` ne font **pas** partie du contexte de projet de démarrage normal. Lors des tours ordinaires, ils sont accessibles à la demande via les outils `memory_search` et `memory_get`, ils ne comptent donc pas contre la fenêtre de contexte à moins que le modèle ne les lise explicitement. Les tours `/new` et `/reset` nus font exception : le runtime peut ajouter une
  mémoire quotidienne récente comme bloc de contexte de démarrage ponctuel pour ce premier tour.
</Note>

Les fichiers volumineux sont tronqués à l'aide d'un marqueur. La taille maximale par fichier est contrôlée par
`agents.defaults.bootstrapMaxChars` (par défaut : 12000). Le contenu total de bootstrap injecté
sur tous les fichiers est plafonné par `agents.defaults.bootstrapTotalMaxChars`
(par défaut : 60000). Les fichiers manquants injectent un marqueur court de fichier manquant. Lorsqu'une troncation
se produit, OpenClaw peut injecter un avis d'avertissement concis sur le système de prompt ; contrôlez cela avec
`agents.defaults.bootstrapPromptTruncationWarning` (`off`, `once`, `always` ;
par défaut : `once`). Les comptes détaillés bruts/injectés restent dans les diagnostics tels que
`/context`, `/status`, doctor, et les journaux.

Pour les fichiers de mémoire, la troncation ne signifie pas une perte de données : le fichier reste intact sur le disque,
mais le modèle ne voit que la copie injectée raccourcie jusqu'à ce qu'il lise ou recherche
la mémoire directement. Si `MEMORY.md` est tronqué à plusieurs reprises, distillez-le en un
résumé durable plus court et déplacez l'historique détaillé dans `memory/*.md`, ou
augmentez intentionnellement les limites de bootstrap.

Les sessions de sous-agent n'injectent que `AGENTS.md` et `TOOLS.md` (les autres fichiers de bootstrap
sont filtrés pour garder le contexte du sous-agent petit).

Les crochets internes peuvent intercepter cette étape via `agent:bootstrap` pour modifier ou remplacer
les fichiers de bootstrap injectés (par exemple en échangeant `SOUL.md` pour une persona alternative).

Si vous souhaitez rendre l'agent moins générique, commencez par
le [Guide de personnalité SOUL.md](/fr/concepts/soul).

Pour inspecter la contribution de chaque fichier injecté (brut par rapport à injecté, troncation, plus la surcharge du schéma d'outil), utilisez `/context list` ou `/context detail`. Voir [Contexte](/fr/concepts/context).

## Gestion de l'heure

Le système de prompt comprend une section dédiée **Date et heure actuelles** lorsque le
fuseau horaire de l'utilisateur est connu. Pour garder le cache du prompt stable, il inclut désormais
uniquement le **fuseau horaire** (pas d'horloge dynamique ni de format d'heure).

Utilisez `session_status` lorsque l'agent a besoin de l'heure actuelle ; la carte d'état
comprend une ligne d'horodatage. Le même outil peut éventuellement définir une substitution de model
par session (`model=default` l'efface).

Configurez avec :

- `agents.defaults.userTimezone`
- `agents.defaults.timeFormat` (`auto` | `12` | `24`)

Voir [Date & Heure](/fr/date-time) pour plus de détails sur le comportement.

## Skills

Lorsque des skills éligibles existent, OpenClaw injecte une **liste des skills disponibles** compacte
(`formatSkillsForPrompt`) qui inclut le **chemin de fichier** pour chaque skill. Le
prompt instruit le model d'utiliser `read` pour charger le SKILL.md à l'emplacement
indiqué (espace de travail, géré ou groupé). Si aucune skill n'est éligible, la
section Skills est omise.

L'éligibilité comprend les portes de métadonnées de skill, les vérifications de configuration/environnement d'exécution,
et la liste d'autorisation effective des skills de l'agent lorsque `agents.defaults.skills` ou
`agents.list[].skills` est configuré.

Les skills groupées par plugin ne sont éligibles que lorsque leur plugin propriétaire est activé.
Cela permet aux plugins d'outil d'exposer des guides d'utilisation approfondis sans intégrer toutes
ces directives directement dans chaque description d'outil.

```
<available_skills>
  <skill>
    <name>...</name>
    <description>...</description>
    <location>...</location>
  </skill>
</available_skills>
```

Cela permet de garder le prompt de base petit tout en permettant une utilisation ciblée des skills.

Le budget de la liste des skills est détenu par le sous-système des skills :

- Par défaut global : `skills.limits.maxSkillsPromptChars`
- Substitution par agent : `agents.list[].skillsLimits.maxSkillsPromptChars`

Les extraits d'exécution bornés génériques utilisent une surface différente :

- `agents.defaults.contextLimits.*`
- `agents.list[].contextLimits.*`

Cette séparation maintient le dimensionnement des skills distinct du dimensionnement de la lecture/injection d'exécution tel
que `memory_get`, les résultats d'outil en direct et les actualisations AGENTS.md post-compaction.

## Documentation

Le système de prompt comprend une section **Documentation**. Lorsque la documentation locale est disponible, il
pointe vers le répertoire de documentation local OpenClaw (`docs/` dans un extrait Git ou le package npm
groupé). Si la documentation locale n'est pas disponible, il revient à
[https://docs.openclaw.ai](https://docs.openclaw.ai).

La même section inclut également l'emplacement de la source OpenClaw. Les extraits Git exposent la racine source locale afin que l'agent puisse inspecter le code directement. Les installations de paquets incluent l'URL source GitHub et indiquent à l'agent d'examiner la source à cet endroit chaque fois que la documentation est incomplète ou obsolète. Le prompt mentionne également le miroir de la documentation publique, le Discord communautaire et ClawHub ([https://clawhub.ai](https://clawhub.ai)) pour la découverte de compétences. Il indique au modèle de consulter d'abord la documentation pour le comportement, les commandes, la configuration ou l'architecture OpenClaw, et d'exécuter `openclaw status` lui-même lorsque cela est possible (en demandant à l'utilisateur uniquement lorsqu'il n'a pas accès). Pour la configuration spécifiquement, il dirige les agents vers l'action d'outil `gateway` `config.schema.lookup` pour une documentation exacte au niveau du champ et des contraintes, puis vers `docs/gateway/configuration.md` et `docs/gateway/configuration-reference.md` pour des conseils plus généraux.

## Connexes

- [Runtime de l'agent](/fr/concepts/agent)
- [Espace de travail de l'agent](/fr/concepts/agent-workspace)
- [Moteur de contexte](/fr/concepts/context-engine)
