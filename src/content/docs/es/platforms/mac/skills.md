---
summary: "Interfaz de usuario de configuración de Habilidades de macOS y estado respaldado por gateway"
read_when:
  - Updating the macOS Skills settings UI
  - Changing skills gating or install behavior
title: "Skills (macOS)"
---

# Habilidades (macOS)

La aplicación de macOS expone las habilidades de OpenClaw a través del gateway; no analiza las habilidades localmente.

## Fuente de datos

- `skills.status` (gateway) devuelve todas las habilidades junto con la elegibilidad y los requisitos faltantes
  (incluidos los bloques de lista de permitidos para las habilidades incluidas).
- Los requisitos se derivan de `metadata.openclaw.requires` en cada `SKILL.md`.

## Acciones de instalación

- `metadata.openclaw.install` define las opciones de instalación (brew/node/go/uv).
- La aplicación llama a `skills.install` para ejecutar los instaladores en el host del gateway.
- Bloquea por defecto los hallazgos de código peligroso `critical` `skills.install`; los hallazgos sospechosos solo emiten una advertencia. La anulación de peligro existe en la solicitud de la puerta de enlace, pero el flujo predeterminado de la aplicación permanece cerrado ante fallos (fail-closed).
- La puerta de enlace muestra solo un instalador preferido cuando se proporcionan varios
  (brew cuando está disponible, de lo contrario el gestor de nodos desde `skills.install`, npm predeterminado).

## Claves de entorno/API

- La aplicación almacena las claves en `~/.openclaw/openclaw.json` bajo `skills.entries.<skillKey>`.
- `skills.update` aplica parches a `enabled`, `apiKey` y `env`.

## Modo remoto

- La instalación y las actualizaciones de configuración ocurren en el host de la puerta de enlace (no en el Mac local).
