---
summary: "Hôte statique Loopback WebChat et utilisation WS Gateway pour l'interface de chat"
read_when:
  - Debugging or configuring WebChat access
title: "WebChat"
---

État : l'interface utilisateur de chat SwiftUI macOS/iOS communique directement avec le WebSocket du macOS.

## Qu'est-ce que c'est

- Une interface utilisateur de chat native pour la passerelle (pas de navigateur intégré et pas de serveur statique local).
- Utilise les mêmes sessions et règles de routage que les autres channels.
- Routage déterministe : les réponses reviennent toujours au WebChat.

## Quick start

1. Démarrez la passerelle.
2. Ouvrez l'interface utilisateur du WebChat (application macOS/iOS) ou l'onglet de chat de l'interface utilisateur de contrôle.
3. Assurez-vous qu'un chemin d'authentification de passerelle valide est configuré (secret partagé par défaut, même en boucle locale).

## Fonctionnement (comportement)

- L'interface utilisateur se connecte au WebSocket du Gateway et utilise `chat.history`, `chat.send` et `chat.inject`.
- `chat.history` est limité pour la stabilité : le Gateway peut tronquer les champs de texte longs, omettre les métadonnées volumineuses et remplacer les entrées trop grandes par `[chat.history omitted: message too large]`.
- `chat.history` suit la branche de transcription active pour les fichiers de session modernes en ajout uniquement, donc les branches de réécriture abandonnées et les copies de invites remplacées ne sont pas rendues dans WebChat.
- Les entrées de compactage s'affichent sous la forme d'un séparateur explicite d'historique compacté. Le séparateur indique que la transcription compactée est conservée en tant que point de contrôle et renvoie aux commandes de point de contrôle des sessions, où les opérateurs peuvent créer une branche ou restaurer à partir de cette vue compactée lorsque leurs autorisations le leur permettent.
- L'interface de contrôle (Control UI) mémorise le `sessionId` Gateway sous-jacent renvoyé par `chat.history` et l'inclut dans les appels `chat.send` suivants, donc les reconnexions et les actualisations de page continuent la même conversation stockée, sauf si l'utilisateur démarre ou réinitialise une session.
- L'interface de contrôle fusionne les soumissions en double en cours pour la même session, le même message et les mêmes pièces jointes avant de générer un nouvel identifiant d'exécution `chat.send` ; le Gateway déduplique toujours les demandes répétées qui réutilisent la même clé d'idempotence.
- Les fichiers de démarrage de l'espace de travail et les instructions en attente `BOOTSTRAP.md` sont fournis via le contexte du projet de l'invite système de l'agent, et non copiés dans le message utilisateur WebChat. La troncature de l'amorçage (bootstrap) ajoute uniquement un avis de récupération concis de l'invite système ; les comptes détaillés et les commandes de configuration restent sur les surfaces de diagnostic.
- `chat.history` est également normalisé pour l'affichage : le contexte d'exécution uniquement OpenClaw,
  les enveloppes entrantes, les balises de directive de livraison en ligne
  telles que `[[reply_to_*]]` et `[[audio_as_voice]]`, les charges utiles XML d'appel d'outil en texte brut
  (y compris `<tool_call>...</tool_call>`,
  `<function_call>...</function_call>`, `<tool_calls>...</tool_calls>`,
  `<function_calls>...</function_calls>`, et les blocs d'appel d'outil tronqués), et
  les jetons de contrôle de modèle ASCII/pleine largeur divulgués sont supprimés du texte visible,
  et les entrées de l'assistant dont tout le texte visible n'est que le jeton silencieux exact
  `NO_REPLY` / `no_reply` sont omises.
- Les charges utiles de réponse marquées par raisonnement (`isReasoning: true`WebChat) sont exclues du contenu de l'assistant WebChat, du texte de relecture de la transcription et des blocs de contenu audio, de sorte que les charges utiles de réflexion uniquement n'apparaissent pas comme des messages d'assistant visibles ou de l'audio jouable.
- `chat.inject` ajoute une note d'assistant directement à la transcription et la diffuse à l'interface utilisateur (pas d'exécution d'agent).
- Les exécutions abandonnées peuvent laisser une sortie partielle de l'assistant visible dans l'interface utilisateur.
- Le Gateway conserve le texte partiel abandonné de l'assistant dans l'historique des transcriptions lorsqu'une sortie tamponnée existe, et marque ces entrées avec des métadonnées d'abandon.
- L'historique est toujours récupéré à partir de la passerelle (pas de surveillance de fichiers locaux).
- Si la passerelle est inaccessible, WebChat est en lecture seule.

### Modèle de transcription et de livraison

WebChat possède deux chemins de données distincts :

