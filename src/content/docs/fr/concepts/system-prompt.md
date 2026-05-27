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
- **OpenClaw Control** : indique au modèle de privilégier l'outil OpenClaw`gateway` pour
  le travail de configuration/redémarrage et d'éviter d'inventer des commandes CLI.
- **OpenClaw Mise à jour automatique** : comment inspecter la configuration en toute sécurité avec `config.schema.lookup`, appliquer un correctif à la configuration avec `config.patch`, remplacer la configuration complète par `config.apply` et exécuter `update.run` uniquement sur demande explicite de l'utilisateur. L'outil `gateway` orienté agent refuse également de réécrire `tools.exec.ask` / `tools.exec.security`, y compris les alias `tools.bash.*` obsolètes qui sont normalisés vers ces chemins d'exécution protégés.
- **Workspace** : répertoire de travail (`agents.defaults.workspace`).
- **Documentation** : chemin local vers la documentation/la source d'OpenClaw et quand les lire.
- **Workspace Files (injected)** : indique que les fichiers d'amorçage sont inclus ci-dessous.
- **Sandbox** (lorsqu'activé) : indique l'exécution isolée (sandboxed), les chemins du bac à sable (sandbox), et si l'exécution avec élévation est disponible.
- **Current Date & Time** : fuseau horaire uniquement (stable dans le cache ; l'horloge en direct provient de `session_status`).
- **Assistant Output Directives** : syntaxe de pièce jointe compacte, de note vocale et de balise de réponse.
- **Heartbeats** : comportement du prompt et de l'accusé de réception des battements de cœur (heartbeat), lorsque ceux-ci sont activés pour l'agent par défaut.
- **Runtime** : hôte, système d'exploitation, nœud, modèle, racine du dépôt (lorsqu'elle est détectée), niveau de réflexion (une ligne).
- **Reasoning** : niveau de visibilité actuel + indice de basculement /reasoning.

OpenClaw conserve le contenu stable important, y compris le **Contexte du Projet**, au-dessus de
la limite du cache de prompt interne. Les sections volatiles de canal/session telles que
les conseils intégrés de l'interface utilisateur de contrôle, la **Messagerie**, la **Voix**, le **Contexte de Discussion de Groupe**,
les **Réactions**, les **Battements de Cœur (Heartbeats)** et le **Runtime** sont ajoutées sous cette limite
afin que les backends locaux avec des préfixes de cache puissent réutiliser le préfixe d'espace de travail stable
à travers les tours de canal. Les descriptions des outils doivent également éviter d'intégrer les noms de
canal actuels lorsque le schéma accepté transporte déjà ce détail d'exécution.

La section Outils (Tooling) inclut également des conseils d'exécution pour le travail de longue durée :

- utilisez cron pour les suivis futurs (`check back later`, rappels, travail récurrent)
  au lieu des boucles de veille `exec`, des astuces de délai `yieldMs` ou des interrogations `process`
  répétées
- utilisez `exec` / `process` uniquement pour les commandes qui commencent maintenant et continuent de s'exécuter
  en arrière-plan
- lorsque le réveil automatique à l'achèvement est activé, lancez la commande une seule fois et comptez sur
  le chemin de réveil basé sur le push lorsqu'elle émet une sortie ou échoue
- utilisez `process` pour les journaux, le statut, la saisie ou l'intervention lorsque vous devez
  inspecter une commande en cours d'exécution
- si la tâche est plus importante, préférez `sessions_spawn` ; l'achèvement du sous-agent est
  basé sur le push et s'annonce automatiquement au demandeur
- n'interrogez pas `subagents list` / `sessions_list` en boucle juste pour attendre
  l'achèvement

`agents.defaults.subagents.delegationMode` peut renforcer cette recommandation. Le mode par défaut
`suggest` conserve le rappel de base. `prefer` ajoute une section dédiée
**Délégation de sous-agent** indiquant à l'agent principal d'agir en tant que coordinateur
réactif et de transmettre tout ce qui dépasse une réponse directe via
`sessions_spawn`. Cela concerne uniquement le prompt ; la stratégie d'outil contrôle toujours si
`sessions_spawn` est disponible.

Lorsque l'outil expérimental `update_plan` est activé, la partie Outiling indique également au
modèle de ne l'utiliser que pour le travail multi-étapes non trivial, de garder exactement une étape
`in_progress`, et d'éviter de répéter l'intégralité du plan après chaque mise à jour.

Les garde-fous de sécurité dans le système de prompt sont consultatifs. Ils guident le comportement du modèle mais n'appliquent pas la stratégie. Utilisez la stratégie d'outil, les approbations d'exécution, la mise en bac à sable et les listes de canaux autorisés pour une application stricte ; les opérateurs peuvent les désactiver par conception.

Sur les canaux avec des boutons/cartes d'approbation natifs, le prompt d'exécution indique désormais à
l'agent de s'appuyer d'abord sur cette interface d'approbation native. Il ne doit inclure une commande manuelle
`/approve` que lorsque le résultat de l'outil indique que les approbations par chat sont indisponibles ou
que l'approbation manuelle est le seul chemin possible.

## Modes de prompt

OpenClaw peut générer des invites système plus petites pour les sous-agents. Le runtime définit un
OpenClaw`promptMode` pour chaque exécution (pas une configuration visible par l'utilisateur) :

- `full` (par défaut) : inclut toutes les sections ci-dessus.
- `minimal`OpenClaw : utilisé pour les sous-agents ; omet **Memory Recall**, **OpenClaw
  Self-Update**, **Model Aliases**, **User Identity**, **Assistant Output Directives**,
  **Messaging**, **Silent Replies**, et **Heartbeats**. Les outils, **Safety**,
  **Skills** (si fournis), l'espace de travail, le bac à sable, la date et l'heure actuelles (si
  connues), le runtime et le contexte injecté restent disponibles.
- `none` : renvoie uniquement la ligne d'identité de base.

Lorsque `promptMode=minimal`, les invites supplémentaires injectées sont étiquetées **Subagent
Context** au lieu de **Group Chat Context**.

Pour les exécutions de réponse automatique de channel, OpenClaw omet la section générique **Silent Replies** lorsque le contexte direct, de groupe ou exclusif à l'outil de message possède le contrat de réponse visible. Seul l'ancien mode automatique de groupe/channel doit afficher `NO_REPLY` ; les discussions directes et les réponses exclusives à l'outil de message ne reçoivent pas de guidance sur les jetons silencieux.

## Instantanés d'invites

OpenClaw conserve des instantanés d'invites validés pour le chemin heureux du runtime Codex sous
OpenClaw`test/fixtures/agents/prompt-snapshots/codex-runtime-happy-path/`TelegramDiscord. Ils affichent
les paramètres de fil/discussion du serveur d'application sélectionnés plus une pile de couches d'invites liées au modèle reconstruite
pour les discussions directes Telegram, les groupes Discord et les battements de cœur. Cette pile
inclut un appareil d'invite de modèle Codex `gpt-5.5`OpenClawOpenClaw épinglé généré à partir de la forme
du catalogue/cache de modèles de Codex, le texte développeur d'autorisation du chemin heureux Codex,
les instructions développeur d'OpenClaw, les instructions de mode collaboration limitées au tour
lorsqu'OpenClaw les fournit, l'entrée utilisateur du tour et les références aux spécifications d'outils dynamiques.

Actualisez la fixture de prompt du modèle Codex épinglée avec
`pnpm prompt:snapshots:sync-codex-model`. Par défaut, le script recherche le
cache d'exécution de Codex à `$CODEX_HOME/models_cache.json`, puis
`~/.codex/models_cache.json`, et ne se rabat ensuite que sur la convention de checkout
du mainteneur Codex à `~/code/codex/codex-rs/models-manager/models.json`. Si aucune
de ces sources n'existe, la commande s'arrête sans modifier la fixture
validée. Passez `--catalog <path>` pour actualiser depuis un `models_cache.json`
spécifique ou un fichier `models.json`.

Ces instantanés ne constituent toujours pas une capture brute octet par octet d'une requête OpenAI. Codex
peut ajouter du contexte d'espace de travail propriétaire de l'exécution, tel que `AGENTS.md`, le contexte
de l'environnement, les mémoires, les instructions de l'application/plugin, et les instructions intégrées
de mode de collaboration par défaut dans l'exécution Codex après que OpenClaw a envoyé
les paramètres de fil et de tour.

Régénérez-les avec `pnpm prompt:snapshots:gen` et vérifiez la dérive avec
`pnpm prompt:snapshots:check`. L'IC exécute la vérification de dérive dans le shard de
frontière supplémentaire afin que les modifications de prompt et les mises à jour d'instantanés restent attachées à la même
PR.

## Injection de bootstrap de l'espace de travail

Les fichiers d'amorçage sont résolus à partir de l'espace de travail actif, puis acheminés vers la surface de prompt qui correspond à leur durée de vie :

- `AGENTS.md`
- `SOUL.md`
- `TOOLS.md`
- `IDENTITY.md`
- `USER.md`
- `HEARTBEAT.md`
- `BOOTSTRAP.md` (uniquement sur les espaces de travail tout neufs)
- `MEMORY.md` lorsqu'il est présent

Sur le harnais Codex natif, OpenClaw évite de répéter les fichiers stables de l'espace de travail à chaque tour utilisateur. Codex charge `AGENTS.md` via sa propre découverte de documentation de projet. `SOUL.md`, `IDENTITY.md`, `TOOLS.md` et `USER.md` sont transmis en tant qu'instructions de développeur Codex. Le contenu de `HEARTBEAT.md` n'est pas injecté ; les tours de heartbeat reçoivent une note en mode de collaboration pointant vers le fichier lorsqu'il existe et n'est pas vide. Le contenu de `MEMORY.md` et `BOOTSTRAP.md` actif conservent pour l'instant le rôle normal de contexte de tour.

Sur les harnais non-Codex, les fichiers d'amorçage continuent d'être composés dans le prompt OpenClaw selon leurs portes existantes. `HEARTBEAT.md` est omis lors des exécutions normales lorsque les heartbeats sont désactivés pour l'agent par défaut ou que `agents.defaults.heartbeat.includeSystemPromptSection` est faux. Gardez les fichiers injectés concis, en particulier `MEMORY.md`. `MEMORY.md` est destiné à rester un résumé à long terme curé ; les notes quotidiennes détaillées appartiennent à `memory/*.md` où `memory_search` et `memory_get` peuvent les récupérer à la demande. Les fichiers `MEMORY.md` trop volumineux augmentent l'utilisation du prompt et peuvent être partiellement injectés en raison des limites de fichiers d'amorçage ci-dessous.

<Note>
  Les fichiers quotidiens `memory/*.md` ne font **pas** partie du Contexte de Projet d'amorçage normal. Lors des tours ordinaires, ils sont consultés à la demande via les outils `memory_search` et `memory_get`, ils ne comptent donc pas contre la fenêtre de contexte à moins que le modèle ne les lise explicitement. Les tours `/new` et `/reset` nus font exception : le runtime peut préprendre la
  mémoire quotidienne récente comme un bloc de contexte de démarrage ponctuel pour ce premier tour.
</Note>

Les fichiers volumineux sont tronqués à l'aide d'un marqueur. La taille maximale par fichier est contrôlée par
`agents.defaults.bootstrapMaxChars` (par défaut : 12000). Le contenu total du bootstrap injecté
sur tous les fichiers est plafonné par `agents.defaults.bootstrapTotalMaxChars`
(par défaut : 60000). Les fichiers manquants injectent un marqueur court de fichier manquant. Lorsqu'une troncation
se produit, OpenClaw peut injecter un avertissement concis dans le système de prompt ; contrôlez cela avec
`agents.defaults.bootstrapPromptTruncationWarning` (`off`, `once`, `always` ;
par défaut : `always`). Les comptes détaillés bruts/injectés restent dans les diagnostics tels que
`/context`, `/status`, doctor et les logs.

Pour les fichiers mémoire, la troncation n'est pas une perte de données : le fichier reste intact sur le disque,
mais le modèle ne voit que la copie injectée raccourcie jusqu'à ce qu'il lise ou recherche
la mémoire directement. Si `MEMORY.md` est tronqué de manière répétée, distillez-le en un
résumé durable plus court et déplacez l'historique détaillé dans `memory/*.md`, ou
augmentez intentionnellement les limites du bootstrap.

Les sessions de sous-agents n'injectent que `AGENTS.md` et `TOOLS.md` (les autres fichiers de bootstrap
sont filtrés pour garder le contexte du sous-agent petit).

Les hooks internes peuvent intercepter cette étape via `agent:bootstrap` pour modifier ou remplacer
les fichiers de bootstrap injectés (par exemple en échangeant `SOUL.md` pour une personnalité alternative).

Si vous voulez rendre l'agent moins générique, commencez par le
[SOUL.md Personality Guide](/fr/concepts/soul).

Pour inspecter la contribution de chaque fichier injecté (brut vs injecté, troncature, plus la surcharge du schéma d'outils), utilisez `/context list` ou `/context detail`. Voir [Context](/fr/concepts/context).

## Gestion du temps

Le système de prompt inclut une section dédiée **Date et heure actuelles** lorsque le
fuseau horaire de l'utilisateur est connu. Pour garder le cache du prompt stable, il n'inclut maintenant que
le **fuseau horaire** (pas d'horloge dynamique ni de format d'heure).

Utilisez `session_status` lorsque l'agent a besoin de l'heure actuelle ; la fiche d'état
inclut une ligne d'horodatage. Le même outil peut optionnellement définir une substitution de modèle
par session (`model=default` l'efface).

Configurez avec :

- `agents.defaults.userTimezone`
- `agents.defaults.timeFormat` (`auto` | `12` | `24`)

Voir [Date & Time](/fr/date-time) pour plus de détails sur le comportement.

## Skills

Lorsque des compétences éligibles existent, OpenClaw injecte une **liste compacte des compétences disponibles**
(`formatSkillsForPrompt`) qui inclut le **chemin de fichier** pour chaque compétence. Le
prompt instruit le model d'utiliser `read` pour charger le SKILL.md à l'emplacement
répertorié (espace de travail, géré ou groupé). Si aucune compétence n'est éligible, la
section Skills est omise.

L'éligibilité comprend les portes de métadonnées de compétence, les vérifications de l'environnement/configuration d'exécution,
et la liste d'autorisation effective des compétences de l'agent lorsque `agents.defaults.skills` ou
`agents.list[].skills` est configuré.

Les compétences groupées par plugin ne sont éligibles que lorsque leur plugin propriétaire est activé.
Cela permet aux plugins d'outils d'exposer des guides opérationnels plus approfondis sans intégrer toutes
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

Cela permet de garder le prompt de base petit tout en permettant une utilisation ciblée des compétences.

Le budget de la liste des compétences est détenu par le sous-système des compétences :

- Valeur par défaut globale : `skills.limits.maxSkillsPromptChars`
- Remplacement par agent : `agents.list[].skillsLimits.maxSkillsPromptChars`

Les extraits d'exécution bornés génériques utilisent une surface différente :

- `agents.defaults.contextLimits.*`
- `agents.list[].contextLimits.*`

Cette séparation maintient la taille des compétences distincte de la taille de lecture/injection d'exécution telle
que `memory_get`, les résultats en direct des outils, et les actualisations AGENTS.md après compactage.

## Documentation

Le système de prompt inclut une section **Documentation**. Lorsque les docs locaux sont disponibles, il
pointe vers le répertoire local des docs OpenClaw (`docs/` dans un extraction Git ou le paquet npm
bundlé docs). Si les docs locaux ne sont pas disponibles, il revient à
[https://docs.openclaw.ai](https://docs.openclaw.ai).

La même section inclut également l'emplacement de la source OpenClaw. Les extraits Git exposent la racine source locale afin que l'agent puisse inspecter le code directement. Les installations de package incluent l'URL de la source GitHub et indiquent à l'agent d'examiner la source à cet endroit chaque fois que la documentation est incomplète ou obsolète. Le prompt mentionne également le miroir de la documentation publique, le Discord de la communauté et ClawHub ([https://clawhub.ai](https://clawhub.ai)) pour la découverte de compétences. Il indique au modèle de consulter d'abord la documentation pour le comportement, les commandes, la configuration ou l'architecture d'OpenClaw, et d'exécuter `openclaw status` lui-même lorsque cela est possible (en demandant à l'utilisateur uniquement lorsqu'il n'a pas accès). Pour la configuration spécifiquement, il dirige les agents vers l'action d'outil `gateway` `config.schema.lookup` pour une documentation et des contraintes exactes au niveau du champ, puis vers `docs/gateway/configuration.md` et `docs/gateway/configuration-reference.md` pour des conseils plus généraux.

## Connexes

- [Agent runtime](/fr/concepts/agent)
- [Espace de travail de l'agent](/fr/concepts/agent-workspace)
- [Moteur de contexte](/fr/concepts/context-engine)
