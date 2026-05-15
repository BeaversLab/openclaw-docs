---
summary: "Référence de la CLI et modèle de sécurité pour Crestodian, l'assistant de configuration et de réparation sans config"
read_when:
  - You run openclaw with no command and want to understand Crestodian
  - You need a configless-safe way to inspect or repair OpenClaw
  - You are designing or enabling message-channel rescue mode
title: "Crestodian"
---

# `openclaw crestodian`

Crestodian est l'assistant local de configuration, de réparation et de configuration d'OpenClaw. Il est conçu pour rester accessible lorsque le chemin normal de l'agent est rompu.

L'exécution de `openclaw` sans commande démarre Crestodian dans un terminal interactif.
L'exécution de `openclaw crestodian` démarre explicitement le même assistant.

## Ce que montre Crestodian

Au démarrage, Crestodian interactif ouvre le même shell TUI que celui utilisé par
`openclaw tui`, avec un backend de chat Crestodian. Le journal de discussion commence par un court
message de bienvenue :

- quand démarrer Crestodian
- le modèle ou le chemin du planificateur déterministe que Crestodian utilise réellement
- validité de la configuration et l'agent par défaut
- accessibilité du Gateway à partir de la première sonde de démarrage
- la prochaine action de débogage que Crestodian peut entreprendre

Il ne vide pas les secrets ni ne charge les commandes CLI des plugins juste pour démarrer. La TUI
fournit toujours l'en-tête normal, le journal de discussion, la ligne d'état, le pied de page, l'autocomplétion
et les contrôles de l'éditeur.

Utilisez `status` pour l'inventaire détaillé avec le chemin de configuration, les chemins docs/source,
les sondes CLI locales, la présence de clé API, les agents, le modèle et les détails du Gateway.

Crestodian utilise la même découverte de référence OpenClaw que les agents réguliers. Dans une extraction Git, il se pointe vers le OpenClaw`docs/`npm local et l'arborescence source locale. Dans une installation de package npm, il utilise les docs du package groupés et des liens vers [https://github.com/openclaw/openclaw](https://github.com/openclaw/openclaw), avec des conseils explicites pour consulter la source lorsque les docs ne suffisent pas.

## Exemples

```bash
openclaw
openclaw crestodian
openclaw crestodian --json
openclaw crestodian --message "models"
openclaw crestodian --message "validate config"
openclaw crestodian --message "setup workspace ~/Projects/work model openai/gpt-5.5" --yes
openclaw crestodian --message "set default model openai/gpt-5.5" --yes
openclaw onboard --modern
```

Dans la TUI Crestodian :

```text
status
health
doctor
doctor fix
validate config
setup
setup workspace ~/Projects/work model openai/gpt-5.5
config set gateway.port 19001
config set-ref gateway.auth.token env OPENCLAW_GATEWAY_TOKEN
gateway status
restart gateway
agents
create agent work workspace ~/Projects/work
models
set default model openai/gpt-5.5
plugins list
plugins search slack
plugin install clawhub:openclaw-codex-app-server
plugin uninstall openclaw-codex-app-server
talk to work agent
talk to agent for ~/Projects/work
audit
quit
```

## Démarrage sécurisé

Le chemin de démarrage de Crestodian est délibérément petit. Il peut fonctionner lorsque :

- `openclaw.json` est manquant
- `openclaw.json` est invalide
- le Gateway est en panne
- l'enregistrement des commandes de plugin est indisponible
- aucun agent n'a encore été configuré

`openclaw --help` et `openclaw --version` utilisent toujours les chemins rapides normaux.
`openclaw` non interactif se ferme avec un court message au lieu d'imprimer l'aide racine,
car le produit sans commande est Crestodian.

## Opérations et approbation

Crestodian utilise des opérations typées au lieu de modifier la configuration ad hoc.

Les opérations en lecture seule peuvent s'exécuter immédiatement :

- afficher l'aperçu
- lister les agents
- list installed plugins
- rechercher des plugins ClawHub
- afficher le statut du modèle/backend
- exécuter des vérifications de statut ou de santé
- vérifier l'accessibilité de la Gateway
- exécuter le doctor sans corrections interactives
- valider la configuration
- afficher le chemin du journal d'audit

Les opérations persistantes nécessitent une approbation conversationnelle en mode interactif, sauf si vous passez `--yes` pour une commande directe :

