---
summary: "Superficies de registro, registros de archivo, estilos de registro WS y formato de consola"
read_when:
  - Changing logging output or formats
  - Debugging CLI or gateway output
title: "Registro de Gateway"
---

# Registro

Para obtener una descripción general orientada al usuario (CLI + Interfaz de usuario de control + configuración), consulte [/logging](/es/logging).

OpenClaw tiene dos "superficies" de registro:

- **Salida de consola** (lo que ve en la terminal / Interfaz de usuario de depuración).
- **Registros de archivo** (líneas JSON) escritos por el registrador de puerta de enlace.

Al iniciarse, el Gateway registra el modelo de agente predeterminado resuelto junto con los
predeterminados del modo que afectan a las nuevas sesiones, por ejemplo:

```text
agent model: openai-codex/gpt-5.5 (thinking=medium, fast=on)
```

`thinking` proviene del agente predeterminado, los parámetros del modelo o el agente global predeterminado;
cuando no está configurado, el resumen de inicio muestra `medium`. `fast` proviene del
agente predeterminado o del modelo `fastMode` parámetros.

## Registrador basado en archivos

- El archivo de registro rotativo predeterminado está en `/tmp/openclaw/` (un archivo por día): `openclaw-YYYY-MM-DD.log`
  - La fecha utiliza la zona horaria local del host de la puerta de enlace.
- Los archivos de registro activos rotan en `logging.maxFileBytes` (predeterminado: 100 MB), manteniendo
  hasta cinco archivos numerados y continuando escribiendo un archivo activo nuevo.
- La ruta y el nivel del archivo de registro se pueden configurar mediante `~/.openclaw/openclaw.json`:
  - `logging.file`
  - `logging.level`

El formato del archivo es un objeto JSON por línea.

Las rutas de código de conversación, voz en tiempo real y sala administrada utilizan el registrador de archivos compartido para
registros del ciclo de vida acotado. Estos registros están destinados a la depuración operativa
y a la exportación de registros OTLP; el texto de la transcripción, las cargas de audio, los identificadores de turno, los identificadores de llamada y los
identificadores de elemento del proveedor no se copian en el registro.

La pestaña Registros de la Interfaz de usuario de control sigue este archivo a través de la puerta de enlace (`logs.tail`).
La CLI puede hacer lo mismo:

```bash
openclaw logs --follow
```

**Detallado vs. niveles de registro**

- Los **registros de archivos** se controlan exclusivamente mediante `logging.level`.
- `--verbose` solo afecta el **detalle de la consola** (y el estilo de registro WS); **no**
  eleva el nivel de registro del archivo.
- Para capturar detalles solo detallados en los registros de archivo, establezca `logging.level` en `debug` o
  `trace`.
- El registro de traza también incluye resúmenes de tiempo de diagnóstico para rutas críticas seleccionadas,
  como la preparación de la fábrica de herramientas de complementos. Consulte
  [/tools/plugin#slow-plugin-tool-setup](/es/tools/plugin#slow-plugin-tool-setup).

## Captura de consola

La CLI captura `console.log/info/warn/error/debug/trace` y las escribe en los registros de archivos,
mientras que todavía se imprime en stdout/stderr.

Puede ajustar la verbosidad de la consola de forma independiente a través de:

- `logging.consoleLevel` (por defecto `info`)
- `logging.consoleStyle` (`pretty` | `compact` | `json`)

## Redacción

OpenClaw puede ofuscar tokens sensibles antes de que la salida del registro o la transcripción salga del
proceso. Esta política de redacción de registros se aplica a la consola, al registro de archivos, a los registros
OTLP y a los receptores de texto de la transcripción de la sesión, por lo que los valores secretos coincidentes se
ofuscan antes de que se escriban líneas o mensajes JSONL en el disco.

- `logging.redactSensitive`: `off` | `tools` (predeterminado: `tools`)
- `logging.redactPatterns`: matriz de cadenas de regex (anula los valores predeterminados)
  - Use cadenas de regex sin procesar (auto `gi`), o `/pattern/flags` si necesita indicadores personalizados.
  - Las coincidencias se ofuscan manteniendo los primeros 6 + los últimos 4 caracteres (longitud >= 18); de lo contrario, `***`.
  - Los valores predeterminados cubren asignaciones de clave comunes, indicadores de CLI, campos JSON, encabezados de portador, bloques PEM, prefijos de token populares y nombres de campo de credenciales de pago, como número de tarjeta, CVC/CVV, token de pago compartido y credencial de pago.

Algunos límites de seguridad siempre redactan independientemente de `logging.redactSensitive`.
Eso incluye eventos de llamadas a herramientas de la interfaz de usuario de control, salida de herramientas `sessions_history`,
exportaciones de soporte de diagnóstico, observaciones de errores del proveedor, visualización de comandos de aprobación de ejecución
y registros de protocolo WebSocket de la puerta de enlace. Estas superficies aún pueden usar
`logging.redactPatterns` como patrones adicionales, pero `redactSensitive: "off"`
no hace que emitan secretos sin procesar.

## Registros de WebSocket de la puerta de enlace

La puerta de enlace imprime registros de protocolo WebSocket en dos modos:

- **Modo normal (sin `--verbose`)**: solo se imprimen resultados RPC "interesantes":
  - errores (`ok=false`)
  - llamadas lentas (umbral predeterminado: `>= 50ms`)
  - errores de análisis
- **Modo detallado (`--verbose`)**: imprime todo el tráfico de solicitud/respuesta de WS.

### Estilo de registro de WS

`openclaw gateway` admite un conmutador de estilo por puerta de enlace:

- `--ws-log auto` (predeterminado): el modo normal está optimizado; el modo detallado usa una salida compacta
- `--ws-log compact`: salida compacta (solicitud/respuesta emparejada) cuando es detallado
- `--ws-log full`: salida completa por fotograma cuando es detallado
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

- **Prefijos de subsistema** en cada línea (por ejemplo, `[gateway]`, `[canvas]`, `[tailscale]`)
- **Colores de subsistema** (estables por subsistema) más coloreado por nivel
- **Color cuando la salida es un TTY o el entorno parece una terminal rica** (`TERM`/`COLORTERM`/`TERM_PROGRAM`), respeta `NO_COLOR`
- **Prefijos de subsistema acortados**: elimina `gateway/` + `channels/` al principio, mantiene los últimos 2 segmentos (por ejemplo, `whatsapp/outbound`)
- **Sub-registradores por subsistema** (prefijo automático + campo estructurado `{ subsystem }`)
- **`logRaw()`** para la salida de QR/UX (sin prefijo, sin formato)
- **Estilos de consola** (por ejemplo, `pretty | compact | json`)
- **Nivel de registro de consola** separado del nivel de registro de archivo (el archivo mantiene todos los detalles cuando `logging.level` está configurado en `debug`/`trace`)
- **Los cuerpos de los mensajes de WhatsApp** se registran en `debug` (use `--verbose` para verlos)

Esto mantiene los registros de archivo existentes estables mientras hace que la salida interactiva sea escaneable.

## Relacionado

- [Registro](/es/logging)
- [Exportación de OpenTelemetry](/es/gateway/opentelemetry)
- [Exportación de diagnósticos](/es/gateway/diagnostics)
