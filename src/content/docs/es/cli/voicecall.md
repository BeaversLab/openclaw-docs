---
summary: "Referencia de la CLI para `openclaw voicecall` (superficie de comando del complemento voice-call)"
read_when:
  - You use the voice-call plugin and want every CLI entry point
  - You need flag tables and defaults for setup, smoke, call, continue, speak, dtmf, end, status, tail, latency, expose, and start
title: "Llamada de voz"
---

# `openclaw voicecall`

`voicecall` es un comando proporcionado por un complemento. Solo aparece cuando el complemento de llamada de voz está instalado y habilitado.

Cuando el Gateway se está ejecutando, los comandos operativos (`call`, `start`, `continue`, `speak`, `dtmf`, `end`, `status`) se enrutan al tiempo de ejecución de llamada de voz de ese Gateway. Si no se puede alcanzar ningún Gateway, recurren a un tiempo de ejecución de CLI independiente.

## Subcomandos

```bash
openclaw voicecall setup    [--json]
openclaw voicecall smoke    [-t <phone>] [--message <text>] [--mode <m>] [--yes] [--json]
openclaw voicecall call     -m <text> [-t <phone>] [--mode <m>]
openclaw voicecall start    --to <phone> [--message <text>] [--mode <m>]
openclaw voicecall continue --call-id <id> --message <text>
openclaw voicecall speak    --call-id <id> --message <text>
openclaw voicecall dtmf     --call-id <id> --digits <digits>
openclaw voicecall end      --call-id <id>
openclaw voicecall status   [--call-id <id>] [--json]
openclaw voicecall tail     [--file <path>] [--since <n>] [--poll <ms>]
openclaw voicecall latency  [--file <path>] [--last <n>]
openclaw voicecall expose   [--mode <m>] [--path <p>] [--port <port>] [--serve-path <p>]
```

| Subcomando | Descripción                                                                                      |
| ---------- | ------------------------------------------------------------------------------------------------ |
| `setup`    | Mostrar comprobaciones de preparación del proveedor y del webhook.                               |
| `smoke`    | Ejecutar comprobaciones de preparación; realizar una llamada de prueba en vivo solo con `--yes`. |
| `call`     | Iniciar una llamada de voz saliente.                                                             |
| `start`    | Alias para `call` con `--to` obligatorio y `--message` opcional.                                 |
| `continue` | Hablar un mensaje y esperar la siguiente respuesta.                                              |
| `speak`    | Hablar un mensaje sin esperar una respuesta.                                                     |
| `dtmf`     | Enviar dígitos DTMF a una llamada activa.                                                        |
| `end`      | Colgar una llamada activa.                                                                       |
| `status`   | Inspeccionar llamadas activas (o una por `--call-id`).                                           |
| `tail`     | Seguir `calls.jsonl` (útil durante las pruebas del proveedor).                                   |
| `latency`  | Resumir las métricas de latencia de turno desde `calls.jsonl`.                                   |
| `expose`   | Alternar Tailscale serve/funnel para el endpoint del webhook.                                    |

## Configuración y prueba

### `setup`

Imprime comprobaciones de preparación legibles por humanos por defecto. Pasa `--json` para scripts.

```bash
openclaw voicecall setup
openclaw voicecall setup --json
```

### `smoke`

Ejecuta las mismas comprobaciones de preparación. No realizará una llamada telefónica real a menos que tanto `--to` como `--yes` estén presentes.

| Opción             | Predeterminado                    | Descripción                                               |
| ------------------ | --------------------------------- | --------------------------------------------------------- |
| `-t, --to <phone>` | (ninguno)                         | Número de teléfono al que llamar para una prueba en vivo. |
| `--message <text>` | `OpenClaw voice call smoke test.` | Mensaje que decir durante la llamada de prueba.           |
| `--mode <mode>`    | `notify`                          | Modo de llamada: `notify` o `conversation`.               |
| `--yes`            | `false`                           | Realmente realiza la llamada saliente en vivo.            |
| `--json`           | `false`                           | Imprime JSON legible por máquina.                         |

```bash
openclaw voicecall smoke
openclaw voicecall smoke --to "+15555550123"        # dry run
openclaw voicecall smoke --to "+15555550123" --yes  # live notify call
```

<Note>Para proveedores externos (`twilio`, `telnyx`, `plivo`), `setup` y `smoke` requieren una URL de webhook pública de `publicUrl`, un túnel o exposición a través de Tailscale. Se rechaza una alternativa de bucle de retorno o servidor privado porque las operadoras no pueden alcanzarla.</Note>

## Ciclo de vida de la llamada

### `call`

Iniciar una llamada de voz saliente.

