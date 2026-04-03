---
summary: "Capacidades de OpenClaw a través de canales, enrutamiento, medios y UX."
read_when:
  - You want a full list of what OpenClaw supports
title: "Características"
---

# Características

## Destacados

<Columns>
  <Card title="Canales" icon="message-square">
    WhatsApp, Telegram, Discord e iMessage con una sola puerta de enlace.
  </Card>
  <Card title="Complementos" icon="plug">
    Añade Mattermost y más con extensiones.
  </Card>
  <Card title="Enrutamiento" icon="route">
    Enrutamiento multiagente con sesiones aisladas.
  </Card>
  <Card title="Medios" icon="image">
    Imágenes, audio y documentos de entrada y salida.
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

- WhatsApp, Telegram, Discord, iMessage (integrado)
- Mattermost, Matrix, Microsoft Teams, Nostr y más (plugins)
- Soporte de chat grupal con activación basada en menciones
- Seguridad de MD con listas de permitidos y emparejamiento

**Agente:**

- Tiempo de ejecución del agente integrado con transmisión de herramientas
- Enrutamiento multiagente con sesiones aisladas por espacio de trabajo o remitente
- Sesiones: los chats directos se contraen en `main` compartidos; los grupos están aislados
- Transmisión y fragmentación para respuestas largas

**Autenticación y proveedores:**

- Más de 35 proveedores de modelos (Anthropic, OpenAI, Google y más)
- Autenticación de suscripción vía OAuth (ej. OpenAI Codex)
- Soporte para proveedores personalizados y autohospedados (vLLM, SGLang, Ollama y cualquier punto de conexión compatible con OpenAI o Anthropic)

**Medios:**

- Imágenes, audio, vídeo y documentos de entrada y salida
- Transcripción de notas de voz
- Conversión de texto a voz con múltiples proveedores

**Aplicaciones e interfaces:**

- WebChat e interfaz de Control del navegador
- Aplicación complementaria de la barra de menús de macOS
- Nodo iOS con emparejamiento, Canvas, cámara, grabación de pantalla, ubicación y voz
- Nodo Android con emparejamiento, chat, voz, Canvas, cámara y comandos de dispositivo

**Herramientas y automatización:**

- Automatización del navegador, exec, sandboxing
- Búsqueda web (Brave, Perplexity, Gemini, Grok, Kimi, Firecrawl)
- Trabajos de Cron y programación de latidos
- Habilidades, plugins y tuberías de flujo de trabajo (Lobster)