- écrire la configuration
- exécuter `config set`
- définir les valeurs SecretRef prises en charge via `config set-ref`
- exécuter l'amorçage (bootstrap) de la configuration/onboarding
- changer le modèle par défaut
- démarrer, arrêter ou redémarrer la Gateway
- créer des agents
- installer des plugins depuis ClawHub ou npm
- désinstaller des plugins
- exécuter des réparations du docteur qui réécrivent la configuration ou l'état

Les écritures appliquées sont enregistrées dans :

```text
~/.openclaw/audit/crestodian.jsonl
```

La découverte n'est pas auditée. Seules les opérations appliquées et les écritures sont journalisées.

`openclaw onboard --modern` lance Crestodian en tant qu'aperçu de l'onboarding moderne.
L'exécution simple de `openclaw onboard` lance toujours l'onboarding classique.

## Amorçage de la configuration

`setup` est l'amorçage de l'onboarding axé sur la discussion. Il n'écrit qu'à travers des
opérations de configuration typées et demande d'abord une approbation.

```text
setup
setup workspace ~/Projects/work
setup workspace ~/Projects/work model openai/gpt-5.5
```

Lorsqu'aucun modèle n'est configuré, la configuration sélectionne le premier backend utilisable dans cet
ordre et vous indique ce qu'il a choisi :

- model explicite existant, si déjà configuré
- `OPENAI_API_KEY` -> `openai/gpt-5.5`
- `ANTHROPIC_API_KEY` -> `anthropic/claude-opus-4-7`
- CLI CLI Claude Code -> `claude-cli/claude-opus-4-7`
- CLI CLI Codex -> `codex-cli/gpt-5.5`

Si aucun n'est disponible, la configuration écrit toujours l'espace de travail par défaut et laisse le
model non défini. Installez ou connectez-vous à Codex/Claude Code, ou exposez
`OPENAI_API_KEY`/`ANTHROPIC_API_KEY`, puis exécutez la configuration à nouveau.

## Planificateur assisté par model

Crestodian démarre toujours en mode déterministe. Pour les commandes floues que l'analyseur déterministe ne comprend pas, le Crestodian local peut effectuer un tour de planification borné via les chemins d'exécution normaux d'OpenClaw. Il utilise d'abord le modèle OpenClaw configuré. Si aucun modèle configuré n'est encore utilisable, il peut revenir aux runtimes locaux déjà présents sur la machine :

- CLI Claude Code : `claude-cli/claude-opus-4-7`
- Harnais de serveur d'application Codex : `openai/gpt-5.5`
- CLI Codex : `codex-cli/gpt-5.5`

Le planeur assisté par modèle ne peut pas modifier directement la configuration. Il doit traduire la
requête en l'une des commandes typées de Crestodian, puis les règles normales d'approbation et
d'audit s'appliquent. Crestodian affiche le modèle utilisé et la commande
interprétée avant d'exécuter quoi que ce soit. Les tours du planeur de repli sans configuration sont
temporaires, désactivés pour les outils là où le runtime le prend en charge, et utilisent un espace de travail/session
temporaire.

Le mode de secours du canal de messages n'utilise pas le planeur assisté par modèle. Le secours
distant reste déterministe afin qu'un chemin d'agent normal défaillant ou compromis ne puisse pas
être utilisé comme éditeur de configuration.

## Basculement vers un agent

Utilisez un sélecteur en langage naturel pour quitter Crestodian et ouvrir la normale TUI :

```text
talk to agent
talk to work agent
switch to main agent
```

`openclaw tui`, `openclaw chat` et `openclaw terminal` ouvrent toujours la
normale agent TUI directement. Ils ne démarent pas Crestodian.

Après avoir basculé vers l'interface TUI normale, utilisez TUI`/crestodian` pour revenir à Crestodian.
Vous pouvez inclure une demande de suivi :

```text
/crestodian
/crestodian restart gateway
```

Les changements d'agent dans l'interface TUI laissent une trace indiquant que TUI`/crestodian` est disponible.

## Mode de sauvetage des messages

Le mode de sauvetage des messages est le point d'entrée du canal de messages pour Crestodian. Il est destiné au cas où votre agent normal est en panne, mais qu'un canal de confiance tel que WhatsApp
reçoit toujours les commandes.

Commande texte prise en charge :

- `/crestodian <request>`

Flux de l'opérateur :

```text
You, in a trusted owner DM: /crestodian status
OpenClaw: Crestodian rescue mode. Gateway reachable: no. Config valid: no.
You: /crestodian restart gateway
OpenClaw: Plan: restart the Gateway. Reply /crestodian yes to apply.
You: /crestodian yes
OpenClaw: Applied. Audit entry written.
```

