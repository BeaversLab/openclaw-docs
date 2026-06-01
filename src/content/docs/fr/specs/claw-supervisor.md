---
title: Claw Supervisor
description: Plan de supervision de flotte pour les sessions d'application serveur Codex contrôlées par OpenClaw.
readWhen:
  - Designing Codex fleet supervision
  - Building OpenClaw tools that read, steer, or spawn Codex sessions
  - Choosing between local, Cloudflare, and VPS deployment for supervised Codex
---

# Claw Supervisor

## Objectif

Claw Supervisor permet à une instance toujours active de OpenClaw de surveiller et de piloter une flotte de sessions Codex sans modifier l'expérience utilisateur normale de Codex. Un utilisateur peut se connecter en SSH à un hôte, démarrer Codex, travailler dans l'TUI, et toujours permettre au superviseur de lire la session, de la diriger, de l'interrompre, de générer des sessions associées et d'accepter des transferts. Les sessions Codex peuvent également rappeler OpenClaw via MCP.

## Modèle Produit

Codex reste la surface de travail principale. OpenClaw supervise Codex plutôt que de masquer Codex dans un sous-agent OpenClaw opaque.

Le plugin OpenClaw est nommé `codex-supervisor`. `crabfleet` reste le profil de déploiement et de flotte d'hôtes pour les machines CRAB plutôt que le nom du plugin réutilisable.

Le modèle comporte trois rôles :

- Codex attaché à un humain : une TUI Codex interactive normale lancée via un serveur d'application partagé.
- Codex autonome : un thread de serveur d'application Codex généré par le superviseur auquel un humain peut se connecter ultérieurement.
- Claw Superviseur : un agent OpenClaw toujours actif avec des outils pour l'état de la flotte, la lecture des transcriptions, la direction, l'interruption, la génération et le transfert.

OpenClaw peut utiliser en interne sa machinerie de sous-agent existante, mais le contrat externe est une session Codex attachable avec un identifiant de thread Codex.

## Architecture

```text
user SSH session
  -> codex --remote unix://... or ws://...
      -> local codex app-server daemon
          <-> host sidecar / supervisor connector
              <-> OpenClaw fleet supervisor
                  <-> supervisor MCP exposed back to Codex
```

Chaque hôte compatible Codex exécute :

- Démon de serveur d'application Codex.
- Un lanceur qui démarre toujours Codex interactif avec `--remote`.
- Un connecteur qui enregistre les points de terminaison du serveur d'application et les threads actifs auprès du superviseur.

Le superviseur exécute :

- Registre des points de terminaison.
- Registre des sessions.
- Pool de clients JSON-RPC pour le serveur d'application Codex.
- Serveur MCP pour les appels Codex-vers-Claw.
- Outils OpenClaw pour le contrôle Claw-vers-Codex.
- Moteur de stratégies pour les actions autonomes, les approbations et la prévention des boucles.

## Contrat de Serveur d'Application Codex

Utiliser les API du serveur d'application Codex comme plan de contrôle canonique :

- `initialize`, `initialized`
- `thread/loaded/list`
- `thread/list`
- `thread/read`
- `thread/resume`
- `thread/start`
- `turn/start`
- `turn/steer`
- `turn/interrupt`
- `model/list`

Codex interactif doit être lancé avec `codex --remote <endpoint>` afin que la TUI et le superviseur se connectent au même app-server. `codex exec` autonome n'est pas une session partagée en direct aujourd'hui ; utilisez les API de l'app-server pour un travail autonome jusqu'à ce que Codex prenne en charge `exec --remote`.

## Registre de sessions

Le superviseur stocke un enregistrement par thread Codex observé :

```json
{
  "sessionId": "codex-thread-id",
  "endpointId": "host-a",
  "host": "host-a.example",
  "workspace": "/workspace/repo",
  "repo": "owner/repo",
  "branch": "feature/example",
  "source": "vscode",
  "status": "idle",
  "humanAttached": true,
  "lastSeenAt": "2026-05-28T10:00:00.000Z",
  "summary": "Short working-state summary"
}
```

