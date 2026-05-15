---
summary: "Capacités d'OpenClaw sur les canaux, le routage, les médias et l'UX."
read_when:
  - You want a full list of what OpenClaw supports
title: "Fonctionnalités"
---

## Points forts

<Columns>
  <Card title="Canaux" icon="message-square" href="/fr/channels">
    Discord, iMessage, Signal, Slack, Telegram, WhatsApp, WebChat, et bien d'autres avec un Gateway unique.
  </Card>
  <Card title="Plugins" icon="plug" href="/fr/tools/plugin">
    Les plugins inclus ajoutent Matrix, Nextcloud Talk, Nextcloud, Nostr, Twitch, et bien d'autres sans installation séparée dans les versions actuelles normales.
  </Card>
  <Card title="Routage" icon="route" href="/fr/concepts/multi-agent">
    Routage multi-agent avec sessions isolées.
  </Card>
  <Card title="Médias" icon="image" href="/fr/nodes/images">
    Images, audio, vidéo, documents et génération d'images/vidéos.
  </Card>
  <Card title="Apps et interface utilisateur" icon="monitor" href="/fr/web/control-ui">
    Interface utilisateur de contrôle Web et application compagnon macOS.
  </Card>
  <Card title="Nœuds mobiles" icon="smartphone" href="/fr/nodes">
    Nœuds iOS et Android avec appairage, voix/discussion et commandes enrichies d'appareil.
  </Card>
</Columns>

## Liste complète

**Canaux :**

- Les canaux intégrés incluent Discord, Google Chat, iMessage, IRC, Signal, Slack, Telegram, WebChat et WhatsApp
- Les canaux de plugins inclus incluent Feishu, LINE, Matrix, Mattermost, Microsoft Teams, Nextcloud Talk, Nostr, QQ Bot, Synology Chat, Tlon, Twitch, Zalo et Zalo Personal
- Les plugins de canal installés séparément en option incluent Voice Call et des packages tiers tels que WeChat
- Les plugins de canal tiers peuvent étendre davantage la Gateway, comme WeChat
- Prise en charge des discussions de groupe avec activation basée sur les mentions
- Sécurité des messages privés avec listes d'autorisation et appairage

**Agent :**

- Runtime d'agent intégré avec flux d'outils
- Routage multi-agent avec sessions isolées par espace de travail ou expéditeur
- Sessions : les discussions directes sont regroupées dans un `main` partagé ; les groupes sont isolés
- Streaming et découpage (chunking) pour les longues réponses

**Auth et fournisseurs :**

- 35+ fournisseurs de modèles (Anthropic, OpenAI, Google, et plus)
- Auth par abonnement via OAuth (ex. OpenAI Codex)
- Support pour les fournisseurs personnalisés et auto-hébergés (vLLM, SGLang, Ollama, et tout point de terminaison compatible OpenAI ou Anthropic)

**Média :**

- Images, audio, vidéo et documents en entrée et sortie
- Surfaces de capacités de génération d'images et de vidéos partagées
- Transcription de notes vocales
- Synthèse vocale avec plusieurs fournisseurs

**Applications et interfaces :**

- WebChat et interface de contrôle navigateur
- Application compagnon de la barre de menus macOS
- Nœud iOS avec appairage, Canvas, caméra, enregistrement d'écran, localisation et voix
- Nœud Android avec appairage, chat, voix, Canvas, caméra et commandes de périphérique

**Outils et automatisation :**

- Automatisation de navigateur, exec, sandboxing
- Recherche web (Brave, DuckDuckGo, Exa, Firecrawl, Gemini, Grok, Kimi, Recherche MiniMax, Recherche web Ollama, Perplexity, SearXNG, Tavily)
- Tâches cron et planification de heartbeat
- Compétences, plugins et pipelines de workflow (Lobster)

## Connexes

<CardGroup cols={2}>
  <Card title="Fonctionnalités expérimentales" href="/fr/concepts/experimental-features" icon="flask">
    Fonctionnalités optionnelles qui n'ont pas encore été déployées sur l'interface par défaut.
  </Card>
  <Card title="Runtime de l'agent" href="/fr/concepts/agent" icon="robot">
    Modèle du runtime de l'agent et distribution des exécutions.
  </Card>
  <Card title="Canaux" href="/fr/channels" icon="message-square">
    Connectez Telegram, WhatsApp, Discord, Slack et plus encore depuis un seul Gateway.
  </Card>
  <Card title="Plugins" href="/fr/tools/plugin" icon="plug">
    Plugins intégrés et tiers qui étendent OpenClaw.
  </Card>
</CardGroup>
