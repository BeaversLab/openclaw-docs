---
summary: "Plan: un SDK de plugin limpio + runtime para todos los conectores de mensajería"
read_when:
  - Definir o refactorizar la arquitectura de plugins
  - Migrar los conectores de canal al SDK/runtime de plugins
title: "Refactorización del SDK de Plugins"
---

# Plan de refactorización del SDK + Runtime de Plugins

Objetivo: cada conector de mensajería es un plugin (empaquetado o externo) que utiliza una API estable.
Ningún plugin importa directamente desde `src/**`. Todas las dependencias pasan a través del SDK o runtime.

## Por qué ahora

- Los conectores actuales mezclan patrones: importaciones directas del núcleo, puentes solo de distribución y ayudantes personalizados.
- Esto hace que las actualizaciones sean frágiles y bloquea una superficie limpia de plugins externos.

## Arquitectura objetivo (dos capas)

### 1) SDK de Plugin (tiempo de compilación, estable, publicable)

Alcance: tipos, ayudantes y utilidades de configuración. Sin estado de ejecución, sin efectos secundarios.

Contenido (ejemplos):

- Tipos: `ChannelPlugin`, adaptadores, `ChannelMeta`, `ChannelCapabilities`, `ChannelDirectoryEntry`.
- Ayudantes de configuración: `buildChannelConfigSchema`, `setAccountEnabledInConfigSection`, `deleteAccountFromConfigSection`,
  `applyAccountNameToChannelSection`.
- Ayudantes de emparejamiento: `PAIRING_APPROVED_MESSAGE`, `formatPairingApproveHint`.
- Puntos de entrada de configuración: `setup` y `setupWizard` propiedad del host; evitar ayudantes de incorporación pública amplia.
- Ayudantes de parámetros de herramientas: `createActionGate`, `readStringParam`, `readNumberParam`, `readReactionParams`, `jsonResult`.
- Ayudante de enlace de documentación: `formatDocsLink`.

Entrega:

- Publicar como `openclaw/plugin-sdk` (o exportar desde el núcleo bajo `openclaw/plugin-sdk`).
- Semver con garantías explícitas de estabilidad.

### 2) Runtime de Plugin (superficie de ejecución, inyectado)

Alcance: todo lo que toque el comportamiento del núcleo en tiempo de ejecución.
Se accede a través de `OpenClawPluginApi.runtime` para que los plugins nunca importen `src/**`.

Superficie propuesta (mínima pero completa):

```ts
export type PluginRuntime = {
  channel: {
    text: {
      chunkMarkdownText(text: string, limit: number): string[];
      resolveTextChunkLimit(cfg: OpenClawConfig, channel: string, accountId?: string): number;
      hasControlCommand(text: string, cfg: OpenClawConfig): boolean;
    };
    reply: {
      dispatchReplyWithBufferedBlockDispatcher(params: {
        ctx: unknown;
        cfg: unknown;
        dispatcherOptions: {
          deliver: (payload: {
            text?: string;
            mediaUrls?: string[];
            mediaUrl?: string;
          }) => void | Promise<void>;
          onError?: (err: unknown, info: { kind: string }) => void;
        };
      }): Promise<void>;
      createReplyDispatcherWithTyping?: unknown; // adapter for Teams-style flows
    };
    routing: {
      resolveAgentRoute(params: {
        cfg: unknown;
        channel: string;
        accountId: string;
        peer: { kind: RoutePeerKind; id: string };
      }): { sessionKey: string; accountId: string };
    };
    pairing: {
      buildPairingReply(params: { channel: string; idLine: string; code: string }): string;
      readAllowFromStore(channel: string): Promise<string[]>;
      upsertPairingRequest(params: {
        channel: string;
        id: string;
        meta?: { name?: string };
      }): Promise<{ code: string; created: boolean }>;
    };
    media: {
      fetchRemoteMedia(params: { url: string }): Promise<{ buffer: Buffer; contentType?: string }>;
      saveMediaBuffer(
        buffer: Uint8Array,
        contentType: string | undefined,
        direction: "inbound" | "outbound",
        maxBytes: number,
      ): Promise<{ path: string; contentType?: string }>;
    };
    mentions: {
      buildMentionRegexes(cfg: OpenClawConfig, agentId?: string): RegExp[];
      matchesMentionPatterns(text: string, regexes: RegExp[]): boolean;
    };
    groups: {
      resolveGroupPolicy(
        cfg: OpenClawConfig,
        channel: string,
        accountId: string,
        groupId: string,
      ): {
        allowlistEnabled: boolean;
        allowed: boolean;
        groupConfig?: unknown;
        defaultConfig?: unknown;
      };
      resolveRequireMention(
        cfg: OpenClawConfig,
        channel: string,
        accountId: string,
        groupId: string,
        override?: boolean,
      ): boolean;
    };
    debounce: {
      createInboundDebouncer<T>(opts: {
        debounceMs: number;
        buildKey: (v: T) => string | null;
        shouldDebounce: (v: T) => boolean;
        onFlush: (entries: T[]) => Promise<void>;
        onError?: (err: unknown) => void;
      }): { push: (v: T) => void; flush: () => Promise<void> };
      resolveInboundDebounceMs(cfg: OpenClawConfig, channel: string): number;
    };
    commands: {
      resolveCommandAuthorizedFromAuthorizers(params: {
        useAccessGroups: boolean;
        authorizers: Array<{ configured: boolean; allowed: boolean }>;
      }): boolean;
    };
  };
  logging: {
    shouldLogVerbose(): boolean;
    getChildLogger(name: string): PluginLogger;
  };
  state: {
    resolveStateDir(cfg: OpenClawConfig): string;
  };
};
```