L'implémentation locale peut dériver la plupart des champs à partir des métadonnées du thread Codex. Le déploiement de flotte devrait enrichir les enregistrements avec l'identité de l'hôte, l'état de l'attachement de l'utilisateur, l'état git et l'état de santé du sidecar.

## Surface MCP pour Codex

Chaque Codex supervisé obtient un serveur MCP nommé `openclaw-codex-supervisor`.

Outils :

- `codex_sessions_list` : lister les sessions Codex visibles.
- `codex_session_read` : lire une transcription.
- `codex_session_send` : envoyer un message à un thread inactif ou diriger un thread actif.
- `codex_session_interrupt` : interrompre le tour actif.
- `codex_endpoint_probe` : vérifier la connectivité du point de terminaison.
- `claw_report_progress` : publier l'état actuel de la tâche au superviseur.
- `claw_ask` : demander de l'aide ou une délégation au superviseur.
- `codex_spawn` : créer une nouvelle session Codex autonome.
- `codex_handoff` : demander une reprise par un humain ou un pair.

Ressources :

- `codex://sessions`
- `codex://sessions/{sessionId}`
- `codex://sessions/{sessionId}/transcript`

## Surface de contrôle Claw

Le Claw toujours actif obtient les mêmes primitives que les outils internes :

- lister les sessions et les points de terminaison
- lire les transcriptions
- envoyer/diriger du texte
- interrompre le travail actif
- générer de nouvelles sessions
- résumer et assigner des sessions
- diffuser des instructions à un groupe filtré
- marquer les sessions comme bloquées, terminées ou abandonnées

Comportement de l'outil :

- Si un thread cible est inactif, `codex_session_send` correspond à `turn/start`.
- Si un thread cible est actif et qu'un identifiant de tour en cours est visible, il correspond à `turn/steer`.
- Si le tour actif ne peut pas être identifié, l'outil échoue de manière fermée au lieu de créer un tour non lié.
- Les contrôles d'écriture MCP exposés par Codex restent désactivés, sauf si une stratégie de confiance réservée au superviseur les active.
- Les lectures brutes de transcripts restent désactivées, sauf si une stratégie de confiance réservée au superviseur les active.
- L'approbation autonome refuse par défaut les approuvations d'outils/de fichiers, sauf si une stratégie explicite indique le contraire.

## Flux de lancement

Connexion interactive à l'hôte :

1. L'utilisateur se connecte par SSH à un hôte CRAB.
2. Le service SSH démarre ou vérifie `codex app-server daemon start`.
3. Le wrapper de connexion lance `codex --remote unix:// --cd <workspace>`.
4. Le connecteur d'hôte enregistre le point de terminaison et le thread chargé.
5. Le superviseur émet un événement de flotte haute priorité : nouvelle session Codex, espace de travail, état attaché à un humain, aperçu de la tâche actuelle.
6. Le Claw superviseur peut lire et diriger immédiatement.

Génération autonome :

1. Le superviseur sélectionne l'hôte et l'espace de travail.
2. Le connecteur d'hôte ouvre ou reprend un thread app-server Codex.
3. Le superviseur démarre le premier tour avec le texte de la tâche et la configuration MCP.
4. Le registre de sessions le marque comme autonome et attachable.
5. Un humain peut s'attacher ultérieurement avec `codex --remote <endpoint> resume <threadId>` une fois que Codex prendra en charge cette UX exacte, ou via le flux de reprise actuel sur le même app-server.

## Déploiement

Plan de contrôle préféré :

- Les connecteurs d'hôte maintiennent des connexions WebSocket sortantes vers le superviseur.
- L'état du superviseur réside dans le stockage du OpenClaw Gateway.
- L'app-server Codex reste local à chaque hôte ; ne jamais exposer un app-server brut non authentifié à l'internet public.

Viabilité de Cloudflare :

- Adapté pour le registre, les objets durables, la concentration WebSocket, le routage d'événements léger et les points de terminaison MCP/gateway publics.
- Pas suffisant en soi pour le contrôle direct d'un hôte privé car les Workers ne peuvent pas appeler de sockets Unix privés arbitraires ou des app-servers en local loopback.
- Utilisez Cloudflare lorsque chaque connecteur d'hôte rappelle le domicile via WebSocket sortant.

Solution de repli VPS :

