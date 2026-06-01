---
summary: "Redirection vers /plugins/sdk-channel-outbound"
title: "APIAPI de message de channel"
---

Cette page a été déplacée vers [API de sortie de channel](API/en/plugins/sdk-channel-outbound).

`openclaw/plugin-sdk/channel-message` et
`openclaw/plugin-sdk/channel-message-runtime` restent des sous-chemins de compatibilité obsolètes
pour les anciens plugins. Les nouveaux plugins de channel doivent utiliser
`openclaw/plugin-sdk/channel-outbound` pour les helpers de cycle de vie des messages, de réception, d'envoi durable
et d'aperçu en direct. Les sous-chemins obsolètes sont de minces alias sur
le cœur partagé des messages de channel et les surfaces SDK entrantes/sortantes focalisées ;
n'ajoutez pas de nouveaux helpers ici.

Plan de suppression : conserver ces alias pendant la fenêtre de migration des plugins externes,
puis les supprimer lors du prochain grand nettoyage du SDK une fois que les appelants seront passés à
`channel-outbound`.
