---
summary: "BlueBubblesOpenClawiMessageiMessageLe support BlueBubbles a été supprimé d'OpenClaw. Utilisez le plugin iMessage intégré avec imsg pour les nouvelles configurations iMessage et les configurations migrées."
read_when:
  - You used the old BlueBubbles channel and need to move to iMessage
  - You are choosing the supported OpenClaw iMessage setup
  - You need a short explanation of the BlueBubbles removal
title: "BlueBubblesiMessageSuppression de BlueBubbles et le chemin imsg iMessage"
---

# BlueBubbles suppression et le chemin imsg iMessage

OpenClaw n'expédie plus le canal BlueBubbles. La prise en charge d'iMessage fonctionne désormais via le plugin intégré OpenClawBlueBubblesiMessage`imessage`, qui démarre [`imsg`](https://github.com/steipete/imsg) localement ou via un wrapper SSH et communique en JSON-RPC via stdin/stdout.

Si votre configuration contient encore `channels.bluebubbles`, migrez-la vers `channels.imessage`. L'URL de la documentation `/channels/bluebubbles` redirige vers [Coming from BlueBubbles](/fr/channels/imessage-from-bluebubbles), qui contient le tableau de traduction de configuration complet et la liste de contrôle de basculement.

## Ce qui a changé

- Il n'y a pas de serveur HTTP BlueBubbles, d'itinéraire de webhook, de mot de passe REST ou d'exécution du plugin BlueBubbles dans le chemin iMessage OpenClaw pris en charge.
- OpenClaw lit et surveille les messages via OpenClaw`imsg` sur le Mac où Messages.app est connecté.
- L'envoi, la réception, l'historique et les médias de base utilisent les interfaces normales `imsg` et les autorisations macOS.
- Les actions avancées telles que les réponses en fil de discussion, les tapbacks, l'édition, l'annulation d'envoi, les effets, les accusés de lecture, les indicateurs de frappe et la gestion de groupes nécessitent `imsg launch` avec le pont de l'API privé disponible.
- Les passerelles Linux et Windows peuvent toujours utiliser iMessage en définissant `channels.imessage.cliPath` sur un wrapper SSH qui exécute `imsg` sur le Mac connecté.

## Que faire

1. Installez et vérifiez `imsg` sur le Mac Messages :

   ```bash
   brew install steipete/tap/imsg
   imsg --version
   imsg chats --limit 3
   imsg rpc --help
   ```

2. Accordez les autorisations d'accès complet au disque et d'automatisation au contexte de processus qui exécute `imsg` et OpenClaw.

3. Traduisez l'ancienne configuration :

   ```json5
   {
     channels: {
       imessage: {
         enabled: true,
         cliPath: "/opt/homebrew/bin/imsg",
         dmPolicy: "pairing",
         allowFrom: ["+15555550123"],
         groupPolicy: "allowlist",
         groupAllowFrom: ["+15555550123"],
         groups: {
           "*": { requireMention: true },
         },
         includeAttachments: true,
       },
     },
   }
   ```

4. Redémarrez la passerelle et vérifiez :

   ```bash
   openclaw channels status --probe
   ```

5. Testez les MP, les groupes, les pièces jointes et toutes les actions de l'API privée dont vous dépendez avant de supprimer votre ancien serveur BlueBubbles.

## Notes de migration

- `channels.bluebubbles.serverUrl` et `channels.bluebubbles.password` n'ont pas d'équivalent iMessage.
- `channels.bluebubbles.allowFrom`, `groupAllowFrom`, `groups`, `includeAttachments`, les racines des pièces jointes, les limites de taille des médias, le découpage et les commutateurs d'action ont des équivalents iMessage.
- `channels.imessage.includeAttachments` est toujours désactivé par défaut. Définissez-le explicitement si vous vous attendez à ce que des photos entrantes, mémos vocaux, vidéos ou fichiers atteignent l'agent.
- Avec `groupPolicy: "allowlist"`, copiez l'ancien bloc `groups`, y compris toute entrée générique `"*"`. Les listes d'autorisation des expéditeurs de groupe et le registre des groupes sont des portes séparées.
- Les liaisons ACP correspondant à `channel: "bluebubbles"` doivent être remplacées par `channel: "imessage"`.
- Les clés de session BlueBubbles ne deviennent pas des clés de session iMessage. Les approbations d'appariement sont conservées par identifiant, mais l'historique des conversations sous les clés de session BlueBubbles ne l'est pas.

## Voir aussi

- [Venant de BlueBubbles](/fr/channels/imessage-from-bluebubbles)
- [iMessage](/fr/channels/imessage)
- [Référence de configuration - iMessage](/fr/gateway/config-channels#imessage)
