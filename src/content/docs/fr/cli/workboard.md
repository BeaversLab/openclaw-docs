---
summary: "CLIRéférence CLI pour les cartes `openclaw workboard`, le dispatch et les exécutions de worker"
read_when:
  - You want to inspect or create Workboard cards from the terminal
  - You want to dispatch Workboard worker runs from the CLI
  - You are debugging Workboard CLI or slash command behavior
title: "CLIWorkboard CLI"
---

`openclaw workboard` est l'interface terminal pour le plugin
[Workboard](/fr/plugins/workboardGateway) inclus. Il permet à un opérateur de lister les cartes, d'en créer une,
d'inspecter une carte et de demander au Gateway en cours d'exécution de distribuer le travail prêt dans
les exécutions de worker de sous-agent.

Activez le plugin avant d'utiliser la commande :

```bash
openclaw plugins enable workboard
openclaw gateway restart
```

## Utilisation

```bash
openclaw workboard list [--board <id>] [--status <status>] [--json]
openclaw workboard create <title...> [--notes <text>] [--status <status>] [--priority <priority>] [--agent <id>] [--board <id>] [--labels <items>] [--json]
openclaw workboard show <id> [--json]
openclaw workboard dispatch [--url <url>] [--token <token>] [--timeout <ms>] [--json]
```

La commande lit et écrit dans la même base de données SQLite propriétaire du plugin utilisée par le
tableau de bord et les outils d'agent Workboard. Les identifiants de carte peuvent être transmis par l'identifiant complet ou par un
préfixe non ambigu lorsqu'une commande accepte un identifiant de carte.

## `list`

```bash
openclaw workboard list
openclaw workboard list --board default --status ready
openclaw workboard list --json
```

La sortie texte est compacte :

```text
7f4a2c10  ready     high    default agent-a  Fix stale worker heartbeat
```

Les colonnes sont le préfixe d'identifiant, le statut, la priorité, l'identifiant de tableau, l'identifiant d'agent facultatif et le titre.

Drapeaux :

| Drapeau             | Objectif                                                     |
| ------------------- | ------------------------------------------------------------ |
| `--board <id>`      | Limiter les résultats à un espace de noms de tableau         |
| `--status <status>` | Limiter les résultats à un statut Workboard                  |
| `--json`            | Imprimer la liste complète des cartes au format JSON machine |

## `create`

```bash
openclaw workboard create "Fix stale worker heartbeat" --priority high --labels bug,workboard
openclaw workboard create "Write Workboard docs" --status ready --agent docs-agent --board docs --notes "Cover CLI, slash command, dispatch, and SQLite state."
```

Drapeaux :

| Drapeau                 | Objectif                                                         |
| ----------------------- | ---------------------------------------------------------------- |
| `--notes <text>`        | Notes initiales de la carte                                      |
| `--status <status>`     | Statut initial, par défaut `todo`                                |
| `--priority <priority>` | Priorité, par défaut `normal`                                    |
| `--agent <id>`          | Assigner la carte à un agent ou à un identifiant de propriétaire |
| `--board <id>`          | Stocker la carte dans un espace de noms de tableau               |
| `--labels <items>`      | Libellés séparés par des virgules                                |
| `--json`                | Imprimer la carte créée au format JSON machine                   |

`create` écrit directement dans l'état SQLite de Workboard. La carte est immédiatement
visible dans l'onglet Workboard de l'interface de contrôle et pour les outils Workboard.

## `show`

```bash
openclaw workboard show 7f4a2c10
openclaw workboard show 7f4a2c10 --json
```

La sortie texte affiche la ligne compacte de la carte et les notes. La sortie JSON renvoie l'enregistrement
complet de la carte, y compris les métadonnées d'exécution, les tentatives, les commentaires, les liens, les preuves,
les artefacts, les journaux du worker, l'état du protocole, les diagnostics et les métadonnées d'automatisation.

## `dispatch`

```bash
openclaw workboard dispatch
openclaw workboard dispatch --json
openclaw workboard dispatch --url http://127.0.0.1:18789 --token "$OPENCLAW_GATEWAY_TOKEN"
```

`dispatch` appelle d'abord la méthode Gateway du RPC en cours d'exécution
`workboard.cards.dispatch`. Ce chemin utilise le même runtime de sous-agent que l'action de dispatch du
dashboard, donc les cartes prêtes deviennent des exécutions de worker suivies par des tâches avec
clés de session liées. Les cartes avec un agent assigné utilisent des clés de session de sous-agent limitées à l'agent ;
les cartes non assignées conservent une clé de sous-agent non limitée afin que l'agent par défaut configuré du Gateway
soit préservé.

La boucle de dispatch :

1. Promeut les enfants prêts pour les dépendances à `ready`.
2. Bloque les réclamations expirées ou les exécutions de worker expirées.
3. Enregistre les métadonnées de dispatch sur les cartes prêtes.
4. Sélectionne un petit lot de cartes prêtes non réclamées.
5. Réclame chaque carte sélectionnée pour le répartiteur ou l'agent assigné.
6. Démarre une exécution de worker de sous-agent avec un contexte de carte limité et le jeton de
   réclamation de la carte.
