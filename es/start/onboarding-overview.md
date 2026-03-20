---
summary: "Descripción general de las opciones y flujos de incorporación de OpenClaw"
read_when:
  - Elegir una ruta de incorporación
  - Configurar un nuevo entorno
title: "Descripción general de la incorporación"
sidebarTitle: "Descripción general de la incorporación"
---

# Descripción general de la incorporación

OpenClaw admite múltiples rutas de incorporación dependiendo de dónde se ejecute el Gateway
y de cómo prefieras configurar los proveedores.

## Elige tu ruta de incorporación

- **Incorporación mediante CLI** para macOS, Linux y Windows (mediante WSL2).
- **Aplicación macOS** para una primera ejecución guiada en Mac con Apple silicon o Intel.

## Incorporación mediante CLI

Ejecute la incorporación en una terminal:

```bash
openclaw onboard
```

Utiliza la incorporación por CLI cuando desees tener control total del Gateway, el espacio de trabajo,
los canales y las habilidades. Documentos:

- [Incorporación (CLI)](/es/start/wizard)
- [comando `openclaw onboard`](/es/cli/onboard)

## Incorporación con la aplicación macOS

Usa la aplicación OpenClaw cuando quieras una configuración totalmente guiada en macOS. Documentos:

- [Incorporación (aplicación macOS)](/es/start/onboarding)

## Proveedor personalizado

Si necesitas un punto de conexión que no esté listado, incluidos proveedores alojados que
expongan API estándar de OpenAI o Anthropic, elige **Proveedor personalizado** en la
incorporación por CLI. Se te pedirá que:

- Elijas compatible con OpenAI, compatible con Anthropic o **Desconocido** (detectar automáticamente).
- Ingreses una URL base y una clave de API (si el proveedor lo requiere).
- Proporciones un ID de modelo y un alias opcional.
- Elijas un ID de punto final para que puedan coexistir múltiples puntos finales personalizados.

Para obtener pasos detallados, consulta los documentos de incorporación de CLI anteriores.

import en from "/components/footer/en.mdx";

<en />
