---
summary: "Comando Doctor: comprobaciones de estado, migraciones de configuración y pasos de reparación"
read_when:
  - Adding or modifying doctor migrations
  - Introducing breaking config changes
title: "Doctor"
---

# Doctor

`openclaw doctor` es la herramienta de reparación y migración para OpenClaw. Corrige el estado/configuración obsoletos, verifica el estado y proporciona pasos de reparación procesables.

## Inicio rápido

```bash
openclaw doctor
```

### Sin interfaz gráfica / automatización

```bash
openclaw doctor --yes
```

Acepta los valores predeterminados sin preguntar (incluyendo pasos de reparación de reinicio/servicio/sandbox cuando sea aplicable).

```bash
openclaw doctor --repair
```

Aplica las reparaciones recomendadas sin preguntar (reparaciones + reinicios donde sea seguro).

```bash
openclaw doctor --repair --force
```

Aplica también reparaciones agresivas (sobrescribe las configuraciones personalizadas del supervisor).

```bash
openclaw doctor --non-interactive
```

Ejecuta sin preguntar y aplica solo migraciones seguras (normalización de configuración + movimientos de estado en disco). Omite acciones de reinicio/servicio/sandbox que requieren confirmación humana.
Las migraciones de estado heredadas se ejecutan automáticamente cuando se detectan.

```bash
openclaw doctor --deep
```

Escanea los servicios del sistema en busca de instalaciones adicionales de la puerta de enlace (launchd/systemd/schtasks).

Si desea revisar los cambios antes de escribirlos, abra primero el archivo de configuración:

```bash
cat ~/.openclaw/openclaw.json
```

## Lo que hace (resumen)

- Actualización previa opcional para instalaciones de git (solo interactivo).
- Verificación de frescura del protocolo de la interfaz de usuario (reconstruye la interfaz de usuario de Control cuando el esquema del protocolo es más reciente).
- Verificación de estado + solicitud de reinicio.
- Resumen del estado de las habilidades (aptas/faltantes/bloqueadas).
- Normalización de configuración para valores heredados.
- La migración del navegador busca configuraciones heredadas de la extensión de Chrome y la preparación para Chrome MCP.
- Advertencias de anulación del proveedor OpenCode (`models.providers.opencode` / `models.providers.opencode-go`).
- Migración del estado heredado en disco (sesiones/dir. agente/aut. WhatsApp).
- Migración del almacén de cron heredado (`jobId`, `schedule.cron`, campos de entrega/payload de nivel superior, payload `provider`, trabajos de respaldo de webhook simples `notify: true`).
- Verificaciones de integridad y permisos del estado (sesiones, transcripciones, directorio de estado).
- Verificaciones de permisos del archivo de configuración (chmod 600) al ejecutarse localmente.
- Salud de autenticación del modelo: verifica la caducidad de OAuth, puede actualizar los tokens que caducan y reporta los estados de perfil de autenticación (enfriamiento/deshabilitado).
- Detección de directorio de espacio de trabajo adicional (`~/openclaw`).
- Reparación de la imagen de sandbox cuando el sandbox está habilitado.
- Migración de servicio heredado y detección de puerta de enlace adicional.
- Verificaciones de tiempo de ejecución de la puerta de enlace (servicio instalado pero no en ejecución; etiqueta launchd en caché).
- Advertencias de estado del canal (sondeadas desde la puerta de enlace en ejecución).
- Auditoría de configuración del supervisor (launchd/systemd/schtasks) con reparación opcional.
- Verificaciones de mejores prácticas de tiempo de ejecución de la puerta de enlace (Node frente a Bun, rutas del gestor de versiones).
- Diagnósticos de colisión de puertos de la puerta de enlace (predeterminado `18789`).
- Advertencias de seguridad para políticas de MD abiertas.
- Verificaciones de autenticación de la puerta de enlace para el modo de token local (ofrece generación de token cuando no existe una fuente de token; no sobrescribe las configuraciones de token SecretRef).
- Verificación de persistencia de systemd en Linux.
- Verificaciones de instalación desde código fuente (discordancia del espacio de trabajo pnpm, activos de interfaz faltantes, binario tsx faltante).
- Escribe la configuración actualizada + los metadatos del asistente.

## Comportamiento detallado y justificación

