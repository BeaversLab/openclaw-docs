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

### Ancrer les channels liés

Les commandes d'ancrage permettent à un utilisateur de déplacer la route de réponse de la session de chat direct actuelle vers un autre channel lié sans démarrer une nouvelle session. Voir [Channel docking](/fr/concepts/channel-docking) pour des exemples, la configuration et le troubleshooting.

Vérifiez votre configuration avec `openclaw security audit`.

## Cycle de vie de la session

Les sessions sont réutilisées jusqu'à leur expiration :

- **Réinitialisation quotidienne** (par défaut) -- nouvelle session à 4h00 heure locale sur l'hôte de la passerelle. La fraîcheur quotidienne est basée sur le moment où la `sessionId` actuelle a démarré, et non sur les écritures ultérieures des métadonnées.
- **Réinitialisation par inactivité** (optionnelle) -- nouvelle session après une période d'inactivité. Définissez `session.reset.idleMinutes`. La fraîcheur par inactivité est basée sur la dernière véritable interaction utilisateur/channel, donc les événements système de heartbeat, cron et exec ne maintiennent pas la session active.
- **Réinitialisation manuelle** -- tapez `/new` ou `/reset` dans le chat. `/new <model>` change également le model.

Lorsque les réinitialisations quotidienne et par inactivité sont toutes deux configurées, la première qui expire l'emporte. Les tours de heartbeat, cron, exec et autres événements système peuvent écrire des métadonnées de session, mais ces écritures ne prolongent pas la fraîcheur de la réinitialisation quotidienne ou par inactivité. Lorsqu'une réinitialisation fait basculer la session, les avis d'événements système en file d'attente pour l'ancienne session sont ignorés afin que les mises à jour d'arrière-plan obsolètes ne soient pas ajoutées avant le premier prompt de la nouvelle session.

Les sessions avec une session CLI active détenue par un provider ne sont pas coupées par la valeur par défaut quotidienne implicite. Utilisez `/reset` ou configurez `session.reset` explicitement lorsque ces sessions doivent expirer selon une minuterie.

## Où réside l'état

Tout l'état de la session appartient à la **passerelle**. Les clients UI interrogent la passerelle pour les données de session.

- **Stockage :** `~/.openclaw/agents/<agentId>/sessions/sessions.json`
- **Transcriptions :** `~/.openclaw/agents/<agentId>/sessions/<sessionId>.jsonl`

`sessions.json` conserve des horodatages de cycle de vie distincts :

- `sessionStartedAt` : moment où la `sessionId` actuelle a commencé ; utilisé par la réinitialisation quotidienne.
- `lastInteractionAt` : dernière interaction utilisateur/channel qui prolonge la durée de vie par inactivité.
- `updatedAt` : dernière mutation de la ligne de stockage ; utile pour le listage et le nettoyage, mais pas faisant autorité pour la fraîcheur de la réinitialisation quotidienne/inactive.

Les lignes plus anciennes sans `sessionStartedAt` sont résolues à partir de l'en-tête de session du transcript JSONL
lorsqu'il est disponible. Si une ligne ancienne ne contient pas non plus `lastInteractionAt`,
la fraîcheur inactive revient à cette heure de début de session, et non aux écritures
de tenue de livre ultérieures.

## Maintenance de session

OpenClaw limite automatiquement le stockage des sessions au fil du temps. Par défaut, il fonctionne
en mode `warn` (indique ce qui serait nettoyé). Définissez `session.maintenance.mode`
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

Pour les limites `maxEntries` de taille de production, les écritures d'exécution Gateway utilisent un petit tampon de niveau haut et nettoient par lots jusqu'à la limite configurée. Les lectures du magasin de sessions n'élaguent ni ne limitent les entrées lors du démarrage du Gateway. Cela évite d'exécuter un nettoyage complet du magasin à chaque démarrage ou session cron isolée. `openclaw sessions cleanup --enforce` applique la limite immédiatement.

La maintenance préserve les pointeurs de conversation externe durables, y compris les sessions
de groupe et les sessions de chat délimitées aux fils, tout en permettant toujours aux entrées synthétiques cron,
hook, heartbeat, ACP et de sous-agent de devenir obsolètes.

Si vous avez précédemment utilisé l'isolement des messages directs et avez ensuite rétabli
`session.dmScope` à `main`, prévisualisez les anciennes lignes DM indexées par homologue avec
`openclaw sessions cleanup --dry-run --fix-dm-scope`. L'application du même indicateur
retire ces anciennes lignes DM directes et conserve leurs transcriptions en tant qu'archives
supprimées.

Prévisualisez avec `openclaw sessions cleanup --dry-run`.

## Inspection des sessions

- `openclaw status` -- chemin du magasin de sessions et activité récente.
- `openclaw sessions --json` -- toutes les sessions (filtrez avec `--active <minutes>`).
- `/status` dans le chat -- utilisation du contexte, model et bascules.
- `/context list` -- ce qui se trouve dans l'invite système.

## Pour aller plus loin

- [Session Pruning](/fr/concepts/session-pruning) -- élagage des résultats des tool
- [Compaction](/fr/concepts/compaction) -- résumé des longues conversations
- [Session Tools](/fr/concepts/session-tool) -- outils d'agent pour le travail inter-session
- [Approfondissement de la gestion des sessions](/fr/reference/session-management-compaction) --
  schéma de stockage, transcriptions, stratégie d'envoi, métadonnées d'origine et configuration avancée
- [Multi-Agent](/fr/concepts/multi-agent) — routage et isolation des sessions entre les agents
- [Tâches d'arrière-plan](/fr/automation/tasks) — fonctionnement de la création d'enregistrements de tâches avec des références de session par le travail détaché
- [Routage des canaux](/fr/channels/channel-routing) — acheminement des messages entrants vers les sessions

## Connexes

- [Nettoyage des sessions](/fr/concepts/session-pruning)
- [Outils de session](/fr/concepts/session-tool)
- [File d'attente de commandes](/fr/concepts/queue)
