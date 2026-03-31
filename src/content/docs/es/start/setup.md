---
summary: "Configuración avanzada y flujos de trabajo de desarrollo para OpenClaw"
read_when:
  - Setting up a new machine
  - You want “latest + greatest” without breaking your personal setup
title: "Configuración"
---

# Configuración

<Note>Si está configurando por primera vez, comience con [Getting Started](/en/start/getting-started). Para obtener detalles sobre la incorporación, consulte [Onboarding (CLI)](/en/start/wizard).</Note>

## TL;DR

- **La personalización vive fuera del repositorio:** `~/.openclaw/workspace` (espacio de trabajo) + `~/.openclaw/openclaw.json` (configuración).
- **Flujo de trabajo estable:** instala la aplicación macOS; déjala ejecutar el Gateway incluido.
- **Flujo de trabajo de última hora:** ejecuta el Gateway tú mismo a través de `pnpm gateway:watch`, luego deja que la aplicación macOS se adjunte en modo Local.

## Requisitos previos (desde el código fuente)

- Se recomienda Node 24 (Node 22 LTS, actualmente `22.14+`, aún compatible)
- `pnpm`
- Docker (opcional; solo para configuración/e2e en contenedores — consulta [Docker](/en/install/docker))

## Estrategia de personalización (para que las actualizaciones no dañen)

Si quieres “100% personalizado para mí” _y_ actualizaciones fáciles, mantén tu personalización en:

- **Configuración:** `~/.openclaw/openclaw.json` (JSON/JSON5-ish)
- **Espacio de trabajo:** `~/.openclaw/workspace` (habilidades, avisos, recuerdos; conviértelo en un repositorio git privado)

Inicializar una vez:

```bash
openclaw setup
```

Desde dentro de este repositorio, usa la entrada de CLI local:

```bash
openclaw setup
```

Si aún no tienes una instalación global, ejecútala a través de `pnpm openclaw setup`.

## Ejecutar el Gateway desde este repositorio

Después de `pnpm build`, puedes ejecutar el CLI empaquetado directamente:

```bash
node openclaw.mjs gateway --port 18789 --verbose
```

## Flujo de trabajo estable (primero la aplicación macOS)

1. Instala + inicia **OpenClaw.app** (barra de menús).
2. Completa la lista de verificación de incorporación/permisos (indicaciones TCC).
3. Asegúrate de que Gateway esté en modo **Local** y ejecutándose (la aplicación lo gestiona).
4. Vincular superficies (ejemplo: WhatsApp):

```bash
openclaw channels login
```

5. Verificación de cordura:

```bash
openclaw health
```

Si la incorporación no está disponible en tu compilación:

- Ejecuta `openclaw setup`, luego `openclaw channels login`, luego inicia el Gateway manualmente (`openclaw gateway`).

## Flujo de trabajo de última hora (Gateway en una terminal)

Objetivo: trabajar en el Gateway de TypeScript, obtener recarga en caliente, mantener la interfaz de usuario de la aplicación macOS adjunta.

### 0) (Opcional) Ejecutar la aplicación macOS desde el código fuente también

Si también quieres la aplicación macOS en la última hora:

```bash
./scripts/restart-mac.sh
```

### 1) Iniciar el Gateway de desarrollo

```bash
pnpm install
pnpm gateway:watch
```

`gateway:watch` ejecuta el gateway en modo de observación y se recarga ante cambios relevantes en el código fuente,
la configuración y los metadatos de los complementos empaquetados.

### 2) Apuntar la aplicación macOS a tu Gateway en ejecución

En **OpenClaw.app**:

- Modo de conexión: **Local**
  La aplicación se adjuntará al gateway en ejecución en el puerto configurado.

### 3) Verificar

- El estado del Gateway en la aplicación debería indicar **“Usando gateway existente …”**
- O a través de CLI:

```bash
openclaw health
```

### Errores comunes

- **Puerto incorrecto:** El WS de Gateway usa por defecto `ws://127.0.0.1:18789`; mantén la app y la CLI en el mismo puerto.
- **Dónde reside el estado:**
  - Credenciales: `~/.openclaw/credentials/`
  - Sesiones: `~/.openclaw/agents/<agentId>/sessions/`
  - Registros (Logs): `/tmp/openclaw/`

## Mapa de almacenamiento de credenciales

Usa esto al depurar la autenticación o al decidir qué respaldar:

- **WhatsApp**: `~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
- **Token del bot de Telegram**: config/env o `channels.telegram.tokenFile` (solo archivo regular; se rechazan los enlaces simbólicos)
- **Token del bot de Discord**: config/env o SecretRef (proveedores env/file/exec)
- **Tokens de Slack**: config/env (`channels.slack.*`)
- **Listas de permitidos para emparejamiento**:
  - `~/.openclaw/credentials/<channel>-allowFrom.json` (cuenta predeterminada)
  - `~/.openclaw/credentials/<channel>-<accountId>-allowFrom.json` (cuentas no predeterminadas)
- **Perfiles de autenticación de modelos**: `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- **Carga útil de secretos respaldada en archivo (opcional)**: `~/.openclaw/secrets.json`
- **Importación heredada de OAuth**: `~/.openclaw/credentials/oauth.json`
  Más detalles: [Seguridad](/en/gateway/security#credential-storage-map).

## Actualización (sin arruinar tu configuración)

- Mantén `~/.openclaw/workspace` y `~/.openclaw/` como "tus cosas"; no pongas prompts/configuraciones personales en el repositorio `openclaw`.
- Actualizar fuente: `git pull` + `pnpm install` (cuando cambie el archivo de bloqueo) + seguir usando `pnpm gateway:watch`.

## Linux (servicio de usuario systemd)

Las instalaciones de Linux utilizan un servicio de **usuario** systemd. De forma predeterminada, systemd detiene los
servicios de usuario al cerrar sesión/inactividad, lo que mata el Gateway. El proceso de incorporación intenta habilitar
el modo persistente (lingering) para ti (puede solicitar sudo). Si aún está desactivado, ejecuta:

```bash
sudo loginctl enable-linger $USER
```

Para servidores siempre activos o multiusuario, considera un servicio del **sistema** en lugar de un
servicio de usuario (no se necesita modo persistente). Consulta el [Manual de procedimientos de Gateway](/en/gateway) para las notas de systemd.

## Documentación relacionada

- [Manual de procedimientos de Gateway](/en/gateway) (indicadores, supervisión, puertos)
- [Configuración de Gateway](/en/gateway/configuration) (esquema de configuración + ejemplos)
- [Discord](/en/channels/discord) y [Telegram](/en/channels/telegram) (etiquetas de respuesta + configuraciones replyToMode)
- [Configuración del asistente OpenClaw](/en/start/openclaw)
- [aplicación de macOS](/en/platforms/macos) (ciclo de vida del gateway)
