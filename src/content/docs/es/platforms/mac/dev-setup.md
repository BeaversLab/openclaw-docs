---
summary: "Guía de configuración para desarrolladores que trabajan en la aplicación de OpenClaw para macOS"
read_when:
  - Setting up the macOS development environment
title: "Configuración de desarrollo de macOS"
---

# Configuración de desarrollo de macOS

Esta guía cubre los pasos necesarios para compilar y ejecutar la aplicación de OpenClaw para macOS desde el código fuente.

## Requisitos previos

Antes de compilar la aplicación, asegúrese de tener instalado lo siguiente:

1. **Xcode 26.2+**: Necesario para el desarrollo en Swift.
2. **Node.js 24 y pnpm**: Recomendados para la puerta de enlace, la CLI y los scripts de empaquetado. Node 22 LTS, actualmente `22.14+`, sigue siendo compatible por compatibilidad.

## 1. Instalar dependencias

Instale las dependencias de todo el proyecto:

```bash
pnpm install
```

## 2. Compilar y empaquetar la aplicación

Para compilar la aplicación de macOS y empaquetarla en `dist/OpenClaw.app`, ejecute:

```bash
./scripts/package-mac-app.sh
```

Si no tiene un certificado de ID de desarrollador de Apple, el script utilizará automáticamente **firma ad-hoc** (`-`).

Para los modos de ejecución de desarrollo, las banderas de firma y la resolución de problemas con el ID de equipo, consulte el README de la aplicación de macOS:
[https://github.com/openclaw/openclaw/blob/main/apps/macos/README.md](https://github.com/openclaw/openclaw/blob/main/apps/macos/README.md)

> **Nota**: Las aplicaciones firmadas ad-hoc pueden activar avisos de seguridad. Si la aplicación falla inmediatamente con "Abort trap 6", consulte la sección [Solución de problemas](#troubleshooting).

## 3. Instalar la CLI

La aplicación de macOS espera una instalación global de la CLI `openclaw` para gestionar las tareas en segundo plano.

**Para instalarla (recomendado):**

1. Abra la aplicación OpenClaw.
2. Vaya a la pestaña de configuración **General**.
3. Haga clic en **"Install CLI"**.

Alternativamente, instálela manualmente:

```bash
npm install -g openclaw@<version>
```

## Solución de problemas

### Error de compilación: Discordancia en la cadena de herramientas o el SDK

La compilación de la aplicación de macOS espera el SDK de macOS más reciente y la cadena de herramientas de Swift 6.2.

**Dependencias del sistema (requeridas):**

- **Última versión de macOS disponible en Actualización de software** (requerida por los SDK de Xcode 26.2)
- **Xcode 26.2** (cadena de herramientas Swift 6.2)

**Comprobaciones:**

```bash
xcodebuild -version
xcrun swift --version
```

Si las versiones no coinciden, actualice macOS/Xcode y vuelva a ejecutar la compilación.

### La aplicación falla al otorgar permisos

Si la aplicación falla cuando intenta permitir el acceso al **Reconocimiento de voz** o al **Micrófono**, puede deberse a una caché de TCC dañada o a una discrepancia en la firma.

**Solución:**

1. Restablezca los permisos de TCC:

   ```bash
   tccutil reset All ai.openclaw.mac.debug
   ```

2. Si eso falla, cambie el `BUNDLE_ID` temporalmente en [`scripts/package-mac-app.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/package-mac-app.sh) para forzar una "hoja en blanco" desde macOS.

### Gateway "Starting..." indefinidamente

Si el estado de la puerta de enlace se mantiene en "Starting...", compruebe si un proceso zombi está reteniendo el puerto:

```bash
openclaw gateway status
openclaw gateway stop

# If you're not using a LaunchAgent (dev mode / manual runs), find the listener:
lsof -nP -iTCP:18789 -sTCP:LISTEN
```

Si una ejecución manual está reteniendo el puerto, detenga ese proceso (Ctrl+C). Como último recurso, mate el PID que encontró anteriormente.
