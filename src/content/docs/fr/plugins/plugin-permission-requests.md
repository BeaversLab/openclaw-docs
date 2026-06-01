---
summary: "Demander aux utilisateurs d'approuver les appels de tool de plugin et les invites de permission appartenant au plugin"
title: "Demandes de permission de plugin"
sidebarTitle: "Demandes de permission"
read_when:
  - You need a plugin hook or tool to ask before a side effect runs
  - You need to configure where plugin approval prompts are delivered
  - You are deciding between optional tools, exec approvals, and plugin approvals
---

Les demandes de permission de plugin permettent au code du plugin de mettre en pause un appel de tool ou une opération appartenant au plugin jusqu'à ce qu'un utilisateur l'approuve ou la refuse. Elles utilisent le flux Gateway `plugin.approval.*` et les mêmes surfaces d'interface utilisateur d'approbation qui gèrent les boutons d'approbation de chat et les commandes `/approve`.

Utilisez les demandes de permission de plugin pour les permissions de plugin/application. Elles ne remplacent pas les approbations d'exécution de l'hôte, les listes d'autorisation de tools optionnels, ni la révision native des permissions de Codex.

## Choisir la bonne porte (gate)

Choisissez la porte qui correspond au point de décision dont vous avez besoin :

| Porte (Gate)                              | À l'utiliser quand                                                                                       | Ce qu'elle contrôle                                                                                                                           |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Tools optionnels                          | Un tool ne doit pas être visible pour le model tant que l'utilisateur n'a pas accepté (opt in).          | Exposition du tool via `tools.allow`.                                                                                                         |
| Demandes de permission de plugin          | Un hook de plugin ou une opération appartenant au plugin doit demander avant qu'une action ne s'exécute. | Approbation à l'exécution via `plugin.approval.*`.                                                                                            |
| Approbations d'exécution (Exec approvals) | Une commande hôte ou un tool de type shell a besoin de l'approbation de l'opérateur.                     | Stratégie d'exécution de l'hôte et listes d'autorisation d'exécution durables.                                                                |
| Demandes de permission natives Codex      | Codex demande avant les actions natives shell, fichier, MCP ou app-server.                               | Gestion de l'approbation native du app-server ou des hooks Codex, acheminée via les approbations de plugin lorsque OpenClaw possède l'invite. |
| Solicitations d'approbation MCP           | Un serveur Codex MCP demande l'approbation pour un appel de tool.                                        | Réponses d'approbation MCP relayées via les approbations de plugin OpenClaw.                                                                  |

Les tools optionnels sont une porte au moment de la découverte. Les demandes de permission de plugin sont une porte par appel. Utilisez les deux lorsqu'un tool sensible devrait nécessiter une acceptation explicite avant que le model puisse le voir et une approbation avant l'exécution de l'action.

## Demander l'approbation avant un appel de tool

La plupart des invites créées par des plugins devraient commencer dans un hook `before_tool_call`. Le hook s'exécute après que le model a sélectionné un tool et avant que OpenClaw ne l'exécute :

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";