### 0) Actualización opcional (instalaciones git)

Si esto es una comprobación de git y doctor se ejecuta de forma interactiva, ofrece
actualizar (fetch/rebase/build) antes de ejecutar doctor.

### 1) Normalización de la configuración

Si la configuración contiene formas de valores heredados (por ejemplo `messages.ackReaction`
sin una anulación específica del canal), doctor las normaliza en el esquema
actual.

### 2) Migraciones de claves de configuración heredadas

Cuando la configuración contiene claves obsoletas, otros comandos se niegan a ejecutarse y le piden
que ejecute `openclaw doctor`.

Doctor hará:

- Explicar qué claves heredadas se encontraron.
- Muestra la migración que aplicó.
- Reescribe `~/.openclaw/openclaw.json` con el esquema actualizado.

Gateway también ejecuta automáticamente las migraciones de doctor al iniciar cuando detecta un formato de configuración heredado, por lo que las configuraciones obsoletas se reparan sin intervención manual.

Migraciones actuales:

- `routing.allowFrom` → `channels.whatsapp.allowFrom`
- `routing.groupChat.requireMention` → `channels.whatsapp/telegram/imessage.groups."*".requireMention`
- `routing.groupChat.historyLimit` → `messages.groupChat.historyLimit`
- `routing.groupChat.mentionPatterns` → `messages.groupChat.mentionPatterns`
- `routing.queue` → `messages.queue`
- `routing.bindings` → `bindings` de nivel superior
- `routing.agents`/`routing.defaultAgentId` → `agents.list` + `agents.list[].default`
- `routing.agentToAgent` → `tools.agentToAgent`
- `routing.transcribeAudio` → `tools.media.audio.models`
- `bindings[].match.accountID` → `bindings[].match.accountId`
- Para canales con `accounts` con nombre pero sin `accounts.default`, mueve los valores de canal de nivel superior de cuenta única con ámbito de cuenta a `channels.<channel>.accounts.default` cuando estén presentes
- `identity` → `agents.list[].identity`
- `agent.*` → `agents.defaults` + `tools.*` (herramientas/elevados/exec/sandbox/subagentes)
- `agent.model`/`allowedModels`/`modelAliases`/`modelFallbacks`/`imageModelFallbacks`
  → `agents.defaults.models` + `agents.defaults.model.primary/fallbacks` + `agents.defaults.imageModel.primary/fallbacks`
- `browser.ssrfPolicy.allowPrivateNetwork` → `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork`
- `browser.profiles.*.driver: "extension"` → `"existing-session"`
- eliminar `browser.relayBindHost` (configuración heredada de rele de extensión)

Las advertencias de Doctor también incluyen orientación predeterminada de la cuenta para canales multicuenta:

- Si se configuran dos o más entradas `channels.<channel>.accounts` sin `channels.<channel>.defaultAccount` o `accounts.default`, doctor advierte que el enrutamiento de respaldo puede elegir una cuenta inesperada.
- Si `channels.<channel>.defaultAccount` está configurado con un ID de cuenta desconocido, doctor advierte y enumera los IDs de cuenta configurados.

### 2b) Anulaciones del proveedor OpenCode

Si has añadido `models.providers.opencode`, `opencode-zen` o `opencode-go`
manualmente, esto anula el catálogo integrado de OpenCode de `@mariozechner/pi-ai`.
Eso puede forzar a los modelos a usar la API incorrecta o anular los costos. Doctor advierte para que
puedas eliminar la anulación y restaurar el enrutamiento de API y los costos por modelo.

### 2c) Migración del navegador y preparación para Chrome MCP

Si la configuración de tu navegador todavía apunta a la ruta de la extensión de Chrome eliminada, doctor
la normaliza al modelo de conexión local del host Chrome MCP actual:

- `browser.profiles.*.driver: "extension"` se convierte en `"existing-session"`
- `browser.relayBindHost` se elimina

Doctor también audita la ruta local del host de Chrome MCP cuando usas el perfil `defaultProfile:
"user"` or a configured `existing-session`:

- verifica si Google Chrome está instalado en el mismo host para los perfiles
  de conexión automática predeterminados
