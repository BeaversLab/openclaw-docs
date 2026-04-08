---
summary: "Capacidades de OpenClaw a través de canales, enrutamiento, medios y UX."
read_when:
  - You want a full list of what OpenClaw supports
title: "Características"
---

# Características

## Destacados

<Columns>
  <Card title="Channels" icon="message-square">
    Discord, iMessage, Signal, Slack, Telegram, WhatsApp, WebChat y más con una única Gateway.
  </Card>
  <Card title="Plugins" icon="plug">
    Los plugins incluidos añaden Matrix, Nextcloud Talk, Nostr, Twitch, Zalo y más sin instalaciones separadas en las versiones actuales normales.
  </Card>
  <Card title="Enrutamiento" icon="route">
    Enrutamiento multiagente con sesiones aisladas.
  </Card>
  <Card title="Media" icon="image">
    Imágenes, audio, video, documentos y generación de imágenes/video.
  </Card>
  <Card title="Aplicaciones e IU" icon="monitor">
    Interfaz de usuario de control web y aplicación complementaria para macOS.
  </Card>
  <Card title="Nodos móviles" icon="smartphone">
    Nodos iOS y Android con emparejamiento, voz/chat y comandos de dispositivo enriquecidos.
  </Card>
</Columns>

## Lista completa

**Canales:**

- Los canales integrados incluyen Discord, Google Chat, iMessage (heredado), IRC, Signal, Slack, Telegram, WebChat y WhatsApp
- Los canales de plugins incluidos incluyen BlueBubbles para iMessage, Feishu, LINE, Matrix, Mattermost, Microsoft Teams, Nextcloud Talk, Nostr, QQ Bot, Synology Chat, Tlon, Twitch, Zalo y Zalo Personal
- Los plugins de canales instalados opcionalmente por separado incluyen Llamada de voz y paquetes de terceros como WeChat
- Los plugins de canales de terceros pueden ampliar la Gateway aún más, como WeChat
- Soporte de chat grupal con activación basada en menciones
- Seguridad en MD con listas de permitidos y emparejamiento

**Agente:**

- Runtime de agente integrado con transmisión de herramientas
- Enrutamiento multi-agente con sesiones aisladas por espacio de trabajo o remitente
- Sesiones: los chats directos colapsan en una `main` compartida; los grupos están aislados
- Transmisión y fragmentación para respuestas largas

**Autenticación y proveedores:**

- Más de 35 proveedores de modelos (Anthropic, OpenAI, Google y más)
- Autenticación de suscripción vía OAuth (ej. OpenAI Codex)
- Soporte para proveedores personalizados y autoalojados (vLLM, SGLang, Ollama y cualquier punto final compatible con OpenAI o Anthropic)

**Medios:**

- Entrada y salida de imágenes, audio, video y documentos
- Capacidades compartidas de generación de imágenes y video
- Transcripción de notas de voz
- Conversión de texto a voz con múltiples proveedores

**Aplicaciones e interfaces:**

- WebChat e interfaz de Control del navegador
- Aplicación complementaria de la barra de menús de macOS
- Nodo iOS con emparejamiento, Canvas, cámara, grabación de pantalla, ubicación y voz
- Nodo Android con emparejamiento, chat, voz, Canvas, cámara y comandos de dispositivo

**Herramientas y automatización:**

- Automatización del navegador, exec, sandboxing
- Búsqueda web (Brave, DuckDuckGo, Exa, Firecrawl, Gemini, Grok, Kimi, MiniMax Search, Ollama Web Search, Perplexity, SearXNG, Tavily)
- Trabajos Cron y programación de latidos (heartbeat)
- Habilidades, complementos y canalizaciones de flujo de trabajo (Lobster)
