---
summary: "Manual logins para la automatización del navegador + publicaciones en X/Twitter"
read_when:
  - You need to log into sites for browser automation
  - You want to post updates to X/Twitter
title: "Inicio de sesión en el navegador"
---

# Inicio de sesión en el navegador + publicaciones en X/Twitter

## Inicio de sesión manual (recomendado)

Cuando un sitio requiera inicio de sesión, **inicie sesión manualmente** en el perfil del navegador **host** (el navegador openclaw).

**No** proporcione sus credenciales al modelo. Los inicios de sesión automatizados a menudo activan defensas anti-bot y pueden bloquear la cuenta.

Volver a la documentación principal del navegador: [Browser](/es/tools/browser).

## ¿Qué perfil de Chrome se utiliza?

OpenClaw controla un **perfil dedicado de Chrome** (denominado `openclaw`, interfaz de usuario de tono naranja). Esto es independiente de su perfil de navegador diario.

Para las llamadas a herramientas de navegador del agente:

- Elección predeterminada: el agente debe usar su navegador aislado `openclaw`.
- Use `profile="user"` solo cuando importen las sesiones iniciadas existentes y el usuario esté en la computadora para hacer clic/aprobar cualquier mensaje de adjunto.
- Si tienes varios perfiles de navegador de usuario, especifica el perfil explícitamente en lugar de adivinar.

Dos formas fáciles de acceder a él:

1. **Pídele al agente que abra el navegador** y luego inicia sesión tú mismo.
2. **Ábrelo a través de la CLI**:

```bash
openclaw browser start
openclaw browser open https://x.com
```

Si tienes varios perfiles, pasa `--browser-profile <name>` (el predeterminado es `openclaw`).

## X/Twitter: flujo recomendado

- **Leer/buscar/hilos:** usa el navegador **host** (inicio de sesión manual).
- **Publicar actualizaciones:** usa el navegador **host** (inicio de sesión manual).

## Sandboxing + acceso al navegador host

Las sesiones de navegador en sandbox **son más propensas** a activar la detección de bots. Para X/Twitter (y otros sitios estrictos), prefiere el navegador **host**.

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

Luego apunta al navegador host:

```bash
openclaw browser open https://x.com --browser-profile openclaw --target host
```

O deshabilita el sandboxing para el agente que publica actualizaciones.

import es from "/components/footer/es.mdx";

<es />
