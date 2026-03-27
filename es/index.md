---
summary: "OpenClaw es una puerta de enlace multicanal para agentes de IA que se ejecuta en cualquier sistema operativo."
read_when:
  - Introducing OpenClaw to newcomers
title: "OpenClaw"
---

# OpenClaw 🦞

<p align="center">
  <img src="/assets/openclaw-logo-text-dark.png" alt="OpenClaw" width="500" class="dark:hidden" />
  <img src="/assets/openclaw-logo-text.png" alt="OpenClaw" width="500" class="hidden dark:block" />
</p>

> _"¡EXFOLIAR! ¡EXFOLIAR!"_ — Una langosta espacial, probablemente

<p align="center">
  <strong>
    Una puerta de enlace de cualquier sistema operativo para agentes de IA a través de WhatsApp,
    Telegram, Discord, iMessage y más.
  </strong>
  <br />
  Envía un mensaje, obtén una respuesta de un agente desde tu bolsillo. Los complementos añaden
  Mattermost y más.
</p>

<Columns>
  <Card title="Empezar" href="/es/start/getting-started" icon="rocket">
    Instala OpenClaw y pon en marcha la puerta de enlace en minutos.
  </Card>
  <Card title="Ejecutar incorporación" href="/es/start/wizard" icon="sparkles">
    Configuración guiada con `openclaw onboard` y flujos de vinculación.
  </Card>
  <Card title="Abrir la interfaz de control" href="/es/web/control-ui" icon="layout-dashboard">
    Inicia el tablero del navegador para chatear, configurar y gestionar sesiones.
  </Card>
</Columns>

## ¿Qué es OpenClaw?

OpenClaw es una **puerta de enlace autoalojada** que conecta tus aplicaciones de chat favoritas — WhatsApp, Telegram, Discord, iMessage y más — con agentes de IA de programación como Pi. Ejecutas un único proceso de Gateway en tu propia máquina (o en un servidor) y se convierte en el puente entre tus aplicaciones de mensajería y un asistente de IA siempre disponible.

**¿Para quién es?** Para desarrolladores y usuarios avanzados que desean un asistente de IA personal al que puedan enviar mensajes desde cualquier lugar, sin renunciar al control de sus datos ni depender de un servicio alojado.

**¿Qué lo hace diferente?**

- **Autoalojado**: se ejecuta en tu hardware, tus reglas
- **Multicanal**: una única Gateway atiende WhatsApp, Telegram, Discord y más simultáneamente
- **Nativo para agentes**: diseñado para agentes de programación con uso de herramientas, sesiones, memoria y enrutamiento multi-agente
- **Código abierto**: con licencia MIT, impulsado por la comunidad

**¿Qué necesitas?** Node 24 (recomendado), o Node 22 LTS (`22.14+`) para compatibilidad, una clave de API de tu proveedor elegido y 5 minutos. Para obtener la mejor calidad y seguridad, utiliza el modelo más potente de última generación disponible.

## Cómo funciona

```mermaid
flowchart LR
  A["Chat apps + plugins"] --> B["Gateway"]
  B --> C["Pi agent"]
  B --> D["CLI"]
  B --> E["Web Control UI"]
  B --> F["macOS app"]
  B --> G["iOS and Android nodes"]
```

El Gateway es la única fuente de verdad para las sesiones, el enrutamiento y las conexiones de canal.

## Funciones clave

<Columns>
  <Card title="Pasarela multicanal" icon="network">
    WhatsApp, Telegram, Discord e iMessage con un único proceso Gateway.
  </Card>
  <Card title="Canales complementarios" icon="plug">
    Añade Mattermost y más con paquetes de extensión.
  </Card>
  <Card title="Enrutamiento multi-agente" icon="route">
    Sesiones aisladas por agente, espacio de trabajo o remitente.
  </Card>
  <Card title="Soporte multimedia" icon="image">
    Envía y recibe imágenes, audio y documentos.
  </Card>
  <Card title="Interfaz de control web" icon="monitor">
    Panel de navegador para chat, configuración, sesiones y nodos.
  </Card>
  <Card title="Nodos móviles" icon="smartphone">
    Empareja nodos iOS y Android para flujos de trabajo con Canvas, cámara y activados por voz.
  </Card>
