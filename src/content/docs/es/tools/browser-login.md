---
summary: "Manual logins para la automatización del navegador + publicaciones en X/Twitter"
read_when:
  - You need to log into sites for browser automation
  - You want to post updates to X/Twitter
title: "Inicio de sesión en el navegador"
---

## Inicio de sesión manual (recomendado)

Cuando un sitio requiera inicio de sesión, **inicie sesión manualmente** en el perfil del navegador **host** (el navegador openclaw).

**No** proporcione sus credenciales al modelo. Los inicios de sesión automatizados a menudo activan defensas anti-bots y pueden bloquear la cuenta.

Volver a la documentación principal del navegador: [Browser](/es/tools/browser).

## ¿Qué perfil de Chrome se utiliza?

OpenClaw controla un **perfil dedicado de Chrome** (denominado `openclaw`, interfaz de usuario de tono naranja). Esto está separado de su perfil de navegador diario.

Para las llamadas a herramientas del navegador del agente:

- Elección predeterminada: el agente debe usar su navegador `openclaw` aislado.
- Use `profile="user"` solo cuando las sesiones iniciadas existentes importen y el usuario esté en la computadora para hacer clic/aprobar cualquier prompt de adjuntar.
- Si tiene varios perfiles de navegador de usuario, especifique el perfil explícitamente en lugar de adivinar.

Dos formas fáciles de acceder a él:

1. **Pida al agente que abra el navegador** y luego inicie sesión usted mismo.
2. **Ábralo a través de CLI**:

```bash
openclaw browser start
openclaw browser open https://x.com
```

Si tiene varios perfiles, pase `--browser-profile <name>` (el predeterminado es `openclaw`).

## X/Twitter: flujo recomendado

- **Leer/buscar/hilos:** use el navegador **host** (inicio de sesión manual).
- **Publicar actualizaciones:** use el navegador **host** (inicio de sesión manual).

## Sandboxing + acceso al navegador host

Las sesiones del navegador en sandbox son **más probables** de activar la detección de bots. Para X/Twitter (y otros sitios estrictos), prefiera el navegador **host**.

Si el agente está en sandbox, la herramienta del navegador usa el sandbox por defecto. Para permitir el control del host:

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

A continuación, abra el navegador del host usted mismo (las invocaciones de CLI siempre se ejecutan contra el navegador del host):

```bash
openclaw browser open https://x.com --browser-profile openclaw
```

Las llamadas a la herramienta `browser` del agente pueden entonces dirigirse al host una vez que se establece `sandbox.browser.allowHostControl: true`. Alternativamente, desactive el sandboxing para el agente que publica actualizaciones.

## Relacionado

- [Browser](/es/tools/browser)
- [Solución de problemas del navegador en Linux](/es/tools/browser-linux-troubleshooting)
- [Solución de problemas del navegador en WSL2](/es/tools/browser-wsl2-windows-remote-cdp-troubleshooting)
