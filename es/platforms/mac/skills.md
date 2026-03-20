---
summary: "Interfaz de usuario de configuración de Skills en macOS y estado respaldado por el gateway"
read_when:
  - Actualizar la interfaz de usuario de configuración de Skills en macOS
  - Cambiar el gating o el comportamiento de instalación de las skills
title: "Skills (macOS)"
---

# Skills (macOS)

La aplicación de macOS expone las skills de OpenClaw a través del gateway; no las analiza localmente.

## Fuente de datos

- `skills.status` (gateway) devuelve todas las skills, además de la elegibilidad y los requisitos faltantes
  (incluidos los bloques de lista de permitidos para las skills incluidas).
- Los requisitos se derivan de `metadata.openclaw.requires` en cada `SKILL.md`.

## Acciones de instalación

- `metadata.openclaw.install` define las opciones de instalación (brew/node/go/uv).
- La aplicación llama a `skills.install` para ejecutar los instaladores en el host del gateway.
- El gateway expone solo un instalador preferido cuando se proporcionan varios
  (brew si está disponible, de lo contrario el gestor de node de `skills.install`, npm por defecto).

## Claves de entorno/API

- La aplicación almacena las claves en `~/.openclaw/openclaw.json` bajo `skills.entries.<skillKey>`.
- `skills.update` aplica parches a `enabled`, `apiKey` y `env`.

## Modo remoto

- La instalación y las actualizaciones de configuración ocurren en el host del gateway (no en el Mac local).

import en from "/components/footer/en.mdx";

<en />
