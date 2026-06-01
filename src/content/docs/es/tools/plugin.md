---
summary: "Instalar, configurar y administrar complementos de OpenClaw"
read_when:
  - Installing or configuring plugins
  - Understanding plugin discovery and load rules
  - Working with Codex/Claude-compatible plugin bundles
title: "Complementos"
sidebarTitle: "Comenzando"
doc-schema-version: 1
---

Los complementos extienden OpenClaw con canales, proveedores de modelos, arneses de agentes, herramientas,
habilidades, voz, transcripción en tiempo real, voz, comprensión de medios, generación,
recuperación web, búsqueda web y otras capacidades de tiempo de ejecución.

Utilice esta página cuando quiera instalar un complemento, reiniciar el Gateway, verificar
que el tiempo de ejecución lo haya cargado y solucionar fallos comunes de configuración. Para ver ejemplos
de solo comandos, consulte [Administrar complementos](/es/plugins/manage-plugins). Para ver el inventario completo generado
de complementos empaquetados, externos oficiales y solo de origen, consulte
[Inventario de complementos](/es/plugins/plugin-inventory).

## Requisitos

Antes de instalar un complemento, asegúrese de tener:

- una copia o instalación de OpenClaw con la CLI `openclaw` disponible
- acceso de red a la fuente seleccionada, como ClawHub, npm o un host git
- cualquier credencial específica del complemento, claves de configuración o herramientas del sistema operativo nombradas
  en la documentación de configuración de ese complemento
- permiso para que el Gateway que sirve sus canales se recargue o reinicie

## Inicio rápido

<Steps>
  <Step title="Busque el complemento">
    Busque paquetes de complementos públicos en [ClawHub](/es/clawhub):

    ```bash
    openclaw plugins search "calendar"
    ```

    ClawHub es la superficie principal de descubrimiento para complementos de la comunidad. Durante
    el cambio de lanzamiento, las especificaciones de paquetes simples ordinarias todavía se instalan desde npm a menos que
    coincidan con un id de complemento oficial. Las especificaciones de paquetes `@openclaw/*` sin formato que coinciden
    con complementos empaquetados usan la copia empaquetada de la compilación actual de OpenClaw. Use un
    prefijo explícito cuando necesite una fuente específica.

  </Step>

  <Step title="Instale el complemento">
    ```bash
    # From ClawHub.
    openclaw plugins install clawhub:<package>

    # From npm.
    openclaw plugins install npm:<package>

    # From git.
    openclaw plugins install git:github.com/<owner>/<repo>@<ref>

    # From a local development checkout.
    openclaw plugins install ./my-plugin
    openclaw plugins install --link ./my-plugin
    ```

    Trate las instalaciones de complementos como si estuviera ejecutando código. Prefiera versiones fijadas cuando

necesite instalaciones de producción reproducibles.

  </Step>

  <Step title="Configure y actívelo">
    Configure la configuración específica del complemento bajo `plugins.entries.<id>.config`.
    Habilite el complemento cuando aún no esté habilitado:

    ```bash
    openclaw plugins enable <plugin-id>
    ```

    Si su configuración usa una lista `plugins.allow` restrictiva, el id del complemento
    instalado debe estar presente allí antes de que el complemento pueda cargarse.
    `openclaw plugins install` agrega el id instalado a una lista
    `plugins.allow` existente y elimina el mismo id de `plugins.deny` para que
    la instalación explícita pueda cargarse después de reiniciar.

  </Step>

  <Step title="Permita que el Gateway se recargue">
    La instalación, actualización o desinstalación del código del complemento requiere un
    reinicio del Gateway. Cuando un Gateway administrado ya se está ejecutando con la recarga
    de configuración habilitada, OpenClaw detecta el registro de instalación del complemento cambiado y reinicia el
    Gateway automáticamente. Si el Gateway no está administrado o la recarga está deshabilitada,
    reinícielo usted mismo:

    ```bash
    openclaw gateway restart
    ```

    Las operaciones de habilitar y deshabilitar actualizan la configuración y actualizan el registro en frío.
    Una inspección en tiempo de ejecución sigue siendo la ruta de verificación más clara para las superficies
    de tiempo de ejecución en vivo.

  </Step>

  <Step title="Verificar el registro en tiempo de ejecución">
    ```bash
    openclaw plugins inspect <plugin-id> --runtime --json
    ```

    Use `--runtime` cuando necesite probar herramientas registradas, enlaces, servicios,
    métodos del Gateway o comandos de CLI propiedad del complemento. El `inspect` simple es una verificación
    de manifiesto y registro en frío.

  </Step>
