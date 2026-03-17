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

- **Incorporación mediante CLI** para macOS, Linux y Windows (mediante WSL2).
- **Aplicación macOS** para una primera ejecución guiada en Mac con Apple silicon o Intel.

## Incorporación mediante CLI

Ejecute la incorporación en una terminal:

```bash
openclaw onboard
```

Utilice la incorporación mediante CLI cuando desee tener control total de la Gateway, el área de trabajo,
los canales y las aptitudes. Documentación:

- [Incorporación (CLI)](/es/start/wizard)
- [comando `openclaw onboard`](/es/cli/onboard)

## Incorporación con la aplicación macOS

Usa la aplicación OpenClaw cuando quieras una configuración totalmente guiada en macOS. Documentos:

- [Incorporación (Aplicación macOS)](/es/start/onboarding)

## Proveedor personalizado

Si necesita un punto de conexión que no esté en la lista, incluidos los proveedores alojados que
exponen API estándar de OpenAI o Anthropic, elija **Proveedor personalizado** en la
incorporación mediante CLI. Se le pedirá que:

- Elijas compatible con OpenAI, compatible con Anthropic o **Desconocido** (detectar automáticamente).
- Ingreses una URL base y una clave de API (si el proveedor lo requiere).
- Proporciones un ID de modelo y un alias opcional.
- Elijas un ID de punto final para que puedan coexistir múltiples puntos finales personalizados.

Para obtener pasos detallados, consulta los documentos de incorporación de CLI anteriores.

import es from "/components/footer/es.mdx";

<es />