- verifica la versión de Chrome detectada y advierte cuando es inferior a Chrome 144
- te recuerda que habilites la depuración remota en la página de inspección del navegador (por
  ejemplo `chrome://inspect/#remote-debugging`, `brave://inspect/#remote-debugging`,
  o `edge://inspect/#remote-debugging`)

Doctor no puede habilitar la configuración del lado de Chrome por ti. Chrome MCP local del host
aún requiere:

- un navegador basado en Chromium 144+ en el host de puerta de enlace/nodo
- el navegador ejecutándose localmente
- depuración remota habilitada en ese navegador
- aprobar el primer prompt de consentimiento de conexión en el navegador

Esta verificación **no** se aplica a Docker, sandbox, remote-browser u otros
flujos sin interfaz gráfica. Esos continúan usando CDP sin procesar.

### 3) Migraciones de estado heredadas (disposición del disco)

Doctor puede migrar disposiciones en disco antiguas a la estructura actual:

- Almacén de sesiones + transcripciones:
  - de `~/.openclaw/sessions/` a `~/.openclaw/agents/<agentId>/sessions/`
- Directorio del agente:
  - de `~/.openclaw/agent/` a `~/.openclaw/agents/<agentId>/agent/`
- Estado de autenticación de WhatsApp (Baileys):
  - desde `~/.openclaw/credentials/*.json` heredado (excepto `oauth.json`)
  - a `~/.openclaw/credentials/whatsapp/<accountId>/...` (id de cuenta predeterminado: `default`)

Estas migraciones se realizan con el mejor esfuerzo y son idempotentes; doctor emitirá advertencias cuando
deje carpetas heredadas como copias de seguridad. Gateway/CLI también migra automáticamente
las sesiones heredadas y el directorio de agentes al inicio para que el historial/autenticación/modelos se ubiquen en la
ruta por agente sin una ejecución manual de doctor. La autenticación de WhatsApp se migra intencionalmente solo
a través de `openclaw doctor`.

### 3b) Migraciones del almacén de cron heredado

Doctor también verifica el almacén de trabajos cron (`~/.openclaw/cron/jobs.json` de forma predeterminada,
o `cron.store` cuando se anula) en busca de formas de trabajo antiguas que el planificador todavía
acepta por compatibilidad.

Las limpiezas de cron actuales incluyen:

- `jobId` → `id`
- `schedule.cron` → `schedule.expr`
- campos de payload de nivel superior (`message`, `model`, `thinking`, ...) → `payload`
- campos de entrega de nivel superior (`deliver`, `channel`, `to`, `provider`, ...) → `delivery`
- alias de entrega `provider` del payload → `delivery.channel` explícito
- trabajos de respaldo webhook `notify: true` heredados simples → `delivery.mode="webhook"` explícito con `delivery.to=cron.webhook`

Doctor solo migra automáticamente los trabajos `notify: true` cuando puede hacerlo sin
cambiar el comportamiento. Si un trabajo combina el respaldo de notificación heredado con un modo de
entrega existente que no sea webhook, doctor advierte y deja ese trabajo para su revisión manual.

### 4) Verificaciones de integridad del estado (persistencia de sesión, enrutamiento y seguridad)

El directorio de estado es el tronco encefálico operativo. Si desaparece, pierde
sesiones, credenciales, registros y configuración (a menos que tenga copias de seguridad en otro lugar).

Doctor verifica:

- **Directorio de estado faltante**: advierte sobre la pérdida catastrófica de estado, solicita recrear
  el directorio y le recuerda que no puede recuperar los datos faltantes.
- **Permisos del directorio de estado**: verifica la capacidad de escritura; ofrece reparar los permisos
  (y emite una sugerencia `chown` cuando se detecta una discrepancia de propietario/grupo).
- **Directorio de estado sincronizado en la nube en macOS**: advierte cuando el estado se resuelve bajo iCloud Drive
  (`~/Library/Mobile Documents/com~apple~CloudDocs/...`) o
  `~/Library/CloudStorage/...` porque las rutas respaldadas por sincronización pueden causar E/S más lenta
  y condiciones de carrera de bloqueo/sincronización.
- **Directorio de estado en SD o eMMC de Linux**: advierte cuando el estado se resuelve en una fuente de montaje `mmcblk*`
  porque la E/S aleatoria respaldada por SD o eMMC puede ser más lenta y desgastarse
  más rápido con las escrituras de sesión y credenciales.
