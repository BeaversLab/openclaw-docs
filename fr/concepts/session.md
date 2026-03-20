---
summary: "Règles, clés et persistance de gestion des sessions pour les chats"
read_when:
  - Modification de la gestion ou du stockage des sessions
title: "Session Management"
---

# Gestion de session

OpenClaw considère **une session de chat direct par agent** comme primaire. Les chats directs sont réduits à `agent:<agentId>:<mainKey>` (par défaut `main`), tandis que les chats de groupe/canal obtiennent leurs propres clés. `session.mainKey` est respecté.

Utilisez `session.dmScope` pour contrôler le regroupement des **messages directs** :

- `main` (par défaut) : tous les DMs partagent la session principale pour la continuité.
- `per-peer` : isoler par identifiant d'expéditeur sur tous les canaux.
- `per-channel-peer` : isoler par canal + expéditeur (recommandé pour les boîtes de réception multi-utilisateurs).
- `per-account-channel-peer` : isoler par compte + canal + expéditeur (recommandé pour les boîtes de réception multi-comptes).
  Utilisez `session.identityLinks` pour mapper les identifiants de pairs préfixés par le fournisseur à une identité canonique, afin que la même personne partage une session DM sur différents canaux lors de l'utilisation de `per-peer`, `per-channel-peer` ou `per-account-channel-peer`.

## Mode DM sécurisé (recommandé pour les configurations multi-utilisateurs)

> **Avertissement de sécurité :** Si votre agent peut recevoir des DMs de **plusieurs personnes**, vous devriez fortement envisager d'activer le mode DM sécurisé. Sans cela, tous les utilisateurs partagent le même contexte de conversation, ce qui peut entraîner des fuites d'informations privées entre les utilisateurs.

**Exemple du problème avec les paramètres par défaut :**

- Alice (`<SENDER_A>`) envoie un message à votre agent sur un sujet privé (par exemple, un rendez-vous médical)
- Bob (`<SENDER_B>`) envoie un message à votre agent en demandant « De quoi parlions-nous ? »
- Parce que les deux DMs partagent la même session, le modèle peut répondre à Bob en utilisant le contexte antérieur d'Alice.

**La solution :** Définissez `dmScope` pour isoler les sessions par utilisateur :

```json5
// ~/.openclaw/openclaw.json
{
  session: {
    // Secure DM mode: isolate DM context per channel + sender.
    dmScope: "per-channel-peer",
  },
}
```

**Quand activer ceci :**

- Vous avez des approbations d'appariement pour plus d'un expéditeur
- Vous utilisez une liste d'autorisation de DM avec plusieurs entrées
- Vous définissez `dmPolicy: "open"`
- Plusieurs numéros de téléphone ou comptes peuvent envoyer des messages à votre agent

Notes :

- La valeur par défaut est `dmScope: "main"` pour la continuité (tous les DMs partagent la session principale). C'est correct pour les configurations mono-utilisateur.
- L'intégration locale du CLI écrit `session.dmScope: "per-channel-peer"` par défaut lorsqu'il n'est pas défini (les valeurs explicites existantes sont conservées).
- Pour les boîtes de réception multi-comptes sur le même canal, préférez `per-account-channel-peer`.
- Si la même personne vous contacte sur plusieurs canaux, utilisez `session.identityLinks` pour fusionner leurs sessions DM en une seule identité canonique.
- Vous pouvez vérifier vos paramètres de DM avec `openclaw security audit` (voir [sécurité](/fr/cli/security)).

## Gateway est la source de vérité

Tout l'état de session est **défini par la passerelle** (le OpenClaw « maître »). Les clients UI (application macOS, WebChat, etc.) doivent interroger la passerelle pour les listes de sessions et les comptes de jetons au lieu de lire les fichiers locaux.

- En **mode distant**, le magasin de sessions qui vous concerne se trouve sur l'hôte de la passerelle distante, et non sur votre Mac.
- Les comptes de jetons affichés dans les interfaces proviennent des champs du magasin de la passerelle (`inputTokens`, `outputTokens`, `totalTokens`, `contextTokens`). Les clients n'analysent pas les transcriptions JSONL pour « corriger » les totaux.

## Où réside l'état

- Sur l'**hôte de la passerelle** :
  - Fichier de magasin : `~/.openclaw/agents/<agentId>/sessions/sessions.json` (par agent).
