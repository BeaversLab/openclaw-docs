---
summary: "Resumen de soporte de plataformas (Gateway + aplicaciones complementarias)"
read_when:
  - Buscando soporte de SO o rutas de instalación
  - Decidiendo dónde ejecutar el Gateway
title: "Plataformas"
---

# Plataformas

El núcleo de OpenClaw está escrito en TypeScript. **Node es el tiempo de ejecución recomendado**.
No se recomienda Bun para el Gateway (errores de WhatsApp/Telegram).

Existen aplicaciones complementarias para macOS (aplicación de barra de menús) y nodos móviles (iOS/Android). Las aplicaciones complementarias para Windows y
Linux están planeadas, pero el Gateway es totalmente compatible hoy en día.
Las aplicaciones complementarias nativas para Windows también están planeadas; se recomienda el Gateway a través de WSL2.

## Elige tu SO

- macOS: [macOS](/es/platforms/macos)
- iOS: [iOS](/es/platforms/ios)
- Android: [Android](/es/platforms/android)
- Windows: [Windows](/es/platforms/windows)
- Linux: [Linux](/es/platforms/linux)

## VPS y hosting

- Centro VPS: [Alojamiento VPS](/es/vps)
- Fly.io: [Fly.io](/es/install/fly)
- Hetzner (Docker): [Hetzner](/es/install/hetzner)
- GCP (Compute Engine): [GCP](/es/install/gcp)
- exe.dev (VM + proxy HTTPS): [exe.dev](/es/install/exe-dev)

## Enlaces comunes

- Guía de instalación: [Primeros pasos](/es/start/getting-started)
- Manual del Gateway: [Gateway](/es/gateway)
- Configuración del Gateway: [Configuración](/es/gateway/configuration)
- Estado del servicio: `openclaw gateway status`

## Instalación del servicio Gateway (CLI)

Use uno de estos (todos compatibles):

- Asistente (recomendado): `openclaw onboard --install-daemon`
- Directo: `openclaw gateway install`
- Flujo de configuración: `openclaw configure` → seleccione **Gateway service**
- Reparar/migrar: `openclaw doctor` (ofrece instalar o reparar el servicio)

El destino del servicio depende del SO:

- macOS: LaunchAgent (`ai.openclaw.gateway` o `ai.openclaw.<profile>`; heredado `com.openclaw.*`)
- Linux/WSL2: servicio de usuario systemd (`openclaw-gateway[-<profile>].service`)

import en from "/components/footer/en.mdx";

<en />