</Columns>

## Inicio rápido

<Steps>
  <Step title="Install OpenClaw">
    ```bash
    npm install -g openclaw@latest
    ```
  </Step>
  <Step title="Onboard and install the service">
    ```bash
    openclaw onboard --install-daemon
    ```
  </Step>
  <Step title="Chat">
    Abre la interfaz de usuario de control en tu navegador y envía un mensaje:

    ```bash
    openclaw dashboard
    ```

    O conecta un canal ([Telegram](/es/channels/telegram) es el más rápido) y chatea desde tu teléfono.

  </Step>
</Steps>

¿Necesitas la instalación completa y la configuración de desarrollo? Consulta [Cómo empezar](/es/start/getting-started).

## Panel de control

Abre la interfaz de usuario de control del navegador después de que se inicie el Gateway.

- Predeterminado local: [http://127.0.0.1:18789/](http://127.0.0.1:18789/)
- Acceso remoto: [Superficies web](/es/web) y [Tailscale](/es/gateway/tailscale)

<p align="center">
  <img src="/whatsapp-openclaw.jpg" alt="OpenClaw" width="420" />
</p>

## Configuración (opcional)

La configuración se encuentra en `~/.openclaw/openclaw.json`.

- Si **no haces nada**, OpenClaw usa el binario Pi incluido en modo RPC con sesiones por remitente.
- Si quieres bloquearlo, comienza con `channels.whatsapp.allowFrom` y (para grupos) reglas de mención.

Ejemplo:

```json5
{
  channels: {
    whatsapp: {
      allowFrom: ["+15555550123"],
      groups: { "*": { requireMention: true } },
    },
  },
  messages: { groupChat: { mentionPatterns: ["@openclaw"] } },
}
```

## Comenzar aquí

<Columns>
  <Card title="Docs hubs" href="/es/start/hubs" icon="book-open">
    Toda la documentación y guías, organizadas por caso de uso.
  </Card>
  <Card title="Configuration" href="/es/gateway/configuration" icon="settings">
    Configuración principal del Gateway, tokens y configuración del proveedor.
  </Card>
  <Card title="Remote access" href="/es/gateway/remote" icon="globe">
    Patrones de acceso SSH y tailnet.
  </Card>
  <Card title="Channels" href="/es/channels/telegram" icon="message-square">
    Configuración específica del canal para WhatsApp, Telegram, Discord y más.
  </Card>
  <Card title="Nodes" href="/es/nodes" icon="smartphone">
    Nodos iOS y Android con emparejamiento, Canvas, cámara y acciones del dispositivo.
  </Card>
  <Card title="Ayuda" href="/es/help" icon="life-buoy">
    Punto de entrada para soluciones comunes y solución de problemas.
  </Card>
</Columns>

## Más información

<Columns>
  <Card title="Lista completa de funciones" href="/es/concepts/features" icon="list">
    Capacidades completas de canales, enrutamiento y medios.
  </Card>
  <Card title="Enrutamiento multiagente" href="/es/concepts/multi-agent" icon="route">
    Aislamiento del espacio de trabajo y sesiones por agente.
  </Card>
  <Card title="Seguridad" href="/es/gateway/security" icon="shield">
    Tokens, listas de permitidos y controles de seguridad.
  </Card>
  <Card title="Solución de problemas" href="/es/gateway/troubleshooting" icon="wrench">
    Diagnósticos de puerta de enlace y errores comunes.
  </Card>
  <Card title="Acerca de y créditos" href="/es/reference/credits" icon="info">
    Orígenes del proyecto, colaboradores y licencia.
  </Card>
</Columns>

import es from "/components/footer/es.mdx";

<es />
