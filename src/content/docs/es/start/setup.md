---
summary: "Configuración avanzada y flujos de trabajo de desarrollo para OpenClaw"
read_when:
  - Setting up a new machine
  - You want “latest + greatest” without breaking your personal setup
title: "Configuración"
---

# Configuración

<Note>Si está configurando por primera vez, comience con [Getting Started](/es/start/getting-started). Para obtener detalles sobre la incorporación, consulte [Onboarding (CLI)](/es/start/wizard).</Note>

## TL;DR

- **La personalización reside fuera del repositorio:** `~/.openclaw/workspace` (espacio de trabajo) + `~/.openclaw/openclaw.json` (configuración).
- **Flujo de trabajo estable:** instala la aplicación macOS; déjala ejecutar el Gateway incluido.
- **Flujo de trabajo de última hora:** ejecuta el Gateway tú mismo a través de `pnpm gateway:watch`, luego permite que la aplicación macOS se adjunte en modo Local.

## Requisitos previos (desde el código fuente)

- Se recomienda Node 24 (Node 22 LTS, actualmente `22.14+`, todavía soportado)
- Se prefiere `pnpm` (o Bun si usa intencionalmente el [Bun workflow](/es/install/bun))
- Docker (opcional; solo para configuración/e2e en contenedores — consulte [Docker](/es/install/docker))

## Estrategia de personalización (para que las actualizaciones no dañen)

Si quieres “100% personalizado para mí” _y_ actualizaciones fáciles, mantén tu personalización en:

- **Configuración:** `~/.openclaw/openclaw.json` (JSON/JSON5-ish)
- **Espacio de trabajo:** `~/.openclaw/workspace` (habilidades, prompts, recuerdos; conviértelo en un repositorio git privado)

Inicializar una vez:

```bash
openclaw setup
```

Desde dentro de este repositorio, usa la entrada de CLI local:

```bash
openclaw setup
```

Si todavía no tienes una instalación global, ejecútala a través de `pnpm openclaw setup` (o `bun run openclaw setup` si estás utilizando el flujo de trabajo Bun).

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

- Ejecuta `openclaw setup`, luego `openclaw channels login`, y después inicia el Gateway manualmente (`openclaw gateway`).

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
# First run only (or after resetting local OpenClaw config/workspace)
pnpm openclaw setup
pnpm gateway:watch
```

`gateway:watch` ejecuta el gateway en modo de observación y se recarga ante cambios relevantes en la fuente,
configuración y metadatos de complementos empaquetados.
`pnpm openclaw setup` es el paso de inicialización única de configuración/espacio de trabajo local para una nueva extracción.
`pnpm gateway:watch` no reconstruye `dist/control-ui`, por lo que vuelva a ejecutar `pnpm ui:build` después de los cambios de `ui/` o use `pnpm ui:dev` mientras desarrolla la interfaz de usuario de Control.

Si estás utilizando intencionadamente el flujo de trabajo Bun, los comandos equivalentes son:

```bash
bun install
# First run only (or after resetting local OpenClaw config/workspace)
bun run openclaw setup
bun run gateway:watch
```

### 2) Apunta la aplicación macOS a tu Gateway en ejecución

En **OpenClaw.app**:

- Modo de conexión: **Local**
  La aplicación se conectará al gateway en ejecución en el puerto configurado.

### 3) Verificar

- El estado del Gateway dentro de la aplicación debería indicar **“Using existing gateway …”**
- O a través de CLI:

```bash
openclaw health
```

### Errores comunes

- **Puerto incorrecto:** El WS del Gateway por defecto es `ws://127.0.0.1:18789`; mantenga la aplicación + CLI en el mismo puerto.
- **Dónde reside el estado:**
  - Estado del canal/proveedor: `~/.openclaw/credentials/`
  - Perfiles de autenticación de modelo: `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
  - Sesiones: `~/.openclaw/agents/<agentId>/sessions/`
  - Registros: `/tmp/openclaw/`

## Mapa de almacenamiento de credenciales

Úsalo al depurar la autenticación o al decidir qué respaldar:

- **WhatsApp**: `~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
- **Token de bot de Telegram**: config/env o `channels.telegram.tokenFile` (solo archivo normal; se rechazan los enlaces simbólicos)
- **Token de bot de Discord**: config/env o SecretRef (proveedores env/file/exec)
- **Tokens de Slack**: config/env (`channels.slack.*`)
- **Listas de permitidos para emparejamiento**:
  - `~/.openclaw/credentials/<channel>-allowFrom.json` (cuenta predeterminada)
  - `~/.openclaw/credentials/<channel>-<accountId>-allowFrom.json` (cuentas no predeterminadas)
- **Perfiles de autenticación de modelo**: `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- **Payload de secretos respaldados en archivo (opcional)**: `~/.openclaw/secrets.json`
- **Importación de OAuth heredada**: `~/.openclaw/credentials/oauth.json`
  Más detalles: [Security](/es/gateway/security#credential-storage-map).

## Actualización (sin arruinar tu configuración)

- Mantenga `~/.openclaw/workspace` y `~/.openclaw/` como "sus cosas"; no coloque avisos/configuraciones personales en el repositorio `openclaw`.
- Actualizar fuente: `git pull` + el paso de instalación de tu gestor de paquetes elegido (`pnpm install` por defecto; `bun install` para el flujo de trabajo de Bun) + seguir usando el comando `gateway:watch` correspondiente.

## Linux (servicio de usuario systemd)

Las instalaciones de Linux utilizan un servicio de **usuario** systemd. Por defecto, systemd detiene los
servicios de usuario al cerrar sesión o estar inactivo, lo que finaliza el Gateway. El proceso de incorporación intenta habilitar
“lingering” para ti (puede solicitar sudo). Si aún está desactivado, ejecuta:

```bash
sudo loginctl enable-linger $USER
```

Para servidores siempre activos o multiusuario, considera un servicio de **sistema** en lugar de un servicio de usuario (no se necesita lingering). Consulta el [manual de Gateway](/es/gateway) para las notas de systemd.

## Documentos relacionados

- [Manual de Gateway](/es/gateway) (flags, supervisión, puertos)
- [Configuración de Gateway](/es/gateway/configuration) (esquema de configuración + ejemplos)
- [Discord](/es/channels/discord) y [Telegram](/es/channels/telegram) (etiquetas de respuesta + configuraciones replyToMode)
- [Configuración del asistente OpenClaw](/es/start/openclaw)
- [Aplicación macOS](/es/platforms/macos) (ciclo de vida del gateway)