Notas:

- El Runtime es la única forma de acceder al comportamiento del núcleo.
- El SDK es intencionalmente pequeño y estable.
- Cada método de runtime se asigna a una implementación existente del núcleo (sin duplicación).

## Plan de migración (por fases, seguro)

### Fase 0: andamiaje

- Introducir `openclaw/plugin-sdk`.
- Añadir `api.runtime` a `OpenClawPluginApi` con la superficie anterior.
- Mantener las importaciones existentes durante un periodo de transición (advertencias de obsolescencia).

### Fase 1: limpieza de puentes (bajo riesgo)

- Reemplazar `core-bridge.ts` por extensión con `api.runtime`.
- Migrar primero BlueBubbles, Zalo, Zalo Personal (ya están cerca).
- Eliminar el código de puente duplicado.

### Fase 2: complementos de importación directa ligeros

- Migrar Matrix a SDK + runtime.
- Validar la lógica de incorporación, directorio y mención de grupo.

### Fase 3: complementos de importación directa pesados

- Migrar MS Teams (el conjunto más grande de asistentes de runtime).
- Asegurar que la semántica de respuesta/escritura coincida con el comportamiento actual.

### Fase 4: complementarización de iMessage

- Mover iMessage a `extensions/imessage`.
- Reemplazar las llamadas directas al núcleo con `api.runtime`.
- Mantener las claves de configuración, el comportamiento de la CLI y la documentación intactos.

### Fase 5: aplicación

- Añadir regla de lint / verificación de CI: sin importaciones `extensions/**` de `src/**`.
- Añadir comprobaciones de compatibilidad de versiones/SDK de complementos (runtime + SDK semver).

## Compatibilidad y versionado

- SDK: semver, publicado, cambios documentados.
- Runtime: versionado por cada lanzamiento del núcleo. Añadir `api.runtime.version`.
- Los complementos declaran un rango de runtime requerido (por ejemplo, `openclawRuntime: ">=2026.2.0"`).

## Estrategia de pruebas

- Pruebas unitarias a nivel de adaptador (funciones de runtime ejercidas con implementación real del núcleo).
- Pruebas doradas por complemento: asegurar que no haya derivas de comportamiento (enrutamiento, emparejamiento, lista de permitidos, bloqueo de menciones).
- Una sola muestra de complemento de extremo a extremo utilizada en CI (instalar + ejecutar + prueba básica).

## Preguntas abiertas

- Dónde alojar los tipos del SDK: paquete separado o exportación del núcleo?
- Distribución de tipos de runtime: en el SDK (solo tipos) o en el núcleo?
- Cómo exponer enlaces de documentación para complementos integrados frente a externos?
- ¿Permitimos importaciones directas limitadas del núcleo para los complementos en el repositorio durante la transición?

## Criterios de éxito

- Todos los conectores de canal son complementos que utilizan SDK + runtime.
- Sin importaciones `extensions/**` de `src/**`.
- Las nuevas plantillas de conectores dependen únicamente del SDK + runtime.
- Los complementos externos se pueden desarrollar y actualizar sin acceso al código fuente del núcleo.

Documentos relacionados: [Plugins](/es/tools/plugin), [Canales](/es/channels/index), [Configuración](/es/gateway/configuration).

## Costuras propiedad del canal implementadas

El trabajo de refactorización reciente amplió el contrato del complemento del canal para que el núcleo pueda dejar de ser propietario
del comportamiento de enrutamiento y la UX específicos del canal:

- `messaging.buildCrossContextComponents`: marcadores de UI entre contextos propiedad del canal
  (por ejemplo, contenedores de componentes de Discord v2)
- `messaging.enableInteractiveReplies`: interruptores de normalización de respuestas propiedad del canal
  (por ejemplo, respuestas interactivas de Slack)
- `messaging.resolveOutboundSessionRoute`: enrutamiento de sesiones salientes propiedad del canal
- `status.formatCapabilitiesProbe` / `status.buildCapabilitiesDiagnostics`: visualización de sondas
  `/channels capabilities` propiedad del canal y auditorías/alcances adicionales
- `threading.resolveAutoThreadId`: hilos automáticos en la misma conversación propiedad del canal
- `threading.resolveReplyTransport`: mapeo de entrega de respuesta versus hilo propiedad del canal
- `actions.requiresTrustedRequesterSender`: puertas de confianza de acciones privilegiadas propiedad del canal
- `execApprovals.*`: estado de la superficie de aprobación de ejecución propiedad del canal, supresión de reenvío,
  UX de carga pendiente y ganchos de preentrega
- `lifecycle.onAccountConfigChanged` / `lifecycle.onAccountRemoved`: limpieza propiedad del canal al
  mutar/eliminar la configuración
- `allowlist.supportsScope`: anuncio de ámbito de lista blanca propiedad del canal

Estos ganchos deben preferirse sobre nuevas ramas `channel === "discord"` / `telegram`
en los flujos centrales compartidos.

import es from "/components/footer/es.mdx";

<es />
