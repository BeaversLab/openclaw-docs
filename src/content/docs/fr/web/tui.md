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
- Une fois qu'un fichier de configuration a défini les paramètres, `openclaw` et `openclaw crestodian`TUI utilisent également ce shell TUI, avec Crestodian comme backend de chat pour la configuration et la réparation locales.

## Ce que vous voyez

- En-tête : URL de connexion, agent actuel, session actuelle.
- Journal de discussion : messages utilisateur, réponses de l'assistant, avis système, cartes d'outils.
- Ligne d'état : état de connexion/exécution (connexion, en cours, streaming, inactif, erreur).
- Pied de page : état de la connexion + agent + session + modèle + état de l'objectif + think/fast/verbose/trace/reasoning + nombre de jetons + deliver.
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
- Si la session a un [goal](/fr/tools/goal), le pied de page affiche son état compact
  tel que `Pursuing goal`, `Goal paused (/goal resume)` ou
  `Goal achieved`.
- Lorsqu'il est démarré sans `--session`, le TUI en mode passerelle reprend la dernière session sélectionnée pour la même passerelle, le même agent et la même portée de session si cette session existe toujours. Passer `--session`, `/session`, `/new` ou `/reset` reste explicite.

## Envoi + livraison

- Les messages sont envoyés au Gateway ; la livraison aux providers est désactivée par défaut.
- Le TUI est une surface source interne comme WebChat, et non un canal générique sortant. Les harnais qui nécessitent `tools.message` pour les réponses visibles peuvent satisfaire le tour actif du TUI avec un `message.send` sans cible ; la livraison explicite au provider utilise toujours les canaux configurés normalement et ne revient jamais à `lastChannel`.
- Activer la livraison :
  - `/deliver on`
  - ou le panneau Paramètres
  - ou démarrer avec `openclaw tui --deliver`

## Sélecteurs + superpositions

- Sélecteur de modèle : liste les modèles disponibles et définit la substitution de session.
- Sélecteur d'agent : choisit un autre agent.
- Sélecteur de session : affiche jusqu'à 50 sessions pour l'agent actuel mises à jour au cours des 7 derniers jours. Utilisez `/session <key>` pour accéder à une session connue plus ancienne.
- Paramètres : activer/désactiver la livraison, l'expansion de la sortie des outils et la visibilité de la réflexion.

## Raccourcis clavier

