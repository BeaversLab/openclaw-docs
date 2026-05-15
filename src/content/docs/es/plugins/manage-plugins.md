---
summary: "Ejemplos rápidos para instalar, listar, desinstalar, actualizar y publicar plugins de OpenClaw"
read_when:
  - You want quick plugin install, list, update, or uninstall examples
  - You want to choose between ClawHub and npm plugin distribution
  - You are publishing a plugin package
title: "Gestionar plugins"
sidebarTitle: "Gestionar plugins"
---

La mayoría de los flujos de trabajo de plugins son unos pocos comandos: buscar, instalar, reiniciar el Gateway, verificar y desinstalar cuando ya no necesites el plugin.

## Listar plugins

```bash
openclaw plugins list
openclaw plugins list --enabled
openclaw plugins list --verbose
openclaw plugins list --json
```

Use `--json` para scripts. Incluye diagnósticos del registro y el `dependencyStatus` estático de cada plugin cuando el paquete del plugin declara `dependencies` o `optionalDependencies`.

```bash
openclaw plugins list --json \
  | jq '.plugins[] | {id, enabled, format, source, dependencyStatus}'
```

`plugins list` es una verificación de inventario en frío. Muestra lo que OpenClaw puede descubrir desde la configuración, los manifiestos y el registro de plugins; no prueba que un proceso del Gateway que ya se está ejecutando haya importado el tiempo de ejecución del plugin.

## Instalar plugins

```bash
# Search ClawHub for plugin packages.
openclaw plugins search "calendar"

# Bare package specs try ClawHub first, then npm fallback.
openclaw plugins install <package>

# Force one source.
openclaw plugins install clawhub:<package>
openclaw plugins install npm:<package>

# Install a specific version or dist-tag.
openclaw plugins install clawhub:<package>@1.2.3
openclaw plugins install clawhub:<package>@beta
openclaw plugins install npm:@scope/openclaw-plugin@1.2.3
openclaw plugins install npm:@openclaw/codex

# Install from git or a local development checkout.
openclaw plugins install git:github.com/acme/openclaw-plugin@v1.0.0
openclaw plugins install ./my-plugin
openclaw plugins install --link ./my-plugin
```

Después de instalar el código del plugin, reinicie el Gateway que atiende sus canales:

```bash
openclaw gateway restart
openclaw plugins inspect <plugin-id> --runtime --json
```

Use `inspect --runtime` cuando necesite una prueba de que el plugin registró superficies de tiempo de ejecución como herramientas, ganchos (hooks), servicios, métodos del Gateway o comandos de CLI propiedad del plugin.

## Actualizar plugins

```bash
openclaw plugins update <plugin-id>
openclaw plugins update <npm-package-or-spec>
openclaw plugins update --all
```

Si un plugin se instaló desde una etiqueta de distribución de npm como `@beta`, las llamadas posteriores a `update <plugin-id>` reutilizan esa etiqueta registrada. Pasar una especificación npm explícita cambia la instalación rastreada a esa especificación para futuras actualizaciones.

```bash
openclaw plugins update @scope/openclaw-plugin@beta
openclaw plugins update @scope/openclaw-plugin
```

El segundo comando devuelve un plugin a la línea de lanzamiento predeterminada del registro cuando anteriormente estaba fijado a una versión o etiqueta exacta.

Cuando `openclaw update` se ejecuta en el canal beta, los registros de plugins de npm y ClawHub de línea predeterminada intentan primero la versión del plugin coincidente `@beta`. Si esa versión beta no existe, OpenClaw recurre a la especificación predeterminada/más reciente registrada. Para los plugins de npm, OpenClaw también recurre cuando el paquete beta existe pero falla la validación de instalación. Las versiones exactas y las etiquetas explícitas como `@rc` o `@beta` se conservan.

## Desinstalar plugins

```bash
openclaw plugins uninstall <plugin-id> --dry-run
openclaw plugins uninstall <plugin-id>
openclaw plugins uninstall <plugin-id> --keep-files
openclaw gateway restart
```

La desinstalación elimina la entrada de configuración del complemento, el registro del índice del complemento, las entradas de la lista de permitidos/denegados y las rutas de carga vinculadas, si corresponde. Los directorios de instalación administrados se eliminan a menos que pase `--keep-files`.

En el modo Nix (`OPENCLAW_NIX_MODE=1`), los comandos de instalación, actualización, desinstalación, habilitación y deshabilitación de complementos están deshabilitados. En su lugar, gestione esas opciones en el origen Nix para la instalación; para nix-openclaw, use la [Guía de inicio rápido](https://github.com/openclaw/nix-openclaw#quick-start) con prioridad de agente.

## Publicar complementos

Puede publicar complementos externos en [ClawHub](https://clawhub.ai), npmjs.com o ambos.

### Publicar en ClawHub

ClawHub es la superficie de descubrimiento público principal para los complementos de OpenClaw. Proporciona a los usuarios metadatos buscables, historial de versiones y resultados de escaneo del registro antes de la instalación.

```bash
npm i -g clawhub
clawhub login
clawhub package publish your-org/your-plugin --dry-run
clawhub package publish your-org/your-plugin
clawhub package publish your-org/your-plugin@v1.0.0
```

Los usuarios instalan desde ClawHub con:

```bash
openclaw plugins install clawhub:<package>
openclaw plugins install <package>
```

La forma básica todavía verifica ClawHub primero.

### Publicar en npmjs.com

Los complementos nativos de npm deben incluir un manifiesto de complemento y metadatos del punto de entrada de OpenClaw `package.json`.

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
```

Los usuarios instalan solo npm con:

```bash
openclaw plugins install npm:@acme/openclaw-plugin
openclaw plugins install npm:@acme/openclaw-plugin@beta
openclaw plugins install npm:@acme/openclaw-plugin@1.0.0
```

Si el mismo paquete también está disponible en ClawHub, `npm:` omite la búsqueda en ClawHub y fuerza la resolución de npm.

## Elección de origen

- **ClawHub**: úselo cuando desee descubrimiento nativo de OpenClaw, resúmenes de escaneo, versiones e indicaciones de instalación.
- **npmjs.com**: úselo cuando ya distribuya paquetes de JavaScript o necesite flujos de trabajo de dist-tags/registros privados de npm.
- **Git**: úselo cuando desee instalar directamente desde una rama, etiqueta o confirmación.
- **Ruta local**: úselo cuando esté desarrollando o probando un complemento en la misma máquina.

## Relacionado

- [Complementos](/es/tools/plugin) - descripción general y solución de problemas
- [`openclaw plugins`](/es/cli/plugins) - referencia completa de la CLI
- [ClawHub](/es/clawhub/cli) - operaciones de publicación y registro
- [Construcción de complementos](/es/plugins/building-plugins) - crear un paquete de complemento
- [Manifiesto del complemento](/es/plugins/manifest) - manifiesto y metadatos del paquete
