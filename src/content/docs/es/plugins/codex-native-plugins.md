---
summary: "Configure migrated native Codex plugins for Codex-mode OpenClaw agents"
title: "Native Codex plugins"
read_when:
  - You want Codex-mode OpenClaw agents to use native Codex plugins
  - You are migrating source-installed openai-curated Codex plugins
  - You are troubleshooting codexPlugins, app inventory, destructive actions, or plugin app diagnostics
---

La compatibilidad con complementos nativos de Codex permite que un agente OpenClaw en modo Codex utilice las capacidades de aplicación y complemento propias del servidor de aplicaciones Codex dentro del mismo hilo de Codex que maneja el turno de OpenClaw.

OpenClaw no traduce los complementos de Codex en herramientas dinámicas `codex_plugin_*`
de OpenClaw. Las llamadas a complementos se mantienen en la transcripción nativa de Codex y el servidor de aplicaciones Codex posee la ejecución de MCP respaldada por la aplicación.

Use esta página después de que el arnés base [Codex harness](/es/plugins/codex-harness) esté funcionando.

## Requisitos

- El tiempo de ejecución del agente OpenClaw seleccionado debe ser el arnés nativo de Codex.
- `plugins.entries.codex.enabled` debe ser true.
- `plugins.entries.codex.config.codexPlugins.enabled` debe ser true.
- V1 solo es compatible con complementos `openai-curated` que la migración observó como
  instalados desde la fuente en el origen de Codex.
- El servidor de aplicaciones Codex de destino debe poder ver el mercado,
  el complemento y el inventario de aplicaciones esperados.

`codexPlugins` no tiene efecto en ejecuciones de PI, ejecuciones normales del proveedor de OpenAI, enlaces de conversación de ACP
u otros arneses porque esas rutas no crean
hilos del servidor de aplicaciones Codex con configuración `apps` nativa.

## Inicio rápido

Vista previa de la migración desde el origen de Codex:

```bash
openclaw migrate codex --dry-run
```

Aplique la migración cuando el plan sea correcto:

```bash
openclaw migrate apply codex --yes
```