- **Faltan directorios de sesión**: `sessions/` y el directorio de almacenamiento de sesión son
  necesarios para persistir el historial y evitar fallos `ENOENT`.
- **Discrepancia de transcripción**: advierte cuando las entradas de sesión recientes tienen archivos de
  transcripción faltantes.
- **“JSONL de 1 línea” de la sesión principal**: marca cuando la transcripción principal tiene solo una
  línea (el historial no se está acumulando).
- **Múltiples directorios de estado**: advierte cuando existen múltiples carpetas `~/.openclaw` en
  directorios de inicio o cuando `OPENCLAW_STATE_DIR` apunta a otro lugar (el historial puede
  dividirse entre instalaciones).
- **Recordatorio de modo remoto**: si `gateway.mode=remote`, doctor le recuerda que lo ejecute
  en el host remoto (el estado reside allí).
- **Permisos del archivo de configuración**: advierte si `~/.openclaw/openclaw.json` es
  legible por el grupo/mundo y ofrece ajustarlo a `600`.

### 5) Estado de autenticación del modelo (caducidad de OAuth)

Doctor inspecciona los perfiles de OAuth en el almacén de autenticación, advierte cuando los tokens están
por expirar/expirados y puede actualizarlos cuando sea seguro. Si el perfil de Anthropic Claude Code
está obsoleto, sugiere ejecutar `claude setup-token` (o pegar un token de configuración).
Las solicitudes de actualización solo aparecen al ejecutarse de forma interactiva (TTY); `--non-interactive`
omite los intentos de actualización.

Doctor también informa sobre los perfiles de autenticación que están temporalmente inutilizables debido a:

- períodos de espera cortos (límites de tasa/timeout/fallos de autenticación)
- desactivaciones más largas (fallos de facturación/crédito)

### 6) Validación del modelo de Hooks

Si `hooks.gmail.model` está establecido, doctor valida la referencia del modelo contra el
catálogo y la lista de permitidos y advierte cuando no se resolverá o no está permitido.

### 7) Reparación de la imagen de Sandbox

Cuando el sandbox está habilitado, doctor verifica las imágenes de Docker y ofrece compilar o cambiar a nombres heredados si falta la imagen actual.

### 8) Migraciones y sugerencias de limpieza del servicio de puerta de enlace

Doctor detecta los servicios de puerta de enlace heredados (launchd/systemd/schtasks) y ofrece eliminarlos e instalar el servicio de OpenClaw utilizando el puerto de puerta de enlace actual. También puede buscar servicios adicionales similares a la puerta de enlace e imprimir sugerencias de limpieza. Los servicios de puerta de enlace de OpenClaw con nombre de perfil se consideran de primera clase y no se marcan como "extra".

### 9) Advertencias de seguridad

Doctor emite advertencias cuando un proveedor está abierto a MD sin una lista de permitidos, o cuando una política está configurada de forma peligrosa.

### 10) Persistencia de systemd (Linux)

Si se ejecuta como un servicio de usuario de systemd, doctor asegura que la persistencia esté habilitada para que la puerta de enlace se mantenga activa después de cerrar la sesión.

### 11) Estado de las habilidades

Doctor imprime un resumen rápido de las habilidades elegibles/faltantes/bloqueadas para el espacio de trabajo actual.

### 12) Verificaciones de autenticación de la puerta de enlace (token local)

Doctor verifica la preparación de la autenticación mediante token de la puerta de enlace local.

- Si el modo de token necesita un token y no existe ninguna fuente de token, doctor ofrece generar uno.
- Si `gateway.auth.token` está administrado por SecretRef pero no está disponible, doctor advierte y no lo sobrescribe con texto sin formato.
- `openclaw doctor --generate-gateway-token` fuerza la generación solo cuando no hay ningún SecretRef de token configurado.

### 12b) Reparaciones con conocimiento de SecretRef de solo lectura

Algunos flujos de reparación necesitan inspeccionar las credenciales configuradas sin debilitar el comportamiento de fallo rápido en tiempo de ejecución.

