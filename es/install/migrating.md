---
summary: "Mueve (migra) una instalación de OpenClaw de una máquina a otra"
read_when:
  - Estás moviendo OpenClaw a un nuevo portátil/servidor
  - Quieres conservar las sesiones, la autenticación y los inicios de sesión de los canales (WhatsApp, etc.)
title: "Guía de migración"
---

# Migrar OpenClaw a una nueva máquina

Esta guía migra un OpenClaw Gateway de una máquina a otra **sin repetir el incorporamiento**.

La migración es conceptualmente simple:

- Copia el **directorio de estado** (`$OPENCLAW_STATE_DIR`, por defecto: `~/.openclaw/`) — esto incluye la configuración, la autenticación, las sesiones y el estado de los canales.
- Copia tu **espacio de trabajo** (`~/.openclaw/workspace/` por defecto) — esto incluye tus archivos de agente (memoria, avisos, etc.).

Pero hay errores comunes en torno a los **perfiles**, los **permisos** y las **copias parciales**.

## Antes de comenzar (qué estás migrando)

### 1) Identifica tu directorio de estado

La mayoría de las instalaciones usan la predeterminada:

- **State dir:** `~/.openclaw/`

Pero puede ser diferente si usas:

- `--profile <name>` (a menudo se convierte en `~/.openclaw-<profile>/`)
- `OPENCLAW_STATE_DIR=/some/path`

Si no estás seguro, ejecuta en la máquina **antigua**:

```bash
openclaw status
```

Busca menciones de `OPENCLAW_STATE_DIR` / perfil en la salida. Si ejecutas varias puertas de enlace, repite para cada perfil.

### 2) Identifica tu espacio de trabajo

Valores predeterminados comunes:

- `~/.openclaw/workspace/` (espacio de trabajo recomendado)
- una carpeta personalizada que creaste

Tu espacio de trabajo es donde residen archivos como `MEMORY.md`, `USER.md` y `memory/*.md`.

### 3) Entiende qué vas a conservar

Si copias **ambos**, el directorio de estado y el espacio de trabajo, conservas:

- Configuración de la puerta de enlace (`openclaw.json`)
- Perfiles de autenticación / claves API / tokens OAuth
- Historial de sesiones + estado del agente
- Estado del canal (por ejemplo, inicio de sesión/sesión de WhatsApp)
- Tus archivos del espacio de trabajo (memoria, notas de habilidades, etc.)

Si copias **solo** el espacio de trabajo (por ejemplo, vía Git), **no** conservas:

- sesiones
- credenciales
- inicios de sesión de canales

Esos residen bajo `$OPENCLAW_STATE_DIR`.

## Pasos de migración (recomendado)

### Paso 0 - Haz una copia de seguridad (máquina antigua)

En la máquina **antigua**, detén la puerta de enlace primero para que los archivos no cambien a mitad de la copia:

```bash
openclaw gateway stop
```

(Opcional pero recomendado) archiva el directorio de estado y el espacio de trabajo:

```bash
# Adjust paths if you use a profile or custom locations
cd ~
tar -czf openclaw-state.tgz .openclaw

tar -czf openclaw-workspace.tgz .openclaw/workspace
```

Si tienes múltiples perfiles/directorios de estado (p. ej., `~/.openclaw-main`, `~/.openclaw-work`), archiva cada uno.

### Paso 1: Instalar OpenClaw en la nueva máquina

En la máquina **nueva**, instala la CLI (y Node si es necesario):

- Ver: [Instalar](/es/install)

En esta etapa, está bien si el proceso de incorporación crea un nuevo `~/.openclaw/` — lo sobrescribirás en el siguiente paso.

### Paso 2: Copiar el directorio de estado y el espacio de trabajo a la nueva máquina

Copia **ambos**:

- `$OPENCLAW_STATE_DIR` (por defecto `~/.openclaw/`)
- tu espacio de trabajo (por defecto `~/.openclaw/workspace/`)

Enfoques comunes:

- `scp` los archivos tar y extraer
- `rsync -a` a través de SSH
- unidad externa

Después de copiar, asegúrate de:

- Se hayan incluido los directorios ocultos (p. ej., `.openclaw/`)
- La propiedad de los archivos sea correcta para el usuario que ejecuta el gateway

### Paso 3: Ejecutar Doctor (migraciones + reparación del servicio)

En la máquina **nueva**:

```bash
openclaw doctor
```

Doctor es el comando "seguro y aburrido". Repara los servicios, aplica las migraciones de configuración y advierte sobre discordancias.

Luego:

```bash
openclaw gateway restart
openclaw status
```

## Errores comunes (y cómo evitarlos)

### Error: discordancia de perfil / directorio de estado

Si ejecutaste el antiguo gateway con un perfil (o `OPENCLAW_STATE_DIR`) y el nuevo gateway usa uno diferente, verás síntomas como:

- los cambios de configuración no surten efecto
- canales faltantes / cerrados sesión
- historial de sesiones vacío

Solución: ejecuta el gateway/servicio usando el **mismo** perfil/directorio de estado que migraste, luego vuelve a ejecutar:

```bash
openclaw doctor
```

### Error: copiar solo `openclaw.json`

`openclaw.json` no es suficiente. Muchos proveedores almacenan el estado en:

- `$OPENCLAW_STATE_DIR/credentials/`
- `$OPENCLAW_STATE_DIR/agents/<agentId>/...`

Migra siempre la carpeta completa `$OPENCLAW_STATE_DIR`.

### Error: permisos / propiedad

Si copiaste como root o cambiaste de usuario, es posible que el gateway no pueda leer las credenciales/sesiones.

Solución: asegúrate de que el directorio de estado y el espacio de trabajo sean propiedad del usuario que ejecuta el gateway.

### Error: migrar entre modos remoto/local

- Si tu interfaz de usuario (WebUI/TUI) apunta a un gateway **remoto**, el host remoto es el propietario del almacenamiento de sesiones y del espacio de trabajo.
- Migrar tu portátil no moverá el estado del gateway remoto.

Si estás en modo remoto, migra el **host de puerta de enlace**.

### Peligro: secretos en las copias de seguridad

`$OPENCLAW_STATE_DIR` contiene secretos (claves de API, tokens de OAuth, credenciales de WhatsApp). Trata las copias de seguridad como secretos de producción:

- almacenar de forma cifrada
- evitar compartir por canales no seguros
- rotar las claves si sospechas de una exposición

## Lista de verificación

En la nueva máquina, confirma:

- `openclaw status` muestra que la puerta de enlace se está ejecutando
- Tus canales siguen conectados (ej. WhatsApp no requiere volver a emparejar)
- El panel se abre y muestra las sesiones existentes
- Tus archivos del espacio de trabajo (memoria, configuraciones) están presentes

## Relacionado

- [Doctor](/es/gateway/doctor)
- [Solución de problemas de la puerta de enlace](/es/gateway/troubleshooting)
- [¿Dónde almacena OpenClaw sus datos?](/es/help/faq#where-does-openclaw-store-its-data)

import en from "/components/footer/en.mdx";

<en />
