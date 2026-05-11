---
summary: "Comment OpenClaw gère les sessions de conversation"
read_when:
  - You want to understand session routing and isolation
  - You want to configure DM scope for multi-user setups
  - You are debugging daily or idle session resets
title: "Gestion de session"
---

OpenClaw organise les conversations en **sessions**. Chaque message est routé vers une session en fonction de sa provenance -- DMs, discussions de groupe, tâches cron, etc.

## Comment les messages sont routés

| Source                | Comportement                   |
| --------------------- | ------------------------------ |
| Messages directs      | Session partagée par défaut    |
| Discussions de groupe | Isolé par groupe               |
| Salons/canaux         | Isolé par salon                |
| Tâches cron           | Nouvelle session par exécution |
| Webhooks              | Isolé par hook                 |

## Isolation des DMs

Par défaut, tous les DMs partagent une session pour assurer la continuité. Cela convient pour les configurations à un seul utilisateur.

<Warning>Si plusieurs personnes peuvent envoyer des messages à votre agent, activez l'isolation des DMs. Sans cela, tous les utilisateurs partagent le même contexte de conversation -- les messages privés d'Alice seraient visibles pour Bob.</Warning>

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

<Tip>Si la même personne vous contacte via plusieurs canaux, utilisez `session.identityLinks` pour lier ses identités afin qu'elles partagent une session.</Tip>

Vérifiez votre configuration avec `openclaw security audit`.

## Cycle de vie de la session

Les sessions sont réutilisées jusqu'à leur expiration :

- **Réinitialisation quotidienne** (par défaut) -- nouvelle session à 4h00 heure locale sur l'hôte de la passerelle. La fraîcheur quotidienne est basée sur le démarrage de l'actuel `sessionId`, et non sur les écritures ultérieures de métadonnées.
- **Réinitialisation par inactivité** (optionnel) -- nouvelle session après une période d'inactivité. Définissez `session.reset.idleMinutes`. La fraîcheur par inactivité est basée sur la dernière véritable interaction utilisateur/canal, donc les événements système heartbeat, cron et exec ne maintiennent pas la session en vie.
- **Réinitialisation manuelle** -- tapez `/new` ou `/reset` dans le chat. `/new <model>` change également le modèle.

Lorsque les réinitialisations quotidiennes et d'inactivité sont configurées, la première à expirer l'emporte. Les tours d'événements système tels que Heartbeat, cron, exec et autres peuvent écrire des métadonnées de session, mais ces écritures ne prolongent pas la fraîcheur des réinitialisations quotidiennes ou d'inactivité. Lorsqu'une réinitialisation fait passer la session, les avis d'événements système en file d'attente pour l'ancienne session sont supprimés afin que les mises à jour d'arrière-plan obsolètes ne soient pas ajoutées devant le premier prompt de la nouvelle session.

Les sessions avec une session CLI active détenue par un fournisseur ne sont pas interrompues par la valeur quotidienne par défaut implicite. Utilisez `/reset` ou configurez `session.reset` explicitement lorsque ces sessions doivent expirer sur une minuterie.

## Où réside l'état

Tout l'état de session est détenu par la **passerelle**. Les clients UI interrogent la passerelle pour
les données de session.

- **Store :** `~/.openclaw/agents/<agentId>/sessions/sessions.json`
- **Transcriptions :** `~/.openclaw/agents/<agentId>/sessions/<sessionId>.jsonl`

`sessions.json` conserve des horodatages de cycle de vie distincts :

- `sessionStartedAt` : début de la `sessionId` actuelle ; utilisé par la réinitialisation quotidienne.
- `lastInteractionAt` : dernière interaction utilisateur/channel qui prolonge la durée d'inactivité.
- `updatedAt` : dernière mutation de la ligne de magasin ; utile pour le listage et l'élagage, mais pas autoritaire pour la fraîcheur de la réinitialisation quotidienne/inactive.

Les lignes plus anciennes sans `sessionStartedAt` sont résolues à partir de l'en-tête de session JSONL de la transcription si disponible. Si une ligne plus ancienne manque aussi de `lastInteractionAt`, la fraîcheur d'inactivité revient à cette heure de début de session, et non aux écritures de tenue de livres ultérieures.

## Maintenance de session

OpenClaw délimite automatiquement le stockage des sessions au fil du temps. Par défaut, il fonctionne en mode `warn` (signale ce qui serait nettoyé). Définissez `session.maintenance.mode` sur `"enforce"` pour un nettoyage automatique :

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

Pour les limites `maxEntries` de taille production, les écritures d'exécution du Gateway utilisent un petit tampon de niveau haut et nettoient par lots jusqu'à la plafond configuré. Cela évite d'exécuter un nettoyage complet du magasin à chaque session cron isolée. `openclaw sessions cleanup --enforce` applique la limite immédiatement.

Aperçu avec `openclaw sessions cleanup --dry-run`.

## Inspection des sessions

- `openclaw status` -- chemin du magasin de sessions et activité récente.
- `openclaw sessions --json` -- toutes les sessions (filtrer avec `--active <minutes>`).
- `/status` dans le chat -- utilisation du contexte, model et bascules.
- `/context list` -- ce qu'il y a dans le prompt système.

## Pour aller plus loin

- [Session Pruning](/fr/concepts/session-pruning) -- rogner les résultats des tools
- [Compaction](/fr/concepts/compaction) -- résumer les longues conversations
- [Session Tools](/fr/concepts/session-tool) -- outils d'agent pour le travail inter-session
- [Session Management Deep Dive](/fr/reference/session-management-compaction) --
  schéma de stockage, transcriptions, politique d'envoi, métadonnées d'origine et configuration avancée
- [Multi-Agent](/fr/concepts/multi-agent) — routage et isolation des sessions entre les agents
- [Background Tasks](/fr/automation/tasks) — comment le travail détaché crée des enregistrements de tâches avec des références de session
- [Channel Routing](/fr/channels/channel-routing) — acheminement des messages entrants vers les sessions

## Connexes

- [Session pruning](/fr/concepts/session-pruning)
- [Session tools](/fr/concepts/session-tool)
- [Command queue](/fr/concepts/queue)
