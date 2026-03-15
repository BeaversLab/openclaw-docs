---
summary: "Mover (migrar) una instalación de OpenClaw de una máquina a otra"
read_when:
  - You are moving OpenClaw to a new laptop/server
  - You want to preserve sessions, auth, and channel logins (WhatsApp, etc.)
title: "Guía de migración"
---

# Migrar OpenClaw a una nueva máquina

Esta guía migra un OpenClaw Gateway de una máquina a otra **sin repetir la incorporación**.

Conceptualmente, la migración es sencilla:

- Copie el **directorio de estado** (`$OPENCLAW_STATE_DIR`, predeterminado: `~/.openclaw/`) — esto incluye la configuración, la autenticación, las sesiones y el estado de los canales.
- Copie su **espacio de trabajo** (`~/.openclaw/workspace/` de forma predeterminada) — esto incluye sus archivos de agente (memoria, indicaciones, etc.).

Pero hay errores comunes en torno a los **perfiles**, los **permisos** y las **copias parciales**.

## Antes de comenzar (lo que va a migrar)

### 1) Identifique su directorio de estado

La mayoría de las instalaciones usan la predeterminada:

- **Directorio de estado:** `~/.openclaw/`

Pero puede ser diferente si usa:

- `--profile <name>` (a menudo se convierte en `~/.openclaw-<profile>/`)
- `OPENCLAW_STATE_DIR=/some/path`

Si no está seguro, ejecute en la máquina **antigua**:

```bash
openclaw status
```

Busque menciones de `OPENCLAW_STATE_DIR` / perfil en la salida. Si ejecuta varias puertas de enlace, repita para cada perfil.

### 2) Identifique su espacio de trabajo

Valores predeterminados comunes:

- `~/.openclaw/workspace/` (espacio de trabajo recomendado)
- una carpeta personalizada que creó

Su espacio de trabajo es donde residen archivos como `MEMORY.md`, `USER.md` y `memory/*.md`.

### 3) Entienda lo que va a conservar

Si copia **ambos**, el directorio de estado y el espacio de trabajo, conserva:

- Configuración de la puerta de enlace (`openclaw.json`)
- Perfiles de autenticación / claves de API / tokens de OAuth
- Historial de sesiones + estado del agente
- Estado del canal (por ejemplo, inicio de sesión/sesión de WhatsApp)
- Sus archivos del espacio de trabajo (memoria, notas de habilidades, etc.)

Si copia **solo** el espacio de trabajo (por ejemplo, mediante Git), **no** conserva:

- sesiones
- credenciales
- inicios de sesión de canales

Esos residen bajo `$OPENCLAW_STATE_DIR`.

## Pasos de migración (recomendado)

### Paso 0 — Hacer una copia de seguridad (máquina antigua)

En la máquina **antigua**, detenga primero la puerta de enlace para que los archivos no cambien a mitad de la copia:

```bash
openclaw gateway stop
```

(Opcional pero recomendado) archive el directorio de estado y el espacio de trabajo:

```bash
# Adjust paths if you use a profile or custom locations
cd ~
tar -czf openclaw-state.tgz .openclaw

tar -czf openclaw-workspace.tgz .openclaw/workspace
```

Si tienes múltiples perfiles/directorios de estado (por ejemplo, `~/.openclaw-main`, `~/.openclaw-work`), archiva cada uno.

### Paso 1: instalar OpenClaw en la nueva máquina

En la máquina **nueva**, instala la CLI (y Node si es necesario):

- Ver: [Instalar](/es/install)

En esta etapa, está bien si el onboarding crea un `~/.openclaw/` nuevo — lo sobrescribirás en el siguiente paso.

### Paso 2: copiar el directorio de estado y el espacio de trabajo a la nueva máquina

Copia **ambos**:

- `$OPENCLAW_STATE_DIR` (predeterminado `~/.openclaw/`)
- tu espacio de trabajo (predeterminado `~/.openclaw/workspace/`)

Enfoques comunes:

- `scp` los archivos tar y extraer
- `rsync -a` a través de SSH
- unidad externa

Después de copiar, asegúrate de:

- Se hayan incluido los directorios ocultos (por ejemplo, `.openclaw/`)
- La propiedad de los archivos sea correcta para el usuario que ejecuta el gateway

### Paso 3: ejecutar Doctor (migraciones + reparación del servicio)

En la máquina **nueva**:

```bash
openclaw doctor
```

Doctor es el comando "seguro y aburrido". Repara los servicios, aplica las migraciones de configuración y advierte sobre discrepancias.

Luego:

```bash
openclaw gateway restart
openclaw status
```

## Errores comunes (y cómo evitarlos)

### Error: discrepancia de perfil/directorio de estado

Si ejecutaste el gateway anterior con un perfil (o `OPENCLAW_STATE_DIR`) y el nuevo gateway usa uno diferente, verás síntomas como:

- los cambios de configuración no surten efecto
- canales faltantes / cerrados sesión
- historial de sesiones vacío

Solución: ejecuta el gateway/servicio utilizando el **mismo** perfil/directorio de estado que migraste, luego vuelve a ejecutar:

```bash
openclaw doctor
```

### Error: copiar solo `openclaw.json`

`openclaw.json` no es suficiente. Muchos proveedores almacenan el estado en:

- `$OPENCLAW_STATE_DIR/credentials/`
- `$OPENCLAW_STATE_DIR/agents/<agentId>/...`

Migra siempre la carpeta `$OPENCLAW_STATE_DIR` completa.

### Error: permisos / propiedad

Si copiaste como root o cambiaste de usuario, es posible que el gateway no pueda leer las credenciales/sesiones.

Solución: asegúrate de que el directorio de estado y el espacio de trabajo sean propiedad del usuario que ejecuta el gateway.

### Error: migrar entre modos remoto/local

- Si tu interfaz de usuario (WebUI/TUI) apunta a un gateway **remoto**, el host remoto es el propietario del almacén de sesiones y del espacio de trabajo.
- Migrar tu portátil no moverá el estado del gateway remoto.

Si estás en modo remoto, migra el **gateway host**.

### Peligro: secretos en las copias de seguridad

`$OPENCLAW_STATE_DIR` contiene secretos (claves API, tokens OAuth, credenciales de WhatsApp). Trata las copias de seguridad como secretos de producción:

- almacenar cifrado
- evitar compartir por canales inseguros
- rotar las claves si sospechas de una exposición

## Lista de verificación

En la nueva máquina, confirma:

- `openclaw status` muestra que el gateway se está ejecutando
- Tus canales siguen conectados (p. ej., WhatsApp no requiere volver a emparejar)
- El panel se abre y muestra las sesiones existentes
- Tus archivos del espacio de trabajo (memoria, configuraciones) están presentes

## Relacionado

- [Doctor](/es/gateway/doctor)
- [Solución de problemas del gateway](/es/gateway/troubleshooting)
- [¿Dónde almacena OpenClaw sus datos?](/es/help/faq#where-does-openclaw-store-its-data)

import es from "/components/footer/es.mdx";

<es />