- Transcriptions : `~/.openclaw/agents/<agentId>/sessions/<SessionId>.jsonl` (les sessions de sujet Telegram utilisent `.../<SessionId>-topic-<threadId>.jsonl`).
- Le magasin est une carte `sessionKey -> { sessionId, updatedAt, ... }`. La suppression des entrées est sans danger ; elles sont recréées à la demande.
- Les entrées de groupe peuvent inclure `displayName`, `channel`, `subject`, `room` et `space` pour étiqueter les sessions dans les interfaces.
- Les entrées de session incluent les métadonnées `origin` (étiquette + indications de routage) afin que les interfaces puissent expliquer l'origine d'une session.
- OpenClaw ne lit **pas** les dossiers de session hérités de Pi/Tau.

## Maintenance

OpenClaw applique la maintenance du magasin de sessions pour maintenir `sessions.json` et les artefacts de transcription bornés dans le temps.

### Valeurs par défaut

- `session.maintenance.mode` : `warn`
- `session.maintenance.pruneAfter` : `30d`
- `session.maintenance.maxEntries` : `500`
- `session.maintenance.rotateBytes` : `10mb`
- `session.maintenance.resetArchiveRetention` : par défaut `pruneAfter` (`30d`)
- `session.maintenance.maxDiskBytes` : non défini (désactivé)
- `session.maintenance.highWaterBytes` : par défaut `80%` de `maxDiskBytes` lorsque la budgétisation est activée

### Fonctionnement

La maintenance s'exécute pendant les écritures dans le magasin de sessions, et vous pouvez la déclencher à la demande avec `openclaw sessions cleanup`.

