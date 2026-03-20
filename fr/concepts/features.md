---
summary: "Capacités d'OpenClaw pour les canaux, le routage, les médias et l'UX."
read_when:
  - Vous souhaitez une liste complète de ce que OpenClaw prend en charge
title: "Features"
---

## Points forts

<Columns>
  <Card title="Channels" icon="message-square">
    WhatsApp, Telegram, Discord et iMessage avec un seul Gateway.
  </Card>
  <Card title="Plugins" icon="plug">
    Ajoutez Mattermost et plus encore grâce aux extensions.
  </Card>
  <Card title="Routing" icon="route">
    Routage multi-agent avec sessions isolées.
  </Card>
  <Card title="Media" icon="image">
    Images, audio et documents en entrée et en sortie.
  </Card>
  <Card title="Apps and UI" icon="monitor">
    Interface utilisateur de contrôle Web et application compagnon macOS.
  </Card>
  <Card title="Mobile nodes" icon="smartphone">
    Nœuds iOS et Android avec appairage, voix/discussion et commandes riches de périphérique.
  </Card>
</Columns>

## Liste complète

- Intégration WhatsApp via WhatsApp Web (Baileys)
- Support de bot Telegram (grammY)
- Support de bot Discord (channels.discord.js)
- Support de bot Mattermost (plugin)
- Intégration iMessage via l'interface CLI imsg locale (macOS)
- Pont agent pour Pi en mode RPC avec diffusion d'outils
- Diffusion et découpage pour les longues réponses
- Routage multi-agent pour des sessions isolées par espace de travail ou expéditeur
- Authentification par abonnement pour Anthropic et OpenAI via OAuth
- Sessions : les discussions directes s'effondrent dans un `main` partagé ; les groupes sont isolés
- Support des discussions de groupe avec activation basée sur les mentions
- Support multimédia pour les images, l'audio et les documents
- Crochet optionnel de transcription des notes vocales
- WebChat et application de barre de menus macOS
- Nœud iOS avec appairage, Canvas, caméra, enregistrement d'écran, localisation et fonctionnalités vocales
- Nœud Android avec jumelage, onglet Connect, sessions de chat, onglet voix, Canvas/caméra, plus appareil, notifications, contacts/calendrier, mouvement, photos et commandes SMS

<Note>
  Les chemins Legacy Claude, Codex, Gemini et Opencode ont été supprimés. Pi est le seul chemin
  d'agent de codage.
</Note>

import fr from "/components/footer/fr.mdx";

<fr />
