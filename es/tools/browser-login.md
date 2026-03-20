---
summary: "Inicio de sesión manual para la automatización del navegador + publicación en X/Twitter"
read_when:
  - Necesitas iniciar sesión en sitios para la automatización del navegador
  - Quieres publicar actualizaciones en X/Twitter
title: "Inicio de sesión en el navegador"
---

# Inicio de sesión en el navegador + publicación en X/Twitter

## Inicio de sesión manual (recomendado)

Cuando un sitio requiera inicio de sesión, **inicia sesión manualmente** en el perfil del navegador **host** (el navegador openclaw).

**No** le des tus credenciales al modelo. Los inicios de sesión automatizados a menudo activan defensas anti-bot y pueden bloquear la cuenta.

Volver a los documentos principales del navegador: [Browser](/es/tools/browser).

## ¿Qué perfil de Chrome se utiliza?

OpenClaw controla un **perfil de Chrome dedicado** (con el nombre `openclaw`, interfaz de usuario de tono naranja). Esto está separado de tu perfil de navegador diario.

Para las llamadas a herramientas del navegador del agente:

- Elección predeterminada: el agente debe usar su navegador aislado `openclaw`.
- Usa `profile="user"` solo cuando las sesiones iniciadas existentes importen y el usuario esté en la computadora para hacer clic/aprobar cualquier mensaje de adjuntar.
- Si tiene varios perfiles de navegador de usuario, especifique el perfil explícitamente en lugar de adivinar.

Dos formas fáciles de acceder a él:

1. **Pídale al agente que abra el navegador** y luego inicie sesión usted mismo.
2. **Abrirlo a través de CLI**:

```bash
openclaw browser start
openclaw browser open https://x.com
```

Si tienes varios perfiles, pasa `--browser-profile <name>` (el predeterminado es `openclaw`).

## X/Twitter: flujo recomendado

- **Leer/buscar/hilos:** use el navegador **host** (inicio de sesión manual).
- **Publicar actualizaciones:** use el navegador **host** (inicio de sesión manual).

## Sandboxeo + acceso al navegador host

Las sesiones de navegador en sandbox tienen **más probabilidades** de activar la detección de bots. Para X/Twitter (y otros sitios estrictos), prefiera el navegador **host**.

Si el agente está en sandbox, la herramienta del navegador usa el sandbox de forma predeterminada. Para permitir el control del host:

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "non-main",
        browser: {
          allowHostControl: true,
        },
      },
    },
  },
}
```

Luego apunte al navegador host:

```bash
openclaw browser open https://x.com --browser-profile openclaw --target host
```

O desactive el sandboxeo para el agente que publica actualizaciones.

import es from "/components/footer/es.mdx";

<es />