- `openclaw doctor --fix` ahora utiliza el mismo modelo de resumen de SecretRef de solo lectura que los comandos de la familia de estado para reparaciones de configuración específicas.
- Ejemplo: la reparación de `allowFrom` / `groupAllowFrom` `@username` de Telegram intenta utilizar las credenciales del bot configuradas cuando están disponibles.
- Si el token del bot de Telegram está configurado a través de SecretRef pero no está disponible en la ruta del comando actual, doctor informa que la credencial está configurada pero no disponible y omite la resolución automática en lugar de fallar o informar erróneamente que falta el token.

### 13) Verificación de estado + reinicio de la puerta de enlace

Doctor ejecuta una verificación de estado y ofrece reiniciar la puerta de enlace cuando parece poco saludable.

### 14) Advertencias de estado del canal

Si la puerta de enlace está saludable, doctor ejecuta una sonda de estado del canal e informa advertencias con soluciones sugeridas.

### 15) Auditoría y reparación de la configuración del supervisor

Doctor comprueba la configuración del supervisor instalada (launchd/systemd/schtasks) para detectar valores predeterminados faltantes o desactualizados (por ejemplo, dependencias de red en línea de systemd y retraso de reinicio). Cuando encuentra una discrepancia, recomienda una actualización y puede reescribir el archivo de servicio/tarea con los valores predeterminados actuales.

Notas:

- `openclaw doctor` solicita confirmación antes de reescribir la configuración del supervisor.
- `openclaw doctor --yes` acepta las solicitudes de reparación predeterminadas.
- `openclaw doctor --repair` aplica las reparaciones recomendadas sin solicitar confirmación.
- `openclaw doctor --repair --force` sobrescribe las configuraciones personalizadas del supervisor.
- Si la autenticación por token requiere un token y `gateway.auth.token` está administrado por SecretRef, la instalación/reparación del servicio de doctor valida el SecretRef pero no persiste los valores de token de texto plano resueltos en los metadatos del entorno del servicio del supervisor.
- Si la autenticación por token requiere un token y el SecretRef del token configurado no está resuelto, doctor bloquea la ruta de instalación/reparación con orientación procesable.
- Si tanto `gateway.auth.token` como `gateway.auth.password` están configurados y `gateway.auth.mode` no está establecido, doctor bloquea la instalación/reparación hasta que el modo se establezca explícitamente.
- Para las unidades de systemd de usuario de Linux, las comprobaciones de desviación de token de doctor ahora incluyen tanto las fuentes `Environment=` como `EnvironmentFile=` al comparar los metadatos de autenticación del servicio.
- Siempre puedes forzar una reescritura completa mediante `openclaw gateway install --force`.

### 16) Diagnósticos del tiempo de ejecución y puerto de la puerta de enlace

Doctor inspecciona el tiempo de ejecución del servicio (PID, último estado de salida) y advierte cuando el servicio está instalado pero no se está ejecutando realmente. También comprueba si hay colisiones de puerto en el puerto de la puerta de enlace (predeterminado `18789`) e informa de las causas probables (la puerta de enlace ya se está ejecutando, túnel SSH).

### 17) Mejores prácticas del tiempo de ejecución de la puerta de enlace

Doctor advierte cuando el servicio de gateway se ejecuta en Bun o en una ruta de Node administrada por versiones
(`nvm`, `fnm`, `volta`, `asdf`, etc.). Los canales de WhatsApp + Telegram requieren Node,
y las rutas de los administradores de versiones pueden romperse después de las actualizaciones porque el servicio no
carga su shell de inicio. Doctor ofrece migrar a una instalación del sistema de Node cuando
está disponible (Homebrew/apt/choco).

### 18) Escritura de configuración + metadatos del asistente

Doctor persiste cualquier cambio en la configuración y marca los metadatos del asistente para registrar la
ejecución del doctor.

### 19) Consejos del espacio de trabajo (copia de seguridad + sistema de memoria)

Doctor sugiere un sistema de memoria del espacio de trabajo cuando falta e imprime un consejo de copia de seguridad
si el espacio de trabajo aún no está bajo git.

Consulte [/concepts/agent-workspace](/es/concepts/agent-workspace) para obtener una guía completa sobre
la estructura del espacio de trabajo y la copia de seguridad en git (se recomienda GitHub o GitLab privados).

import es from "/components/footer/es.mdx";

<es />
