---
summary: "Comando Doctor: comprobaciones de estado, migraciones de configuración y pasos de reparación"
read_when:
  - Agregar o modificar migraciones del Doctor
  - Introducir cambios de ruptura en la configuración
title: "Doctor"
---

# Doctor

`openclaw doctor` es la herramienta de reparación y migración para OpenClaw. Corrige configuraciones/estados obsoletos, verifica el estado y proporciona pasos de reparación accionables.

## Inicio rápido

```bash
openclaw doctor
```

### Sin interfaz / automatización

```bash
openclaw doctor --yes
```

Acepta los valores predeterminados sin solicitar confirmación (incluidos los pasos de reparación de reinicio/servicio/sandbox cuando corresponda).

```bash
openclaw doctor --repair
```

Aplica las reparaciones recomendadas sin solicitar confirmación (reparaciones + reinicios cuando sea seguro).

```bash
openclaw doctor --repair --force
```

Aplica también reparaciones agresivas (sobrescribe las configuraciones personalizadas del supervisor).

```bash
openclaw doctor --non-interactive
```

Se ejecuta sin indicaciones y solo aplica migraciones seguras (normalización de configuración + movimientos de estado en disco). Omite las acciones de reinicio/servicio/sandbox que requieren confirmación humana.
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

- Actualización previa opcional para instalaciones desde git (solo interactivo).
- Verificación de frescura del protocolo de interfaz de usuario (reconstruye la interfaz de usuario de Control cuando el esquema del protocolo es más reciente).
- Verificación de estado + aviso de reinicio.
- Resumen del estado de las habilidades (elegibles/faltantes/bloqueadas).
- Normalización de la configuración para valores heredados.
- Verificaciones de migración del navegador para configuraciones heredadas de extensiones de Chrome y preparación para Chrome MCP.
- Advertencias de anulación del proveedor de OpenCode (`models.providers.opencode` / `models.providers.opencode-go`).
- Migración de estado heredado en disco (sesiones/directorio del agente/autenticación de WhatsApp).
- Migración de tienda de programación heredada (`jobId`, `schedule.cron`, campos de nivel superior de entrega/carga útil, carga útil `provider`, trabajos de respaldo de webhook simple `notify: true`).
- Verificaciones de integridad y permisos del estado (sesiones, transcripciones, directorio de estado).
- Verificaciones de permisos del archivo de configuración (chmod 600) al ejecutarse localmente.
- Estado de autenticación del modelo: verifica el vencimiento de OAuth, puede actualizar los tokens que vencen y reporta los estados de enfriamiento/deshabilitado del perfil de autenticación.
- Detección de directorio de espacio de trabajo adicional (`~/openclaw`).
- Reparación de la imagen del sandbox cuando el sandbox está habilitado.
- Migración de servicio heredado y detección de puerta de enlace adicional.
- Verificaciones de tiempo de ejecución de Gateway (servicio instalado pero no en ejecución; etiqueta launchd en caché).
- Advertencias de estado del canal (sondeadas desde el gateway en ejecución).
- Auditoría de configuración del supervisor (launchd/systemd/schtasks) con reparación opcional.
- Verificaciones de mejores prácticas de tiempo de ejecución de Gateway (Node frente a Bun, rutas del gestor de versiones).
- Diagnósticos de colisión de puertos de Gateway (por defecto `18789`).
- Advertencias de seguridad para políticas de DM abiertas.
- Verificaciones de autenticación de Gateway para el modo de token local (ofrece generación de token cuando no existe una fuente de token; no sobrescribe las configuraciones de token SecretRef).
- Verificación de persistencia de systemd en Linux.
- Verificaciones de instalación desde fuente (discordancia en el espacio de trabajo de pnpm, activos de interfaz de usuario faltantes, binario tsx faltante).
- Escribe la configuración actualizada + los metadatos del asistente.

## Comportamiento detallado y justificación

### 0) Actualización opcional (instalaciones git)

