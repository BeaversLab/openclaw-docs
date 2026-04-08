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

- macOS: [macOS](/en/platforms/macos)
- iOS: [iOS](/en/platforms/ios)
- Android: [Android](/en/platforms/android)
- Windows: [Windows](/en/platforms/windows)
- Linux: [Linux](/en/platforms/linux)

## VPS y alojamiento

- VPS hub: [VPS hosting](/en/vps)
- Fly.io: [Fly.io](/en/install/fly)
- Hetzner (Docker): [Hetzner](/en/install/hetzner)
- GCP (Compute Engine): [GCP](/en/install/gcp)
- Azure (Linux VM): [Azure](/en/install/azure)
- exe.dev (VM + HTTPS proxy): [exe.dev](/en/install/exe-dev)

## Enlaces comunes

- Install guide: [Getting Started](/en/start/getting-started)
- Gateway runbook: [Gateway](/en/gateway)
- Gateway configuration: [Configuration](/en/gateway/configuration)
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
- Native Windows: Scheduled Task (`OpenClaw Gateway` o `OpenClaw Gateway (<profile>)`), con un elemento de inicio de sesión de carpeta de inicio por usuario como alternativa si se deniega la creación de la tarea
