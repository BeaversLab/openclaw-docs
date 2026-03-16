---
summary: "Intégration de l'API Bot Telegram via API avec des notes de configuration"
read_when:
  - Working on Telegram or grammY pathways
title: grammY
---

# Intégration grammY (API Bot Telegram)

# Pourquoi grammY

- Client API Bot d'abord TS avec assistants de long-poll + webhook intégrés, intergiciel (middleware), gestion des erreurs, limiteur de débit.
- Assistants multimédias plus propres que le fetch manuel + FormData ; prend en charge toutes les méthodes de l'API Bot.
- Extensible : support du proxy via fetch personnalisé, intergiciel (middleware) de session (facultatif), contexte sûr typé.

# Ce que nous avons livré

- **Chemin client unique :** implémentation basée sur fetch supprimée ; grammY est désormais le seul client Telegram (envoi + passerelle) avec le limiteur grammY activé par défaut.
- **Gateway :** `monitorTelegramProvider` construit un grammY `Bot``, connecte le filtrage par mention/liste d'autorisation, le téléchargement de médias via ``getFile`/`download`, et envoie les réponses avec `sendMessage/sendPhoto/sendVideo/sendAudio/sendDocument`. Prend en charge le long-poll ou le webhook via `webhookCallback``.
- **Proxy :** `channels.telegram.proxy` facultatif utilise `undici.ProxyAgent` via le `client.baseFetch` de grammY.
- **Support Webhook :** `webhook-set.ts` encapsule `setWebhook/deleteWebhook` ; `webhook.ts` héberge le rappel avec santé + arrêt gracieux. La Gateway active le mode webhook lorsque `channels.telegram.webhookUrl` + `channels.telegram.webhookSecret` sont définis (sinon elle utilise le long-poll).
- **Sessions :** les discussions directes s'effondrent dans la session principale de l'agent (`agent:<agentId>:<mainKey>`) ; les groupes utilisent `agent:<agentId>:telegram:group:<chatId>` ; les réponses sont renvoyées vers le même canal.
- **Options de configuration :** `channels.telegram.botToken`, `channels.telegram.dmPolicy`, `channels.telegram.groups` (valeurs par défaut de la liste d'autorisation + mention), `channels.telegram.allowFrom`, `channels.telegram.groupAllowFrom`, `channels.telegram.groupPolicy`, `channels.telegram.mediaMaxMb`, `channels.telegram.linkPreview`, `channels.telegram.proxy`, `channels.telegram.webhookSecret`, `channels.telegram.webhookUrl`.
- **Diffusion de brouillon :** `channels.telegram.streamMode` facultatif utilise `sendMessageDraft` dans les discussions de sujets privés (Bot API 9.3+). Ceci est distinct de la diffusion de bloc de channel.
- **Tests :** les simulations grammy couvrent le filtrage des mentions DM + groupe et l'envoi sortant ; d'autres appareils média/webhook sont toujours les bienvenus.

Questions ouvertes

- Plugins grammY facultatifs (throttler) si nous rencontrons des 429 du Bot API.
- Ajouter plus de tests de médias structurés (autocollants, notes vocales).
- Rendre le port d'écoute du webhook configurable (actuellement fixé à 8787 sauf s'il est connecté via la passerelle).

import fr from "/components/footer/fr.mdx";

<fr />
