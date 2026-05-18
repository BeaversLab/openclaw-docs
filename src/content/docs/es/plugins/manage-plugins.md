---
summary: "Ejemplos rápidos para listar, instalar, actualizar, inspeccionar y desinstalar complementos de OpenClaw"
read_when:
  - You want quick plugin list, install, update, inspect, or uninstall examples
  - You want to choose a plugin install source
  - You want the right reference for publishing plugin packages
title: "Administrar complementos"
sidebarTitle: "Administrar complementos"
doc-schema-version: 1
---

Use esta página para comandos comunes de administración de complementos. Para el contrato de comandos exhaustivo,
indicadores, reglas de selección de origen y casos extremos, consulte
[`openclaw plugins`](/es/cli/plugins).

La mayoría de los flujos de trabajo de instalación son:

1. encontrar un paquete
2. instalarlo desde ClawHub, npm, git o una ruta local
3. permitir que el Gateway administrado se reinicie automáticamente, o reiniciarlo manualmente cuando no esté administrado
4. verificar los registros de tiempo de ejecución del complemento

## Listar y buscar complementos

```bash
openclaw plugins list
openclaw plugins list --enabled
openclaw plugins list --verbose
openclaw plugins list --json
openclaw plugins search "calendar"
```

Use `--json` para scripts:

```bash
openclaw plugins list --json \
  | jq '.plugins[] | {id, enabled, format, source, dependencyStatus}'
```

`plugins list` es una verificación de inventario en frío. Muestra lo que OpenClaw puede descubrir
a partir de la configuración, los manifiestos y el registro de complementos; no prueba que un
Gateway que ya se está ejecutando haya importado el tiempo de ejecución del complemento. La salida JSON incluye
diagnósticos del registro y el `dependencyStatus` estático de cada complemento cuando el
paquete de complementos declara `dependencies` o `optionalDependencies`.

`plugins search` consulta a ClawHub paquetes de complementos instalables e imprime
sugerencias de instalación como `openclaw plugins install clawhub:<package>`.

## Instalar complementos

```bash
# Search ClawHub for plugin packages.
openclaw plugins search "calendar"

# Install from ClawHub.
openclaw plugins install clawhub:<package>
openclaw plugins install clawhub:<package>@1.2.3
openclaw plugins install clawhub:<package>@beta

# Install from npm.
openclaw plugins install npm:<package>
openclaw plugins install npm:@scope/openclaw-plugin@1.2.3
openclaw plugins install npm:@openclaw/codex

# Install from a local npm pack artifact.
openclaw plugins install npm-pack:<path.tgz>

# Install from git or a local development checkout.
openclaw plugins install git:github.com/acme/openclaw-plugin@v1.0.0
openclaw plugins install ./my-plugin
openclaw plugins install --link ./my-plugin
```

Las especificaciones de paquetes simples se instalan desde npm durante el cambio de lanzamiento. Use `clawhub:`,
`npm:`, `git:` o `npm-pack:` cuando necesite una selección determinista del origen.
Si el nombre simple coincide con un id de complemento oficial, OpenClaw puede instalar la
entrada del catálogo directamente.

Use `--force` solo cuando intencionalmente desee sobrescribir un destino de instalación
existente. Para actualizaciones de rutina de instalaciones rastreadas de npm, ClawHub o hook-pack, use
`openclaw plugins update`.

## Reiniciar e inspeccionar

Después de instalar, actualizar o desinstalar el código del complemento, un Gateway administrado en ejecución
con la recarga de configuración habilitada se reinicia automáticamente. Si el Gateway no está
administrado o la recarga está deshabilitada, reinícielo usted mismo antes de verificar las superficies
de tiempo de ejecución en vivo:

```bash
openclaw gateway restart
openclaw plugins inspect <plugin-id> --runtime --json
```

Use `inspect --runtime` cuando necesites pruebas de que el complemento registró superficies de tiempo de ejecución como herramientas, ganchos, servicios, métodos de Gateway, rutas HTTP o comandos CLI propiedad del complemento. `inspect` y `list` simples son comprobaciones en frío de manifiesto, configuración y registro.

## Actualizar complementos

```bash
openclaw plugins update <plugin-id>
openclaw plugins update <npm-package-or-spec>
openclaw plugins update --all
openclaw plugins update <plugin-id> --dry-run
```

Cuando pasas un ID de complemento, OpenClaw reutiliza la especificación de instalación rastreada. Las dist-tags almacenadas como `@beta` y las versiones fijas exactas continúan usándose en ejecuciones posteriores de `update <plugin-id>`.

Para instalaciones de npm, puedes pasar una especificación de paquete explícita para cambiar el registro rastreado:

```bash
openclaw plugins update @scope/openclaw-plugin@beta
openclaw plugins update @scope/openclaw-plugin
```

El segundo comando devuelve un complemento a la línea de lanzamiento predeterminada del registro cuando anteriormente estaba fijado a una versión exacta o etiqueta.

Cuando `openclaw update` se ejecuta en el canal beta, los registros de complementos pueden preferir lanzamientos `@beta` coincidentes. Para las reglas exactas de reserva y anclaje, consulta [`openclaw plugins`](/es/cli/plugins#update).

## Desinstalar complementos

```bash
openclaw plugins uninstall <plugin-id> --dry-run
openclaw plugins uninstall <plugin-id>
openclaw plugins uninstall <plugin-id> --keep-files
```

La desinstalación elimina la entrada de configuración del complemento, el registro del índice del complemento persistido, las entradas de lista de permitir/denegar y las rutas de carga vinculadas, si corresponde. Los directorios de instalación administrados se eliminan a menos que pases `--keep-files`. Un Gateway administrado en ejecución se reinicia automáticamente cuando la desinstalación cambia la fuente del complemento.

En modo Nix (`OPENCLAW_NIX_MODE=1`), los comandos de instalación, actualización, desinstalación, habilitación y deshabilitación de complementos están deshabilitados. Gestiona esas opciones en la fuente de Nix para la instalación en su lugar.

## Elegir una fuente

| Fuente     | Usar cuando                                                                                       | Ejemplo                                                        |
| ---------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| ClawHub    | Deseas descubrimiento nativo de OpenClaw, resúmenes de escaneo, versiones e indicaciones          | `openclaw plugins install clawhub:<package>`                   |
| npmjs.com  | Ya distribuyes paquetes JavaScript o necesitas dist-tags/registros privados de npm                | `openclaw plugins install npm:@acme/openclaw-plugin`           |
| git        | Deseas una rama, etiqueta o confirmación de un repositorio                                        | `openclaw plugins install git:github.com/<owner>/<repo>@<ref>` |
| ruta local | Estás desarrollando o probando un complemento en la misma máquina                                 | `openclaw plugins install --link ./my-plugin`                  |
| npm pack   | Estás proporcionando un artefacto de paquete local a través de la semántica de instalación de npm | `openclaw plugins install npm-pack:<path.tgz>`                 |
| mercado    | Estás instalando un complemento de mercado compatible con Claude                                  | `openclaw plugins install <plugin> --marketplace <source>`     |

## Publicar complementos

ClawHub es la superficie principal de descubrimiento público para los complementos de OpenClaw. Publique allí cuando desee que los usuarios encuentren los metadatos del complemento, el historial de versiones, los resultados del análisis del registro y las sugerencias de instalación antes de instalar.

```bash
npm i -g clawhub
clawhub login
clawhub package publish your-org/your-plugin --dry-run
clawhub package publish your-org/your-plugin
clawhub package publish your-org/your-plugin@v1.0.0
```

Los complementos nativos de npm deben incluir un manifiesto de complemento y metadatos del paquete antes de publicar:

```json package.json
{
  "name": "@acme/openclaw-plugin",
  "version": "1.0.0",
  "type": "module",
  "openclaw": {
    "extensions": ["./dist/index.js"]
  }
}
```

```bash
npm publish --access public
openclaw plugins install npm:@acme/openclaw-plugin
openclaw plugins install npm:@acme/openclaw-plugin@beta
openclaw plugins install npm:@acme/openclaw-plugin@1.0.0
```

Use estas páginas para el contrato completo de publicación en lugar de tratar esta página como la referencia de publicación:

- [Publicación en ClawHub](/es/clawhub/publishing) explica los propietarios, ámbitos, lanzamientos, revisiones, validación de paquetes y transferencia de paquetes.
- [Compilación de complementos](/es/plugins/building-plugins) muestra la estructura del paquete del complemento y el flujo de trabajo de primera publicación.
- [Manifiesto de complemento](/es/plugins/manifest) define los campos del manifiesto del complemento nativo.

Si el mismo paquete está disponible tanto en ClawHub como en npm, use el prefijo explícito `clawhub:` o `npm:` cuando necesite forzar una fuente.

## Relacionado

- [Complementos](/es/tools/plugin) - instalar, configurar, reiniciar y solucionar problemas
- [`openclaw plugins`](/es/cli/plugins) - referencia completa de la CLI
- [Complementos comunitarios](/es/plugins/community) - descubrimiento público y publicación en ClawHub
- [ClawHub](/es/clawhub/cli) - operaciones de CLI del registro
- [Compilación de complementos](/es/plugins/building-plugins) - crear un paquete de complemento
- [Manifiesto de complemento](/es/plugins/manifest) - manifiesto y metadatos del paquete