La création d'agent peut également être mise en file d'attente à partir de l'invite locale ou du mode de secours :

```text
create agent work workspace ~/Projects/work model openai/gpt-5.5
/crestodian create agent work workspace ~/Projects/work
```

Le mode de secours distant est une surface d'administration. Il doit être traité comme une réparation de configuration à distance,
non comme une discussion normale.

Contrat de sécurité pour le secours distant :

- Désactivé lorsque le sandboxing est actif. Si un agent/une session est sandboxé,
  Crestodian doit refuser le secours distant et expliquer qu'une réparation CLI locale est
  requise.
- L'état effectif par défaut est `auto` : autoriser le secours distant uniquement dans l'opération YOLO de confiance,
  où le runtime possède déjà une autorité locale non sandboxée.
- Exiger une identité de propriétaire explicite. Le secours ne doit pas accepter de règles d'expéditeur génériques,
  de stratégie de groupe ouverte, de webhooks non authentifiés, ou de canaux anonymes.
- DMs du propriétaire uniquement par défaut. Le secours de groupe/canal nécessite une acceptation explicite.
- La recherche et la liste de plugins sont en lecture seule. L'installation de plugins est locale uniquement par défaut
  car elle télécharge du code exécutable. La désinstallation de plugins peut être autorisée en tant qu'opération
  de réparation approuvée lorsque la stratégie de secours autorise les écritures persistantes.
- Le secours distant ne peut pas ouvrir le TUI local ni passer à une session d'agent
  interactive. Utilisez le `openclaw` local pour le transfert d'agent.
- Les écritures persistantes nécessitent toujours une approbation, même en mode de secours.
- Auditer chaque opération de secours appliquée. Le secours par canal de message enregistre le canal,
  le compte, l'expéditeur et les métadonnées de l'adresse source. Les opérations de modification de configuration
  enregistrent également les hachages de configuration avant et après.
- Ne jamais répéter de secrets. L'inspection de SecretRef doit signaler la disponibilité, pas
  les valeurs.
- Si le Gateway est actif, privilégier les opérations typées Gateway. Si le Gateway est
  inactif, utiliser uniquement la surface de réparation locale minimale qui ne dépend pas de la
  boucle d'agent normale.

Structure de la configuration :

```jsonc
{
  "crestodian": {
    "rescue": {
      "enabled": "auto",
      "ownerDmOnly": true,
    },
  },
}
```

`enabled` doit accepter :

- `"auto"` : par défaut. Autoriser uniquement lorsque le runtime effectif est YOLO et
  que le sandboxing est désactivé.
- `false` : n'autoriser jamais le secours par canal de message.
- `true` : autoriser explicitement le secours lorsque les vérifications du propriétaire/canal réussissent. Cela
  ne doit toujours pas contourner le refus du sandboxing.

La posture YOLO par défaut `"auto"` est :

- le mode bac à sable (sandbox) correspond à `off`
- `tools.exec.security` correspond à `full`
- `tools.exec.ask` correspond à `off`

La secours à distance est couverte par la voie Docker :

```bash
pnpm test:docker:crestodian-rescue
```

Le repli du planificateur local sans configuration est couvert par :

```bash
pnpm test:docker:crestodian-planner
```

Une surface de commande de canal en direct opt-in effectue des tests de fumée `/crestodian status` ainsi qu'un aller-retour d'approbation persistant via le gestionnaire de secours :

```bash
pnpm test:live:crestodian-rescue-channel
```

La configuration initiale sans configuration via Crestodian est couverte par :

```bash
pnpm test:docker:crestodian-first-run
```

Cette voie commence par un répertoire d'état vide, achemine `openclaw` nu vers Crestodian, définit le model par défaut, crée un agent supplémentaire, configure Discord via l'activation d'un plugin et un SecretRef de jeton, valide la configuration et vérifie le journal d'audit. Le QA Lab dispose également d'un scénario basé sur un dépôt pour le même flux Ring 0 :

```bash
pnpm openclaw qa suite --scenario crestodian-ring-zero-setup
```

## Connexes

- [Référence CLI](/fr/cli)
- [Doctor](/fr/cli/doctor)
- [TUI](/fr/cli/tui)
- [Sandbox](/fr/cli/sandbox)
- [Sécurité](/fr/cli/security)