Si es una comprobación de git y doctor se está ejecutando de forma interactiva, ofrece actualizar (fetch/rebase/build) antes de ejecutar doctor.

### 1) Normalización de la configuración

Si la configuración contiene formas de valores heredados (por ejemplo, `messages.ackReaction` sin una anulación específica del canal), doctor las normaliza al esquema actual.

### 2) Migraciones de claves de configuración heredadas

Cuando la configuración contiene claves obsoletas, otros comandos se niegan a ejecutarse y le piden que ejecute `openclaw doctor`.

Doctor hará lo siguiente:

- Explicará qué claves heredadas se encontraron.
- Mostrará la migración que aplicó.
- Reescribirá `~/.openclaw/openclaw.json` con el esquema actualizado.

El Gateway también ejecuta automáticamente las migraciones de doctor al iniciarse cuando detecta un formato de configuración heredado, por lo que las configuraciones obsoletas se reparan sin intervención manual.

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
- Para canales con `accounts` con nombre pero sin `accounts.default`, mueve los valores de canal de nivel superior de una sola cuenta con ámbito de cuenta a `channels.<channel>.accounts.default` cuando esté presente
- `identity` → `agents.list[].identity`
- `agent.*` → `agents.defaults` + `tools.*` (tools/elevated/exec/sandbox/subagents)
- `agent.model`/`allowedModels`/`modelAliases`/`modelFallbacks`/`imageModelFallbacks`
  → `agents.defaults.models` + `agents.defaults.model.primary/fallbacks` + `agents.defaults.imageModel.primary/fallbacks`
- `browser.ssrfPolicy.allowPrivateNetwork` → `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork`
- `browser.profiles.*.driver: "extension"` → `"existing-session"`
- eliminar `browser.relayBindHost` (configuración heredada de retransmisión de extensiones)

Las advertencias de Doctor también incluyen orientación predeterminada de cuenta para canales multicuenta:

- Si se configuran dos o más entradas `channels.<channel>.accounts` sin `channels.<channel>.defaultAccount` o `accounts.default`, Doctor advierte que el enrutamiento de respaldo puede elegir una cuenta inesperada.
- Si `channels.<channel>.defaultAccount` está configurado con un ID de cuenta desconocido, Doctor advierte y lista los IDs de cuenta configurados.

### 2b) Anulaciones del proveedor de OpenCode

Si ha añadido `models.providers.opencode`, `opencode-zen` o `opencode-go`
manualmente, anula el catálogo integrado de OpenCode de `@mariozechner/pi-ai`.
Eso puede forzar modelos a la API incorrecta o anular los costes. Doctor advierte para que
pueda eliminar la anulación y restaurar el enrutamiento de API por modelo + costes.

### 2c) Migración del navegador y preparación para Chrome MCP

Si su configuración del navegador todavía apunta a la ruta eliminada de la extensión de Chrome, doctor
la normaliza al modelo de conexión de Chrome MCP local del host actual:

- `browser.profiles.*.driver: "extension"` se convierte en `"existing-session"`
- `browser.relayBindHost` se elimina

Doctor también audita la ruta de Chrome MCP local del host cuando usa el perfil `defaultProfile:
"user"` or a configured `existing-session`:

- verifica si Google Chrome está instalado en el mismo host para los perfiles
  de conexión automática predeterminados
- verifica la versión de Chrome detectada y advierte cuando es inferior a Chrome 144
- le recuerda que habilite la depuración remota en la página de inspección del navegador (por
  ejemplo `chrome://inspect/#remote-debugging`, `brave://inspect/#remote-debugging`,
  o `edge://inspect/#remote-debugging`)

Doctor no puede habilitar la configuración del lado de Chrome por usted. Chrome MCP local del host
aún requiere:

- un navegador basado en Chromium 144+ en el host de puerta de enlace/nodo
- el navegador ejecutándose localmente
- depuración remota habilitada en ese navegador
- aprobar el primer mensaje de consentimiento de conexión en el navegador

