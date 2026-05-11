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

Crestodian utilise la même découverte de référence OpenClaw que les agents réguliers. Dans un extraction Git,
il se pointe vers le `docs/` local et l'arborescence source locale. Dans une installation de package npm, il
utilise les docs du package groupés et des liens vers
[https://github.com/openclaw/openclaw](https://github.com/openclaw/openclaw), avec des conseils
explicites pour consulter la source chaque fois que les docs ne suffisent pas.

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
- afficher l'état du modèle/backend
- exécuter des vérifications d'état ou de santé
- vérifier l'accessibilité de la Gateway
- exécuter doctor sans correctifs interactifs
- valider la configuration
- afficher le chemin du journal d'audit

Les opérations persistantes nécessitent une approbation conversationnelle en mode interactif, sauf si vous passez `--yes` pour une commande directe :

- écrire la configuration
- exécuter `config set`
- définir les valeurs SecretRef prises en charge via `config set-ref`
- exécuter l'amorçage de la configuration/onboarding
- changer le modèle par défaut
- démarrer, arrêter ou redémarrer la Gateway
- créer des agents
- exécuter les réparations du médecin qui réécrivent la configuration ou l'état

Les écritures appliquées sont enregistrées dans :

```text
~/.openclaw/audit/crestodian.jsonl
```

Discovery n'est pas audité. Seules les opérations appliquées et les écritures sont journalisées.

`openclaw onboard --modern` démarre Crestodian en tant qu'aperçu de l'intégration moderne.
`openclaw onboard` simple exécute toujours l'intégration classique.

## Amorçage de la configuration

`setup` est l'amorçage d'intégration axé sur la conversation. Il n'écrit qu'à travers des opérations de configuration typées et demande d'abord l'approbation.

```text
setup
setup workspace ~/Projects/work
setup workspace ~/Projects/work model openai/gpt-5.5
```

Lorsqu'aucun modèle n'est configuré, la configuration sélectionne le premier backend utilisable dans cet ordre et vous indique ce qu'il a choisi :

- modèle explicite existant, si déjà configuré
- `OPENAI_API_KEY` -> `openai/gpt-5.5`
- `ANTHROPIC_API_KEY` -> `anthropic/claude-opus-4-7`
- Claude Code CLI -> `claude-cli/claude-opus-4-7`
- Codex CLI -> `codex-cli/gpt-5.5`

Si aucun n'est disponible, la configuration écrit toujours l'espace de travail par défaut et laisse le modèle non défini. Installez ou connectez-vous à Codex/Claude Code, ou exposez `OPENAI_API_KEY`/`ANTHROPIC_API_KEY`, puis exécutez à nouveau la configuration.

## Planificateur assisté par modèle

Crestodian démarre toujours en mode déterministe. Pour les commandes floues que l'analyseur déterministe ne comprend pas, Crestodian local peut effectuer un tour de planificateur borné via les chemins d'exécution normaux d'OpenClaw. Il utilise d'abord le modèle configuré OpenClaw. Si aucun modèle configuré n'est encore utilisable, il peut revenir aux runtimes locaux déjà présents sur la machine :

- Claude Code CLI : `claude-cli/claude-opus-4-7`
- Harnais de serveur d'application Codex : `openai/gpt-5.5` avec `agentRuntime.id: "codex"`
- CLI Codex : `codex-cli/gpt-5.5`

Le planificateur assisté par modèle ne peut pas modifier directement la configuration. Il doit traduire la
requête en l'une des commandes typées de Crestodian, puis les règles normales d'approbation et
d'audit s'appliquent. Crestodian affiche le modèle utilisé et la commande
interprétée avant d'exécuter quoi que ce soit. Les tours du planificateur de repli sans configuration sont
temporaires, désactivés pour les outils lorsque l'exécution le prend en charge, et utilisent un espace de travail/session
temporaire.

Le mode de sauvetage de canal de messages n'utilise pas le planificateur assisté par modèle. Le
sauvetage à distance reste déterministe afin qu'un chemin d'agent normal cassé ou compromis ne puisse pas
être utilisé comme éditeur de configuration.

## Basculement vers un agent

Utilisez un sélecteur en langage naturel pour quitter Crestodian et ouvrir le TUI normal :

```text
talk to agent
talk to work agent
switch to main agent
```

`openclaw tui`, `openclaw chat` et `openclaw terminal` ouvrent toujours le TUI
de l'agent normal directement. Ils ne démarrent pas Crestodian.

Après être passé au TUI normal, utilisez `/crestodian` pour revenir à Crestodian.
Vous pouvez inclure une demande de suivi :

```text
/crestodian
/crestodian restart gateway
```

Les basculements d'agent à l'intérieur du TUI laissent une trace indiquant que `/crestodian` est disponible.

## Mode de sauvetage de messages

Le mode de sauvetage de messages est le point d'entrée du canal de messages pour Crestodian. Il est destiné
au cas où votre agent normal est mort, mais qu'un canal de confiance tel que WhatsApp
reçoit toujours des commandes.

Commande textuelle prise en charge :

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

La création d'un agent peut également être mise en file d'attente à partir de l'invite locale ou du mode de sauvetage :

```text
create agent work workspace ~/Projects/work model openai/gpt-5.5
/crestodian create agent work workspace ~/Projects/work
```

Le mode de sauvetage à distance est une surface d'administration. Il doit être traité comme une réparation de
configuration à distance, et non comme une discussion normale.

Contrat de sécurité pour le sauvetage à distance :

- Désactivé lorsque la mise en bac à sable (sandboxing) est active. Si un agent/session est en bac à sable,
  Crestodian doit refuser le sauvetage à distance et expliquer qu'une réparation via le CLI local est
  requise.
- L'état effectif par défaut est `auto` : autoriser le sauvetage à distance uniquement dans l'opération YOLO
  de confiance, où l'exécution possède déjà une autorité locale non soumise au bac à sable.
- Nécessite une identité de propriétaire explicite. Le sauvetage ne doit pas accepter de règles d'expéditeur
  génériques, de stratégie de groupe ouvert, de webhooks non authentifiés ou de canaux anonymes.
- DMs du propriétaire uniquement par défaut. Le sauvetage de groupe/canal nécessite une acceptation explicite.
- La sauvegarde à distance ne peut pas ouvrir le TUI local ni basculer vers une session agent interactive. Utilisez le `openclaw` local pour le transfert vers l'agent.
- Les écritures persistantes nécessitent toujours une approbation, même en mode de sauvegarde.
- Auditez chaque opération de sauvegarde appliquée. La sauvegarde de canal de message enregistre les métadonnées du canal, du compte, de l'expéditeur et de l'adresse source. Les opérations de modification de configuration enregistrent également les hachages de configuration avant et après.
- N'affichez jamais de secrets. L'inspection SecretRef doit signaler la disponibilité, pas les valeurs.
- Si la Gateway est active, préférez les opérations typées Gateway. Si la Gateway est hors service, utilisez uniquement la surface de réparation locale minimale qui ne dépend pas de la boucle de l'agent normal.

Forme de la configuration :

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

`enabled` devrait accepter :

- `"auto"` : par défaut. Autoriser uniquement lorsque le runtime effectif est YOLO et que le sandboxing est désactivé.
- `false` : n'autoriser jamais la sauvegarde de canal de message.
- `true` : autoriser explicitement la sauvegarde lorsque les vérifications de propriétaire/canal réussissent. Cela ne doit toujours pas contourner le refus du sandboxing.

La posture YOLO par défaut `"auto"` est :

- le mode sandbox résout à `off`
- `tools.exec.security` résout à `full`
- `tools.exec.ask` résout à `off`

La sauvegarde à distance est couverte par la voie Docker :

```bash
pnpm test:docker:crestodian-rescue
```

Le repli du planificateur local sans configuration est couvert par :

```bash
pnpm test:docker:crestodian-planner
```

Une commande de canal en direct optionnelle effectue des tests de fumée `/crestodian status` plus un aller-retour d'approbation persistant via le gestionnaire de sauvegarde :

```bash
pnpm test:live:crestodian-rescue-channel
```

Une configuration fraîche sans fichier de configuration via Crestodian est couverte par :

```bash
pnpm test:docker:crestodian-first-run
```

Cette voie commence par un répertoire d'état vide, achemine le `openclaw` nu vers Crestodian, définit le modèle par défaut, crée un agent supplémentaire, configure Discord via l'activation d'un plugin plus un SecretRef de jeton, valide la configuration et vérifie le journal d'audit. Le QA Lab possède également un scénario soutenu par un repo pour le même flux Ring 0 :

```bash
pnpm openclaw qa suite --scenario crestodian-ring-zero-setup
```

## Connexes

- [Référence CLI](/fr/cli)
- [Doctor](/fr/cli/doctor)
- [TUI](/fr/cli/tui)
- [Sandbox](/fr/cli/sandbox)
- [Sécurité](/fr/cli/security)
