---
summary: "Plan y lista de verificación de auditoría para mover Canvas fuera del núcleo y a un plugin experimental incluido."
read_when:
  - Moving Canvas host, tools, commands, docs, or protocol ownership
  - Auditing whether Canvas is still core-owned
  - Preparing or reviewing the experimental Canvas plugin PR
title: "Refactorización del plugin Canvas"
---

# Refactorización del plugin Canvas

Canvas es de bajo uso y experimental. Trátelo como un plugin incluido, no como una característica principal. El núcleo puede mantener la infraestructura genérica de puerta de enlace, nodo, HTTP, autenticación, configuración y cliente nativo, pero el comportamiento específico de Canvas debe residir en `extensions/canvas`.

## Objetivo

Mover la propiedad de Canvas a `extensions/canvas` mientras se preserva el comportamiento actual de nodo emparejado:

- la herramienta `canvas` orientada al agente es registrada por el plugin Canvas
- Los comandos del nodo Canvas solo se permiten cuando el plugin Canvas los registra
- Los archivos de host/fuente A2UI residen en el plugin Canvas
- La materialización de documentos de Canvas reside en el plugin Canvas
- La implementación del comando CLI reside en el plugin Canvas, o delega a través de un barril de tiempo de ejecución propiedad del plugin
- los documentos y el inventario de plugins describen Canvas como experimental y respaldado por un plugin

## No objetivos

- No rediseñar la interfaz de usuario de Canvas de la aplicación nativa en esta refactorización.
- No eliminar el soporte de protocolo/cliente de Canvas en iOS, Android o macOS a menos que una decisión de producto por separado indique que Canvas debe eliminarse.
- No construir un marco de servicio de plugin amplio solo para Canvas a menos que al menos otro plugin incluido necesite la misma costura.

## Estado actual de la rama

Hecho:

- Añadido el paquete de plugin incluido en `extensions/canvas`.
- Añadido `extensions/canvas/openclaw.plugin.json`.
- Movida la herramienta del agente `canvas` de `src/agents/tools/canvas-tool.ts` a `extensions/canvas/src/tool.ts`.
- Eliminada el registro central de `createCanvasTool` de `src/agents/openclaw-tools.ts`.
- Movida la implementación del host Canvas de `src/canvas-host` a `extensions/canvas/src/host`.
- Mantenido `extensions/canvas/runtime-api.ts` como el barril de compatibilidad propiedad del plugin para pruebas, empaquetado y asistentes públicos externos de Canvas.
- Movida la materialización de documentos Canvas de `src/gateway/canvas-documents.ts` a `extensions/canvas/src/documents.ts`.
- Movida la implementación del CLI de Canvas y los asistentes A2UI JSONL a `extensions/canvas/src/cli.ts`.
- Se movió la URL del host de Canvas y los asistentes de capacidades con ámbito a `extensions/canvas/src`.
- Se movieron los valores predeterminados de los comandos de nodo de Canvas fuera de las listas centralizadas del núcleo y al `nodeInvokePolicies` del complemento.
- Se agregó la configuración del host de Canvas propiedad del complemento en `plugins.entries.canvas.config.host`.
- Se movió el servicio HTTP de Canvas y A2UI detrás del registro de ruta HTTP del complemento Canvas.
- Se agregó un despacho genérico de actualización de WebSocket para complementos para rutas HTTP propiedad del complemento.
- Se reemplazó la URL del host de la puerta de enlace específica de Canvas y la autenticación de capacidades de nodo con una superficie genérica de complemento alojado y asistentes de capacidades de nodo.
- Se agregaron resolutores de medios alojados propiedad del complemento para que las URL de los documentos de Canvas se resuelvan a través del complemento Canvas en lugar de que el núcleo importe los internos del documento de Canvas.
- Se agregó `api.registerNodeCliFeature(...)` para que Canvas pueda declarar `openclaw nodes canvas` como una característica de nodo propiedad del complemento sin tener que deletrear manualmente la ruta del comando principal.
- Se eliminaron las importaciones de producción `src/**` de `extensions/canvas/runtime-api.js`.
- Se movió la fuente del paquete A2UI de `apps/shared/OpenClawKit/Tools/CanvasA2UI` a `extensions/canvas/src/host/a2ui-app`.
- Se movió la implementación de compilación/copiado de A2UI bajo `extensions/canvas/scripts` y se reemplazó el cableado de compilación raíz con ganchos genéricos de activos de complemento agrupado.
- Se eliminó el alias de configuración `canvasHost` de nivel superior heredado en tiempo de ejecución.
- Se mantuvo la migración del doctor de Canvas para que `openclaw doctor --fix` reescriba las configuraciones antiguas `canvasHost` en `plugins.entries.canvas.config.host`.
- Se eliminó la compatibilidad con el protocolo Canvas del agente antiguo detrás del protocolo de puerta de enlace v4. Los clientes nativos y las puertas de enlace ahora usan solo `pluginSurfaceUrls.canvas` más `node.pluginSurface.refresh`; la ruta obsoleta `canvasHostUrl`, `canvasCapability` y `node.canvas.capability.refresh` no es compatible intencionalmente en esta refactorización experimental.
- Se actualizó el inventario de complementos generado para incluir Canvas.
- Se agregó documentación de referencia del complemento en `docs/plugins/reference/canvas.md`.

