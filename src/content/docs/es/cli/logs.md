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

- Resumen de registros: [Registro](/es/logging)
- CLI de Gateway: [gateway](/es/cli/gateway)

## Opciones

- `--limit <n>`: número máximo de líneas de registro a devolver (por defecto `200`)
- `--max-bytes <n>`: bytes máximos a leer del archivo de registro (por defecto `250000`)
- `--follow`: seguir el flujo de registros
- `--interval <ms>`: intervalo de sondeo mientras se sigue (por defecto `1000`)
- `--json`: emitir eventos JSON delimitados por línea
- `--plain`: salida de texto sin formato sin formato con estilo
- `--no-color`: desactivar colores ANSI
- `--local-time`: renderizar marcas de tiempo en su zona horaria local

## Opciones RPC de Gateway compartidas

`openclaw logs` también acepta los indicadores de cliente estándar de Gateway:

- `--url <url>`: URL de WebSocket de Gateway
- `--token <token>`: token de Gateway
- `--timeout <ms>`: tiempo de espera en ms (por defecto `30000`)
- `--expect-final`: esperar una respuesta final cuando la llamada a Gateway está respaldada por un agente

Cuando pasa `--url`, la CLI no aplica automáticamente la configuración ni las credenciales del entorno. Incluya `--token` explícitamente si el Gateway de destino requiere autenticación.

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
openclaw logs --follow --local-time
openclaw logs --url ws://127.0.0.1:18789 --token "$OPENCLAW_GATEWAY_TOKEN"
```

## Notas

- Use `--local-time` para renderizar marcas de tiempo en su zona horaria local.
- Si el Gateway de loopback local implícito solicita emparejamiento, se cierra durante la conexión o agota el tiempo de espera antes de que `logs.tail` responda, `openclaw logs` recurre automáticamente al archivo de registro del Gateway configurado. Los destinos `--url` explícitos no utilizan esta alternativa.
- `openclaw logs --follow` no sigue las alternativas de archivos configuradas después de fallos implícitos de RPC de Gateway local. En Linux, usa el diario de Gateway del usuario systemd activo por PID cuando está disponible e imprime la fuente de registro seleccionada; de lo contrario, sigue reintentando el Gateway activo en lugar de hacer seguimiento de un archivo paralelo potencialmente obsoleto.
- Al usar `--follow`, las desconexiones transitorias del gateway (cierre de WebSocket, tiempo de espera, caída de conexión) activan la reconexión automática con retroceso exponencial (hasta 8 reintentos, limitados a 30 s entre intentos). Se imprime una advertencia en stderr en cada reintento y se imprime un aviso de `[logs] gateway reconnected` una vez que una encuesta tiene éxito. En el modo `--json`, tanto la advertencia de reintento como la transición de reconexión se emiten como registros `{"type":"notice"}` en stderr. Los errores irrecuperables (fallo de autenticación, configuración incorrecta) siguen saliendo inmediatamente.

## Relacionado

- [Referencia de CLI](/es/cli)
- [Registro de Gateway](/es/gateway/logging)