export default definePluginEntry({
  id: "deploy-policy",
  name: "Deploy Policy",
  register(api) {
    api.on("before_tool_call", async (event) => {
      if (event.toolName !== "deploy_service") {
        return;
      }

      const environment = typeof event.params.environment === "string" ? event.params.environment : "unknown";

      return {
        requireApproval: {
          title: "Deploy service",
          description: `Deploy service to ${environment}.`,
          severity: environment === "production" ? "critical" : "warning",
          allowedDecisions: environment === "production" ? ["allow-once", "deny"] : ["allow-once", "allow-always", "deny"],
          timeoutMs: 120_000,
          timeoutBehavior: "deny",
          onResolution(decision) {
            console.log(`deploy approval resolved: ${decision}`);
          },
        },
      };
    });
  },
});
```

Rédigez le texte de l'invite pour la personne qui approuvera l'action :

- Gardez `title` court et axé sur l'action. Le Gateway accepte jusqu'à 80 caractères.
- Gardez `description` spécifique et délimité. Le Gateway accepte jusqu'à 256 caractères.
- Incluez l'action, la cible et le risque. N'incluez pas de secrets, de jetons ou de charges utiles privées qui ne devraient pas apparaître dans les surfaces d'approbation de chat.
- Utilisez `severity: "critical"` uniquement pour les actions où une mauvaise décision pourrait causer des dommages en production ou une perte de données.
- Utilisez `allowedDecisions: ["allow-once", "deny"]` lorsque la confiance persistante n'est pas sûre pour cette action.

## Comportement de décision

OpenClaw crée une approbation en attente avec un ID `plugin:`, la livre aux surfaces d'approbation disponibles et attend une décision.

| Décision                       | Résultat                                                                           |
| ------------------------------ | ---------------------------------------------------------------------------------- |
| `allow-once`                   | L'appel actuel se poursuit.                                                        |
| `allow-always`                 | L'appel actuel se poursuit et la décision est transmise au plugin.                 |
| `deny`                         | L'appel est bloqué avec un résultat de tool refusé.                                |
| Expiration du délai            | L'appel est bloqué sauf si `timeoutBehavior` est `"allow"`.                        |
| Annulation                     | L'appel est bloqué lorsque l'exécution est abandonnée.                             |
| Aucun itinéraire d'approbation | L'appel est bloqué car aucune surface d'approbation connectée ne peut le résoudre. |

`allow-always` n'est durable que lorsque le plugin ou le runtime demandeur implémente cette persistance. Pour les hooks `before_tool_call.requireApproval` ordinaires, OpenClaw traite `allow-once` et `allow-always` comme des décisions d'approbation pour l'appel actuel et transmet la valeur résolue à `onResolution`. Si votre plugin offre `allow-always`, documentez et implémentez exactement quels futurs appels il fait confiance.

Si le hook renvoie également `params`, OpenClaw applique ces modifications de paramètres uniquement après la réussite de l'approbation. Un hook de priorité inférieure peut toujours bloquer après qu'un hook de priorité supérieure a demandé une approbation.

`allowedDecisions` limite les boutons et les commandes affichés à l'utilisateur. Le Gateway rejette toute tentative de résolution pour une décision que la demande n'a pas offerte.

## Acheminer les invites d'approbation

Les invites d'approbation peuvent être résolues dans les interfaces utilisateur locales ou dans les channels de chat qui prennent en charge la gestion des approbations. Pour transférer les invites d'approbation de plugin vers des cibles de chat explicites, configurez `approvals.plugin` :

```json5
{
  approvals: {
    plugin: {
      enabled: true,
      mode: "targets",
      agentFilter: ["main"],
      targets: [{ channel: "slack", to: "U12345678" }],
    },
  },
}
```

`approvals.plugin` est indépendant de `approvals.exec`. L'activation du transfert des approbations exec n'achemine pas les invites d'approbation de plugin, et l'activation du transfert des approbations de plugin ne modifie pas la stratégie exec de l'hôte.

Lorsqu'une invite inclut du texte d'approbation manuelle, résolvez-la avec l'une des décisions proposées :

```text
/approve <id> allow-once
/approve <id> allow-always
/approve <id> deny
```

Consultez [Advanced exec approvals](/fr/tools/exec-approvals-advanced#plugin-approval-forwarding)
pour le modèle de transfert complet, le comportement d'approbation same-chat, la livraison native dans le channel et les règles d'approbation spécifiques au channel.

## Autorisations natives Codex

Les invites d'autorisation natives de Codex peuvent également passer par les approbations de plugin, mais elles ont une propriété différente de celle des hooks créés par le plugin.

- Les demandes d'approbation du serveur d'application Codex transitent par OpenClaw après révision par Codex.
- Le relais du hook natif `permission_request` peut demander via
  `plugin.approval.request` lorsque ce relais est activé.
- Les sollicitations d'approbation de tool MCP transitent par les approbations de plugin lorsque Codex marque
  `_meta.codex_approval_kind` comme `"mcp_tool_call"`.

Consultez [Codex harness runtime](/fr/plugins/codex-harness-runtime#native-permissions-and-mcp-elicitations)
pour le comportement spécifique à Codex et les règles de secours.

## Dépannage

**L'outil indique que les approbations de plugin ne sont pas disponibles.** Aucune interface utilisateur d'approbation ni aucune route d'approbation configurée n'a accepté la demande. Connectez un client capable d'approuver, utilisez un channel qui prend en charge `/approve` same-chat, ou configurez `approvals.plugin`.

**`allow-always` apparaît mais l'appel suivant invite à nouveau.** Le flux d'approbation de plugin générique ne conserve pas automatiquement la confiance pour les hooks arbitraires. Conservez la confiance détenue par le plugin dans votre plugin après `onResolution("allow-always")`, ou n'offrez que `allow-once` et `deny`.

**`/approve` rejette la décision.** La requête a restreint
`allowedDecisions`. Utilisez l'une des décisions affichées dans l'invite.

**Une invite Slack, Discord, Telegram ou Matrix est acheminée différemment des approbations d'exécution.** Les approbations de plugin et les approbations d'exécution utilisent une configuration distincte et peuvent utiliser des vérifications d'autorisation différentes. Vérifiez `approvals.plugin` et la prise en charge des approbations de plugin du canal au lieu de vérifier uniquement `approvals.exec`.

## Connexes

- [Crochets de plugin](/fr/plugins/hooks#tool-call-policy)
- [Création de plugins](/fr/plugins/building-plugins#registering-agent-tools)
- [Approbations d'exécution avancées](/fr/tools/exec-approvals-advanced#plugin-approval-forwarding)
- [Protocole Gateway](/fr/gateway/protocol)
- [Runtime du harnais Codex](/fr/plugins/codex-harness-runtime#native-permissions-and-mcp-elicitations)