- Utilisez un service Hetzner lorsqu'un contrôle de processus longue durée, des tunnels SSH, un routage de réseau privé ou un accès au système de fichiers local est nécessaire.
- Conservez le même protocole : connecteurs d'hôte sortants, registre du superviseur central, app-server Codex local.

## Sécurité

- La liaison par défaut est le socket Unix local.
- Le serveur d'application distant utilise un jeton ou une authentification de porteur signée.
- Le connecteur d'hôte s'authentifie auprès du superviseur avec un jeton d'hôte délimité.
- Les outils du superviseur appliquent une politique par session : lecture, direction, interruption, spawn, approbation.
- Les messages inter-agents incluent `originSessionId` ; l'auto-écho est supprimé.
- La diffusion nécessite un filtre explicite et un nombre de cibles limité.
- Les lectures de transcriptions expurgent les secrets à la frontière OpenClaw.
- Les demandes d'approbation refusent par défaut les tours initiés par le superviseur, sauf si la politique les autorise.

## Plan de mise en œuvre

Phase 1 : MVP du superviseur local

- Ajouter le client JSON-RPC du serveur d'application Codex pour les terminaisons proxy stdio et WebSocket.
- Ajouter le registre de terminaison/session du superviseur.
- Ajouter les outils MCP : list, read, send, interrupt, probe.
- Ajouter la configuration de l'environnement local pour les terminaisons.
- Ajouter des tests de faux serveur d'application et un test de fumée avec un serveur d'application local en direct.

Phase 2 : Intégration OpenClaw

- Enregistrer les outils du superviseur dans le plugin `codex-supervisor`.
- Injecter le MCP du superviseur dans la configuration du thread Codex.
- Ajouter des résumés de sessions au contexte de l'agent.
- Ajouter des notifications d'événement lorsque de nouveaux threads Codex apparaissent.
- Ajouter une configuration de politique pour l'envoi/interruption/spawn autonome.

Phase 3 : Connecteur de flotte

- Le sidecar de l'hôte enregistre la terminaison du serveur d'application, les métadonnées de l'hôte, les métadonnées git/espace de travail et l'état d'attachement humain.
- Ajouter un connecteur WebSocket sortant pour le plan de contrôle Cloudflare ou VPS.
- Ajouter la reconnexion, le heartbeat et le nettoyage des sessions périmées.
- Ajouter un wrapper de lanceur SSH CRAB.

Phase 4 : Fonctionnement autonome

- Ajouter les flux de spawn/reprise/prise de contrôle.
- Ajouter la diffusion et la délégation.
- Ajouter les rapports de progression et les résumés d'état des tâches.
- Ajouter la prévention des boucles et les limites de débit.
- Ajouter les vues du tableau de bord.

Phase 5 : Multi-Claw

- Partitionner les sessions par groupe.
- Ajouter un leadership/bail pour chaque session.
- Ajouter le journal d'audit et la relecture.
- Ajouter l'escalade entre les groupes Claw.

## Tests d'acceptation

- Un humain lance le TUI Codex via un serveur d'application partagé.
- Le superviseur liste le thread en direct via `thread/loaded/list`.
- Le superviseur lit la transcription via `thread/read`.
- Le superviseur envoie du texte à un thread inactif via `turn/start`.
- Le superviseur dirige un fil actif via `turn/steer`.
- L'interruption du superviseur arrête un tour actif via `turn/interrupt`.
- Codex appelle le MCP du superviseur et liste les sessions homologues.
- Un Codex autonome est généré et ensuite attaché par un humain.
- Le connecteur d'hôte perdu marque les sessions comme obsolètes sans supprimer l'historique.

## Questions ouvertes

- UX d'attachage exacte du TUI Codex pour un fil app-server généré sans TUI.
- Si Codex doit ajouter `exec --remote` pour les exécutions en tête-à-tête partagées en direct.
- Propriétaire de l'état durable : DB de OpenClaw Gateway, Cloudflare Durable Object, ou base de données VPS.
- Granularité de la politique d'approbation pour les tours initiés par le superviseur.
- Combien de résumé de transcription doit être injecté dans le contexte Claw toujours actif par rapport à être conservé en tant que ressource/tool.