- `mode: "warn"` : signale ce qui serait expulsé mais ne modifie pas les entrées/transcriptions.
- `mode: "enforce"` : applique le nettoyage dans cet ordre :
  1. élaguer les entrées périmées plus anciennes que `pruneAfter`
  2. limiter le nombre d'entrées à `maxEntries` (les plus anciennes d'abord)
  3. archiver les fichiers de transcription des entrées supprimées qui ne sont plus référencées
  4. purger les anciennes archives `*.deleted.<timestamp>` et `*.reset.<timestamp>` selon la politique de rétention
  5. faire une rotation de `sessions.json` lorsqu'elle dépasse `rotateBytes`
  6. si `maxDiskBytes` est défini, appliquer le budget disque vers `highWaterBytes` (les artefacts les plus anciens d'abord, puis les sessions les plus anciennes)

### Mise en garde sur les performances pour les magasins volumineux

Les magasins de sessions volumineux sont courants dans les configurations à fort volume. Le travail de maintenance s'effectue sur le chemin d'écriture, donc les très grands magasins peuvent augmenter la latence d'écriture.

Ce qui augmente le plus le coût :

- valeurs de `session.maintenance.maxEntries` très élevées
- longues fenêtres `pruneAfter` qui gardent des entrées obsolètes
- de nombreux artefacts de transcription/archive dans `~/.openclaw/agents/<agentId>/sessions/`
- activer les budgets disque (`maxDiskBytes`) sans limites raisonnables de nettoyage/plafonnement

What to do:

- utiliser `mode: "enforce"` en production pour que la croissance soit automatiquement limitée
- définir à la fois des limites de temps et de comptage (`pruneAfter` + `maxEntries`), pas seulement une
- définir `maxDiskBytes` + `highWaterBytes` pour des limites supérieures strictes dans les grands déploiements
- garder `highWaterBytes` sensiblement en dessous de `maxDiskBytes` (la valeur par défaut est 80 %)
- exécuter `openclaw sessions cleanup --dry-run --json` après les changements de configuration pour vérifier l'impact projeté avant l'application
- pour les sessions actives fréquentes, passer `--active-key` lors du nettoyage manuel

### Customize examples

Use a conservative enforce policy:

```json5
{
  session: {
    maintenance: {
      mode: "enforce",
      pruneAfter: "45d",
      maxEntries: 800,
      rotateBytes: "20mb",
      resetArchiveRetention: "14d",
    },
  },
}
```

Enable a hard disk budget for the sessions directory:

```json5
{
  session: {
    maintenance: {
      mode: "enforce",
      maxDiskBytes: "1gb",
      highWaterBytes: "800mb",
    },
  },
}
```

Tune for larger installs (example):

```json5
{
  session: {
    maintenance: {
      mode: "enforce",
      pruneAfter: "14d",
      maxEntries: 2000,
      rotateBytes: "25mb",
      maxDiskBytes: "2gb",
      highWaterBytes: "1.6gb",
    },
  },
}
```

Preview or force maintenance from CLI:

```bash
openclaw sessions cleanup --dry-run
openclaw sessions cleanup --enforce
```

## Session pruning

OpenClaw supprime les **anciens résultats d'outils** du contexte en mémoire juste avant les appels LLM par défaut.
Cela ne réécrit **pas** l'historique JSONL. Voir [/concepts/session-pruning](/fr/concepts/session-pruning).

## Pre-compaction memory flush

Lorsqu'une session approche de la auto-compaction, OpenClaw peut exécuter un **silent memory flush**
qui rappelle au model d'écrire des notes durables sur le disque. Cela ne s'exécute que lorsque
l'espace de travail est inscriptible. Voir [Memory](/fr/concepts/memory) et
[Compaction](/fr/concepts/compaction).

## Mapping transports → session keys

- Les chats directs suivent `session.dmScope` (par défaut `main`).
  - `main` : `agent:<agentId>:<mainKey>` (continuité sur les périphériques/canaux).
    - Multiple phone numbers and channels can map to the same agent main key; they act as transports into one conversation.
  - `per-peer` : `agent:<agentId>:direct:<peerId>`.
  - `per-channel-peer` : `agent:<agentId>:<channel>:direct:<peerId>`.
  - `per-account-channel-peer` : `agent:<agentId>:<channel>:<accountId>:direct:<peerId>` (accountId par défaut `default`).
  - Si `session.identityLinks` correspond à un ID de pair préfixé par un fournisseur (par exemple `telegram:123`), la clé canonique remplace `<peerId>` afin que la même personne partage une session sur plusieurs canaux.
- Les discussions de groupe isolent l'état : `agent:<agentId>:<channel>:group:<id>` (les salons/canaux utilisent `agent:<agentId>:<channel>:channel:<id>`).
  - Les sujets de forum Telegram ajoutent `:topic:<threadId>` à l'identifiant de groupe pour l'isolement.
  - Les clés `group:<id>` héritées sont toujours reconnues pour la migration.
- Les contextes entrants peuvent toujours utiliser `group:<id>` ; le canal est déduit de `Provider` et normalisé sous la forme canonique `agent:<agentId>:<channel>:group:<id>`.
- Autres sources :
  - Tâches Cron : `cron:<job.id>` (isolé) ou personnalisé `session:<custom-id>` (persistant)
  - Webhooks : `hook:<uuid>` (sauf si défini explicitement par le hook)
  - Exécutions de nœud : `node-<nodeId>`

## Cycle de vie

- Politique de réinitialisation : les sessions sont réutilisées jusqu'à leur expiration, et l'expiration est évaluée lors du prochain message entrant.
- Réinitialisation quotidienne : par défaut à **4:00 AM heure locale sur l'hôte de la passerelle**. Une session est périmée dès que sa dernière mise à jour est antérieure à l'heure de la réinitialisation quotidienne la plus récente.
- Réinitialisation inactive (optionnelle) : `idleMinutes` ajoute une fenêtre inactive glissante. Lorsque les réinitialisations quotidiennes et inactives sont configurées, **la première qui expire** force une nouvelle session.
- Mode inactif hérité : si vous définissez `session.idleMinutes` sans aucune configuration `session.reset`/`resetByType`, OpenClaw reste en mode inactif uniquement pour la compatibilité descendante.
- Remplacements par type (optionnels) : `resetByType` vous permet de remplacer la stratégie pour les sessions `direct`, `group` et `thread` (thread = fils de discussion Slack/Discord, sujets Telegram, fils de discussion Matrix lorsqu'ils sont fournis par le connecteur).
- Remplacements par canal (optionnels) : `resetByChannel` remplace la stratégie de réinitialisation pour un canal (s'applique à tous les types de session pour ce canal et prend la priorité sur `reset`/`resetByType`).
- Déclencheurs de réinitialisation : `/new` ou `/reset` exacts (plus tout autre élément dans `resetTriggers`) démarrent un identifiant de session frais et transmettent le reste du message. `/new <model>` accepte un alias de modèle, `provider/model`, ou un nom de fournisseur (correspondance approximative) pour définir le modèle de la nouvelle session. Si `/new` ou `/reset` sont envoyés seuls, OpenClaw exécute un bref tour de salutation « hello » pour confirmer la réinitialisation.
- Réinitialisation manuelle : supprimez les clés spécifiques du magasin ou retirez la transcription JSONL ; le message suivant les recrée.
- Les tâches cron isolées créent toujours un `sessionId` frais pour chaque exécution (pas de réutilisation au repos).

## Stratégie d'envoi (facultatif)

Bloquer la livraison pour des types de session spécifiques sans lister les identifiants individuels.

```json5
{
  session: {
    sendPolicy: {
      rules: [
        { action: "deny", match: { channel: "discord", chatType: "group" } },
        { action: "deny", match: { keyPrefix: "cron:" } },
        // Match the raw session key (including the `agent:<id>:` prefix).
        { action: "deny", match: { rawKeyPrefix: "agent:main:discord:" } },
      ],
      default: "allow",
    },
  },
}
```

Remplacement à l'exécution (propriétaire uniquement) :

- `/send on` → autoriser pour cette session
- `/send off` → refuser pour cette session
- `/send inherit` → effacer la priorité et utiliser les règles de configuration
  Envoyez-les sous forme de messages autonomes pour qu'ils soient enregistrés.

## Configuration (exemple de renommage facultatif)

```json5
// ~/.openclaw/openclaw.json
{
  session: {
    scope: "per-sender", // keep group keys separate
    dmScope: "main", // DM continuity (set per-channel-peer/per-account-channel-peer for shared inboxes)
    identityLinks: {
      alice: ["telegram:123456789", "discord:987654321012345678"],
    },
    reset: {
      // Defaults: mode=daily, atHour=4 (gateway host local time).
      // If you also set idleMinutes, whichever expires first wins.
      mode: "daily",
      atHour: 4,
      idleMinutes: 120,
    },
    resetByType: {
      thread: { mode: "daily", atHour: 4 },
      direct: { mode: "idle", idleMinutes: 240 },
      group: { mode: "idle", idleMinutes: 120 },
    },
    resetByChannel: {
      discord: { mode: "idle", idleMinutes: 10080 },
    },
    resetTriggers: ["/new", "/reset"],
    store: "~/.openclaw/agents/{agentId}/sessions/sessions.json",
    mainKey: "main",
  },
}
```

## Inspection

- `openclaw status` — affiche le chemin du magasin et les sessions récentes.
- `openclaw sessions --json` — vide chaque entrée (filtrez avec `--active <minutes>`).
- `openclaw gateway call sessions.list --params '{}'` — récupère les sessions de la passerelle en cours d'exécution (utilisez `--url`/`--token` pour l'accès à la passerelle distante).
- Envoyez `/status` comme un message autonome dans le chat pour voir si l'agent est joignable, combien du contexte de session est utilisé, les bascules actuelles de réflexion/rapide/verbeux, et quand vos identifiants Web WhatsApp ont été actualisés pour la dernière fois (aide à détecter les besoins de reconnexion).
- Envoyez `/context list` ou `/context detail` pour voir ce qu'il y a dans l'invite système et les fichiers de l'espace de travail injectés (ainsi que les plus grands contributeurs au contexte).
- Envoyez `/stop` (ou des phrases d'abandon autonomes comme `stop`, `stop action`, `stop run`, `stop openclaw`) pour abandonner l'exécution en cours, effacer les suivis mis en file d'attente pour cette session, et arrêter toute exécution de sous-agent lancée à partir de celle-ci (la réponse inclut le nombre d'arrêts).
- Envoyez `/compact` (instructions optionnelles) comme un message autonome pour résumer l'ancien contexte et libérer de l'espace dans la fenêtre. Voir [/concepts/compaction](/fr/concepts/compaction).
- Les transcriptions JSONL peuvent être ouvertes directement pour examiner les tours complets.

## Conseils

- Gardez la clé primaire dédiée au trafic 1:1 ; laissez les groupes garder leurs propres clés.
- Lors de l'automatisation du nettoyage, supprimez les clés individuelles plutôt que le magasin entier pour préserver le contexte ailleurs.

## Métadonnées d'origine de session

Chaque entrée de session enregistre sa provenance (au mieux) dans `origin` :

- `label` : libellé humain (résolu à partir du libellé de la conversation + du sujet du groupe/channel)
- `provider` : identifiant de channel normalisé (y compris les extensions)
- `from`/`to` : identifiants de routage bruts depuis l'enveloppe entrante
- `accountId` : identifiant de compte de provider (lorsqu'il est multi-compte)
- `threadId` : identifiant de fil/sujet lorsque le channel le prend en charge
  Les champs d'origine sont renseignés pour les messages directs, les channels et les groupes. Si un
  connecteur ne met à jour que le routage de livraison (par exemple, pour garder une session principale DM
  à jour), il doit tout de même fournir le contexte entrant afin que la session conserve ses
  métadonnées explicatives. Les extensions peuvent le faire en envoyant `ConversationLabel`,
  `GroupSubject`, `GroupChannel`, `GroupSpace` et `SenderName` dans le contexte
  entrant et en appelant `recordSessionMetaFromInbound` (ou en passant le même contexte
  à `updateLastRoute`).

import en from "/components/footer/en.mdx";

<en />
