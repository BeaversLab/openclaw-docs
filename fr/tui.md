---
summary: "Terminal UI (TUI) : connectez-vous à la Gateway depuis n'importe quelle machine"
read_when:
  - Vous souhaitez une présentation détaillée et accessible aux débutants de la TUI
  - Vous avez besoin de la liste complète des fonctionnalités, des commandes et des raccourcis de la TUI
title: "TUI"
---

# TUI (Terminal UI)

## Quick start

1. Démarrez la Gateway.

```bash
openclaw gateway
```

2. Ouvrez la TUI.

```bash
openclaw tui
```

3. Tapez un message et appuyez sur Entrée.

Gateway distante :

```bash
openclaw tui --url ws://<host>:<port> --token <gateway-token>
```

Utilisez `--password` si votre Gateway utilise une authentification par mot de passe.

## Ce que vous voyez

- En-tête : URL de connexion, agent actuel, session actuelle.
- Journal de discussion : messages de l'utilisateur, réponses de l'assistant, avis système, cartes d'outils.
- Ligne d'état : état de connexion/exécution (connexion en cours, en cours d'exécution, diffusion, inactif, erreur).
- Pied de page : état de connexion + agent + session + modèle + réflexion/verbeux/raisonnement + comptes de jetons + livraison.
- Saisie : éditeur de texte avec autocomplétion.

## Modèle mental : agents + sessions

- Les agents sont des identifiants uniques (par ex. `main`, `research`). La Gateway expose la liste.
- Les sessions appartiennent à l'agent actuel.
- Les clés de session sont stockées sous forme de `agent:<agentId>:<sessionKey>`.
  - Si vous tapez `/session main`, la TUI l'étend à `agent:<currentAgent>:main`.
  - Si vous tapez `/session agent:other:main`, vous basculez explicitement vers cette session d'agent.
- Portée de la session :
  - `per-sender` (par défaut) : chaque agent possède plusieurs sessions.
  - `global` : la TUI utilise toujours la session `global` (le sélecteur peut être vide).
- L'agent actuel et la session sont toujours visibles dans le pied de page.

## Envoi + livraison

- Les messages sont envoyés à la Gateway ; la livraison aux fournisseurs est désactivée par défaut.
- Activer la livraison :
  - `/deliver on`
  - ou le panneau Paramètres
  - ou démarrer avec `openclaw tui --deliver`

## Sélecteurs + superpositions

- Sélecteur de modèle : liste les modèles disponibles et définit la priorité de la session.
- Sélecteur d'agent : choisissez un agent différent.
- Sélecteur de session : affiche uniquement les sessions de l'agent actuel.
- Paramètres : activer/désactiver la livraison, l'expansion de la sortie des outils et la visibilité de la réflexion.

## Raccourcis clavier

- Entrée : envoyer le message
- Échap : abandonner l'exécution active
- Ctrl+C : effacer la saisie (appuyez deux fois pour quitter)
- Ctrl+D : quitter
- Ctrl+L : sélecteur de modèle
- Ctrl+G : sélecteur d'agent
- Ctrl+P : sélecteur de session
- Ctrl+O : activer/désactiver l'expansion de la sortie des outils
- Ctrl+T : activer/désactiver la visibilité de la réflexion (recharge l'historique)

## Commandes slash

Core :

- `/help`
- `/status`
- `/agent <id>` (ou `/agents`)
- `/session <key>` (ou `/sessions`)
- `/model <provider/model>` (ou `/models`)

Session controls :

- `/think <off|minimal|low|medium|high>`
- `/verbose <on|full|off>`
- `/reasoning <on|off|stream>`
- `/usage <off|tokens|full>`
- `/elevated <on|off|ask|full>` (alias : `/elev`)
- `/activation <mention|always>`
- `/deliver <on|off>`

Session lifecycle :

- `/new` ou `/reset` (réinitialiser la session)
- `/abort` (abandonner l'exécution active)
- `/settings`
- `/exit`

Les autres commandes slash du Gateway (par exemple, `/context`) sont transmises au Gateway et affichées sous forme de sortie système. Voir [Slash commands](/fr/tools/slash-commands).

## Commandes de shell local

- Préfixez une ligne avec `!` pour exécuter une commande de shell local sur l'hôte de la TUI.
- La TUI demande une fois par session l'autorisation d'exécution locale ; le refus maintient `!` désactivé pour la session.
- Les commandes s'exécutent dans un shell frais et non interactif dans le répertoire de travail de la TUI (aucun `cd`/env persistant).
- Un `!` seul est envoyé en tant que message normal ; les espaces de début ne déclenchent pas l'exécution locale.

## Tool output

- Les appels de tool s'affichent sous forme de cartes avec les arguments + résultats.
- Ctrl+O permet de basculer entre les vues réduites et développées.
- Pendant que les tools s'exécutent, les mises à jour partielles sont diffusées dans la même carte.

## Historique + streaming

- Lors de la connexion, la TUI charge le dernier historique (200 messages par défaut).
- Les réponses en streaming sont mises à jour sur place jusqu'à finalisation.
- La TUI écoute également les événements de tool de l'agent pour des cartes de tool plus riches.

## Détails de la connexion

- La TUI s'enregistre auprès du Gateway en tant que `mode: "tui"`.
- Les reconnexions affichent un message système ; les écarts d'événements sont signalés dans le journal.

## Options

- `--url <url>` : URL WebSocket du Gateway (par défaut la configuration ou `ws://127.0.0.1:<port>`)
- `--token <token>` : jeton du Gateway (si requis)
- `--password <password>` : Mot de passe Gateway (si requis)
- `--session <key>` : Clé de session (par défaut : `main`, ou `global` lorsque la portée est globale)
- `--deliver` : Livrer les réponses de l'assistant au provider (désactivé par défaut)
- `--thinking <level>` : Remplacer le niveau de réflexion pour les envois
- `--timeout-ms <ms>` : Délai d'expiration de l'agent en ms (par défaut `agents.defaults.timeoutSeconds`)

Remarque : lorsque vous définissez `--url`, le TUI ne revient pas aux identifiants de configuration ou d'environnement.
Passez `--token` ou `--password` explicitement. L'absence d'identifiants explicites constitue une erreur.

## Dépannage

Aucune sortie après l'envoi d'un message :

- Exécutez `/status` dans le TUI pour confirmer que le Gateway est connecté et inactif/occupé.
- Vérifiez les journaux du Gateway : `openclaw logs --follow`.
- Confirmez que l'agent peut s'exécuter : `openclaw status` et `openclaw models status`.
- Si vous vous attendez à des messages dans un channel de chat, activez la livraison (`/deliver on` ou `--deliver`).
- `--history-limit <n>` : Entrées d'historique à charger (200 par défaut)

## Dépannage

- `disconnected` : assurez-vous que le Gateway est en cours d'exécution et que vos `--url/--token/--password` sont corrects.
- Aucun agent dans le sélecteur : vérifiez `openclaw agents list` et votre configuration de routage.
- Sélecteur de session vide : vous êtes peut-être dans la portée globale ou vous n'avez pas encore de sessions.

import fr from "/components/footer/fr.mdx";

<fr />