Esta verificación **no** se aplica a Docker, sandbox, navegador remoto u otros
  flujos headless. Esos continúan usando CDP sin procesar.

### 3) Migraciones de estado heredadas (diseño de disco)

Doctor puede migrar diseques de disco antiguos a la estructura actual:

- Almacén de sesiones + transcripciones:
  - de `~/.openclaw/sessions/` a `~/.openclaw/agents/<agentId>/sessions/`
- Directorio del agente:
  - de `~/.openclaw/agent/` a `~/.openclaw/agents/<agentId>/agent/`
- Estado de autenticación de WhatsApp (Baileys):
  - del legado `~/.openclaw/credentials/*.json` (excepto `oauth.json`)
  - a `~/.openclaw/credentials/whatsapp/<accountId>/...` (id de cuenta predeterminada: `default`)

Estas migraciones son de mejor esfuerzo e idempotentes; doctor emitirá advertencias cuando
deje carpetas heredadas como copias de seguridad. Gateway/CLI también migra automáticamente
las sesiones heredadas + directorio del agente al inicio para que el historial/autenticación/modelos aterricen en la
ruta por agente sin una ejecución manual de doctor. La autenticación de WhatsApp se migra intencionalmente solo
a través de `openclaw doctor`.

### 3b) Migraciones de almacenamiento cron heredadas

Doctor también verifica el almacenamiento de trabajos cron (`~/.openclaw/cron/jobs.json` de forma predeterminada,
o `cron.store` cuando se anula) en busca de formas de trabajo antiguas que el planificador aún
acepta por compatibilidad.

Las limpiezas cron actuales incluyen:

- `jobId` → `id`
- `schedule.cron` → `schedule.expr`
- campos de carga útil de nivel superior (`message`, `model`, `thinking`, ...) → `payload`
- campos de entrega de nivel superior (`deliver`, `channel`, `to`, `provider`, ...) → `delivery`
- alias de entrega `provider` de carga útil → `delivery.channel` explícito
- trabajos de retroceso de webhook `notify: true` heredados simples → `delivery.mode="webhook"` explícito con `delivery.to=cron.webhook`

Doctor solo migra automáticamente los trabajos `notify: true` cuando puede hacerlo sin
cambiar el comportamiento. Si un trabajo combina la retroacción de notificación heredada con un modo de
entrega que no es de webhook existente, doctor avisa y deja ese trabajo para su revisión manual.

### 4) Verificaciones de integridad del estado (persistencia de la sesión, enrutamiento y seguridad)

El directorio de estado es el tronco encefálico operativo. Si desaparece, pierde
sesiones, credenciales, registros y configuración (a menos que tenga copias de seguridad en otro lugar).

Doctor comprueba:

- **Directorio de estado faltante**: advierte sobre una pérdida catastrófica del estado, solicita recrear
  el directorio y le recuerda que no puede recuperar los datos faltantes.
- **Permisos del directorio de estado**: verifica la capacidad de escritura; ofrece reparar los permisos
  (y emite una sugerencia `chown` cuando se detecta una discrepancia de propietario/grupo).
- **Directorio de estado sincronizado en la nube en macOS**: advierte cuando el estado se resuelve bajo iCloud Drive
  (`~/Library/Mobile Documents/com~apple~CloudDocs/...`) o
  `~/Library/CloudStorage/...` porque las rutas respaldadas por sincronización pueden causar E/S más lenta
  y condiciones de carrera de bloqueo/sincronización.
- **Directorio de estado SD o eMMC en Linux**: advierte cuando el estado se resuelve en un origen de montaje `mmcblk*`,
  porque la E/S aleatoria respaldada por SD o eMMC puede ser más lenta y desgastarse
  más rápido bajo escrituras de sesión y credenciales.
- **Directorios de sesión faltantes**: `sessions/` y el directorio de almacenamiento de sesión son
  necesarios para persistir el historial y evitar fallos `ENOENT`.
- **Discrepancia de transcripción**: advierte cuando las entradas de sesión recientes tienen archivos
  de transcripción faltantes.
