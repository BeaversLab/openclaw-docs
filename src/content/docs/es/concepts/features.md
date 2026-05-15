---
summary: "Capacidades de OpenClaw a través de canales, enrutamiento, medios y UX."
read_when:
  - You want a full list of what OpenClaw supports
title: "Características"
---

## Aspectos destacados

<Columns>
  <Card title="Canales" icon="message-square" href="/es/channels">
    Discord, iMessage, Signal, Slack, Telegram, WhatsApp, WebChat y más con una única puerta de enlace.
  </Card>
  <Card title="Complementos" icon="plug" href="/es/tools/plugin">
    Los complementos incluidos añaden Matrix, Nextcloud Talk, Nostr, Twitch, Zalo y más sin instalaciones adicionales en las versiones actuales normales.
  </Card>
  <Card title="Enrutamiento" icon="route" href="/es/concepts/multi-agent">
    Enrutamiento multiagente con sesiones aisladas.
  </Card>
  <Card title="Medios" icon="image" href="/es/nodes/images">
    Imágenes, audio, vídeo, documentos y generación de imágenes/vídeo.
  </Card>
  <Card title="Aplicaciones e interfaz" icon="monitor" href="/es/web/control-ui">
    Interfaz de usuario de control web y aplicación complementaria para macOS.
  </Card>
  <Card title="Nodos móviles" icon="smartphone" href="/es/nodes">
    Nodos iOS y Android con emparejamiento, voz/chat y comandos de dispositivo enriquecidos.
  </Card>
</Columns>

## Lista completa

**Canales:**

- Los canales integrados incluyen Discord, Google Chat, iMessage, IRC, Signal, Slack, Telegram, WebChat y WhatsApp
- Los canales de complementos incluidos incluyen Feishu, LINE, Matrix, Mattermost, Microsoft Teams, Nextcloud Talk, Nostr, QQ Bot, Synology Chat, Tlon, Twitch, Zalo y Zalo Personal
- Los complementos de canal instalados opcionalmente por separado incluyen Llamada de voz y paquetes de terceros como WeChat
- Los complementos de canal de terceros pueden ampliar aún más la puerta de enlace, como WeChat
- Soporte para chat en grupo con activación basada en menciones
- Seguridad de MD con listas de permitidos y emparejamiento

**Agente:**

- Tiempo de ejecución del agente integrado con transmisión de herramientas
- Enrutamiento multiagente con sesiones aisladas por espacio de trabajo o remitente
- Sesiones: los chats directos se agrupan en una `main` compartida; los grupos están aislados
- Transmisión y fragmentación para respuestas largas

**Autenticación y proveedores:**

- Más de 35 proveedores de modelos (Anthropic, OpenAI, Google y más)
- Autenticación de suscripción vía OAuth (p. ej., OpenAI Codex)
- Soporte para proveedores personalizados y autohospedados (vLLM, SGLang, Ollama y cualquier endpoint compatible con OpenAI o Anthropic)

**Medios:**

- Imágenes, audio, video y documentos de entrada y salida
- Superficies de capacidades compartidas para generación de imágenes y videos
- Transcripción de notas de voz
- Conversión de texto a voz con múltiples proveedores

**Aplicaciones e interfaces:**

- WebChat e interfaz de control del navegador
- Aplicación complementaria de la barra de menús de macOS
- Nodo iOS con emparejamiento, Canvas, cámara, grabación de pantalla, ubicación y voz
- Nodo Android con emparejamiento, chat, voz, Canvas, cámara y comandos de dispositivo

**Herramientas y automatización:**

- Automatización del navegador, exec, sandboxing
- Búsqueda web (Brave, DuckDuckGo, Exa, Firecrawl, Gemini, Grok, Kimi, MiniMax Search, Ollama Web Search, Perplexity, SearXNG, Tavily)
- Trabajos Cron y programación de latidos
- Habilidades, complementos y canalizaciones de flujo de trabajo (Lobster)

## Relacionado

<CardGroup cols={2}>
  <Card title="Funciones experimentales" href="/es/concepts/experimental-features" icon="flask">
    Funciones opcionales que aún no se han implementado en la superficie predeterminada.
  </Card>
  <Card title="Tiempo de ejecución del agente" href="/es/concepts/agent" icon="robot">
    Modelo de tiempo de ejecución del agente y cómo se despachan las ejecuciones.
  </Card>
  <Card title="Canales" href="/es/channels" icon="message-square">
    Conecta Telegram, WhatsApp, Discord, Slack y más desde una sola puerta de enlace.
  </Card>
  <Card title="Complementos" href="/es/tools/plugin" icon="plug">
    Complementos de terceros e incluidos que amplían OpenClaw.
  </Card>
</CardGroup>
