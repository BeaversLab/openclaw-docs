---
title: "Migración del SDK de complementos"
sidebarTitle: "Migrar al SDK"
summary: "Migrar desde la capa de compatibilidad con versiones anteriores heredada al SDK de complementos moderno"
read_when:
  - You see the OPENCLAW_PLUGIN_SDK_COMPAT_DEPRECATED warning
  - You see the OPENCLAW_EXTENSION_API_DEPRECATED warning
  - You are updating a plugin to the modern plugin architecture
  - You maintain an external OpenClaw plugin
---

# Migración del SDK de complementos

OpenClaw ha pasado de una amplia capa de compatibilidad con versiones anteriores a una arquitectura de complementos moderna con importaciones centradas y documentadas. Si su complemento se construyó antes de la nueva arquitectura, esta guía le ayuda a migrar.

## Qué está cambiando

El antiguo sistema de complementos proporcionaba dos superficies muy abiertas que permitían a los complementos importar cualquier cosa que necesitaran desde un único punto de entrada:

- **`openclaw/plugin-sdk/compat`** — una única importación que reexportaba docenas de ayudantes. Se introdujo para mantener los complementos antiguos basados en ganchos funcionando mientras se construía la nueva arquitectura de complementos.
- **`openclaw/extension-api`** — un puente que brindaba a los complementos acceso directo a ayudantes del lado del host, como el ejecutor de agentes integrado.

Ambas superficies ahora están **obsoletas**. Todavía funcionan en tiempo de ejecución, pero los nuevos complementos no deben usarlas, y los complementos existentes deben migrar antes de que la próxima versión principal las elimine.

<Warning>La capa de compatibilidad con versiones anteriores se eliminará en una versión mayor futura. Los complementos que todavía se importen de estas superficies se romperán cuando eso ocurra.</Warning>

## Por qué cambió esto

El enfoque anterior causó problemas:

- **Inicio lento** — al importar un solo ayudante se cargaban docenas de módulos no relacionados
- **Dependencias circulares** — las amplias reexportaciones facilitaban la creación de ciclos de importación
- **Superficie de API poco clara** — ninguna forma de saber qué exportaciones eran estables frente a las internas

El SDK de complementos moderno soluciona esto: cada ruta de importación (`openclaw/plugin-sdk/\<subpath\>`) es un módulo pequeño y autónomo con un propósito claro y un contrato documentado.

## Cómo migrar

<Steps>
  <Step title="Buscar importaciones obsoletas">
    Busque en su complemento importaciones de cualquiera de las superficies obsoletas:

    ```bash
    grep -r "plugin-sdk/compat" my-plugin/
    grep -r "openclaw/extension-api" my-plugin/
    ```

  </Step>

  <Step title="Reemplazar con importes enfocados">
    Cada exportación de la superficie anterior se asigna a una ruta de importación moderna específica:

    ```typescript
    // Before (deprecated backwards-compatibility layer)
    import {
      createChannelReplyPipeline,
      createPluginRuntimeStore,
      resolveControlCommandGate,
    } from "openclaw/plugin-sdk/compat";

    // After (modern focused imports)
    import { createChannelReplyPipeline } from "openclaw/plugin-sdk/channel-reply-pipeline";
    import { createPluginRuntimeStore } from "openclaw/plugin-sdk/runtime-store";
    import { resolveControlCommandGate } from "openclaw/plugin-sdk/command-auth";
    ```

    Para los asistentes del lado del host, utilice el tiempo de ejecución del complemento inyectado en lugar de importar
    directamente:

    ```typescript
    // Before (deprecated extension-api bridge)
    import { runEmbeddedPiAgent } from "openclaw/extension-api";
    const result = await runEmbeddedPiAgent({ sessionId, prompt });

    // After (injected runtime)
    const result = await api.runtime.agent.runEmbeddedPiAgent({ sessionId, prompt });
    ```

    El mismo patrón se aplica a otros asistentes de puente heredados:

    | Importación antigua | Equivalente moderno |
    | --- | --- |
    | `resolveAgentDir` | `api.runtime.agent.resolveAgentDir` |
    | `resolveAgentWorkspaceDir` | `api.runtime.agent.resolveAgentWorkspaceDir` |
    | `resolveAgentIdentity` | `api.runtime.agent.resolveAgentIdentity` |
    | `resolveThinkingDefault` | `api.runtime.agent.resolveThinkingDefault` |
    | `resolveAgentTimeoutMs` | `api.runtime.agent.resolveAgentTimeoutMs` |
    | `ensureAgentWorkspace` | `api.runtime.agent.ensureAgentWorkspace` |
    | asistentes de almacenamiento de sesión | `api.runtime.agent.session.*` |

  </Step>

  <Step title="Construir y probar">
    ```bash
    pnpm build
    pnpm test -- my-plugin/
    ```
  </Step>
</Steps>

## Referencia de la ruta de importación

