---
summary: "Superficies de registro, registros de archivo, estilos de registro WS y formato de consola"
read_when:
  - Changing logging output or formats
  - Debugging CLI or gateway output
title: "Registro"
---

# Registro

Para una descripción general orientada al usuario (CLI + Interfaz de usuario de control + configuración), consulte [/logging](/es/logging).

OpenClaw tiene dos "superficies" de registro:

- **Salida de consola** (lo que ve en la terminal / Interfaz de usuario de depuración).
- **Registros de archivo** (líneas JSON) escritos por el registrador de puerta de enlace.

## Registrador basado en archivos

- El archivo de registro de rotación predeterminado se encuentra en `/tmp/openclaw/` (un archivo por día): `openclaw-YYYY-MM-DD.log`
  - La fecha utiliza la zona horaria local del host de la puerta de enlace.
- La ruta y el nivel del archivo de registro se pueden configurar a través de `~/.openclaw/openclaw.json`:
  - `logging.file`
  - `logging.level`

El formato de archivo es un objeto JSON por línea.

La pestaña Registros de la interfaz de usuario de control sigue este archivo a través de la puerta de enlace (`logs.tail`).
La CLI puede hacer lo mismo:

```bash
openclaw logs --follow
```

**Detallado frente a niveles de registro**

- Los **registros de archivo** se controlan exclusivamente mediante `logging.level`.
- `--verbose` solo afecta la **verbosidad de la consola** (y el estilo de registro WS); **no**
  eleva el nivel de registro del archivo.
- Para capturar detalles solo detallados en los registros de archivo, establezca `logging.level` en `debug` o
  `trace`.

## Captura de consola

La CLI captura `console.log/info/warn/error/debug/trace` y los escribe en los registros de archivo,
mientras que todavía se imprime en stdout/stderr.

Puede ajustar la verbosidad de la consola de forma independiente a través de:

- `logging.consoleLevel` (predeterminado `info`)
- `logging.consoleStyle` (`pretty` | `compact` | `json`)

## Ocultación del resumen de herramientas

Los resúmenes de herramientas detallados (p. ej., `🛠️ Exec: ...`) pueden ocultar tokens confidenciales antes de que lleguen al
flujo de la consola. Esto es **solo para herramientas** y no altera los registros de archivos.

- `logging.redactSensitive`: `off` | `tools` (predeterminado: `tools`)
- `logging.redactPatterns`: matriz de cadenas de expresiones regulares (anula los valores predeterminados)
  - Use cadenas de regex sin procesar (auto `gi`), o `/pattern/flags` si necesita marcas personalizadas.
  - Las coincidencias se enmascaran manteniendo los primeros 6 + los últimos 4 caracteres (longitud >= 18), de lo contrario `***`.
  - Los valores predeterminados cubren asignaciones de clave comunes, marcas de CLI, campos JSON, encabezados de portador, bloques PEM y prefijos de token populares.

## Registros de WebSocket de la puerta de enlace

La puerta de enlace imprime registros de protocolo WebSocket en dos modos:

- **Modo normal (sin `--verbose`)**: solo se imprimen los resultados de RPC "interesantes":
  - errores (`ok=false`)
  - llamadas lentas (umbral predeterminado: `>= 50ms`)
  - errores de análisis
- **Modo detallado (`--verbose`)**: imprime todo el tráfico de solicitud/respuesta de WS.

### Estilo de registro de WS

`openclaw gateway` admite un interruptor de estilo por puerta de enlace:

- `--ws-log auto` (predeterminado): el modo normal está optimizado; el modo detallado usa una salida compacta
- `--ws-log compact`: salida compacta (solicitud/respuesta emparejada) cuando está detallado
- `--ws-log full`: salida completa por trama cuando está detallado
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

El formateador de la consola es **consciente de TTY** e imprime líneas con prefijo consistentes.
Los registradores de subsistema mantienen la salida agrupada y escaneable.

Comportamiento:

- **Prefijos de subsistema** en cada línea (p. ej., `[gateway]`, `[canvas]`, `[tailscale]`)
- **Colores de subsistema** (estables por subsistema) más coloración por nivel
- **Color cuando la salida es un TTY o el entorno parece un terminal enriquecido** (`TERM`/`COLORTERM`/`TERM_PROGRAM`), respeta `NO_COLOR`
- **Prefijos de subsistema acortados**: elimina el `gateway/` inicial + `channels/`, mantiene los últimos 2 segmentos (p. ej., `whatsapp/outbound`)
- **Sub-registradores por subsistema** (prefijo automático + campo estructurado `{ subsystem }`)
- **`logRaw()`** para la salida de QR/UX (sin prefijo, sin formato)
- **Estilos de consola** (p. ej., `pretty | compact | json`)
- **Nivel de registro de consola** separado del nivel de registro de archivo (el archivo mantiene el detalle completo cuando `logging.level` está establecido en `debug`/`trace`)
- Los **cuerpos de los mensajes de WhatsApp** se registran en `debug` (use `--verbose` para verlos)

Esto mantiene los registros de archivo existentes estables mientras hace que la salida interactiva sea fácil de escanear.

import es from "/components/footer/es.mdx";

<es />
