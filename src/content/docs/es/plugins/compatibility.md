---
summary: "Contratos de compatibilidad de plugins, metadatos de obsolescencia y expectativas de migración"
title: "Compatibilidad de plugins"
read_when:
  - You maintain an OpenClaw plugin
  - You see a plugin compatibility warning
  - You are planning a plugin SDK or manifest migration
---

OpenClaw mantiene los contratos de complementos antiguos conectados a través de adaptadores de compatibilidad con nombre antes de eliminarlos. Esto protege los complementos integrados y externos existentes mientras evolucionan los contratos del SDK, manifiesto, configuración y tiempo de ejecución del agente.

## Registro de compatibilidad

Los contratos de compatibilidad de plugins se rastrean en el registro central en
`src/plugins/compat/registry.ts`.

Cada registro tiene:

- un código de compatibilidad estable
- estado: `active`, `deprecated`, `removal-pending` o `removed`
- propietario: SDK, configuración, configuración inicial, canal, proveedor, ejecución de complementos, tiempo de ejecución del agente,
  o núcleo
- fechas de introducción y obsolescencia cuando corresponda
- orientación de reemplazo
- documentos, diagnósticos y pruebas que cubran el comportamiento antiguo y nuevo

El registro es la fuente para la planificación del mantenedor y las verificaciones futuras del inspector de complementos. Si cambia un comportamiento orientado al complemento, agregue o actualice el registro de compatibilidad en el mismo cambio que agrega el adaptador.

La compatibilidad de reparación y migración de Doctor se rastrea por separado en
`src/commands/doctor/shared/deprecation-compat.ts`. Esos registros cubren viejas
estructuras de configuración, diseños de registro de instalación y shims de reparación que pueden necesitar mantenerse
disponibles después de que se elimine la ruta de compatibilidad del tiempo de ejecución.

Las barridas de lanzamiento deben verificar ambos registros. No elimine una migración de doctor
solo porque el registro de compatibilidad de tiempo de ejecución o configuración correspondiente haya caducado; primero
verifique que no haya una ruta de actualización compatible que aún necesite la reparación. Además
vuelva a validar cada anotación de reemplazo durante la planificación del lanzamiento porque la
propiedad del complemento y la huella de configuración pueden cambiar a medida que los proveedores y canales salen del
núcleo.

## Paquete del inspector de complementos

El inspector de complementos debe residir fuera del repositorio central de OpenClaw como un paquete/repositorio
separado respaldado por los contratos de compatibilidad y manifiesto con versiones.

La CLI del primer día debe ser:

```sh
openclaw-plugin-inspector ./my-plugin
```

Debe emitir:

- validación de manifiesto/esquema
- la versión de compatibilidad del contrato que se está verificando
- verificaciones de metadatos de instalación/fuente
- verificaciones de importación de ruta en frío
- advertencias de obsolescencia y compatibilidad

Use `--json` para una salida estable legible por máquina en anotaciones de CI. El núcleo de OpenClaw debería exponer contratos y dispositivos que el inspector pueda consumir, pero no debería publicar el binario del inspector desde el paquete principal `openclaw`.

### Carril de aceptación del mantenedor

Use Blacksmith Testbox para el carril de aceptación de paquetes instalables al validar el inspector externo con los paquetes de plugins de OpenClaw. Ejecútelo desde una comprobación limpia de OpenClaw después de que se construya el paquete:

```sh
blacksmith testbox warmup ci-check-testbox.yml --ref main --idle-timeout 90
blacksmith testbox run --id <tbx_id> "pnpm install && pnpm build && npm exec --yes @openclaw/plugin-inspector@0.1.0 -- ./extensions/telegram --json"
blacksmith testbox run --id <tbx_id> "npm exec --yes @openclaw/plugin-inspector@0.1.0 -- ./extensions/discord --json"
blacksmith testbox run --id <tbx_id> "npm exec --yes @openclaw/plugin-inspector@0.1.0 -- <clawhub-plugin-dir> --json"
blacksmith testbox stop <tbx_id>
```

Mantenga este carril opcional para los mantenedores porque instala un paquete npm externo y puede inspeccionar paquetes de plugins clonados fuera del repositorio. Los guardias del repositorio local cubren el mapa de exportación del SDK, los metadatos del registro de compatibilidad, la reducción de la importación del SDK en desuso y los límites de importación de extensiones agrupadas; la prueba del inspector Testbox cubre el paquete tal como lo consumen los autores de plugins externos.

## Política de desuso

OpenClaw no debe eliminar un contrato de plugin documentado en la misma versión
que introduce su reemplazo.