<Accordion title="Tabla completa de rutas de importación">
  | Ruta de importación | Propósito | Exportaciones clave | | --- | --- | --- | | `plugin-sdk/plugin-entry` | Auxiliar de entrada de complemento canónico | `definePluginEntry` | | `plugin-sdk/core` | Definiciones de entrada de canal, constructores de canal, tipos base | `defineChannelPluginEntry`, `createChatChannelPlugin` | | `plugin-sdk/channel-setup` | Adaptadores del asistente de configuración
  | `createOptionalChannelSetupSurface` | | `plugin-sdk/channel-pairing` | Primitivas de emparejamiento DM | `createChannelPairingController` | | `plugin-sdk/channel-reply-pipeline` | Cableado de prefijo de respuesta + escritura | `createChannelReplyPipeline` | | `plugin-sdk/channel-config-helpers` | Fábricas de adaptadores de configuración | `createHybridChannelConfigAdapter` | |
  `plugin-sdk/channel-config-schema` | Constructores de esquema de configuración | Tipos de esquema de configuración de canal | | `plugin-sdk/channel-policy` | Resolución de política de grupo/DM | `resolveChannelGroupRequireMention` | | `plugin-sdk/channel-lifecycle` | Seguimiento del estado de la cuenta | `createAccountStatusSink` | | `plugin-sdk/channel-runtime` | Auxiliares de cableado en
  tiempo de ejecución | Utilidades de tiempo de ejecución del canal | | `plugin-sdk/channel-send-result` | Tipos de resultado de envío | Tipos de resultado de respuesta | | `plugin-sdk/runtime-store` | Almacenamiento persistente del complemento | `createPluginRuntimeStore` | | `plugin-sdk/approval-runtime` | Auxiliares de solicitud de aprobación | Carga útil y auxiliares de respuesta de aprobación
  de ejec/complemento | | `plugin-sdk/collection-runtime` | Auxiliares de caché delimitada | `pruneMapToMaxSize` | | `plugin-sdk/diagnostic-runtime` | Auxiliares de bloqueo de diagnóstico | `isDiagnosticFlagEnabled`, `isDiagnosticsEnabled` | | `plugin-sdk/error-runtime` | Auxiliares de formato de error | `formatUncaughtError`, auxiliares de gráfico de errores | | `plugin-sdk/fetch-runtime` |
  Auxiliares de búsqueda/proxy encapsulados | `resolveFetch`, auxiliares de proxy | | `plugin-sdk/host-runtime` | Auxiliares de normalización de host | `normalizeHostname`, `normalizeScpRemoteHost` | | `plugin-sdk/retry-runtime` | Auxiliares de reintento | `RetryConfig`, `retryAsync`, ejecutores de política | | `plugin-sdk/allow-from` | Formato de lista de permitidos | `formatAllowFromLowercase` |
  | `plugin-sdk/allowlist-resolution` | Mapeo de entrada de lista de permitidos | `mapAllowlistResolutionInputs` | | `plugin-sdk/command-auth` | Bloqueo de comandos | `resolveControlCommandGate` | | `plugin-sdk/secret-input` | Análisis de entrada secreta | Auxiliares de entrada secreta | | `plugin-sdk/webhook-ingress` | Auxiliares de solicitud de webhook | Utilidades de destino de webhook | |
  `plugin-sdk/webhook-request-guards` | Auxiliares de guardia de cuerpo de webhook | Auxiliares de lectura/limite de cuerpo de solicitud | | `plugin-sdk/reply-payload` | Tipos de respuesta de mensaje | Tipos de carga útil de respuesta | | `plugin-sdk/provider-onboard` | Parches de incorporación de proveedores | Auxiliares de configuración de incorporación | | `plugin-sdk/keyed-async-queue` | Cola
  asíncrona ordenada | `KeyedAsyncQueue` | | `plugin-sdk/testing` | Utilidades de prueba | Auxiliares y simulacros de prueba |
</Accordion>

Utilice la importación más específica que coincida con la tarea. Si no puede encontrar una exportación, verifique el código fuente en `src/plugin-sdk/` o pregunte en Discord.

## Cronograma de eliminación

| Cuándo                    | Qué sucede                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------- |
| **Ahora**                 | Las superficies obsoletas emiten advertencias en tiempo de ejecución                        |
| **Próxima versión mayor** | Las superficies obsoletas se eliminarán; los complementos que todavía las utilicen fallarán |

Todos los complementos centrales ya han sido migrados. Los complementos externos deben migrar antes de la próxima versión mayor.

## Suprimir temporalmente las advertencias

Establece estas variables de entorno mientras trabajas en la migración:

```bash
OPENCLAW_SUPPRESS_PLUGIN_SDK_COMPAT_WARNING=1 openclaw gateway run
OPENCLAW_SUPPRESS_EXTENSION_API_WARNING=1 openclaw gateway run
```

Esta es una solución de escape temporal, no una solución permanente.

## Relacionado

- [Introducción](/en/plugins/building-plugins) — construya su primer complemento
- [Resumen del SDK](/en/plugins/sdk-overview) — referencia completa de importación de subrutas
- [Complementos de canal](/en/plugins/sdk-channel-plugins) — construcción de complementos de canal
- [Complementos de proveedor](/en/plugins/sdk-provider-plugins) — construcción de complementos de proveedor
- [Aspectos internos del complemento](/en/plugins/architecture) — inmersión profunda en la arquitectura
- [Manifiesto del complemento](/en/plugins/manifest) — referencia del esquema del manifiesto
