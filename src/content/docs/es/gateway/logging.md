---
summary: "Superficies de registro, registros de archivo, estilos de registro WS y formato de consola"
read_when:
  - Changing logging output or formats
  - Debugging CLI or gateway output
title: "Registro de Gateway"
---

# Registro

Para una descripción general orientada al usuario (CLI + Interfaz de usuario de control + configuración), consulte [/logging](/es/logging).

OpenClaw tiene dos "superficies" de registro:

- **Salida de consola** (lo que ve en la terminal / Interfaz de usuario de depuración).
- **Registros de archivo** (líneas JSON) escritos por el registrador de puerta de enlace.

## Registrador basado en archivos

- El archivo de registro de rotación predeterminado se encuentra en `/tmp/openclaw/` (un archivo por día): `openclaw-YYYY-MM-DD.log`
  - La fecha utiliza la zona horaria local del host de la puerta de enlace.
- Los archivos de registro activos rotan en `logging.maxFileBytes` (predeterminado: 100 MB), manteniendo
  hasta cinco archivos numerados y continuando escribiendo en un archivo activo nuevo.
- La ruta y el nivel del archivo de registro se pueden configurar a través de `~/.openclaw/openclaw.json`:
  - `logging.file`
  - `logging.level`

El formato del archivo es un objeto JSON por línea.

La pestaña Registros (Logs) de la Interfaz de Usuario de Control hace un seguimiento de este archivo a través del gateway (`logs.tail`).
La CLI puede hacer lo mismo:

```bash
openclaw logs --follow
```

**Detallado (Verbose) vs. niveles de registro**

- Los **registros de archivo** se controlan exclusivamente mediante `logging.level`.
- `--verbose` solo afecta la **verbosidad de la consola** (y el estilo de registro WS); **no**
  eleva el nivel de registro del archivo.
- Para capturar detalles solo detallados (verbose) en los registros de archivo, establezca `logging.level` en `debug` o
  `trace`.

## Captura de consola

La CLI captura `console.log/info/warn/error/debug/trace` y los escribe en los registros de archivo,
mientras que sigue imprimiendo en stdout/stderr.

Puede ajustar la verbosidad de la consola de forma independiente a través de:

- `logging.consoleLevel` (predeterminado `info`)
- `logging.consoleStyle` (`pretty` | `compact` | `json`)

## Redacción

OpenClaw puede enmascarar tokens sensibles antes de que la salida del registro o la transcripción salga del
proceso. La misma política de redacción se aplica en la consola, registro de archivo, registro
OTLP y los sumideros de texto de la transcripción de la sesión, por lo que los valores secretos coincidentes se
enmascaran antes de que las líneas JSONL o los mensajes se escriban en el disco.

- `logging.redactSensitive`: `off` | `tools` (predeterminado: `tools`)
- `logging.redactPatterns`: matriz de cadenas de expresiones regulares (anula los valores predeterminados)
  - Use cadenas de expresiones regulares sin procesar (auto `gi`), o `/pattern/flags` si necesita banderas personalizadas.
  - Las coincidencias se enmascaran manteniendo los primeros 6 + últimos 4 caracteres (longitud >= 18), de lo contrario `***`.
  - Los valores predeterminados cubren asignaciones de claves comunes, banderas de CLI, campos JSON, encabezados de portador, bloques PEM y prefijos de tokens populares.

## Registros de WebSocket del Gateway

La puerta de enlace imprime registros del protocolo WebSocket en dos modos:

- **Modo normal (sin `--verbose`)**: solo se imprimen los resultados de RPC "interesantes":
  - errores (`ok=false`)
  - llamadas lentas (umbral predeterminado: `>= 50ms`)
  - errores de análisis
- **Modo detallado (`--verbose`)**: imprime todo el tráfico de solicitud/respuesta de WS.

### Estilo de registro WS

`openclaw gateway` admite un interruptor de estilo por puerta de enlace:

- `--ws-log auto` (predeterminado): el modo normal está optimizado; el modo detallado usa una salida compacta
- `--ws-log compact`: salida compacta (solicitud/respuesta emparejadas) en modo detallado
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

- **Prefijos de subsistema** en cada línea (p. ej. `[gateway]`, `[canvas]`, `[tailscale]`)
- **Colores de subsistema** (estables por subsistema) más coloreado por nivel
- **Color cuando la salida es un TTY o el entorno parece una terminal rica** (`TERM`/`COLORTERM`/`TERM_PROGRAM`), respeta `NO_COLOR`
- **Prefijos de subsistema acortados**: elimina `gateway/` + `channels/` iniciales, mantiene los últimos 2 segmentos (p. ej. `whatsapp/outbound`)
- **Sub-registradores por subsistema** (prefijo automático + campo estructurado `{ subsystem }`)
- **`logRaw()`** para la salida de QR/UX (sin prefijo, sin formato)
- **Estilos de consola** (p. ej. `pretty | compact | json`)
- **Nivel de registro de consola** separado del nivel de registro de archivo (el archivo mantiene el detalle completo cuando `logging.level` está establecido en `debug`/`trace`)
- **Los cuerpos de mensajes de WhatsApp** se registran en `debug` (use `--verbose` para verlos)

Esto mantiene los registros de archivos existentes estables mientras hace que la salida interactiva sea fácil de examinar.

## Relacionado

- [Registro](/es/logging)
- [Exportación de OpenTelemetry](/es/gateway/opentelemetry)
- [Exportación de diagnósticos](/es/gateway/diagnostics)