- Le fichier JSONL de session est la transcription durable du modèle/d'exécution. Pour les exécutions normales d'agent, le runtime OpenClaw intégré persiste les messages OpenClaw`user`, `assistant` et `toolResult`WebChat visibles par le modèle via son gestionnaire de session. WebChat n'écrit pas de texte arbitraire de livraison, de statut ou d'assistance dans cette transcription.
- Les événements Gateway`ReplyPayload`WebChat de la passerelle sont la projection de livraison en direct. Ils peuvent être normalisés pour l'affichage WebChat/canal, le block streaming, les balises de directive, l'intégration de médias, les indicateurs audio/TTS et le comportement de repli de l'interface utilisateur. Ils ne constituent pas eux-mêmes le journal de session canonique.
- Les harnais qui nécessitent des réponses visibles via `tools.message` utilisent toujours WebChat comme récepteur de réponses source interne pour l'exécution en cours. Un `message.send` sans cible de cette exécution WebChat active est projeté dans le même chat et mis en miroir dans la transcription de la session ; WebChat ne devient pas un canal sortant réutilisable et n'hérite jamais de `lastChannel`.
- WebChat injecte des entrées de transcription d'assistant uniquement lorsque le Gateway possède un message affiché en dehors d'un tour d'agent intégré normal : WebChatGateway`chat.inject`WebChat, les réponses de commande non-agent, la sortie partielle interrompue et les suppléments de transcription multimédia gérés par WebChat.
- `chat.history` lit la transcription de session stockée et applique la projection d'affichage WebChat. Si du texte d'assistant en direct apparaît pendant une exécution mais disparaît après le rechargement de l'historique, vérifiez d'abord si le JSONL brut contient le texte de l'assistant, puis si la projection `chat.history` l'a supprimé, puis si la fusion de queue optimiste de l'interface de contrôle a remplacé l'état de livraison local par l'instantané persistant.

Les réponses finales de l'exécution normale de l'agent doivent être durables car le runtime intégré écrit le `message_end` de l'assistant. Tout repli qui reflète une charge utile finale livrée dans la transcription doit d'abord éviter de dupliquer un tour d'assistant que le runtime intégré a déjà écrit.

## Panneau des outils des agents de l'interface de contrôle

- Le panneau des outils `/agents` de l'interface de contrôle possède deux vues distinctes :
  - **Disponible immédiatement** utilise `tools.effective(sessionKey=...)` et affiche une projection en lecture seule dérivée du serveur de l'inventaire de session actuel, y compris les outils du serveur MCP de base, de plugin, appartenant au canal et déjà découverts.
  - **Configuration des outils** utilise `tools.catalog` et reste axé sur les profils, les overrides et
    la sémantique du catalogue.
- La disponibilité du runtime est limitée à la session. Le changement de sessions sur le même agent peut modifier la liste **Disponible immédiatement**. Si les serveurs MCP configurés n'ont pas été connectés ou ont été modifiés depuis la dernière découverte, le panneau affiche un avis au lieu de démarrer silencieusement les transports MCP à partir du chemin de lecture.
- L'éditeur de configuration n'implique pas la disponibilité au moment de l'exécution ; l'accès effectif suit toujours la priorité de la stratégie (`allow`/`deny`, overrides par agent et par fournisseur/canal).

## Utilisation à distance

- Le mode distant tunnel le WebSocket de la passerelle via SSH/Tailscale.
- Vous n'avez pas besoin d'exécuter un serveur WebChat distinct.

## Référence de configuration (WebChat)

Configuration complète : [Configuration](/fr/gateway/configuration)

Options WebChat :

- `gateway.webchat.chatHistoryMaxChars` : nombre maximum de caractères pour les champs de texte dans les réponses `chat.history`. Lorsqu'une entrée de transcription dépasse cette limite, le Gateway tronque les champs de texte longs et peut remplacer les messages trop volumineux par un espace réservé. Un `maxChars` par requête peut également être envoyé par le client pour remplacer cette valeur par défaut pour un seul appel `chat.history`.

Options globales connexes :

- `gateway.port`, `gateway.bind` : hôte/port WebSocket.
- `gateway.auth.mode`, `gateway.auth.token`, `gateway.auth.password` :
  authentification WebSocket par secret partagé.
- `gateway.auth.allowTailscale` : l'onglet de chat de l'interface de contrôle du navigateur peut utiliser les en-têtes d'identité Tailscale
  Serve lorsqu'ils sont activés.
- `gateway.auth.mode: "trusted-proxy"` : authentification par proxy inverse pour les clients navigateurs derrière une source proxy **non-boucle** (loopback) consciente de l'identité (voir [Trusted Proxy Auth](/fr/gateway/trusted-proxy-auth)).
- `gateway.remote.url`, `gateway.remote.token`, `gateway.remote.password` : cible de passerelle distante.
- `session.*` : stockage de session et valeurs par défaut de la clé principale.

## Connexes

- [Interface de contrôle](/fr/web/control-ui)
- [Tableau de bord](/fr/web/dashboard)
