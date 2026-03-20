---
summary: "Superficies de registro, registros de archivo, estilos de registro WS y formato de consola"
read_when:
  - Cambiar la salida o el formato de registro
  - Depuración de la salida de la CLI o de la puerta de enlace
title: "Logging"
---

# Logging

Para obtener una descripción general orientada al usuario (CLI + Interfaz de usuario de control + configuración), consulte [/logging](/es/logging).

OpenClaw tiene dos "superficies" de registro:

- **Salida de consola** (lo que ve en el terminal / Interfaz de usuario de depuración).
- **Registros de archivo** (líneas JSON) escritos por el registrador de la puerta de enlace.

## Registrador basado en archivos

- El archivo de registro rotativo predeterminado se encuentra en `/tmp/openclaw/` (un archivo por día): `openclaw-YYYY-MM-DD.log`
  - La fecha utiliza la zona horaria local del host de la puerta de enlace.
- La ruta y el nivel del archivo de registro se pueden configurar mediante `~/.openclaw/openclaw.json`:
  - `logging.file`
  - `logging.level`

El formato de archivo es un objeto JSON por línea.

La pestaña Logs de la Interfaz de usuario de control muestra este archivo en tiempo real a través de la puerta de enlace (`logs.tail`).
La CLI puede hacer lo mismo:

```bash
openclaw logs --follow
```

**Verbose vs. niveles de registro**

- Los **Registros de archivo** se controlan exclusivamente mediante `logging.level`.
- `--verbose` solo afecta la **verbosidad de la consola** (y el estilo de registro WS); **no**
  eleva el nivel de registro del archivo.
- Para capturar detalles exclusivos del modo verbose en los registros de archivo, establezca `logging.level` en `debug` o
  `trace`.

## Captura de consola

La CLI captura `console.log/info/warn/error/debug/trace` y los escribe en los registros de archivo,
mientras que aún se imprimen en stdout/stderr.

Puede ajustar la verbosidad de la consola de forma independiente a través de:

- `logging.consoleLevel` (predeterminado `info`)
- `logging.consoleStyle` (`pretty` | `compact` | `json`)

## Redacción del resumen de herramientas

Los resúmenes de herramientas detallados (p. ej., `🛠️ Exec: ...`) pueden ocultar tokens confidenciales antes de que lleguen a la
flujo de la consola. Esto es **solo para herramientas** y no altera los registros de archivos.

- `logging.redactSensitive`: `off` | `tools` (predeterminado: `tools`)
- `logging.redactPatterns`: matriz de cadenas de regex (anula los valores predeterminados)
  - Use cadenas de expresiones regulares sin procesar (auto `gi`), o `/pattern/flags` si necesita indicadores personalizados.
  - Las coincidencias se enmascaran manteniendo los primeros 6 + los últimos 4 caracteres (longitud >= 18), de lo contrario `***`.
  - Los valores predeterminados cubren asignaciones de claves comunes, indicadores de CLI, campos JSON, encabezados de portador, bloques PEM y prefijos de token populares.

## Registros de WebSocket de la puerta de enlace

La puerta de enlace imprime los registros del protocolo WebSocket en dos modos:

- **Modo normal (sin `--verbose`)**: solo se imprimen los resultados RPC "interesantes":
  - errores (`ok=false`)
  - llamadas lentas (umbral predeterminado: `>= 50ms`)
  - errores de análisis
- **Modo detallado (`--verbose`)**: imprime todo el tráfico de solicitudes/respuestas WS.

### Estilo de registro WS

`openclaw gateway` admite un selector de estilo por puerta de enlace:

- `--ws-log auto` (predeterminado): el modo normal está optimizado; el modo detallado usa una salida compacta
- `--ws-log compact`: salida compacta (solicitud/respuesta emparejada) en modo detallado
- `--ws-log full`: salida completa por trama en modo detallado
- `--compact`: alias para `--ws-log compact`

Ejemplos:

```bash
# optimized (only errors/slow)
openclaw gateway

# show all WS traffic (paired)
openclaw gateway --verbose --ws-log compact

# show all WS traffic (full meta)
openclaw gateway --verbose --ws-log full
```

## Formato de consola (registro de subsistemas)

El formateador de consola es **consciente de TTY** e imprime líneas con prefijo consistentes.
Los registradores de subsistemas mantienen la salida agrupada y escaneable.

Comportamiento:

- **Prefijos de subsistema** en cada línea (p. ej., `[gateway]`, `[canvas]`, `[tailscale]`)
- **Colores de subsistema** (estables por subsistema) más colores de nivel
- **Color cuando la salida es un TTY o el entorno parece un terminal enriquecido** (`TERM`/`COLORTERM`/`TERM_PROGRAM`), respeta `NO_COLOR`
- **Prefijos de subsistema acortados**: elimina `gateway/` inicial + `channels/`, mantiene los últimos 2 segmentos (p. ej., `whatsapp/outbound`)
- **Sub-registradores por subsistema** (prefijo automático + campo estructurado `{ subsystem }`)
- **`logRaw()`** para la salida de QR/UX (sin prefijo, sin formato)
- **Estilos de consola** (p. ej., `pretty | compact | json`)
- **Nivel de registro de consola** separado del nivel de registro de archivo (el archivo mantiene todos los detalles cuando `logging.level` está configurado en `debug`/`trace`)
- **Los cuerpos de los mensajes de WhatsApp** se registran en `debug` (use `--verbose` para verlos)

Esto mantiene los registros de archivo existentes estables mientras hace que el resultado interactivo sea fácil de escanear.

import es from "/components/footer/es.mdx";

<es />