- Entrée : envoyer le message
- Échap : annuler l'exécution active
- Ctrl+C : effacer la saisie (appuyer deux fois pour quitter)
- Ctrl+D : quitter
- Ctrl+L : sélecteur de modèle
- Ctrl+G : sélecteur d'agent
- Ctrl+P : sélecteur de session
- Ctrl+O : basculer l'expansion de la sortie des outils
- Ctrl+T : basculer la visibilité de la réflexion (recharge l'historique)

## Commandes slash

Principal :

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
- `/goal [status] | /goal start <objective> | /goal pause|resume|complete|block|clear`
- `/elevated <on|off|ask|full>` (alias : `/elev`)
- `/activation <mention|always>`
- `/deliver <on|off>`

Cycle de vie de la session :

- `/new` ou `/reset` (réinitialiser la session)
- `/abort` (interrompre l'exécution active)
- `/settings`
- `/exit`

Mode local uniquement :

- `/auth [provider]` ouvre le flux d'authentification/connexion du provider à l'intérieur du TUI.

Les autres commandes slash du Gateway (par exemple, `/context`) sont transmises au Gateway et affichées comme sortie système. Voir [Slash commands](/fr/tools/slash-commands).

## Commandes de shell local

- Préfixez une ligne avec `!` pour exécuter une commande de shell local sur l'hôte du TUI.
- Le TUI demande une fois par session d'autoriser l'exécution locale ; refuser laisse `!` désactivé pour la session.
- Les commandes s'exécutent dans un shell frais et non interactif dans le répertoire de travail du TUI (pas de `cd`/env persistant).
- Les commandes de shell local reçoivent `OPENCLAW_SHELL=tui-local` dans leur environnement.
- Un `!` seul est envoyé comme un message normal ; les espaces au début ne déclenchent pas l'exécution locale.

## Réparer les configurations depuis le TUI local

Utilisez le mode local lorsque la configuration actuelle est déjà valide et que vous voulez que l'agent intégré l'inspecte sur la même machine, la compare à la documentation et aide à réparer les divergences sans dépendre d'un Gateway en cours d'exécution.

Si `openclaw config validate` échoue déjà, commencez par `openclaw configure`
ou `openclaw doctor --fix` d'abord. `openclaw chat` ne contourne pas la garde de
configuration invalide.

Boucle typique :

1. Démarrer le mode local :

```bash
openclaw chat
```

2. Demandez à l'agent ce que vous voulez vérifier, par exemple :

```text
Compare my gateway auth config with the docs and suggest the smallest fix.
```

3. Utilisez les commandes shell locales pour des preuves exactes et une validation :

```text
!openclaw config file
!openclaw docs gateway auth token secretref
!openclaw config validate
!openclaw doctor
```

4. Appliquez des modifications étroites avec `openclaw config set` ou `openclaw configure`, puis relancez `!openclaw config validate`.
5. Si Doctor recommande une migration ou une réparation automatique, examinez-la et exécutez `!openclaw doctor --fix`.

Conseils :

- Préférez `openclaw config set` ou `openclaw configure` à l'édition manuelle de `openclaw.json`.
- `openclaw docs "<query>"` recherche l'index de documentation en direct depuis la même machine.
- `openclaw config validate --json` est utile lorsque vous voulez des erreurs de schéma structuré et de résolution SecretRef.

## Sortie de l'outil

- Les appels d'outils s'affichent sous forme de cartes avec les arguments + résultats.
- Ctrl+O bascule entre les vues réduites et développées.
- Pendant que les outils s'exécutent, des mises à jour partielles diffusent dans la même carte.

## Couleurs du terminal

- Le TUI conserve le texte du corps de l'assistant dans la couleur de premier plan par défaut de votre terminal, de sorte que les terminaux clairs et sombres restent lisibles.
- Si votre terminal utilise un arrière-plan clair et que la détection automatique est incorrecte, définissez `OPENCLAW_THEME=light` avant de lancer `openclaw tui`.
- Pour forcer plutôt la palette sombre d'origine, définissez `OPENCLAW_THEME=dark`.

## Historique + diffusion en continu

- Lors de la connexion, le TUI charge le dernier historique (200 messages par défaut).
- Les réponses diffusées en continu sont mises à jour sur place jusqu'à ce qu'elles soient finalisées.
- Le TUI écoute également les événements d'outils de l'agent pour des cartes d'outils plus riches.

## Détails de la connexion

- Le TUI s'enregistre auprès du Gateway en tant que `mode: "tui"`.
- Les reconnexions affichent un message système ; les écarts d'événements sont signalés dans le journal.

## Options

- `--local` : Exécuter par rapport au runtime d'agent intégré local
- `--url <url>` : URL WebSocket du Gateway (par défaut, la configuration ou `ws://127.0.0.1:<port>`)
- `--token <token>`Gateway : Jeton du Gateway (si requis)
- `--password <password>`Gateway : Mot de passe du Gateway (si requis)
- `--session <key>` : Clé de session (par défaut : `main`, ou `global` lorsque la portée est globale)
- `--deliver` : Livrer les réponses de l'assistant au provider (désactivé par défaut)
- `--thinking <level>` : Remplacer le niveau de réflexion pour l'envoi
- `--message <text>` : Envoyer un message initial après la connexion
- `--timeout-ms <ms>` : Délai d'expiration de l'agent en ms (par défaut `agents.defaults.timeoutSeconds`)
- `--history-limit <n>` : Entrées d'historique à charger (par défaut `200`)

<Warning>Lorsque vous définissez `--url`TUI, le TUI n'utilise pas les identifiants de la configuration ou de l'environnement en secours. Passez `--token` ou `--password` explicitement. L'absence d'identifiants explicites est une erreur. En mode local, ne passez pas `--url`, `--token`, ou `--password`.</Warning>

## Troubleshooting

Pas de sortie après l'envoi d'un message :

- Exécutez `/status`TUIGateway dans le TUI pour confirmer que le Gateway est connecté et inactif/occupé.
- Vérifiez les journaux du Gateway : Gateway`openclaw logs --follow`.
- Confirmez que l'agent peut s'exécuter : `openclaw status` et `openclaw models status`.
- Si vous attendez des messages dans un channel de chat, activez la livraison (`/deliver on` ou `--deliver`).

## Dépannage de la connexion

- `disconnected`Gateway : assurez-vous que le Gateway est en cours d'exécution et que vos `--url/--token/--password` sont corrects.
- Aucun agent dans le sélecteur : vérifiez `openclaw agents list` et votre configuration de routage.
- Sélecteur de session vide : vous pourriez être dans la portée globale ou n'avoir aucune session pour le moment.

## Connexes

- [Interface de contrôle](/fr/web/control-ui) — interface de contrôle basée sur le web
- [Configuration](/fr/cli/config) — inspecter, valider et modifier `openclaw.json`
- [Doctor](/fr/cli/doctor) — vérifications guidées de réparation et de migration
- [Référence CLI](/fr/cli) — référence complète des commandes CLI