7. Stocke l'ID de l'exécution du worker, la clé de session, le lien de tâche lorsque le grand livre de
   tâches du Gateway le signale, le statut d'exécution et le journal du worker sur la carte.

La sélection est intentionnellement conservatrice. Un seul dispatch lance au plus trois
workers par défaut, ignore les cartes archivées ou déjà réclamées, et n'en lance qu'une
seule par propriétaire ou agent dans un seul passage. Les cartes déjà détenues par un travail
actif ou en cours de révision sont laissées pour un dispatch ultérieur.

Si le démarrage du worker échoue après qu'une carte a été réclamée, Workboard bloque cette carte,
nettoie la réclamation et enregistre l'échec dans les métadonnées d'exécution de la carte et du journal du worker.
Cela rend les échecs de démarrage visibles au lieu de renvoyer silencieusement la
carte dans la file d'attente.

Si aucune cible Gateway explicite n'est fournie et que le Gateway local est indisponible
ou n'expose pas encore la méthode de dispatch Workboard, le CLI revient par défaut
au dispatch de données uniquement sur l'état local du Workboard. Le dispatch de données uniquement peut toujours
promouvoir les dépendances, nettoyer les réclamations obsolètes et bloquer les exécutions expirées, mais il ne
démarre pas les workers. Les échecs d'authentification, d'autorisation, de validation et les échecs pour une
cible explicite `--url` ou `--token` sont signalés directement.

La sortie texte signale les démarrages de workers :

```text
dispatch complete: started=2 failures=0
```

La sortie de repli est explicite :

```text
gateway unavailable; data dispatch only: promoted=1 blocked=0
```

La sortie JSON inclut le résultat de la répartition. La répartition soutenue par Gateway peut inclure `started` et `startFailures` ; le repli données uniquement inclut `gatewayUnavailable: true`. Les jetons de réclamation sont expurgés de la sortie JSON de la carte.

Dans le tableau de bord, le même résultat de répartition est affiché sous forme d'un bref résumé afin qu'un opérateur puisse voir combien de cartes ont démarré, été promues, bloquées, récupérées ou ont échoué sans ouvrir les détails de la carte.

## Parité des commandes slash

Les canaux compatibles avec les commandes peuvent utiliser la commande slash correspondante :

```text
/workboard list
/workboard show 7f4a2c10
/workboard create Fix stale worker heartbeat
/workboard dispatch
```

La répartition par commande slash utilise également le runtime du sous-agent Gateway, elle suit donc le même comportement en matière de réclamation, de démarrage de worker et d'échec que le tableau de bord et le chemin CLI Gateway.

`/workboard list` et `/workboard show` sont des commandes de lecture pour les expéditeurs de commandes autorisés. `/workboard create` et `/workboard dispatch` modifient l'état du tableau et nécessitent le statut de propriétaire sur les surfaces de chat ou un client Gateway avec `operator.write` ou `operator.admin`.

## Autorisations

Le chemin de répartition CLI appelle le Gateway RPC avec les portées `operator.read` et `operator.write`. Un jeton Gateway en lecture seule peut inspecter les données du Workboard via des méthodes de lecture, mais il ne peut pas créer de cartes ou répartir des workers.

Les commandes locales `list`, `create` et `show` opèrent sur le répertoire d'état local OpenClaw utilisé par le profil actuel. Utilisez `--dev` ou `--profile <name>` sur la commande `openclaw` de premier niveau lorsque vous avez besoin d'une racine d'état différente.

## Dépannage

### Aucune carte n'apparaît

Confirmez que le plugin est activé pour le même profil et la même racine d'état :

```bash
openclaw plugins inspect workboard --runtime --json
```

Si le tableau de bord affiche des cartes mais que le CLI n'en affiche pas, vérifiez que les deux commandes utilisent le même paramètre `--dev` ou `--profile`.

### La répartition indique données uniquement

Démarrez ou redémarrez le Gateway :

```bash
openclaw gateway restart
openclaw gateway status --deep
```

Réessayez ensuite `openclaw workboard dispatch`. Le repli en données uniquement est utile pour le nettoyage de l'état local, mais les exécutions de travailleurs ont besoin d'un Gateway actif.

### Le dispatch ne démarre rien

Vérifiez la présence d'au moins une carte `ready` sans réclamation active :

```bash
openclaw workboard list --status ready
```

Les cartes peuvent également être ignorées lorsque le même propriétaire a déjà un travail en cours d'exécution ou en cours de révision. Déplacez le travail terminé vers `done`, libérez les réclarations périmées via les outils Workboard, ou relancez le dispatch une fois le travailleur actif terminé.

## Connexes

- [Workboard plugin](/fr/plugins/workboard)
- [CLI reference](/fr/cli)
- [Slash commands](/fr/tools/slash-commands)
- [Control UI](/fr/web/control-ui)
