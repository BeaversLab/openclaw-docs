---
summary: "Capacités d'OpenClaw sur les canaux, le routage, les médias et l'UX."
read_when:
  - You want a full list of what OpenClaw supports
title: "Fonctionnalités"
---

# Fonctionnalités

## Points forts

<Columns>
  <Card title="Channels" icon="message-square" href="/fr/channels">
    Discord, iMessage, Signal, Slack, Telegram, WhatsApp, WebChat et plus encore avec un seul Gateway.
  </Card>
  <Card title="Plugins" icon="plug" href="/fr/tools/plugin">
    Les plugins inclus ajoutent Matrix, Nextcloud Talk, Nostr, Twitch, Zalo et plus encore sans installation séparée dans les versions actuelles normales.
  </Card>
  <Card title="Routing" icon="route" href="/fr/concepts/multi-agent">
    Routage multi-agent avec sessions isolées.
  </Card>
  <Card title="Media" icon="image" href="/fr/nodes/images">
    Images, audio, vidéo, documents et génération d'images/vidéo.
  </Card>
  <Card title="Apps and UI" icon="monitor" href="/fr/web/control-ui">
    Interface utilisateur de contrôle Web et application compagnon macOS.
  </Card>
  <Card title="Mobile nodes" icon="smartphone" href="/fr/nodes">
    Nœuds iOS et Android avec appairage, voix/chat et commandes riches de périphérique.
  </Card>
</Columns>

## Liste complète

**Canaux :**

- Les chaînes intégrées incluent Discord, Google Chat, iMessage (hérité), IRC, Signal, Slack, Telegram, WebChat et WhatsApp
- Les chaînes de plugins inclus comprennent BlueBubbles pour iMessage, Feishu, LINE, Matrix, Mattermost, Microsoft Teams, Nextcloud Talk, Nostr, QQ Bot, Synology Chat, Tlon, Twitch, Zalo et Zalo Personal
- Les plugins de canal installés séparément en option incluent les appels vocaux et des packages tiers tels que WeChat
- Les plugins de canal tiers peuvent étendre davantage le Gateway, tels que WeChat
- Prise en charge des conversations de groupe avec activation basée sur les mentions
- Sécurité des MD avec des listes d'autorisation et l'appariement

**Agent :**

- Runtime d'agent intégré avec streaming d'outils
- Routage multi-agent avec sessions isolées par espace de travail ou expéditeur
- Sessions : les chats directs sont regroupés dans un `main` partagé ; les groupes sont isolés
- Streaming et fractionnement pour les longues réponses

**Auth et fournisseurs :**

- 35+ fournisseurs de modèles (Anthropic, OpenAI, Google, et plus)
- Auth d'abonnement via OAuth (ex: OpenAI Codex)
- Prise en charge de fournisseurs personnalisés et auto-hébergés (vLLM, SGLang, Ollama, et tout point de terminaison compatible OpenAI ou Anthropic)

**Médias :**

- Images, audio, vidéo et documents en entrée et sortie
- Surfaces de capacité de génération d'images et de vidéos partagées
- Transcription de notes vocales
- Synthèse vocale avec plusieurs fournisseurs

**Applications et interfaces :**

- WebChat et interface de contrôle de navigateur
- Application compagnon de barre de menu macOS
- Nœud iOS avec appariement, Canvas, caméra, enregistrement d'écran, localisation et voix
- Nœud Android avec appairage, chat, voix, Canvas, caméra et commandes d'appareil

**Outils et automatisation :**

- Automatisation du navigateur, exec, sandboxing
- Recherche Web (Brave, DuckDuckGo, Exa, Firecrawl, Gemini, Grok, Kimi, MiniMax Search, Ollama Web Search, Perplexity, SearXNG, Tavily)
- Tâches Cron et planification des pulsations (heartbeat)
- Skills, plugins et pipelines de workflow (Lobster)