- **Sesión principal "1-line JSONL"**: marca cuando la transcripción principal tiene solo una
  línea (el historial no se está acumulando).
- **Múltiples directorios de estado**: advierte cuando existen múltiples carpetas `~/.openclaw` en
  directorios de inicio o cuando `OPENCLAW_STATE_DIR` apunta a otro lugar (el historial puede
  dividirse entre instalaciones).
- **Recordatorio de modo remoto**: si `gateway.mode=remote`, doctor te recuerda ejecutarlo
  en el host remoto (el estado reside allí).
- **Permisos del archivo de configuración**: advierte si `~/.openclaw/openclaw.json` es
  legible por el grupo/mundo y ofrece restringirlo a `600`.

### 5) Estado de autenticación del modelo (caducidad de OAuth)

Doctor inspecciona los perfiles de OAuth en el almacén de autenticación, advierte cuando los tokens están
  a punto de caducar/caducados y puede actualizarlos cuando es seguro. Si el perfil de Anthropic Claude Code
  está obsoleto, sugiere ejecutar `claude setup-token` (o pegar un token de configuración).
  Los mensajes de actualización solo aparecen al ejecutarse de forma interactiva (TTY); `--non-interactive`
  omite los intentos de actualización.

Doctor también informa sobre los perfiles de autenticación que están temporalmente inutilizables debido a:

- períodos de enfriamiento cortos (límites de velocidad/tiempos de espera/fallos de autenticación)
- inhabilitaciones más largas (fallos de facturación/crédito)

### 6) Validación del modelo de Hooks

Si `hooks.gmail.model` está establecido, doctor valida la referencia del modelo contra el
  catálogo y la lista blanca y advierte cuando no se puede resolver o no está permitido.

### 7) Reparación de la imagen de Sandbox

Cuando el sandbox está habilitado, doctor verifica las imágenes de Docker y ofrece construir o
  cambiar a nombres heredados si falta la imagen actual.

### 8) Migraciones del servicio Gateway y sugerencias de limpieza

Doctor detecta servicios gateway heredados (launchd/systemd/schtasks) y
  ofrece eliminarlos e instalar el servicio OpenClaw utilizando el puerto gateway
  actual. También puede buscar servicios adicionales similares a gateway e imprimir sugerencias de limpieza.
  Los servicios gateway de OpenClaw con nombres de perfil se consideran de primera clase y no
  se marcan como "extra".

### 9) Advertencias de seguridad

Doctor emite advertencias cuando un proveedor está abierto a MD sin una lista blanca, o
  cuando una política está configurada de forma peligrosa.

### 10) systemd linger (Linux)

Si se ejecuta como un servicio de usuario de systemd, doctor asegura que lingering esté habilitado para que el
  gateway permanezca activo después de cerrar sesión.

### 11) Estado de las habilidades (Skills)

Doctor imprime un resumen rápido de las habilidades aptas/faltantes/bloqueadas para el espacio de trabajo
  actual.

### 12) Verificaciones de autenticación del Gateway (token local)

Doctor verifica la preparación de la autenticación del token local del gateway.

- Si el modo de token necesita un token y no existe ninguna fuente de token, doctor ofrece generar uno.
- Si `gateway.auth.token` está gestionado por SecretRef pero no está disponible, doctor advierte y no lo sobrescribe con texto plano.
- `openclaw doctor --generate-gateway-token` fuerza la generación solo cuando no hay ningún SecretRef de token configurado.

### 12b) Reparaciones con conocimiento de SecretRef de solo lectura

Algunos flujos de reparación necesitan inspeccionar las credenciales configuradas sin debilitar el comportamiento de fallo rápido en tiempo de ejecución.

- `openclaw doctor --fix` ahora utiliza el mismo modelo de resumen de SecretRef de solo lectura que los comandos de la familia de estado para reparaciones de configuración específicas.
- Ejemplo: la reparación de `allowFrom` / `groupAllowFrom` de `@username` de Telegram intenta utilizar las credenciales del bot configuradas cuando están disponibles.
- Si el token del bot de Telegram está configurado mediante SecretRef pero no está disponible en la ruta de comandos actual, doctor informa que la credencial está configurada pero no disponible y omite la resolución automática en lugar de bloquearse o informar erróneamente que falta el token.