La migración escribe entradas `codexPlugins` explícitas para complementos elegibles y llama
al servidor de aplicaciones Codex `plugin/install` para los complementos seleccionados. Una configuración migrada
típica tiene este aspecto:

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          codexPlugins: {
            enabled: true,
            allow_destructive_actions: false,
            plugins: {
              "google-calendar": {
                enabled: true,
                marketplaceName: "openai-curated",
                pluginName: "google-calendar",
              },
            },
          },
        },
      },
    },
  },
}
```

Después de cambiar `codexPlugins`, use `/new`, `/reset` o reinicie la puerta de enlace para que
las futuras sesiones de arnés de Codex comiencen con el conjunto de aplicaciones actualizado.

## Cómo funciona la configuración de complementos nativos

La integración tiene tres estados separados:

- Instalado: Codex tiene el paquete de complementos local en el tiempo de ejecución del servidor de aplicaciones de destino.
- Habilitado: La configuración de OpenClaw está dispuesta a poner el complemento a disposición de los
  turnos del arnés de Codex.
- Accesible: El servidor de aplicaciones de Codex confirma que las entradas de la aplicación del complemento están disponibles
  para la cuenta activa y se pueden asignar a la identidad del complemento migrado.

La migración es el paso duradero de instalación/elegibilidad. El inventario de aplicaciones en tiempo de ejecución es la
verificación de accesibilidad. La configuración de la sesión del arnés de Codex luego calcula una configuración
restrictiva de la aplicación del hilo para las aplicaciones de complementos habilitadas y accesibles.

La configuración de la aplicación del subproceso se calcula cuando OpenClaw establece una sesión de arnés de Codex
o reemplaza un enlace de subproceso de Codex obsoleto. No se recalcula en cada turno.

## Límite de soporte de V1

V1 es intencionalmente limitado:

- Solo los complementos `openai-curated` que ya estaban instalados en el inventario del
  servidor de aplicaciones Codex de origen son elegibles para la migración.
- La migración escribe identidades de complementos explícitas con `marketplaceName` y
  `pluginName`; no escribe rutas de caché `marketplacePath` locales.
- `codexPlugins.enabled` es el interruptor de habilitación global.
- No hay ningún comodín `plugins["*"]` ni ninguna clave de configuración que otorgue
  autoridad de instalación arbitraria.
- Los mercados no compatibles, los paquetes de complementos en caché, los enlaces y los archivos de configuración de Codex
  se conservan en el informe de migración para su revisión manual.

## Inventario y propiedad de aplicaciones

OpenClaw lee el inventario de aplicaciones de Codex a través de app-server `app/list`, lo guarda en caché durante una hora y actualiza las entradas obsoletas o faltantes de forma asíncrona.

Una aplicación de complemento se expone solo cuando OpenClaw puede asignarla de nuevo al complemento migrado mediante una propiedad estable:

- id de aplicación exacto de los detalles del complemento
- nombre de servidor MCP conocido
- metadatos estables únicos

Se excluye la propiedad de solo nombre para mostrar o ambigua hasta que la próxima actualización del inventario demuestre la propiedad.

## Configuración de la aplicación del hilo

OpenClaw inyecta un parche `config.apps` restrictivo para el hilo de Codex: `_default` está deshabilitado y solo se habilitan las aplicaciones propiedad de complementos migrados habilitados.

OpenClaw establece `destructive_enabled` a nivel de aplicación a partir de la política efectiva `allow_destructive_actions` global o por complemento y permite que Codex haga cumplir los metadatos de herramientas destructivas desde sus anotaciones nativas de herramientas de aplicaciones. La configuración de la aplicación `_default` está deshabilitada con `open_world_enabled: false`. Las aplicaciones de complemento habilitadas se emiten con `open_world_enabled: true`; OpenClaw no expone un control de política de "mundo abierto" separado para complementos ni mantiene listas de denegación de nombres de herramientas destructivas por complemento.

El modo de aprobación de herramientas se solicita de forma predeterminada para las aplicaciones de complemento porque OpenClaw no tiene una interfaz de usuario interactiva de elicitación de aplicaciones en esta ruta del mismo hilo.

## Política de acciones destructivas

Las elicitudes de complemento destructivas fallan de forma cerrada de forma predeterminada:

- El `allow_destructive_actions` global tiene como valor predeterminado `false`.
- Por complemento `allow_destructive_actions` anula la política global para ese
  complemento.
- Cuando la política es `false`, OpenClaw devuelve una denegación determinista.
- Cuando la política es `true`, OpenClaw acepta automáticamente solo esquemas seguros que pueda asignar a
  una respuesta de aprobación, como un campo de aprobación booleano.
- Falta la identidad del complemento, propiedad ambigua, falta un id de turno, un id de turno
  incorrecto o un esquema de elicitación inseguro rechaza en lugar de solicitar.

## Solución de problemas

**`auth_required`:** la migración instaló el complemento, pero una de sus aplicaciones todavía
necesita autenticación. La entrada explícita del complemento se escribe deshabilitada hasta que
la reautorices y la habilites.

**`marketplace_missing` o `plugin_missing`:** el servidor de aplicaciones Codex de destino no puede ver el mercado o complemento `openai-curated` esperado. Vuelva a ejecutar la migración en el tiempo de ejecución de destino o inspeccione el estado del complemento del servidor de aplicaciones Codex.

**`app_inventory_missing` o `app_inventory_stale`:** la disponibilidad de la aplicación provino de un caché vacío o obsoleto. OpenClaw programa una actualización asíncrona y excluye las aplicaciones de complemento hasta que se conocen la propiedad y la disponibilidad.

**`app_ownership_ambiguous`:** el inventario de aplicaciones solo coincidió por el nombre para mostrar, por lo que la aplicación no está expuesta al hilo de Codex.

**La configuración cambió pero el agente no puede ver el complemento:** use `/new`, `/reset` o reinicie la puerta de enlace. Los enlaces de hilo de Codex existentes mantienen la configuración de la aplicación con la que comenzaron hasta que OpenClaw establece una nueva sesión de arnés o reemplaza un enlace obsoleto.

**Acción destructiva rechazada:** comprueba los valores globales y por complemento de `allow_destructive_actions`. Incluso cuando la política es verdadera, los esquemas de elicitación inseguros y la identidad ambigua del complemento aún fallan cerrados.

## Relacionado

- [Arnés de Codex](/es/plugins/codex-harness)
- [Referencia del arnés de Codex](/es/plugins/codex-harness-reference)
- [Tiempo de ejecución del arnés de Codex](/es/plugins/codex-harness-runtime)
- [Referencia de configuración](/es/gateway/configuration-reference#codex-harness-plugin-config)
- [Migrar CLI](/es/cli/migrate)
