---
summary: "Interface utilisateur terminal (TUI) : connectez-vous au Gateway depuis n'importe quelle machine"
read_when:
  - You want a beginner-friendly walkthrough of the TUI
  - You need the complete list of TUI features, commands, and shortcuts
title: "TUI"
---

# TUI (Interface utilisateur terminal)

## Démarrage rapide

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

Utilisez `--password` si votre Gateway utilise l'authentification par mot de passe.

## Ce que vous voyez

- En-tête : URL de connexion, agent actuel, session actuelle.
- Journal de discussion : messages de l'utilisateur, réponses de l'assistant, avis système, cartes d'outil.
- Ligne d'état : état de connexion/exécution (connexion, exécution, streaming, inactif, erreur).
- Pied de page : état de connexion + agent + session + modèle + réflexion/rapide/verbeux/raisonnement + nombre de jetons + livraison.
- Saisie : éditeur de texte avec saisie semi-automatique.

## Modèle mental : agents + sessions

- Les agents sont des identifiants uniques (par ex. `main`, `research`). Le Gateway expose la liste.
- Les sessions appartiennent à l'agent actuel.
- Les clés de session sont stockées sous `agent:<agentId>:<sessionKey>`.
  - Si vous tapez `/session main`, le TUI l'étend à `agent:<currentAgent>:main`.
  - Si vous tapez `/session agent:other:main`, vous basculez explicitement vers cette session d'agent.
- Portée de la session :
  - `per-sender` (par défaut) : chaque agent possède plusieurs sessions.
  - `global` : le TUI utilise toujours la session `global` (le sélecteur peut être vide).
- L'agent actuel + la session sont toujours visibles dans le pied de page.

## Envoi + livraison

- Les messages sont envoyés au Gateway ; la livraison aux fournisseurs est désactivée par défaut.
- Activer la livraison :
  - `/deliver on`
  - ou le panneau Paramètres
  - ou démarrer avec `openclaw tui --deliver`

## Sélecteurs + superpositions

- Sélecteur de modèle : liste les modèles disponibles et définit la substitution de session.
- Sélecteur d'agent : choisissez un autre agent.
- Sélecteur de session : affiche uniquement les sessions de l'agent actuel.
- Paramètres : activer/désactiver la livraison, l'extension de la sortie des outils et la visibilité de la réflexion.

## Raccourcis clavier

- Entrée : envoyer le message
- Échap : interrompre l'exécution active
- Ctrl+C : effacer la saisie (appuyez deux fois pour quitter)
- Ctrl+D : quitter
- Ctrl+L : sélecteur de model
- Ctrl+G : sélecteur d'agent
- Ctrl+P : sélecteur de session
- Ctrl+O : basculer l'expansion de la sortie du tool
- Ctrl+T : basculer la visibilité de la réflexion (recharge l'historique)

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
- `/reasoning <on|off|stream>`
- `/usage <off|tokens|full>`
- `/elevated <on|off|ask|full>` (alias : `/elev`)
- `/activation <mention|always>`
- `/deliver <on|off>`

Cycle de vie de la session :

- `/new` ou `/reset` (réinitialiser la session)
- `/abort` (interrompre l'exécution active)
- `/settings`
- `/exit`

Les autres commandes slash du Gateway (par exemple, `/context`) sont transmises au Gateway et affichées sous forme de sortie système. Voir [Slash commands](/fr/tools/slash-commands).

## Commandes de shell local

- Préfixez une ligne avec `!` pour exécuter une commande de shell local sur l'hôte du TUI.
- Le TUI demande une fois par session l'autorisation d'exécution locale ; refuser laisse `!` désactivé pour la session.
- Les commandes s'exécutent dans un shell frais et non interactif dans le répertoire de travail du TUI (pas de `cd`/env persistant).
- Les commandes de shell local reçoivent `OPENCLAW_SHELL=tui-local` dans leur environnement.
- Un `!` seul est envoyé comme un message normal ; les espaces au début ne déclenchent pas l'exécution locale.

## Sortie du tool

- Les appels de tool s'affichent sous forme de cartes avec les arguments + résultats.
- Ctrl+O permet de basculer entre les vues réduites et développées.
- Pendant que les tools tournent, les mises à jour partielles sont diffusées dans la même carte.

## Couleurs du terminal

- La TUI conserve le texte du corps de l'assistant dans la couleur de premier plan par défaut de votre terminal afin que les terminaux clairs et sombres restent lisibles.
- Si votre terminal utilise un arrière-plan clair et que la détection automatique est incorrecte, définissez `OPENCLAW_THEME=light` avant de lancer `openclaw tui`.
- Pour forcer la palette sombre d'origine à la place, définissez `OPENCLAW_THEME=dark`.

## Historique + streaming

- Lors de la connexion, la TUI charge le dernier historique (200 messages par défaut).
- Les réponses en streaming sont mises à jour sur place jusqu'à leur finalisation.
- La TUI écoute également les événements des outils de l'agent pour des cartes d'outils plus riches.

## Détails de la connexion

- La TUI s'enregistre auprès du Gateway en tant que `mode: "tui"`.
- Les reconnexions affichent un message système ; les écarts d'événements sont signalés dans le journal.

## Options

- `--url <url>` : URL WebSocket du Gateway (par défaut, la configuration ou `ws://127.0.0.1:<port>`)
- `--token <token>` : jeton du Gateway (si requis)
- `--password <password>` : mot de passe du Gateway (si requis)
- `--session <key>` : clé de session (par défaut : `main`, ou `global` lorsque la portée est globale)
- `--deliver` : envoyer les réponses de l'assistant au provider (désactivé par défaut)
- `--thinking <level>` : remplacer le niveau de réflexion pour les envois
- `--timeout-ms <ms>` : délai d'attente de l'agent en ms (par défaut `agents.defaults.timeoutSeconds`)

Remarque : lorsque vous définissez `--url`, la TUI ne revient pas aux identifiants de configuration ou d'environnement.
Passez `--token` ou `--password` explicitement. L'absence d'identifiants explicites constitue une erreur.

## Dépannage

Pas de sortie après l'envoi d'un message :

- Exécutez `/status` dans la TUI pour confirmer que le Gateway est connecté et inactif/occupé.
- Vérifiez les journaux du Gateway : `openclaw logs --follow`.
- Confirmez que l'agent peut s'exécuter : `openclaw status` et `openclaw models status`.
- Si vous vous attendez à des messages dans un channel de chat, activez la livraison (`/deliver on` ou `--deliver`).
- `--history-limit <n>` : Entrées d'historique à charger (défaut 200)

## Dépannage de la connexion

- `disconnected` : assurez-vous que le Gateway est en cours d'exécution et que vos `--url/--token/--password` sont corrects.
- Aucun agent dans le sélecteur : vérifiez `openclaw agents list` et votre configuration de routage.
- Sélecteur de session vide : vous pourriez être dans la portée globale ou ne pas avoir encore de sessions.

import fr from '/components/footer/fr.mdx';

<fr />