Superficies de Canvas propiedad del núcleo restantes conocidas:

- Los controladores de Canvas de la aplicación nativa bajo `apps/` todavía consumen intencionalmente la superficie del complemento Canvas
- controladores de protocolo/cliente de Canvas de la aplicación nativa bajo `apps/`
- la salida del artefacto publicado todavía usa `dist/canvas-host/a2ui` para la búsqueda en tiempo de ejecución compatible con versiones anteriores, pero el paso de copia ahora es propiedad del complemento

## Forma objetivo

`extensions/canvas` debería ser propietario de:

- manifiesto del complemento y metadatos del paquete
- registro de herramientas de agente
- política de comando de invocación de nodo
- host de Canvas y tiempo de ejecución de A2UI
- fuente del paquete A2UI de Canvas y scripts de compilación/copiado de activos
- creación de documentos de Canvas y resolución de activos
- implementación de la CLI de Canvas
- página de documentación de Canvas y entrada de inventario de complementos

Core solo debe ser propietario de las costuras genéricas:

- descubrimiento y registro de complementos
- registro genérico de herramientas de agente
- registro genérico de políticas de invocación de nodo
- HTTP/autenticación de puerta de enlace genérica y despacho de actualización de WebSocket
- resolución genérica de URL de superficie de complemento alojado
- registro genérico de resolución de medios alojados
- transporte genérico de capacidades de nodo
- fontanería de configuración genérica
- descubrimiento genérico de enlaces de activos de complementos incluidos

Las aplicaciones nativas pueden mantener los controladores de comandos de Canvas como clientes del protocolo. No son los propietarios del tiempo de ejecución del complemento.

## Pasos de migración

1. Trate `plugins.entries.canvas.config.host` como la superficie de configuración propiedad del complemento.
2. Actualice la documentación para que Canvas se describa como un complemento incluido experimental.
3. Ejecute pruebas enfocadas de Canvas, verificaciones de inventario de complementos, verificaciones de API del SDK de complementos y compuertas de compilación/tipo afectadas por los límites del tiempo de ejecución.

## Lista de verificación de auditoría

Antes de dar por terminada la refactorización:

- `rg "src/canvas-host|../canvas-host"` no devuelve importaciones de código fuente en vivo.
- `rg "canvas-tool|createCanvasTool" src` no encuentra ninguna implementación de herramienta de Canvas propiedad de Core.
- `rg "canvas.present|canvas.snapshot|canvas.a2ui" src/gateway` no encuentra valores predeterminados de lista blanca codificados fuera de las pruebas de políticas de complementos genéricos.
- `rg "extensions/canvas/runtime-api" src --glob '!**/*.test.ts'` está vacío.
- `rg "canvas-documents" src` está vacío.
- `rg "registerNodesCanvasCommands|nodes-canvas" src` está vacío; el complemento Canvas registra `openclaw nodes canvas` a través de metadatos de CLI de complementos anidados.
- `rg "createCanvasHostHandler|handleA2uiHttpRequest" src/gateway` no devuelve propiedad del tiempo de ejecución de la puerta de enlace.
- `rg "apps/shared/OpenClawKit/Tools/CanvasA2UI|canvas-a2ui-copy|extensions/canvas/src/host/a2ui" scripts .github package.json` encuentra solo contenedores de compatibilidad o rutas propiedad del complemento.
- `pnpm plugins:inventory:check` pasa.
- `pnpm plugin-sdk:api:check` pasa, o las líneas base de API generadas se actualizan intencionalmente y se revisan.
- Las pruebas específicas de Canvas pasan.
- Las pruebas de carriles cambiados pasan para las rutas del host/A2UI de Canvas.
- El cuerpo del PR indica explícitamente que Canvas es experimental y está respaldado por un complemento.

## Comandos de verificación

Use comprobaciones locales específicas mientras itera:

```sh
pnpm test extensions/canvas/src/host/server.test.ts extensions/canvas/src/host/server.state-dir.test.ts extensions/canvas/src/host/file-resolver.test.ts
pnpm test src/gateway/server.plugin-node-capability-auth.test.ts src/gateway/server-import-boundary.test.ts
pnpm test extensions/canvas/src/config-migration.test.ts src/commands/doctor-legacy-config.migrations.test.ts
pnpm test test/scripts/changed-lanes.test.ts test/scripts/build-all.test.ts extensions/canvas/scripts/bundle-a2ui.test.ts test/scripts/bundled-plugin-assets.test.ts extensions/canvas/scripts/copy-a2ui.test.ts src/infra/run-node.test.ts
pnpm tsgo:extensions
pnpm plugins:inventory:check
pnpm plugin-sdk:api:check
```

Ejecute `pnpm build` antes de enviar si el barril de tiempo de ejecución, la importación diferida, el empaquetado o las superficies del complemento publicado cambian.