La secuencia de migración es:

1. Añadir el nuevo contrato.
2. Mantener el comportamiento antiguo conectado a través de un adaptador de compatibilidad con nombre.
3. Emitir diagnósticos o advertencias cuando los autores de los plugins puedan actuar.
4. Documentar el reemplazo y el cronograma.
5. Probar tanto las rutas antiguas como las nuevas.
6. Esperar durante la ventana de migración anunciada.
7. Eliminar solo con la aprobación explícita de la versión de interrupción (breaking release).

Los registros obsoletos deben incluir una fecha de inicio de la advertencia, un reemplazo, un enlace a la documentación
y una fecha de eliminación final no más de tres meses después de que comience la advertencia. No
añada una ruta de compatibilidad obsoleta con una ventana de eliminación abierta a menos que
los mantenedores decidan explícitamente que es una compatibilidad permanente y la marquen `active`
en su lugar.

## Áreas de compatibilidad actuales

Los registros de compatibilidad actuales incluyen:

- importaciones del SDK amplias heredadas como `openclaw/plugin-sdk/compat`
- formas de complemento heredadas solo de gancho y `before_agent_start`
- puntos de entrada de complemento heredados `activate(api)` mientras los complementos migran a
  `register(api)`
- alias del SDK heredados como `openclaw/extension-api`,
  `openclaw/plugin-sdk/channel-runtime`, `openclaw/plugin-sdk/command-auth`
  constructores de estado, `openclaw/plugin-sdk/test-utils` (reemplazados por subrutas de prueba `openclaw/plugin-sdk/*` centradas) y los alias de tipo `ClawdbotConfig` /
  `OpenClawSchemaType`
- lista de permitidos y comportamiento de habilitación de complementos agrupados
- metadatos de manifiesto de variables de entorno de proveedor/canal heredados
- ganchos y alias de tipo de complemento de proveedor heredados mientras los proveedores pasan a
  ganchos explícitos de catálogo, autenticación, pensamiento, repetición y transporte
- alias de runtime heredados como `api.runtime.taskFlow`,
  `api.runtime.subagent.getSession`, `api.runtime.stt`, y los en desuso
  `api.runtime.config.loadConfig()` / `api.runtime.config.writeConfigFile(...)`
- registro dividido heredado de complementos de memoria mientras los complementos de memoria se mueven a
  `registerMemoryCapability`
- auxiliares del SDK de canal heredados para esquemas de mensajes nativos, bloqueo de menciones,
  formato de sobres entrantes y anidamiento de capacidades de aprobación
- alias de auxiliares de clave de ruta de canal y de destino comparable heredados mientras los complementos
  se mueven a `openclaw/plugin-sdk/channel-route`
- sugerencias de activación que están siendo reemplazadas por la propiedad de las contribuciones del manifiesto
- respaldo del runtime `setup-api` mientras los descriptores de configuración se mueven a metadatos `setup.requiresRuntime: false` fríos
- ganchos del proveedor `discovery` mientras los ganchos del catálogo de proveedores se mueven a
  `catalog.run(...)`
- metadatos del canal `showConfigured` / `showInSetup` mientras los paquetes del canal
  se mueven a `openclaw.channel.exposure`
- claves de configuración de runtime-policy heredadas mientras doctor migra los operadores a
  `agentRuntime`
- respaldo de metadatos de configuración de canal agrupado generado mientras los metadatos
  `channelConfigs` priorizando el registro llegan
- marcadores de entorno de desactivación del registro de complementos y de migración de instalación persistidos mientras
  los flujos de reparación migran los operadores a `openclaw plugins registry --refresh` y
  `openclaw doctor --fix`
- rutas de configuración de búsqueda web, recuperación web y x_search propiedad del complemento heredadas mientras
  doctor las migra a `plugins.entries.<plugin>.config`
- configuración creada por `plugins.installs` heredada y alias de ruta de carga de complementos agrupados
  mientras los metadatos de instalación se mueven al libro mayor de complementos gestionados por estado

El código nuevo de los complementos debería preferir el reemplazo que figura en el registro y en la guía de migración específica. Los complementos existentes pueden seguir utilizando una ruta de compatibilidad hasta que los documentos, los diagnósticos y las notas de la versión anuncien un período de eliminación.

## Notas de la versión

Las notas de la versión deben incluir las futuras desaprobaciones de complementos con fechas objetivo y enlaces a los documentos de migración. Esa advertencia debe producirse antes de que una ruta de compatibilidad pase a `removal-pending` o `removed`.
