---
summary: "Resumen de compatibilidad de plataformas (Gateway + aplicaciones complementarias)"
read_when:
  - Looking for OS support or install paths
  - Deciding where to run the Gateway
title: "Plataformas"
---

# Plataformas

El núcleo de OpenClaw está escrito en TypeScript. **Node es el tiempo de ejecución recomendado**.
No se recomienda Bun para el Gateway (errores de WhatsApp/Telegram).

Existen aplicaciones complementarias para macOS (aplicación de la barra de menús) y nodos móviles (iOS/Android). Se planean
aplicaciones complementarias para Windows y Linux, pero hoy el Gateway es totalmente compatible.
También se planean aplicaciones complementarias nativas para Windows; se recomienda el Gateway a través de WSL2.

## Elige tu sistema operativo

- macOS: [macOS](/es/platforms/macos)
- iOS: [iOS](/es/platforms/ios)
- Android: [Android](/es/platforms/android)
- Windows: [Windows](/es/platforms/windows)
- Linux: [Linux](/es/platforms/linux)

## VPS y alojamiento

- Centro de VPS: [Alojamiento VPS](/es/vps)
- Fly.io: [Fly.io](/es/install/fly)
- Hetzner (Docker): [Hetzner](/es/install/hetzner)
- GCP (Compute Engine): [GCP](/es/install/gcp)
- Azure (máquina virtual Linux): [Azure](/es/install/azure)
- exe.dev (máquina virtual + proxy HTTPS): [exe.dev](/es/install/exe-dev)

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

El destino del servicio depende del sistema operativo:

- macOS: LaunchAgent (`ai.openclaw.gateway` o `ai.openclaw.<profile>`; heredado `com.openclaw.*`)
- Linux/WSL2: servicio de usuario systemd (`openclaw-gateway[-<profile>].service`)
