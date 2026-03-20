---
summary: "SOUL Evil hook (swap SOUL.md with SOUL_EVIL.md)"
read_when:
  - Quieres habilitar o ajustar el hook SOUL Evil
  - Quieres una ventana de purga o un intercambio de personalidad aleatorio
title: "SOUL Evil Hook"
---

# SOUL Evil Hook

El hook SOUL Evil intercambia el contenido `SOUL.md` **inyectado** con `SOUL_EVIL.md` durante
una ventana de purga o por casualidad aleatoria. **No** modifica los archivos en disco.

## Cómo funciona

Cuando `agent:bootstrap` se ejecuta, el hook puede reemplazar el contenido `SOUL.md` en la memoria
antes de que se ensamble el sistema de prompts. Si `SOUL_EVIL.md` falta o está vacío,
OpenClaw registra una advertencia y mantiene el `SOUL.md` normal.

Las ejecuciones de sub-agentes **no** incluyen `SOUL.md` en sus archivos de arranque, por lo que este hook
no tiene ningún efecto en los sub-agentes.

## Habilitar

```bash
openclaw hooks enable soul-evil
```

Luego, configura la configuración:

```json
{
  "hooks": {
    "internal": {
      "enabled": true,
      "entries": {
        "soul-evil": {
          "enabled": true,
          "file": "SOUL_EVIL.md",
          "chance": 0.1,
          "purge": { "at": "21:00", "duration": "15m" }
        }
      }
    }
  }
}
```

Crea `SOUL_EVIL.md` en la raíz del espacio de trabajo del agente (junto a `SOUL.md`).

## Opciones

- `file` (cadena): nombre de archivo SOUL alternativo (predeterminado: `SOUL_EVIL.md`)
- `chance` (número 0–1): probabilidad aleatoria por ejecución de usar `SOUL_EVIL.md`
- `purge.at` (HH:mm): inicio de purga diaria (reloj de 24 horas)
- `purge.duration` (duración): duración de la ventana (ej. `30s`, `10m`, `1h`)

**Precedencia:** la ventana de purga gana sobre la probabilidad.

**Zona horaria:** usa `agents.defaults.userTimezone` cuando se establece; de lo contrario, la zona horaria del host.

## Notas

- No se escriben ni modifican archivos en disco.
- Si `SOUL.md` no está en la lista de arranque, el hook no hace nada.

## Véase también

- [Hooks](/es/hooks)

import en from "/components/footer/en.mdx";

<en />
