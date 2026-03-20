---
summary: "Capacidades de OpenClaw en canales, enrutamiento, medios y UX."
read_when:
  - Deseas ver la lista completa de lo que OpenClaw admite
title: "Funciones"
---

## Destacados

<Columns>
  <Card title="Canales" icon="message-square">
    WhatsApp, Telegram, Discord e iMessage con una única pasarela.
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
  <Card title="Aplicaciones e interfaz" icon="monitor">
    Interfaz de control web y aplicación complementaria para macOS.
  </Card>
  <Card title="Nodos móviles" icon="smartphone">
    Nodos iOS y Android con emparejamiento, voz/chat y comandos de dispositivo enriquecidos.
  </Card>
</Columns>

## Lista completa

- Integración con WhatsApp a través de WhatsApp Web (Baileys)
- Soporte de bot de Telegram (grammY)
- Soporte de bot de Discord (channels.discord.js)
- Soporte de bot de Mattermost (complemento)
- Integración con iMessage a través de la CLI local imsg (macOS)
- Puente de agente para Pi en modo RPC con streaming de herramientas
- Transmisión y fragmentación para respuestas largas
- Enrutamiento multiagente para sesiones aisladas por espacio de trabajo o remitente
- Autenticación de suscripción para Anthropic y OpenAI a través de OAuth
- Sesiones: los chats directos se colapsan en `main` compartidos; los grupos están aislados
- Soporte de chat grupal con activación basada en menciones
- Soporte de medios para imágenes, audio y documentos
- Gancho opcional de transcripción de notas de voz
- WebChat y aplicación de la barra de menús de macOS
- Nodo iOS con emparejamiento, Canvas, cámara, grabación de pantalla, ubicación y funciones de voz
- Nodo Android con emparejamiento, pestaña Conectar, sesiones de chat, pestaña de voz, Canvas/cámara, además de dispositivo, notificaciones, contactos/calendario, movimiento, fotos y comandos SMS

<Note>
Se han eliminado las rutas heredadas de Claude, Codex, Gemini y Opencode. Pi es la única
ruta del agente de codificación.
</Note>

import en from "/components/footer/en.mdx";

<en />
