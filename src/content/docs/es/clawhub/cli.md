---
summary: "Puntos de entrada de la CLI de ClawHub para descubrir, instalar, publicar y verificar habilidades y complementos de OpenClaw."
read_when:
  - You want to use ClawHub from the command line
  - You want to install ClawHub skills or plugins through OpenClaw
  - You want to publish ClawHub packages
title: "CLI de ClawHub"
---

# CLI de ClawHub

OpenClaw tiene dos puntos de entrada de línea de comandos para ClawHub:

- `openclaw skills` y `openclaw plugins` instalan y gestionan paquetes de ClawHub
  dentro de OpenClaw.
- La CLI independiente `clawhub` gestiona flujos de trabajo de editor, como inicio de sesión,
  publicación, transferencia y sincronización.

## Descubrir e instalar

Utilice los comandos de OpenClaw cuando desee instalar o actualizar paquetes para un agente
local de OpenClaw o para Gateway.

```bash
openclaw skills search "calendar"
openclaw skills install <slug>
openclaw skills update <slug>
openclaw skills verify <slug>

openclaw plugins search "calendar"
openclaw plugins install clawhub:<package>
openclaw plugins update <id-or-npm-spec>
```

Las instalaciones de habilidades apuntan al directorio del espacio de trabajo activo `skills/` de manera predeterminada. Añada
`--global` para instalar en el directorio compartido de habilidades administradas.

Las instalaciones de complementos utilizan el prefijo `clawhub:` cuando desea la resolución de ClawHub
en lugar de npm u otra fuente de instalación.

## Publicar y mantener

Instale la CLI independiente de ClawHub para los flujos de trabajo de editor:

```bash
npm i -g clawhub
clawhub login
```

Publique paquetes de complementos con `clawhub package publish`:

```bash
clawhub package publish your-org/your-plugin --dry-run
clawhub package publish your-org/your-plugin
clawhub package publish your-org/your-plugin@v1.0.0
```

Publique carpetas de habilidades con `clawhub skill publish`:

```bash
clawhub skill publish ./skills/review-helper
clawhub skill publish ./skills/review-helper --version 1.0.0
```

Cuando el estado de escaneo de habilidades locales o la propiedad del paquete necesiten mantenimiento, utilice el
comando independiente relevante:

```bash
clawhub sync --all
clawhub package transfer @old-owner/package --to new-owner
```

## Relacionado

- [`openclaw skills`](/es/cli/skills) - búsqueda, instalación, actualización y
  verificación de habilidades locales
- [`openclaw plugins`](/es/cli/plugins) - búsqueda, instalación, actualización e
  inspección de complementos
- [Publicación en ClawHub](/es/clawhub/publishing) - alcance del propietario, validación de lanzamiento
  y flujo de revisión
- [Creación de habilidades](/es/tools/creating-skills) - creación y flujo de publicación de habilidades
- [Creación de complementos](/es/plugins/building-plugins) - creación de paquetes de complementos
