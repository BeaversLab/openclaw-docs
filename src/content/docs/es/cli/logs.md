---
summary: "Referencia de CLI para `openclaw logs` (ver registros de gateway a través de RPC)"
read_when:
  - You need to tail Gateway logs remotely (without SSH)
  - You want JSON log lines for tooling
title: "registros"
---

# `openclaw logs`

Ver los registros de archivo de Gateway a través de RPC (funciona en modo remoto).

Relacionado:

- Resumen de registros: [Registros](/en/logging)
- CLI de Gateway: [gateway](/en/cli/gateway)

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
- Si el Gateway de bucle invertido local solicita emparejamiento, `openclaw logs` recurre automáticamente al archivo de registro local configurado. Los destinos explícitos `--url` no utilizan esta reserva.
