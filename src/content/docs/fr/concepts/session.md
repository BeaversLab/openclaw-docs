---
summary: "Comment OpenClaw gère les sessions de conversation"
read_when:
  - You want to understand session routing and isolation
  - You want to configure DM scope for multi-user setups
title: "Gestion de session"
---

# Gestion de session

OpenClaw organise les conversations en **sessions**. Chaque message est routé vers une
session en fonction de sa provenance -- les DMs, les discussions de groupe, les tâches cron, etc.

## Routage des messages

| Source                | Comportement                        |
| --------------------- | ----------------------------------- |
| Messages directs      | Session partagée par défaut         |
| Discussions de groupe | Isolé par groupe                    |
| Salons/canaux         | Isolé par salon                     |
| Tâches cron           | Nouvelle session à chaque exécution |
| Webhooks              | Isolé par hook                      |

## Isolement des DMs

Par défaut, tous les DMs partagent une même session pour assurer la continuité. C'est adapté pour
les configurations mono-utilisateur.

<Warning>Si plusieurs personnes peuvent envoyer des messages à votre agent, activez l'isolement des DMs. Sans cela, tous les utilisateurs partagent le même contexte de conversation -- les messages privés d'Alice seraient visibles pour Bob.</Warning>

**La solution :**

```json5
{
  session: {
    dmScope: "per-channel-peer", // isolate by channel + sender
  },
}
```

Autres options :

- `main` (par défaut) -- tous les DMs partagent une session.
- `per-peer` -- isoler par expéditeur (à travers les canaux).
- `per-channel-peer` -- isoler par canal + expéditeur (recommandé).
- `per-account-channel-peer` -- isoler par compte + canal + expéditeur.

<Tip>Si la même personne vous contacte depuis plusieurs canaux, utilisez `session.identityLinks` pour lier ses identités afin qu'elles partagent une session.</Tip>

Vérifiez votre configuration avec `openclaw security audit`.

## Cycle de vie de la session

Les sessions sont réutilisées jusqu'à leur expiration :

- **Réinitialisation quotidienne** (par défaut) -- nouvelle session à 4h00 heure locale sur la passerelle
  hôte.
- **Réinitialisation par inactivité** (optionnel) -- nouvelle session après une période d'inactivité. Définissez
  `session.reset.idleMinutes`.
- **Réinitialisation manuelle** -- tapez `/new` ou `/reset` dans le chat. `/new <model>` permet également
  de changer de modèle.

Lorsque les réinitialisations quotidiennes et par inactivité sont toutes deux configurées, la première à expirer l'emporte.

## Où réside l'état

Tout l'état de session est détenu par la **passerelle**. Les clients UI interrogent la passerelle pour
les données de session.

- **Stockage :** `~/.openclaw/agents/<agentId>/sessions/sessions.json`
- **Transcriptions :** `~/.openclaw/agents/<agentId>/sessions/<sessionId>.jsonl`

## Maintenance de session

OpenClaw limite automatiquement le stockage des sessions au fil du temps. Par défaut, il fonctionne
en mode `warn` (signale ce qui serait nettoyé). Définissez `session.maintenance.mode`
sur `"enforce"` pour un nettoyage automatique :

```json5
{
  session: {
    maintenance: {
      mode: "enforce",
      pruneAfter: "30d",
      maxEntries: 500,
    },
  },
}
```

Aperçu avec `openclaw sessions cleanup --dry-run`.

## Inspection des sessions

- `openclaw status` -- chemin du magasin de sessions et activité récente.
- `openclaw sessions --json` -- toutes les sessions (filtrer avec `--active <minutes>`).
- `/status` dans le chat -- utilisation du contexte, model et bascules.
- `/context list` -- ce qui se trouve dans le prompt système.

## Pour aller plus loin

- [Session Pruning](/fr/concepts/session-pruning) -- élagage des résultats des outils
- [Compaction](/fr/concepts/compaction) -- résumé des longues conversations
- [Session Tools](/fr/concepts/session-tool) -- outils de l'agent pour le travail inter-sessions
- [Session Management Deep Dive](/fr/reference/session-management-compaction) --
  schéma du magasin, transcriptions, politique d'envoi, métadonnées d'origine et configuration avancée
- [Multi-Agent](/fr/concepts/multi-agent) — routage et isolement des sessions entre les agents
- [Background Tasks](/fr/automation/tasks) — comment le travail détaché crée des enregistrements de tâches avec des références de session
- [Channel Routing](/fr/channels/channel-routing) — routage des messages entrants vers les sessions
