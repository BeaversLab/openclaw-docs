---
summary: "Referencia de CLI para `openclaw logs` (ver registros de gateway a través de RPC)"
read_when:
  - You need to tail Gateway logs remotely (without SSH)
  - You want JSON log lines for tooling
title: "Registros"
---

# `openclaw logs`

Ver los registros de archivo de Gateway a través de RPC (funciona en modo remoto).

Relacionado:

- Resumen de registro: [Logging](/es/logging)
- CLI de Gateway: [gateway](/es/cli/gateway)

## Opciones

- `--limit <n>`: número máximo de líneas de registro a devolver (por defecto `200`)
- `--max-bytes <n>`: bytes máximos a leer del archivo de registro (por defecto `250000`)
- `--follow`: seguir el flujo de registros
- `--interval <ms>`: intervalo de sondeo mientras se sigue (por defecto `1000`)
- `--json`: emitir eventos JSON delimitados por línea
- `--plain`: salida de texto sin formato sin formato con estilo
- `--no-color`: desactivar colores ANSI
- `--local-time`: muestra las marcas de tiempo en su zona horaria local (predeterminado)
- `--utc`: muestra las marcas de tiempo en UTC

## Opciones compartidas de RPC de Gateway

`openclaw logs` también acepta los indicadores estándar del cliente de Gateway:

- `--url <url>`: URL de WebSocket de Gateway
- `--token <token>`: token de Gateway
- `--timeout <ms>`: tiempo de espera en ms (predeterminado `30000`)
- `--expect-final`: espera una respuesta final cuando la llamada a Gateway está respaldada por un agente

Cuando pasa `--url`, la CLI no aplica automáticamente las credenciales de configuración o del entorno. Incluya `--token` explícitamente si el Gateway de destino requiere autenticación.

## Ejemplos

```bash
openclaw logs
openclaw logs --follow
openclaw logs --follow --interval 2000
openclaw logs --limit 500 --max-bytes 500000
openclaw logs --json
openclaw logs --plain
openclaw logs --no-color
openclaw logs --limit 500
openclaw logs --local-time
openclaw logs --utc
openclaw logs --follow --local-time
openclaw logs --url ws://127.0.0.1:18789 --token "$OPENCLAW_GATEWAY_TOKEN"
```

## Notas

- Las marcas de tiempo se muestran en su zona horaria local de forma predeterminada. Use `--utc` para la salida en UTC.
- Si el Gateway de bucle de retorno local implícito solicita emparejamiento, se cierra durante la conexión o agota el tiempo de espera antes de que `logs.tail` responda, `openclaw logs` vuelve automáticamente al archivo de registro del Gateway configurado. Los objetivos explícitos `--url` no usan esta alternativa.
- `openclaw logs --follow` no sigue las alternativas de archivos configurados después de fallas de RPC de Gateway local implícitas. En Linux, usa el diario de Gateway de usuario-systemd activo por PID cuando está disponible e imprime la fuente de registro seleccionada; de lo contrario, sigue reintentando el Gateway en vivo en lugar de seguir un archivo paralelo potencialmente obsoleto.
- Al usar `--follow`, las desconexiones transitorias del gateway (cierre de WebSocket, tiempo de espera, caída de conexión) activan una reconexión automática con retroceso exponencial (hasta 8 reintentos, limitados a 30 s entre intentos). Se imprime una advertencia en stderr en cada reintento y se imprime un aviso `[logs] gateway reconnected` una vez que una encuesta tiene éxito. En modo `--json`, tanto la advertencia de reintento como la transición de reconexión se emiten como registros `{"type":"notice"}` en stderr. Los errores irrecuperables (fallo de autenticación, configuración incorrecta) aún salen inmediatamente.

## Relacionado

- [Referencia de la CLI](/es/cli)
- [Registro de Gateway](/es/gateway/logging)
