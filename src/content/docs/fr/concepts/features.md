---
summary: "Capacités d'OpenClaw sur les canaux, le routage, les médias et l'UX."
read_when:
  - You want a full list of what OpenClaw supports
title: "Fonctionnalités"
---

# Fonctionnalités

## Points forts

<Columns>
  <Card title="Channels" icon="message-square">
    WhatsApp, Telegram, Discord et iMessage avec un seul Gateway.
  </Card>
  <Card title="Plugins" icon="plug">
    Ajoutez Mattermost et plus encore avec des extensions.
  </Card>
  <Card title="Routing" icon="route">
    Routage multi-agent avec sessions isolées.
  </Card>
  <Card title="Media" icon="image">
    Images, audio et documents en entrée et en sortie.
  </Card>
  <Card title="Apps and UI" icon="monitor">
    Interface de contrôle Web et application compagnon macOS.
  </Card>
  <Card title="Mobile nodes" icon="smartphone">
    Nœuds iOS et Android avec couplage, voix/chat et commandes riches d'appareil.
  </Card>
</Columns>

## Liste complète

**Canaux :**

- WhatsApp, Telegram, Discord, iMessage (intégré)
- Mattermost, Matrix, Microsoft Teams, Nostr et plus (plugins)
- Prise en charge des discussions de groupe avec activation par mention
- Sécurité des DM avec listes d'autorisation et couplage

**Agent :**

- Runtime d'agent intégré avec streaming d'outils
- Routage multi-agent avec sessions isolées par espace de travail ou expéditeur
- Sessions : les chats directs sont fusionnés dans un `main` partagé ; les groupes sont isolés
- Streaming et découpage pour les longues réponses

**Authentification et fournisseurs :**

- 35+ fournisseurs de modèles (Anthropic, OpenAI, Google, et plus)
- Authentification par abonnement via OAuth (ex. OpenAI Codex)
- Prise en charge des fournisseurs personnalisés et auto-hébergés (vLLM, SGLang, Ollama, et tout point de terminaison compatible OpenAI ou Anthropic)

**Médias :**

- Images, audio, vidéo et documents en entrée et en sortie
- Transcription des notes vocales
- Synthèse vocale avec plusieurs fournisseurs

**Applications et interfaces :**

- WebChat et interface de contrôle par navigateur
- Application compagnon de barre de menu macOS
- Nœud iOS avec couplage, Canvas, caméra, enregistrement d'écran, localisation et voix
- Nœud Android avec couplage, chat, voix, Canvas, caméra et commandes d'appareil

**Outils et automatisation :**

- Automatisation du navigateur, exec, sandboxing
- Recherche Web (Brave, Perplexity, Gemini, Grok, Kimi, Firecrawl)
- Tâches Cron et planification de pulsation (heartbeat)
- Compétences, plugins et pipelines de workflow (Lobster)
