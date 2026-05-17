---
summary: "Interface utilisateur en terminal (TUI) : connectez-vous au Gateway ou exécutez localement en mode intégré"
read_when:
  - You want a beginner-friendly walkthrough of the TUI
  - You need the complete list of TUI features, commands, and shortcuts
title: "TUI"
---

## Quick start

### Gateway mode

1. Démarrez le Gateway.

```bash
openclaw gateway
```

2. Ouvrez la TUI.

```bash
openclaw tui
```

3. Tapez un message et appuyez sur Entrée.

Gateway distant :

```bash
openclaw tui --url ws://<host>:<port> --token <gateway-token>
```

Utilisez `--password` si votre Gateway utilise une authentification par mot de passe.

### Local mode

Exécutez le TUI sans Gateway :

```bash
openclaw chat
# or
openclaw tui --local
```

Notes :

- `openclaw chat` et `openclaw terminal` sont des alias de `openclaw tui --local`.
- `--local` ne peut pas être combiné avec `--url`, `--token` ou `--password`.
- Le mode local utilise directement le runtime de l'agent intégré. La plupart des outils locaux fonctionnent, mais les fonctionnalités exclusives au Gateway sont indisponibles.
- `openclaw` et `openclaw crestodian` utilisent également ce shell TUI, avec Crestodian comme backend de chat pour la configuration et la réparation locales.

## Ce que vous voyez

- En-tête : URL de connexion, agent actuel, session actuelle.
- Journal de discussion : messages utilisateur, réponses de l'assistant, avis système, cartes d'outils.
- Ligne d'état : état de connexion/exécution (connexion, en cours, streaming, inactif, erreur).
- Pied de page : état de connexion + agent + session + model + réflexion/rapide/verbeux/trace/raisonnement + nombre de jetons + livrer.
- Saisie : éditeur de texte avec autocomplétion.

## Modèle mental : agents + sessions

- Les agents sont des slugs uniques (par ex. `main`, `research`). Le Gateway expose la liste.
- Les sessions appartiennent à l'agent actuel.
- Les clés de session sont stockées sous la forme `agent:<agentId>:<sessionKey>`.
  - Si vous tapez `/session main`, le TUI l'étend à `agent:<currentAgent>:main`.
  - Si vous tapez `/session agent:other:main`, vous basculez explicitement vers cette session d'agent.
- Portée de la session :
  - `per-sender` (par défaut) : chaque agent possède plusieurs sessions.
  - `global` : le TUI utilise toujours la session `global` (le sélecteur peut être vide).
- L'agent actuel + la session sont toujours visibles dans le pied de page.
- Lorsqu'il est démarré sans `--session`TUI, la TUI en mode Gateway reprend la dernière session sélectionnée pour la même passerelle, le même agent et la même portée de session si cette session existe toujours. Le passage de `--session`, `/session`, `/new` ou `/reset` reste explicite.

## Envoi + livraison

- Les messages sont envoyés à la Gateway ; la livraison aux fournisseurs est désactivée par défaut.
- La TUI est une surface source interne comme WebChat, et non un canal de sortie générique. Les harnais qui nécessitent TUIWebChat`tools.message`TUI pour les réponses visibles peuvent satisfaire le tour TUI actif avec un `message.send` sans cible ; la livraison explicite du fournisseur utilise toujours les canaux configurés normalement et ne revient jamais à `lastChannel`.
- Activer la livraison :
  - `/deliver on`
  - ou le panneau Paramètres
  - ou démarrer avec `openclaw tui --deliver`

## Sélecteurs + superpositions

- Sélecteur de modèle : lister les modèles disponibles et définir la priorité de la session.
- Sélecteur d'agent : choisir un autre agent.
- Sélecteur de session : affiche jusqu'à 50 sessions pour l'agent actuel mises à jour au cours des 7 derniers jours. Utilisez `/session <key>` pour accéder à une session antérieure connue.
- Paramètres : activer/désactiver la livraison, l'extension de la sortie des outils et la visibilité de la réflexion.

## Raccourcis clavier