</Steps>

## Configuración

### Elija una fuente de instalación

| Fuente      | Úselo cuando                                                                                          | Ejemplo                                                        |
| ----------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| ClawHub     | Desea descubrimiento nativo de OpenClaw, escaneos, metadatos de versión e indicaciones de instalación | `openclaw plugins install clawhub:<package>`                   |
| npm         | Necesita flujos de trabajo directos del registro npm o etiquetas de distribución                      | `openclaw plugins install npm:<package>`                       |
| git         | Necesita una rama, etiqueta o confirmación de un repositorio                                          | `openclaw plugins install git:github.com/<owner>/<repo>@<ref>` |
| ruta local  | Está desarrollando o probando un complemento en la misma máquina                                      | `openclaw plugins install --link ./my-plugin`                  |
| marketplace | Está instalando un complemento de marketplace compatible con Claude                                   | `openclaw plugins install <plugin> --marketplace <source>`     |

Las especificaciones de paquetes básicos tienen un comportamiento de compatibilidad especial. Si el nombre básico coincide con un id de un complemento incluido, OpenClaw usa esa fuente incluida. Si coincide con un id de un complemento externo oficial, OpenClaw usa el catálogo de paquetes oficial. Otras especificaciones de paquetes básicos ordinarios se instalan a través de npm durante la transición de lanzamiento. Las especificaciones de paquetes `@openclaw/*` que coinciden con complementos incluidos también se resuelven en la copia incluida antes de volver a npm. Use `npm:@openclaw/<plugin>@<version>` cuando deliberadamente desee el paquete npm externo en lugar de la copia incluida propiedad de la imagen. Use `clawhub:`, `npm:`, `git:` o `npm-pack:` cuando necesite una selección de fuente determinista. Consulte [`openclaw plugins`](/es/cli/plugins#install) para obtener el contrato completo del comando.

Para las instalaciones de npm, las especificaciones de paquetes no ancladas y `@latest` eligen el paquete estable más reciente que anuncia compatibilidad con esta compilación de OpenClaw. Si el lanzamiento más reciente actual de npm declara un `openclaw.compat.pluginApi` o `openclaw.install.minHostVersion` más reciente, OpenClaw escanea versiones de paquetes estables anteriores e instala la más reciente que se ajuste. Las versiones exactas y las etiquetas de canal explícitas como `@beta` permanecen ancladas al paquete seleccionado y fallan cuando son incompatibles.

### Configurar la política de complementos

La forma común de configuración del complemento es:

```json5
{
  plugins: {
    enabled: true,
    allow: ["voice-call"],
    deny: ["untrusted-plugin"],
    load: { paths: ["~/Projects/oss/voice-call-plugin"] },
    slots: { memory: "memory-core" },
    entries: {
      "voice-call": { enabled: true, config: { provider: "twilio" } },
    },
  },
}
```

Reglas de política clave:

- `plugins.enabled: false` deshabilita todos los complementos y omite el trabajo de descubrimiento/carga de complementos. Las referencias a complementos obsoletos están inactivas mientras esto está activo; vuelva a habilitar los complementos antes de ejecutar la limpieza del médico cuando desee que se eliminen los ids obsoletos.
- `plugins.deny` tiene prioridad sobre allow y la habilitación por complemento.
- `plugins.allow` es una lista de permitidos exclusiva. Las herramientas propiedad de complementos fuera de la lista de permitidos permanecen no disponibles, incluso cuando `tools.allow` incluye `"*"`.
- `plugins.entries.<id>.enabled: false` deshabilita un complemento mientras conserva su configuración.
- `plugins.load.paths` agrega archivos o directorios locales de complementos explícitos.
- Los complementos de origen del espacio de trabajo están deshabilitados de manera predeterminada; habilítelos o agréquelos explícitamente a la lista de permitidos antes de usar el código local del espacio de trabajo.
- Los plugins integrados siguen sus metadatos integrados de activado por defecto/desactivado por defecto a menos que la configuración los anule explícitamente.
- `plugins.slots.<slot>` elige un plugin para categorías exclusivas como motores de memoria y contexto. La selección de ranura fuerza la activación del plugin seleccionado para esa ranura al contar como una activación explícita; puede cargarse incluso cuando de otro modo sería opcional. `plugins.deny` y `plugins.entries.<id>.enabled: false` todavía lo bloquean.
- Los plugins integrados opcionales pueden activarse automáticamente cuando la configuración nombra una de sus superficies propiedad, como una referencia de proveedor/modelo, configuración de canal, backend de CLI o tiempo de ejecución de arnés de agente.
- El enrutamiento de Codex de la familia OpenAI mantiene separados los límites del proveedor y del plugin de tiempo de ejecución: `openai-codex/*` es la configuración de proveedor de OpenAI heredada, mientras que el plugin integrado `codex` posee el tiempo de ejecución del servidor de aplicaciones de Codex para referencias de agente canónicas `openai/*`, `agentRuntime.id: "codex"` explícitas y referencias heredadas `codex/*`.

Ejecute `openclaw doctor` o `openclaw doctor --fix` cuando la validación de la configuración reporte ids de plugins obsoletos, desajustes en la lista de permitidos/herramientas o rutas de plugins integrados heredadas.

## Entender los formatos de complemento

OpenClaw reconoce dos formatos de complemento:

| Formato                        | Cómo se carga                                                                                     | Usar cuando                                                                                |
| ------------------------------ | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Complemento nativo de OpenClaw | `openclaw.plugin.json` más un módulo de tiempo de ejecución cargado en proceso                    | Estás instalando o construyendo capacidades de tiempo de ejecución específicas de OpenClaw |
| Paquete compatible             | Diseño de complemento de Codex, Claude o Cursor mapeado al inventario de complementos de OpenClaw | Estás reutilizando habilidades, comandos, ganchos o metadatos de paquetes compatibles      |

Ambos formatos aparecen en `openclaw plugins list`, `openclaw plugins inspect`, `openclaw plugins enable` y `openclaw plugins disable`. Consulte [Plugin bundles](/es/plugins/bundles) para el límite de compatibilidad del paquete y [Building plugins](/es/plugins/building-plugins) para la creación de complementos nativos.

## Ganchos de complemento

Los complementos pueden registrar ganchos en tiempo de ejecución, pero hay dos API diferentes con trabajos diferentes.

- Use typed hooks vía `api.on(...)` para los hooks del ciclo de vida del tiempo de ejecución. Esta es la superficie preferida para middleware, políticas, reescritura de mensajes, modelado de indicadores (prompt shaping) y control de herramientas.
- Use `api.registerHook(...)` solo cuando desee participar en el sistema interno de hooks descrito en [Hooks](/es/automation/hooks). Esto es principalmente para efectos secundarios de comandos/ciclo de vida generales y compatibilidad con la automatización de estilo HOOK existente.

Regla rápida:

- Si el controlador (handler) necesita prioridad, semántica de fusión o comportamiento de bloqueo/cancelación, use los hooks de complemento tipados.
- Si el controlador solo reacciona a `command:new`, `command:reset`, `message:sent`, o eventos generales similares, `api.registerHook(...)` está bien.

Los hooks internos gestionados por complementos aparecen en `openclaw hooks list` con `plugin:<id>`. No puede habilitarlos o deshabilitarlos a través de `openclaw hooks`; en su lugar, habilite o deshabilite el complemento.

## Verificar el Gateway activo

`openclaw plugins list` y `openclaw plugins inspect` simples leen la configuración en frío, el manifiesto y el estado del registro. No prueban que un Gateway ya en ejecución haya importado el mismo código de complemento.

Cuando un complemento aparece instalado pero el tráfico de chat en vivo no lo usa:

```bash
openclaw gateway status --deep --require-rpc
openclaw plugins inspect <plugin-id> --runtime --json
openclaw gateway restart
```

Los Gateways administrados se reinician automáticamente después de cambios de instalación, actualización y desinstalación de complementos que alteran la fuente del complemento. En instalaciones VPS o contenedores, asegúrese de que cualquier reinicio manual apunte al hijo `openclaw gateway run` real que atiende sus canales, no solo a un contenedor o supervisor.

## Solución de problemas

| Síntoma                                                                                        | Verificar                                                                                                                                                        | Solución                                                                                                                                   |
| ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| El complemento aparece en `plugins list` pero los hooks del tiempo de ejecución no se ejecutan | Use `openclaw plugins inspect <id> --runtime --json` y confirme el Gateway activo con `gateway status --deep --require-rpc`                                      | Reinicie el Gateway en vivo después de cambios de instalación, actualización, configuración o fuente                                       |
| Aparecen diagnósticos de propiedad duplicada de canal o herramienta                            | Ejecute `openclaw plugins list --enabled --verbose`, inspeccione cada complemento sospechoso con `--runtime --json` y compare la propiedad del canal/herramienta | Deshabilite un propietario, elimine instalaciones obsoletas o use el manifiesto `preferOver` para un reemplazo intencional                 |
| La configuración indica que falta un complemento                                               | Consulte [Inventario de complementos](/es/plugins/plugin-inventory) para ver si está incluido, es oficial externo o solo de origen                               | Instale el paquete externo, habilite el complemento incluido o elimine la configuración obsoleta                                           |
| La configuración no es válida durante la instalación                                           | Lea el mensaje de validación y ejecute `openclaw doctor --fix` cuando indique un estado de complemento obsoleto                                                  | Doctor puede poner en cuarentena la configuración no válida del complemento deshabilitando la entrada y eliminando la carga útil no válida |
| La ruta del complemento está bloqueada por propiedad o permisos sospechosos                    | Inspeccione el diagnóstico antes del error de configuración                                                                                                      | Corrija la propiedad/permisos del sistema de archivos y luego ejecute `openclaw plugins registry --refresh`                                |
| `OPENCLAW_NIX_MODE=1` bloquea los comandos del ciclo de vida                                   | Confirme que la instalación está administrada por Nix                                                                                                            | Cambie la selección del complemento en la fuente de Nix en lugar de usar comandos de modificación de complementos                          |
| Error en la importación de dependencias en tiempo de ejecución                                 | Compruebe si el complemento se instaló a través de npm/git/ClawHub o se cargó desde una ruta local                                                               | Ejecute `openclaw plugins update <id>`, reinstale la fuente o instale las dependencias del complemento local usted mismo                   |

Cuando la configuración obsoleta del complemento todavía nombra un complemento de canal ya no reconocible,
el inicio de Gateway omite ese canal respaldado por complemento en lugar de bloquear todos los
demás canales. Ejecute `openclaw doctor --fix` para eliminar las entradas obsoletas del complemento y del canal.
Las claves de canal desconocidas sin evidencia de complemento obsoleto aún fallan
la validación, por lo que los errores tipográficos siguen siendo visibles.

Para el reemplazo intencional del canal, el complemento preferido debe declarar
`channelConfigs.<channel-id>.preferOver` con el id del complemento heredado o de menor prioridad.
Si ambos complementos están explícitamente habilitados, OpenClaw mantiene esa solicitud
y reporta diagnósticos de canal o herramienta duplicados en lugar de elegir silenciosamente
un propietario.

Si un paquete instalado informa que `requiere salida de tiempo de ejecución compilada para
la entrada de TypeScript ...`, el paquete se publicó sin los archivos JavaScript
que OpenClaw necesita en tiempo de ejecución. Actualice o reinstale después de que el editor envíe
JavaScript compilado, o deshabilite/desinstale el complemento hasta entonces.

### Propiedad de la ruta del complemento bloqueada

Si los diagnósticos del complemento indican
`blocked plugin candidate: suspicious ownership (... uid=1000, expected uid=0 or root)`
y la validación de la configuración continúa con `plugin present but blocked`, OpenClaw encontró
archivos de complemento propiedad de un usuario Unix diferente al proceso que los está cargando.
Mantenga la configuración del complemento en su lugar; repare la propiedad del sistema de archivos o ejecute
OpenClaw como el mismo usuario que posee el directorio de estado.

Para instalaciones de Docker, la imagen oficial se ejecuta como `node` (uid `1000`), por lo que los directorios de configuración y espacio de trabajo de OpenClaw montados con bind en el host deberían pertenecer normalmente
al uid `1000`:

```bash
sudo chown -R 1000:1000 /path/to/openclaw-config /path/to/openclaw-workspace
```

Si ejecuta intencionalmente OpenClaw como root, repare la raíz del complemento administrado
para que sea propiedad de root en su lugar:

```bash
sudo chown -R root:root /path/to/openclaw-config/npm
```

Después de reparar la propiedad, ejecute nuevamente `openclaw doctor --fix` o
`openclaw plugins registry --refresh` para que el registro persistente del complemento coincida
con los archivos reparados.

### Configuración lenta de herramientas de complemento

Si los turnos del agente parecen detenerse mientras preparan las herramientas, active el registro de rastreo y
busque líneas de tiempo de fábrica de herramientas de complemento:

```bash
openclaw config set logging.level trace
openclaw logs --follow
```

Busque:

```text
[trace:plugin-tools] factory timings ...
```

El resumen enumera el tiempo total de fábrica y las fábricas de herramientas de complemento más lentas,
incluyendo el id del complemento, los nombres de las herramientas declaradas, la forma del resultado y si la herramienta es
opcional. Las líneas lentas se promocionan a advertencias cuando una sola fábrica tarda al
menos 1s o la preparación total de la fábrica de herramientas del complemento tarda al menos 5s.

OpenClaw almacena en caché los resultados exitosos de la fábrica de herramientas de complemento para resoluciones repetidas
con el mismo contexto de solicitud efectivo. La clave de caché incluye la configuración
efectiva de tiempo de ejecución, el espacio de trabajo, los ids de agente/sesión, la política de sandbox, la configuración del navegador,
el contexto de entrega, la identidad del solicitante y el estado de propiedad, por lo que las fábricas que
dependen de esos campos de confianza se vuelven a ejecutar cuando cambia el contexto. Si los tiempos
se mantienen altos, es posible que el complemento esté realizando un trabajo costoso antes de devolver sus definiciones
de herramientas.

Si un complemento domina el tiempo, inspeccione sus registros de tiempo de ejecución:

```bash
openclaw plugins inspect <plugin-id> --runtime --json
```

Luego actualice, reinstale o deshabilite ese complemento. Los autores de complementos deben mover
la carga costosa de dependencias detrás de la ruta de ejecución de la herramienta en lugar de hacerlo
dentro de la fábrica de herramientas.

Para las raíces de dependencias, la validación de metadatos de paquetes, los registros del registro, el comportamiento
de recarga al inicio y la limpieza heredada, consulte
[Resolución de dependencias de complementos](/es/plugins/dependency-resolution).

## Relacionado

- [Administrar complementos](/es/plugins/manage-plugins) - ejemplos de comandos para listar, instalar, actualizar, desinstalar y publicar
- [`openclaw plugins`](/es/cli/plugins) - referencia completa de la CLI
- [Inventario de complementos](/es/plugins/plugin-inventory) - lista generada de complementos integrados y externos
- [Referencia de complementos](/es/plugins/reference) - páginas de referencia generadas por complemento
- [Complementos de la comunidad](/es/plugins/community) - política de descubrimiento y solicitudes de extracción de documentos de ClawHub
- [Resolución de dependencias de complementos](/es/plugins/dependency-resolution) - raíces de instalación, registros del registro y límites de tiempo de ejecución
- [Creación de complementos](/es/plugins/building-plugins) - guía de creación de complementos nativos
- [Descripción general del SDK de complementos](/es/plugins/sdk-overview) - registro en tiempo de ejecución, enlaces y campos de API
- [Manifiesto del complemento](/es/plugins/manifest) - metadatos del manifiesto y del paquete
