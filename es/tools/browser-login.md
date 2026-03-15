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

Volver a la documentación principal del navegador: [Navegador](/es/tools/browser).

## ¿Qué perfil de Chrome se utiliza?

OpenClaw controla un **perfil dedicado de Chrome** (denominado `openclaw`, interfaz de usuario de tono naranja). Esto es independiente de su perfil de navegador diario.

Para las llamadas a herramientas de navegador del agente:

- Elección predeterminada: el agente debe usar su navegador aislado `openclaw`.
- Use `profile="user"` solo cuando importen las sesiones iniciadas existentes y el usuario esté en la computadora para hacer clic/aprobar cualquier mensaje de adjunto.
- Use `profile="chrome-relay"` solo para el flujo de adjunto de la extensión de Chrome / botón de la barra de herramientas.
- Si tiene varios perfiles de navegador de usuario, especifique el perfil explícitamente en lugar de adivinar.

Dos formas fáciles de acceder a él:

1. **Pídale al agente que abra el navegador** y luego inicie sesión usted mismo.
2. **Abrirlo a través de CLI**:

```bash
openclaw browser start
openclaw browser open https://x.com
```

Si tiene varios perfiles, pase `--browser-profile <name>` (el valor predeterminado es `openclaw`).

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