### 13) Comprobación de estado del gateway + reinicio

Doctor ejecuta una comprobación de estado y ofrece reiniciar el gateway cuando parece
no saludable.

### 14) Advertencias del estado del canal

Si el gateway está saludable, doctor ejecuta una sonda de estado del canal e informa
de las advertencias con las soluciones sugeridas.

### 15) Auditoría y reparación de la configuración del supervisor

Doctor comprueba la configuración del supervisor instalada (launchd/systemd/schtasks) para
valores predeterminados que faltan o están obsoletos (por ejemplo, dependencias de network-online de systemd y
retraso de reinicio). Cuando encuentra una discrepancia, recomienda una actualización y puede
reescribir el archivo de servicio/tarea a los valores predeterminados actuales.

Notas:

- `openclaw doctor` solicita confirmación antes de reescribir la configuración del supervisor.
- `openclaw doctor --yes` acepta las indicaciones de reparación predeterminadas.
- `openclaw doctor --repair` aplica las soluciones recomendadas sin solicitar confirmación.
- `openclaw doctor --repair --force` sobrescribe las configuraciones personalizadas del supervisor.
- Si la autenticación por token requiere un token y `gateway.auth.token` está gestionado por SecretRef, la instalación/reparación del servicio de doctor valida el SecretRef pero no persiste los valores de token de texto plano resueltos en los metadatos del entorno del servicio del supervisor.
- Si la autenticación por token requiere un token y la SecretRef del token configurado no está resuelta, el doctor bloquea la ruta de instalación/reparación con una guía procesable.
- Si tanto `gateway.auth.token` como `gateway.auth.password` están configurados y `gateway.auth.mode` no está definido, el doctor bloquea la instalación/reparación hasta que el modo se establezca explícitamente.
- Para las unidades user-systemd de Linux, las verificaciones de deriva de tokens del doctor ahora incluyen tanto las fuentes `Environment=` como `EnvironmentFile=` al comparar los metadatos de autenticación del servicio.
- Siempre puedes forzar una reescritura completa mediante `openclaw gateway install --force`.

### 16) Diagnósticos del tiempo de ejecución y puertos de Gateway

El doctor inspecciona el tiempo de ejecución del servicio (PID, último estado de salida) y advierte cuando el servicio está instalado pero no se está ejecutando realmente. También verifica colisiones de puertos en el puerto de gateway (por defecto `18789`) e informa las causas probables (gateway ya en ejecución, túnel SSH).

### 17) Mejores prácticas del tiempo de ejecución de Gateway

El doctor advierte cuando el servicio de gateway se ejecuta en Bun o en una ruta de Node administrada por versiones (`nvm`, `fnm`, `volta`, `asdf`, etc.). Los canales de WhatsApp y Telegram requieren Node, y las rutas de gestores de versiones pueden romperse después de las actualizaciones porque el servicio no carga tu inicialización de shell. El doctor ofrece migrar a una instalación del sistema Node cuando esté disponible (Homebrew/apt/choco).

### 18) Escritura de configuración + metadatos del asistente

El doctor guarda cualquier cambio de configuración y estampa los metadatos del asistente para registrar la ejecución del doctor.

### 19) Consejos del espacio de trabajo (copia de seguridad + sistema de memoria)

El doctor sugiere un sistema de memoria del espacio de trabajo cuando falta e imprime un consejo de copia de seguridad si el espacio de trabajo aún no está bajo git.

Consulte [/concepts/agent-workspace](/es/concepts/agent-workspace) para obtener una guía completa sobre la estructura del espacio de trabajo y la copia de seguridad en git (se recomienda GitHub o GitLab privados).

import en from "/components/footer/en.mdx";

<en />
