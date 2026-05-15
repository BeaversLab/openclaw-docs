---
summary: "APIAPI expérimentale d'entrée de channel pour l'autorisation des messages entrants"
read_when:
  - Building or migrating a messaging channel plugin
  - Changing DM or group allowlists, route gates, command auth, event auth, or mention activation
  - Reviewing channel ingress redaction or SDK compatibility boundaries
title: "APIAPI d'entrée de channel"
sidebarTitle: "Entrée de channel"
---

# API d'entrée de channel

L'entrée de channel est la limite de contrôle d'accès expérimentale pour les événements de channel entrants. Utilisez `openclaw/plugin-sdk/channel-ingress-runtime` pour les chemins de réception.
L'ancien sous-chemin `openclaw/plugin-sdk/channel-ingress` reste exporté en tant que façade de compatibilité obsolète pour les plugins tiers.

Les plugins possèdent les faits de plateforme et les effets secondaires. Le cœur possède la politique générique : listes d'autorisation DM/groupe, entrées DM du magasin d'appairage, portes de routage, portes de commande, authentification d'événement, activation de mention, diagnostics rédigés et admission.

## Résolveur d'exécution

```ts
import { defineStableChannelIngressIdentity, resolveChannelMessageIngress } from "openclaw/plugin-sdk/channel-ingress-runtime";

const identity = defineStableChannelIngressIdentity({
  key: "platform-user-id",
  normalize: normalizePlatformUserId,
  sensitivity: "pii",
});

const result = await resolveChannelMessageIngress({
  channelId: "my-channel",
  accountId,
  identity,
  subject: { stableId: platformUserId },
  conversation: { kind: isGroup ? "group" : "direct", id: conversationId },
  event: { kind: "message", authMode: "inbound", mayPair: !isGroup },
  policy: {
    dmPolicy: config.dmPolicy,
    groupPolicy: config.groupPolicy,
    groupAllowFromFallbackToAllowFrom: true,
  },
  allowFrom: config.allowFrom,
  groupAllowFrom: config.groupAllowFrom,
  accessGroups: cfg.accessGroups,
  route,
  readStoreAllowFrom,
  command: hasControlCommand ? { allowTextCommands: true, hasControlCommand } : undefined,
});
```

Ne précalculez pas les listes d'autorisation effectives, les propriétaires de commandes ou les groupes de commandes. Le résolveur les dérive des listes d'autorisation brutes, des rappels de magasin, des descripteurs de routage, des groupes d'accès, de la politique et du type de conversation.

## Résultat

Les plugins groupés doivent consommer directement les projections modernes :

- `ingress` : décision de porte ordonnée et admission
- `senderAccess` : autorisation de l'expéditeur/de la conversation uniquement
- `routeAccess` : projection de route et d'expéditeur de route
- `commandAccess` : autorisation de commande ; faux si aucune porte de commande n'a été exécutée
- `activationAccess` : résultat de mention/activation

L'autorisation d'événement reste disponible sur l' `ingress.graph` ordonné et le `ingress.reasonCode` décisif ; aucune projection d'événement distincte n'est émise.

Les assistants SDK tiers obsolètes peuvent reconstruire en interne des anciennes formes. Les nouveaux chemins de réception groupés ne doivent pas traduire les résultats modernes en DTO locaux.

## Groupes d'accès

Les entrées `accessGroup:<name>` restent rédigées. Le cœur résout les groupes `message.senders` statiques lui-même et n'appelle `resolveAccessGroupMembership` que pour les groupes dynamiques nécessitant une recherche de plateforme. Les groupes manquants, non pris en charge et ayant échoué échouent en mode fermé.

## Modes d'événement

| `authMode`       | Signification                                                                          |
| ---------------- | -------------------------------------------------------------------------------------- |
| `inbound`        | portes d'expéditeur entrantes normales                                                 |
| `command`        | portes de commande pour les rappels ou les boutons délimités                           |
| `origin-subject` | l'acteur doit correspondre au sujet du message original                                |
| `route-only`     | portes de routage uniquement pour les événements approuvés délimités par l'itinéraire  |
| `none`           | les événements internes possédés par le plugin contournent l'authentification partagée |

Utilisez `mayPair: false` pour les réactions, les boutons, les rappels et les commandes natives.

## Itinéraires et activation

Utilisez des descripteurs d'itinéraire pour la stratégie de salle, de sujet, de guilde, de fil ou d'itinéraire imbriqué :

```ts
route: {
  id: "room",
  allowed: roomAllowed,
  enabled: roomEnabled,
  senderPolicy: "replace",
  senderAllowFrom: roomAllowFrom,
  blockReason: "room_sender_not_allowlisted",
}
```

Utilisez `channelIngressRoutes(...)` lorsqu'un plugin possède plusieurs descripteurs d'itinéraire optionnels ; il filtre les branches désactivées tout en gardant les faits d'itinéraire génériques et ordonnés par le `precedence` de chaque descripteur.

Le filtrage par mention est une porte d'activation. Une absence de mention renvoie `admission: "skip"` afin que le noyau de tour ne traite pas un tour d'observation uniquement. La plupart des canaux devraient laisser l'activation après les portes d'expéditeur et de commande. Les surfaces de conversation publique qui doivent réduire le trafic sans mention avant le bruit de la liste d'autorisation des expéditeurs peuvent opter pour `activation.order: "before-sender"` lorsque le contournement des commandes textuelles est désactivé. Les canaux avec activation implicite, tels que les réponses dans les fils de discussion de bots, peuvent transmettre `activation.allowedImplicitMentionKinds` ; le `activationAccess.shouldBypassMention` projeté signale ensuite lorsque la commande ou l'activation implicite a contourné une mention explicite.

## Rectification

Les valeurs brutes de l'expéditeur et les entrées brutes de la liste d'autorisation sont une entrée du résolveur uniquement. Elles ne doivent pas apparaître dans l'état résolu, les décisions, les diagnostics, les instantanés ou les faits de compatibilité. Utilisez des identifiants de sujet opaques, des identifiants d'entrée, des identifiants d'itinéraire et des identifiants de diagnostic.

## Vérification

```bash
pnpm test src/channels/message-access/message-access.test.ts src/plugin-sdk/channel-ingress-runtime.test.ts
pnpm plugin-sdk:api:check
```
