---
summary: "Descripción general de las opciones y flujos de incorporación de OpenClaw"
read_when:
  - Choosing an onboarding path
  - Setting up a new environment
title: "Descripción general de la incorporación"
sidebarTitle: "Descripción general de la incorporación"
---

# Descripción general de la incorporación

OpenClaw admite múltiples rutas de incorporación dependiendo de dónde se ejecute el Gateway
de cómo prefieras configurar los proveedores.

## Elige tu ruta de incorporación

- **Asistente de CLI** para macOS, Linux y Windows (a través de WSL2).
- **Aplicación macOS** para una primera ejecución guiada en Mac con Apple silicon o Intel.

## Asistente de incorporación de CLI

Ejecuta el asistente en una terminal:

```bash
openclaw onboard
```

Usa el asistente de CLI cuando quieras tener control total del Gateway, espacio de trabajo,
canales y habilidades. Documentos:

- [Asistente de incorporación (CLI)](/es/start/wizard)
- [comando `openclaw onboard`](/es/cli/onboard)

## Incorporación con la aplicación macOS

Usa la aplicación OpenClaw cuando quieras una configuración totalmente guiada en macOS. Documentos:

- [Incorporación (Aplicación macOS)](/es/start/onboarding)

## Proveedor personalizado

Si necesitas un punto final que no esté en la lista, incluidos los proveedores alojados que
expongan API estándar de OpenAI o Anthropic, elige **Proveedor personalizado** en el
asistente de CLI. Se te pedirá que:

- Elijas compatible con OpenAI, compatible con Anthropic o **Desconocido** (detectar automáticamente).
- Ingreses una URL base y una clave de API (si el proveedor lo requiere).
- Proporciones un ID de modelo y un alias opcional.
- Elijas un ID de punto final para que puedan coexistir múltiples puntos finales personalizados.

Para obtener pasos detallados, consulta los documentos de incorporación de CLI anteriores.

import es from "/components/footer/es.mdx";

<es />
