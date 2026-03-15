---
summary: "Plan: un SDK de complemento limpio + runtime para todos los conectores de mensajería"
read_when:
  - Defining or refactoring the plugin architecture
  - Migrating channel connectors to the plugin SDK/runtime
title: "Refactorización del SDK de complementos"
---

# Plan de refactorización del SDK de complementos + Runtime

Objetivo: cada conector de mensajería es un complemento (incluido o externo) que utiliza una API estable.
Ningún complemento importa directamente de `src/**`. Todas las dependencias pasan a través del SDK o del runtime.

## Por qué ahora

- Los conectores actuales mezclan patrones: importaciones directas del núcleo, puentes solo de distribución y ayudantes personalizados.
- Esto hace que las actualizaciones sean frágiles y bloquea una superficie limpia de complementos externos.

## Arquitectura objetivo (dos capas)

### 1) SDK de complementos (tiempo de compilación, estable, publicable)

Alcance: tipos, ayudantes y utilidades de configuración. Sin estado de tiempo de ejecución, sin efectos secundarios.

Contenido (ejemplos):

- Tipos: `ChannelPlugin`, adaptadores, `ChannelMeta`, `ChannelCapabilities`, `ChannelDirectoryEntry`.
- Ayudantes de configuración: `buildChannelConfigSchema`, `setAccountEnabledInConfigSection`, `deleteAccountFromConfigSection`,
  `applyAccountNameToChannelSection`.
- Ayudantes de emparejamiento: `PAIRING_APPROVED_MESSAGE`, `formatPairingApproveHint`.
- Ayudantes de incorporación: `promptChannelAccessConfig`, `addWildcardAllowFrom`, tipos de incorporación.
- Ayudantes de parámetros de herramientas: `createActionGate`, `readStringParam`, `readNumberParam`, `readReactionParams`, `jsonResult`.
- Ayudante de enlace a documentos: `formatDocsLink`.

Entrega:

- Publicar como `openclaw/plugin-sdk` (o exportar desde el núcleo bajo `openclaw/plugin-sdk`).
- Semver con garantías de estabilidad explícitas.

### 2) Runtime de complementos (superficie de ejecución, inyectado)

Alcance: todo lo que toque el comportamiento del tiempo de ejecución del núcleo.
Se accede a través de `OpenClawPluginApi.runtime` para que los complementos nunca importen `src/**`.

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
- Cada método de runtime se asigna a una implementación del núcleo existente (sin duplicación).

## Plan de migración (por fases, seguro)

### Fase 0: andamiaje

- Introducir `openclaw/plugin-sdk`.
- Añada `api.runtime` a `OpenClawPluginApi` con la superficie anterior.
- Mantenga las importaciones existentes durante una ventana de transición (advertencias de desaprobación).

### Fase 1: limpieza del puente (bajo riesgo)

- Reemplace `core-bridge.ts` por extensión con `api.runtime`.
- Migre primero BlueBubbles, Zalo, Zalo Personal (ya están cerca).
- Elimine el código de puente duplicado.

### Fase 2: complementos de importación directa ligeros

- Migre Matrix a SDK + runtime.
- Valide la lógica de incorporación, directorio y menciones de grupo.

### Fase 3: complementos de importación directa pesados

- Migre MS Teams (el conjunto más grande de asistentes de runtime).
- Asegúrese de que la semántica de respuesta/escritura coincida con el comportamiento actual.

### Fase 4: creación de complementos de iMessage

- Mueva iMessage a `extensions/imessage`.
- Reemplace las llamadas directas al núcleo con `api.runtime`.
- Mantenga las claves de configuración, el comportamiento de la CLI y la documentación intactos.

### Fase 5: aplicación

- Agregue regla de lint / verificación de CI: sin `extensions/**` importaciones de `src/**`.
- Agregue comprobaciones de compatibilidad del complemento/versión (runtime + SDK semver).

## Compatibilidad y versionado

- SDK: semver, publicado, cambios documentados.
- Runtime: versionado por cada lanzamiento del núcleo. Agregue `api.runtime.version`.
- Los complementos declaran un rango de runtime requerido (por ejemplo, `openclawRuntime: ">=2026.2.0"`).

## Estrategia de pruebas

- Pruebas unitarias a nivel de adaptador (funciones de runtime ejercitadas con la implementación real del núcleo).
- Pruestas golden por complemento: asegurar que no haya deriva de comportamiento (enrutamiento, emparejamiento, lista blanca, restricción de menciones).
- Una única muestra de complemento de extremo a extremo utilizada en CI (instalar + ejecutar + pruebas de humo).

## Preguntas abiertas

- Dónde alojar los tipos del SDK: paquete separado o exportación del núcleo?
- Distribución de tipos de runtime: en SDK (solo tipos) o en el núcleo?
- Cómo exponer los enlaces de documentos para complementos integrados frente a externos?
- ¿Permitimos importaciones directas limitadas del núcleo para los complementos dentro del repositorio durante la transición?

## Criterios de éxito

- Todos los conectores de canal son complementos que usan SDK + runtime.
- Sin `extensions/**` importaciones de `src/**`.
- Las nuevas plantillas de conectores dependen solo de SDK + runtime.
- Los complementos externos pueden desarrollarse y actualizarse sin acceso al código fuente del núcleo.

Documentos relacionados: [Plugins](/es/tools/plugin), [Canales](/es/channels/index), [Configuración](/es/gateway/configuration).

import es from "/components/footer/es.mdx";

<es />