- Entrée : envoyer le message
- Échap : abandonner l'exécution active
- Ctrl+C : effacer l'entrée (appuyer deux fois pour quitter)
- Ctrl+D : quitter
- Ctrl+L : sélecteur de modèle
- Ctrl+G : sélecteur d'agent
- Ctrl+P : sélecteur de session
- Ctrl+O : activer/désactiver l'extension de la sortie des outils
- Ctrl+T : activer/désactiver la visibilité de la réflexion (recharge l'historique)

## Commandes slash

Cœur :

- `/help`
- `/status`
- `/agent <id>` (ou `/agents`)
- `/session <key>` (ou `/sessions`)
- `/model <provider/model>` (ou `/models`)

Contrôles de session :

- `/think <off|minimal|low|medium|high>`
- `/fast <status|on|off>`
- `/verbose <on|full|off>`
- `/trace <on|off>`
- `/reasoning <on|off|stream>`
- `/usage <off|tokens|full>`
- `/elevated <on|off|ask|full>` (alias : `/elev`)
- `/activation <mention|always>`
- `/deliver <on|off>`

Cycle de vie de la session :

- `/new` ou `/reset` (réinitialiser la session)
- `/abort` (abandonner l'exécution active)
- `/settings`
- `/exit`

Mode local uniquement :

- `/auth [provider]` ouvre le flux d'authentification/connexion du provider à l'intérieur du TUI.

Les autres commandes slash du Gateway (par exemple, `/context`) sont transférées au Gateway et affichées comme sortie système. Voir [Slash commands](/fr/tools/slash-commands).

## Commandes du shell local

- Préfixez une ligne avec `!` pour exécuter une commande de shell local sur l'hôte du TUI.
- Le TUI demande une fois par session d'autoriser l'exécution locale ; refuser laisse `!` désactivé pour la session.
- Les commandes s'exécutent dans un shell frais et non interactif dans le répertoire de travail du TUI (pas de `cd`/env persistant).
- Les commandes du shell local reçoivent `OPENCLAW_SHELL=tui-local` dans leur environnement.
- Un `!` seul est envoyé comme un message normal ; les espaces au début ne déclenchent pas l'exécution locale.

## Réparer les configurations à partir du TUI local

Utilisez le mode local lorsque la configuration actuelle est déjà valide et que vous souhaitez que
l'agent embarqué l'inspecte sur la même machine, la compare aux docs,
et aide à réparer les dérives sans dépendre d'un Gateway en cours d'exécution.

Si `openclaw config validate` échoue déjà, commencez par `openclaw configure`
ou `openclaw doctor --fix` d'abord. `openclaw chat` ne contourne pas la garde
de configuration invalide.

Boucle typique :

1. Démarrer le mode local :

```bash
openclaw chat
```

2. Demandez à l'agent ce que vous voulez vérifier, par exemple :

```text
Compare my gateway auth config with the docs and suggest the smallest fix.
```

3. Utilisez les commandes du shell local pour des preuves exactes et une validation :

```text
!openclaw config file
!openclaw docs gateway auth token secretref
!openclaw config validate
!openclaw doctor
```

4. Appliquez des modifications ciblées avec `openclaw config set` ou `openclaw configure`, puis relancez `!openclaw config validate`.
5. Si Doctor recommande une migration ou une réparation automatique, révisez-la et exécutez `!openclaw doctor --fix`.

Conseils :

- Préférez `openclaw config set` ou `openclaw configure` à l'édition manuelle de `openclaw.json`.
- `openclaw docs "<query>"` recherche l'index des docs en direct à partir de la même machine.
- `openclaw config validate --json` est utile lorsque vous voulez des erreurs de schéma structuré et SecretRef/resolvability.

## Sortie de l'outil

- Les appels d'outils s'affichent sous forme de cartes avec les arguments + résultats.
- Ctrl+O bascule entre les vues réduites et développées.
- Pendant l'exécution des outils, les mises à jour partielles sont diffusées dans la même carte.

## Couleurs du terminal

- Le TUI conserve le texte du corps de l'assistant dans la couleur de premier plan par défaut de votre terminal, de sorte que les terminaux clairs et sombres restent lisibles.
- Si votre terminal utilise un arrière-plan clair et que la détection automatique est incorrecte, définissez `OPENCLAW_THEME=light` avant de lancer `openclaw tui`.
- Pour forcer à la place la palette sombre d'origine, définissez `OPENCLAW_THEME=dark`.

## Historique + diffusion en continu

- Lors de la connexion, le TUI charge le dernier historique (200 messages par défaut).
- Les réponses diffusées en continu sont mises à jour sur place jusqu'à ce qu'elles soient finalisées.
- Le TUI écoute également les événements d'outil de l'agent pour des cartes d'outils plus riches.

## Détails de la connexion

- Le TUI s'enregistre auprès du Gateway en tant que `mode: "tui"`.
- Les reconnexions affichent un message système ; les écarts d'événements sont signalés dans le journal.

## Options

- `--local` : Exécuter sur le runtime d'agent local intégré
- `--url <url>` : URL WebSocket du Gateway (par défaut la configuration ou `ws://127.0.0.1:<port>`)
- `--token <token>` : Jeton du Gateway (si requis)
- `--password <password>` : Mot de passe du Gateway (si requis)
- `--session <key>` : Clé de session (par défaut : `main`, ou `global` lorsque la portée est globale)
- `--deliver` : Envoyer les réponses de l'assistant au provider (désactivé par défaut)
- `--thinking <level>` : Remplacer le niveau de réflexion pour les envois
- `--message <text>` : Envoyer un message initial après la connexion
- `--timeout-ms <ms>` : Délai d'attente de l'agent en ms (par défaut `agents.defaults.timeoutSeconds`)
- `--history-limit <n>` : Entrées d'historique à charger (par défaut `200`)

<Warning>Lorsque vous définissez `--url`TUI, le TUI ne revient pas aux identifiants de configuration ou d'environnement. Passez `--token` ou `--password` explicitement. L'absence d'identifiants explicites est une erreur. En mode local, ne passez pas `--url`, `--token` ou `--password`.</Warning>

## Dépannage

Pas de sortie après l'envoi d'un message :

- Exécutez `/status`TUIGateway dans le TUI pour confirmer que le Gateway est connecté et inactif/occupé.
- Vérifiez les journaux du Gateway : Gateway`openclaw logs --follow`.
- Confirmez que l'agent peut s'exécuter : `openclaw status` et `openclaw models status`.
- Si vous attendez des messages dans un channel de chat, activez la livraison (`/deliver on` ou `--deliver`).

## Dépannage de la connexion

- `disconnected`Gateway : assurez-vous que le Gateway est en cours d'exécution et que vos `--url/--token/--password` sont corrects.
- Aucun agent dans le sélecteur : vérifiez `openclaw agents list` et votre configuration de routage.
- Sélecteur de session vide : vous êtes peut-être dans la portée globale ou vous n'avez pas encore de sessions.

## Connexes

- [Control UI](/fr/web/control-ui) — interface de contrôle basée sur le Web
- [Config](/fr/cli/config) — inspecter, valider et modifier `openclaw.json`
- [Doctor](/fr/cli/doctor) — vérifications guidées de réparation et de migration
- [Référence CLI](CLI/en/cliCLI) — référence complète des commandes CLI
