---
title: "Tokenjuice"
summary: "Compacta los resultados de herramientas exec y bash ruidosos con un complemento incluido opcional"
read_when:
  - You want shorter `exec` or `bash` tool results in OpenClaw
  - You want to enable the bundled tokenjuice plugin
  - You need to understand what tokenjuice changes and what it leaves raw
---

# Tokenjuice

`tokenjuice` es un complemento incluido opcional que compacta los resultados de herramientas ruidosas `exec` y `bash`
después de que el comando ya se ha ejecutado.

Cambia el `tool_result` devuelto, no el comando en sí. Tokenjuice no
reescribe la entrada del shell, vuelve a ejecutar comandos ni cambia los códigos de salida.

Hoy esto se aplica a las ejecuciones integradas de Pi, donde tokenjuice engancha la ruta
`tool_result` integrada y recorta la salida que vuelve a la sesión.

## Habilitar el complemento

Ruta rápida:

```bash
openclaw config set plugins.entries.tokenjuice.enabled true
```

Equivalente:

```bash
openclaw plugins enable tokenjuice
```

OpenClaw ya incluye el complemento. No hay un paso separado de `plugins install`
o `tokenjuice install openclaw`.

Si prefieres editar la configuración directamente:

```json5
{
  plugins: {
    entries: {
      tokenjuice: {
        enabled: true,
      },
    },
  },
}
```

## Lo que cambia tokenjuice

- Compacta los resultados ruidosos de `exec` y `bash` antes de que se introduzcan nuevamente en la sesión.
- Mantiene la ejecución del comando original sin tocar.
- Conserva las lecturas exactas del contenido de los archivos y otros comandos que tokenjuice debe dejar sin procesar.
- Mantenerse opcional: deshabilita el complemento si deseas una salida literal en todas partes.

## Verificar que funciona

1. Habilita el complemento.
2. Inicia una sesión que pueda llamar a `exec`.
3. Ejecuta un comando ruidoso como `git status`.
4. Verifica que el resultado de la herramienta devuelto sea más corto y más estructurado que la salida del shell sin procesar.

## Deshabilitar el complemento

```bash
openclaw config set plugins.entries.tokenjuice.enabled false
```

O:

```bash
openclaw plugins disable tokenjuice
```