| Opción                 | Obligatorio | Predeterminado    | Descripción                                                                                 |
| ---------------------- | ----------- | ----------------- | ------------------------------------------------------------------------------------------- |
| `-m, --message <text>` | sí          | (ninguno)         | Mensaje que decir cuando se conecta la llamada.                                             |
| `-t, --to <phone>`     | no          | config `toNumber` | Número de teléfono E.164 al que llamar.                                                     |
| `--mode <mode>`        | no          | `conversation`    | Modo de llamada: `notify` (colgar después del mensaje) o `conversation` (mantener abierta). |

```bash
openclaw voicecall call --to "+15555550123" --message "Hello"
openclaw voicecall call -m "Heads up" --mode notify
```

### `start`

Alias para `call` con una forma de opción predeterminada diferente.

| Opción             | Obligatorio | Predeterminado | Descripción                                     |
| ------------------ | ----------- | -------------- | ----------------------------------------------- |
| `--to <phone>`     | sí          | (ninguno)      | Número de teléfono al que llamar.               |
| `--message <text>` | no          | (ninguno)      | Mensaje que decir cuando se conecta la llamada. |
| `--mode <mode>`    | no          | `conversation` | Modo de llamada: `notify` o `conversation`.     |

### `continue`

Decir un mensaje y esperar una respuesta.

| Opción             | Obligatorio | Descripción      |
| ------------------ | ----------- | ---------------- |
| `--call-id <id>`   | sí          | ID de llamada.   |
| `--message <text>` | sí          | Mensaje a decir. |

### `speak`

Hablar un mensaje sin esperar una respuesta.

| Opción             | Obligatorio | Descripción      |
| ------------------ | ----------- | ---------------- |
| `--call-id <id>`   | sí          | ID de llamada.   |
| `--message <text>` | sí          | Mensaje a decir. |

### `dtmf`

Enviar dígitos DTMF a una llamada activa.

| Opción              | Obligatorio | Descripción                                  |
| ------------------- | ----------- | -------------------------------------------- |
| `--call-id <id>`    | sí          | ID de llamada.                               |
| `--digits <digits>` | sí          | Dígitos DTMF (ej. `ww123456#` para esperas). |

### `end`

Colgar una llamada activa.

| Opción           | Obligatorio | Descripción    |
| ---------------- | ----------- | -------------- |
| `--call-id <id>` | sí          | ID de llamada. |

### `status`

Inspeccionar llamadas activas.

| Opción           | Predeterminado | Descripción                         |
| ---------------- | -------------- | ----------------------------------- |
| `--call-id <id>` | (ninguno)      | Restringir la salida a una llamada. |
| `--json`         | `false`        | Imprimir JSON legible por máquina.  |

```bash
openclaw voicecall status
openclaw voicecall status --json
openclaw voicecall status --call-id <id>
```

## Registros y métricas

### `tail`

Ver el registro JSONL de voice-call. Imprime las últimas `--since` líneas al inicio, luego transmite las nuevas líneas a medida que se escriben.

| Opción          | Predeterminado                           | Descripción                                        |
| --------------- | ---------------------------------------- | -------------------------------------------------- |
| `--file <path>` | resuelto desde la tienda de complementos | Ruta a `calls.jsonl`.                              |
| `--since <n>`   | `25`                                     | Líneas a imprimir antes de iniciar el seguimiento. |
| `--poll <ms>`   | `250` (mínimo 50)                        | Intervalo de sondeo en milisegundos.               |

### `latency`

Resumir las métricas de latencia de turno y espera de escucha de `calls.jsonl`. La salida es JSON con resúmenes de `recordsScanned`, `turnLatency` y `listenWait`.

| Opción          | Predeterminado                           | Descripción                               |
| --------------- | ---------------------------------------- | ----------------------------------------- |
| `--file <path>` | resuelto desde la tienda de complementos | Ruta a `calls.jsonl`.                     |
| `--last <n>`    | `200` (mínimo 1)                         | Número de registros recientes a analizar. |

## Exponer webhooks

### `expose`

Habilitar, deshabilitar o cambiar la configuración de serve/funnel de Tailscale para el webhook de voz.

| Opción                | Predeterminado                           | Descripción                                    |
| --------------------- | ---------------------------------------- | ---------------------------------------------- |
| `--mode <mode>`       | `funnel`                                 | `off`, `serve` (tailnet) o `funnel` (público). |
| `--path <path>`       | config `tailscale.path` o `--serve-path` | Ruta de Tailscale a exponer.                   |
| `--port <port>`       | config `serve.port` o `3334`             | Puerto local del webhook.                      |
| `--serve-path <path>` | config `serve.path` o `/voice/webhook`   | Ruta local del webhook.                        |

```bash
openclaw voicecall expose --mode serve
openclaw voicecall expose --mode funnel
openclaw voicecall expose --mode off
```

<Warning>Solo exponga el endpoint del webhook a redes de confianza. Prefiera Tailscale Serve antes que Funnel cuando sea posible.</Warning>

## Relacionado

- [Referencia de la CLI](/es/cli)
- [Complemento de voz](/es/plugins/voice-call)
