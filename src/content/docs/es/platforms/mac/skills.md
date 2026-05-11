---
summary: "Interfaz de usuario de configuración de Habilidades de macOS y estado respaldado por gateway"
read_when:
  - Updating the macOS Skills settings UI
  - Changing skills gating or install behavior
title: "Skills (macOS)"
---

La aplicación de macOS expone las habilidades de OpenClaw a través de la puerta de enlace; no analiza las habilidades localmente.

## Fuente de datos

- `skills.status` (puerta de enlace) devuelve todas las habilidades más la elegibilidad y los requisitos faltantes
  (incluidos los bloques de lista de permitidos para las habilidades agrupadas).
- Los requisitos se derivan de `metadata.openclaw.requires` en cada `SKILL.md`.

## Acciones de instalación

- `metadata.openclaw.install` define las opciones de instalación (brew/node/go/uv).
- La aplicación llama a `skills.install` para ejecutar los instaladores en el host de la puerta de enlace.
- Los hallazgos de código peligroso integrados de `critical` bloquean `skills.install` de forma predeterminada; los hallazgos sospechosos solo advierten. La invalidación peligrosa existe en la solicitud de la puerta de enlace, pero el flujo predeterminado de la aplicación permanece cerrado en caso de fallo.
- Si cada opción de instalación es `download`, la puerta de enlace expone todas las opciones
  de descarga.
- De lo contrario, la puerta de enlace elige un instalador preferido utilizando las preferencias
  de instalación actuales y los binarios del host: primero Homebrew cuando
  `skills.install.preferBrew` está habilitado y `brew` existe, luego `uv`, luego el
  administrador de nodos configurado desde `skills.install.nodeManager`, y luego
  alternativas posteriores como `go` o `download`.
- Las etiquetas de instalación de Node reflejan el administrador de nodos configurado, incluyendo `yarn`.

## Claves de entorno/API

- La aplicación almacena las claves en `~/.openclaw/openclaw.json` bajo `skills.entries.<skillKey>`.
- `skills.update` parchea `enabled`, `apiKey` y `env`.

## Modo remoto

- La instalación + las actualizaciones de configuración ocurren en el host de la puerta de enlace (no en el Mac local).

## Relacionado

- [Habilidades](/es/tools/skills)
- [Aplicación macOS](/es/platforms/macos)
