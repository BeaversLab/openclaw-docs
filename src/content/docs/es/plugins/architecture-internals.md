---
summary: "Aspectos internos de la arquitectura de plugins: canalización de carga, registro, ganchos de tiempo de ejecución, rutas HTTP y tablas de referencia"
read_when:
  - Implementing provider runtime hooks, channel lifecycle, or package packs
  - Debugging plugin load order or registry state
  - Adding a new plugin capability or context engine plugin
title: "Aspectos internos de la arquitectura de plugins"
---

Para ver el modelo de capacidades público, las formas de los plugins y los contratos de propiedad/ejecución, consulte [Arquitectura de plugins](/es/plugins/architecture). Esta página es la referencia de la mecánica interna: canalización de carga, registro, ganchos de tiempo de ejecución, rutas HTTP de Gateway, rutas de importación y tablas de esquemas.

## Canalización de carga

Al iniciarse, OpenClaw hace aproximadamente esto:

1. descubrir las raíces de los plugins candidatos
2. leer los manifiestos de paquetes nativos o compatibles y los metadatos del paquete
3. rechazar candidatos no seguros
4. normalizar la configuración del plugin (`plugins.enabled`, `allow`, `deny`, `entries`,
   `slots`, `load.paths`)
5. decidir la habilitación de cada candidato
6. cargar módulos nativos habilitados: los módulos empaquetados construidos usan un cargador nativo;
   los plugins nativos no construidos usan jiti
7. llamar a los ganchos `register(api)` nativos y recopilar los registros en el registro de plugins
8. exponer el registro a comandos/superficies de tiempo de ejecución

<Note>`activate` es un alias heredado de `register` — el cargador resuelve cualquiera que esté presente (`def.register ?? def.activate`) y lo llama en el mismo punto. Todos los plugins empaquetados usan `register`; se prefiere `register` para nuevos plugins.</Note>

Los mecanismos de seguridad ocurren **antes** de la ejecución del tiempo de ejecución. Los candidatos se bloquean
cuando la entrada escapa de la raíz del plugin, la ruta es escribible por todos (world-writable), o la propiedad
de la ruta parece sospechosa para plugins no empaquetados.

### Comportamiento basado primero en el manifiesto

El manifiesto es la fuente de verdad del plano de control. OpenClaw lo usa para:

- identificar el plugin
- descubrir canales/habilidades/esquema de configuración declarados o capacidades del paquete
- validar `plugins.entries.<id>.config`
- aumentar las etiquetas/marcadores de posición de la Interfaz de Usuario de Control
- mostrar metadatos de instalación/catálogo
- preservar descriptores de activación y configuración económicos sin cargar el tiempo de ejecución del plugin

Para los complementos nativos, el módulo de tiempo de ejecución es la parte del plano de datos. Registra el comportamiento real, como ganchos, herramientas, comandos o flujos de proveedores.

Los bloques opcionales de manifiesto `activation` y `setup` se mantienen en el plano de control. Son descriptores solo de metadatos para la planificación de activación y el descubrimiento de configuración; no reemplazan el registro de tiempo de ejecución, `register(...)` o `setupEntry`. Los primeros consumidores de activación en vivo ahora utilizan sugerencias de comando, canal y proveedor del manifiesto para reducir la carga de complementos antes de la materialización más amplia del registro:

- La carga de la CLI se reduce a los complementos que poseen el comando principal solicitado
- la configuración del canal/resolución del complemento se reduce a los complementos que poseen el id de canal solicitado
- la configuración explícita del proveedor/resolución del tiempo de ejecución se reduce a los complementos que poseen el id de proveedor solicitado

El planificador de activación expone tanto una API de solo ids para los llamantes existentes como una API de plan para nuevos diagnósticos. Las entradas del plan informan por qué se seleccionó un complemento, separando las sugerencias explícitas del planificador `activation.*` de la reserva de propiedad del manifiesto como `providers`, `channels`, `commandAliases`, `setup.providers`, `contracts.tools` y ganchos. Esa división de razones es el límite de compatibilidad: los metadatos de complementos existentes siguen funcionando, mientras que el código nuevo puede detectar sugerencias amplias o comportamiento de reserva sin cambiar la semántica de carga del tiempo de ejecución.

La configuración del descubrimiento ahora prefiere los identificadores propios del descriptor, como `setup.providers` y
`setup.cliBackends`, para reducir los complementos candidatos antes de recurrir a
`setup-api` para los complementos que aún necesitan enlaces de tiempo de ejecución (runtime hooks) de configuración. Las listas
de configuración del proveedor usan el manifiesto `providerAuthChoices`, opciones de configuración derivadas del descriptor
y metadatos del catálogo de instalación sin cargar el tiempo de ejecución del proveedor. Un `setup.requiresRuntime: false` explícito
es un punto de corte exclusivo del descriptor; omitir `requiresRuntime` mantiene la alternativa de compatibilidad de la API de configuración heredada. Si más
de un complemento descubierto reclama el mismo proveedor de configuración normalizado o un identificador
de backend de CLI, la búsqueda de configuración rechaza al propietario ambiguo en lugar de confiar en el
orden de descubrimiento. Cuando se ejecuta el tiempo de ejecución de configuración, los diagnósticos del registro informan
desviaciones entre `setup.providers` / `setup.cliBackends` y los proveedores o CLI
backends registrados por setup-api sin bloquear los complementos heredados.

### Lo que almacena en caché el cargador

OpenClaw mantiene cachés cortos en proceso para:

- resultados del descubrimiento
- datos del registro de manifiestos
- registros de complementos cargados

Estas cachés reducen la carga de inicio y la sobrecarga de comandos repetidos. Es seguro
considerarlas como cachés de rendimiento de corta duración, no como persistencia.

Las rutas de acceso rápidas (hot paths) de inicio de Gateway deben preferir el `PluginMetadataSnapshot` actual,
el `PluginLookUpTable` derivado, o un registro de manifiesto explícito pasado a través de
la cadena de llamadas. La validación de configuración, la activación automática al inicio y el arranque de complementos usan
la misma instantánea cuando está disponible. Para las llamadas que todavía reconstruyen metadatos de manifiesto
a partir del índice persistente de complementos instalados, OpenClaw también mantiene una pequeña
caché de respaldo delimitada claveada por el índice instalado, la forma de la solicitud, la política
de configuración, las raíces de tiempo de ejecución y las firmas de archivos de manifiesto/paquete. Esa caché es solo una
alternativa para la reconstrucción repetida del índice instalado; no es un registro de complementos
de tiempo de ejecución mutable.

Nota de rendimiento:

- Establezca `OPENCLAW_DISABLE_PLUGIN_DISCOVERY_CACHE=1` o
  `OPENCLAW_DISABLE_PLUGIN_MANIFEST_CACHE=1` para deshabilitar estas cachés.
- Establezca `OPENCLAW_DISABLE_INSTALLED_PLUGIN_MANIFEST_REGISTRY_CACHE=1` para deshabilitar
  solo la caché de respaldo del registro de manifiestos del índice instalado.
- Ajuste las ventanas de caché con `OPENCLAW_PLUGIN_DISCOVERY_CACHE_MS` y
  `OPENCLAW_PLUGIN_MANIFEST_CACHE_MS`.

## Modelo de registro

Los plugins cargados no mutan directamente globales aleatorios del núcleo. Se registran en un registro central de plugins.

El registro rastrea:

- registros de plugins (identidad, fuente, origen, estado, diagnósticos)
- herramientas
- ganchos heredados y ganchos tipados
- canales
- proveedores
- controladores RPC de puerta de enlace
- rutas HTTP
- registradores de CLI
- servicios en segundo plano
- comandos propios del plugin

Las características principales luego leen de ese registro en lugar de comunicarse directamente con los módulos del plugin. Esto mantiene la carga en una sola dirección:

- módulo de plugin -> registro en el registro
- tiempo de ejecución principal -> consumo del registro

Esa separación es importante para la mantenibilidad. Significa que la mayoría de las superficies principales solo necesitan un punto de integración: "leer el registro", en lugar de "casos especiales para cada módulo de plugin".

## Retrollamadas de vinculación de conversaciones

Los plugins que vinculan una conversación pueden reaccionar cuando se resuelve una aprobación.

Use `api.onConversationBindingResolved(...)` para recibir una retrollamada después de que una solicitud de vinculación se apruebe o se deniegue:

```ts
export default {
  id: "my-plugin",
  register(api) {
    api.onConversationBindingResolved(async (event) => {
      if (event.status === "approved") {
        // A binding now exists for this plugin + conversation.
        console.log(event.binding?.conversationId);
        return;
      }

      // The request was denied; clear any local pending state.
      console.log(event.request.conversation.conversationId);
    });
  },
};
```

Campos de la carga útil de la retrollamada:

- `status`: `"approved"` o `"denied"`
- `decision`: `"allow-once"`, `"allow-always"`, o `"deny"`
- `binding`: la vinculación resuelta para solicitudes aprobadas
- `request`: el resumen de la solicitud original, sugerencia de desvinculación, id del remitente y metadatos de la conversación

Esta retrollamada es solo de notificación. No cambia quién tiene permiso para vincular una conversación y se ejecuta después de que finaliza el manejo de la aprobación principal.

## Ganchos de tiempo de ejecución del proveedor

Los plugins de proveedor tienen tres capas:

- **Metadatos de manifiesto** para búsquedas previas al tiempo de ejecución económicas:
  `setup.providers[].envVars`, compatibilidad en desuso `providerAuthEnvVars`,
  `providerAuthAliases`, `providerAuthChoices`, y `channelEnvVars`.
- **Ganchos de tiempo de configuración**: `catalog` (legado `discovery`) más
  `applyConfigDefaults`.
- **Ganchos de tiempo de ejecución**: más de 40 ganchos opcionales que cubren autenticación, resolución de modelos, ajuste de flujo, niveles de pensamiento, política de repetición y puntos finales de uso. Vea la lista completa en [Hook order and usage](#hook-order-and-usage).

OpenClaw sigue siendo propietario del bucle genérico del agente, la conmutación por error, el manejo de transcripciones y la política de herramientas. Estos ganchos son la superficie de extensión para el comportamiento específico del proveedor sin necesidad de un transporte de inferencia personalizado completo.

Use el manifiesto `setup.providers[].envVars` cuando el proveedor tenga credenciales basadas en variables de entorno que las rutas genéricas de auth/status/model-picker deban ver sin cargar el runtime del plugin. El `providerAuthEnvVars` obsoleto todavía lo lee el adaptador de compatibilidad durante el período de obsolescencia, y los plugins no empaquetados que lo usan reciben un diagnóstico de manifiesto. Use el manifiesto `providerAuthAliases` cuando un ID de proveedor deba reutilizar las variables de entorno, perfiles de autenticación, autenticación respaldada por configuración y la elección de incorporación de clave API de otro ID de proveedor. Use el manifiesto `providerAuthChoices` cuando las superficies de CLI de incorporación/elección de autenticación deban conocer el ID de elección, las etiquetas de grupo y el cableado de autenticación de un solo indicador simple del proveedor sin cargar el runtime del proveedor. Mantenga el `envVars` del runtime del proveedor para las pistas orientadas al operador, como las etiquetas de incorporación o las variables de configuración del ID de cliente y secreto de cliente de OAuth.

Use el manifiesto `channelEnvVars` cuando un canal tenga autenticación o configuración impulsada por variables de entorno que la reserva genérica de shell-env, las verificaciones de config/status o las solicitudes de configuración deban ver sin cargar el runtime del canal.

### Orden y uso de los ganchos

Para los plugins de modelos/proveedores, OpenClaw llama a los ganchos en este orden aproximado. La columna "Cuándo usar" es la guía de decisión rápida.

| #   | Gancho                            | Lo que hace                                                                                                                                                                   | Cuándo usar                                                                                                                                                                                                                   |
| --- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `catalog`                         | Publicar configuración del proveedor en `models.providers` durante la generación de `models.json`                                                                             | El proveedor posee un catálogo o valores predeterminados de URL base                                                                                                                                                          |
| 2   | `applyConfigDefaults`             | Aplicar valores predeterminados de configuración global propios del proveedor durante la materialización de la configuración                                                  | Los valores predeterminados dependen del modo de autenticación, el entorno o la semántica de la familia de modelos del proveedor                                                                                              |
| --  | _(búsqueda de modelo integrada)_  | OpenClaw prueba primero la ruta normal de registro/catálogo                                                                                                                   | _(no es un gancho de plugin)_                                                                                                                                                                                                 |
| 3   | `normalizeModelId`                | Normalizar alias de ID de modelo heredados o de vista previa antes de la búsqueda                                                                                             | El proveedor posee la limpieza de alias antes de la resolución del modelo canónico                                                                                                                                            |
| 4   | `normalizeTransport`              | Normalizar la familia del proveedor `api` / `baseUrl` antes del ensamblaje del modelo genérico                                                                                | El proveedor es propietario de la limpieza del transporte para los IDs de proveedor personalizados en la misma familia de transporte                                                                                          |
| 5   | `normalizeConfig`                 | Normalizar `models.providers.<id>` antes de la resolución del runtime/proveedor                                                                                               | El proveedor necesita una limpieza de configuración que debe residir con el complemento; los auxiliares de la familia de Google incluidos también sirven de respaldo para las entradas de configuración de Google compatibles |
| 6   | `applyNativeStreamingUsageCompat` | Aplicar reescrituras de compatibilidad de uso de transmisión nativa a los proveedores de configuración                                                                        | El proveedor necesita correcciones de metadatos de uso de transmisión nativa impulsadas por el endpoint                                                                                                                       |
| 7   | `resolveConfigApiKey`             | Resolver la autenticación de marcadores de entorno para los proveedores de configuración antes de la carga de autenticación en tiempo de ejecución                            | El proveedor tiene una resolución de clave de API de marcador de entorno propiedad del proveedor; `amazon-bedrock` también tiene un resolvedor de marcador de entorno de AWS integrado aquí                                   |
| 8   | `resolveSyntheticAuth`            | Exponer la autenticación local/autoalojada o respaldada por configuración sin persistir texto plano                                                                           | El proveedor puede operar con un marcador de credencial sintético/local                                                                                                                                                       |
| 9   | `resolveExternalAuthProfiles`     | Superponer perfiles de autenticación externos propiedad del proveedor; el `persistence` predeterminado es `runtime-only` para las credenciales propiedad de la CLI/aplicación | El proveedor reutiliza las credenciales de autenticación externa sin persistir tokens de actualización copiados; declarar `contracts.externalAuthProviders` en el manifiesto                                                  |
| 10  | `shouldDeferSyntheticProfileAuth` | Reducir los marcadores de posición de perfil sintético almacenados detrás de la autenticación respaldada por entorno/configuración                                            | El proveedor almacena perfiles de marcador de posición sintéticos que no deben ganar precedencia                                                                                                                              |
| 11  | `resolveDynamicModel`             | Respaldo de sincronización para los IDs de modelo propiedad del proveedor que aún no están en el registro local                                                               | El proveedor acepta IDs de modelo ascendentes arbitrarios                                                                                                                                                                     |
| 12  | `prepareDynamicModel`             | Calentamiento asíncrono, luego `resolveDynamicModel` se ejecuta nuevamente                                                                                                    | El proveedor necesita metadatos de red antes de resolver IDs desconocidos                                                                                                                                                     |
| 13  | `normalizeResolvedModel`          | Reescritura final antes de que el ejecutor integrado utilice el modelo resuelto                                                                                               | El proveedor necesita reescrituras de transporte pero aún usa un transporte principal                                                                                                                                         |
| 14  | `contributeResolvedModelCompat`   | Contribuir con marcas de compatibilidad para modelos de proveedores detrás de otro transporte compatible                                                                      | El proveedor reconoce sus propios modelos en transportes de proxy sin asumir el control del proveedor                                                                                                                         |
| 15  | `capabilities`                    | Metadatos de transcripción/herramientas propiedad del proveedor utilizados por la lógica central compartida                                                                   | El proveedor necesita peculiaridades de la familia de proveedores/transcripciones                                                                                                                                             |
| 16  | `normalizeToolSchemas`            | Normalizar esquemas de herramientas antes de que el ejecutor integrado los vea                                                                                                | El proveedor necesita limpieza de esquema de la familia de transporte                                                                                                                                                         |
| 17  | `inspectToolSchemas`              | Exponer diagnósticos de esquema propiedad del proveedor después de la normalización                                                                                           | El proveedor quiere advertencias de palabras clave sin enseñar reglas específicas del proveedor al núcleo                                                                                                                     |
| 18  | `resolveReasoningOutputMode`      | Seleccionar contrato de salida de razonamiento nativo frente a etiquetado                                                                                                     | El proveedor necesita salida de razonamiento/final etiquetada en lugar de campos nativos                                                                                                                                      |
| 19  | `prepareExtraParams`              | Normalización de parámetros de solicitud antes de los contenedores de opciones de transmisión genéricos                                                                       | El proveedor necesita parámetros de solicitud predeterminados o limpieza de parámetros por proveedor                                                                                                                          |
| 20  | `createStreamFn`                  | Reemplazar completamente la ruta de transmisión normal con un transporte personalizado                                                                                        | El proveedor necesita un protocolo de cable personalizado, no solo un contenedor                                                                                                                                              |
| 21  | `wrapStreamFn`                    | Contenedor de transmisión después de aplicar los contenedores genéricos                                                                                                       | El proveedor necesita contenedores de compatibilidad de encabezados/cuerpo/modelo de solicitud sin un transporte personalizado                                                                                                |
| 22  | `resolveTransportTurnState`       | Adjuntar encabezados de transporte o metadatos nativos por turno                                                                                                              | El proveedor quiere que los transportes genéricos envíen la identidad de turno nativa del proveedor                                                                                                                           |
| 23  | `resolveWebSocketSessionPolicy`   | Adjuntar encabezados nativos de WebSocket o política de enfriamiento de sesión                                                                                                | El proveedor quiere que los transportes WS genéricos ajusten los encabezados de sesión o la política de respaldo                                                                                                              |
| 24  | `formatApiKey`                    | Formateador de perfil de autenticación: el perfil almacenado se convierte en la cadena de tiempo de ejecución `apiKey`                                                        | El proveedor almacena metadatos de autenticación adicionales y necesita una forma de token de tiempo de ejecución personalizada                                                                                               |
| 25  | `refreshOAuth`                    | Anulación de actualización de OAuth para puntos finales de actualización personalizados o política de fallo de actualización                                                  | El proveedor no se ajusta a los actualizadores compartidos `pi-ai`                                                                                                                                                            |
| 26  | `buildAuthDoctorHint`             | Sugerencia de reparación anexada cuando falla la actualización de OAuth                                                                                                       | El proveedor necesita orientación de reparación de autenticación propia del proveedor después de un fallo de actualización                                                                                                    |
| 27  | `matchesContextOverflowError`     | Comparador de desbordamiento de ventana de contexto propiedad del proveedor                                                                                                   | El proveedor tiene errores de desbordamiento sin procesar que las heurísticas genéricas pasarían por alto                                                                                                                     |
| 28  | `classifyFailoverReason`          | Clasificación de motivos de conmutación por error propiedad del proveedor                                                                                                     | El proveedor puede asignar errores de API/transporte sin procesar a límites de tasa/sobrecarga/etc.                                                                                                                           |
| 29  | `isCacheTtlEligible`              | Política de caché de avisos para proveedores de proxy/backhaul                                                                                                                | El proveedor necesita un control de TTL de caché específico del proxy                                                                                                                                                         |
| 30  | `buildMissingAuthMessage`         | Reemplazo del mensaje genérico de recuperación de autenticación faltante                                                                                                      | El proveedor necesita una sugerencia de recuperación de autenticación faltante específica del proveedor                                                                                                                       |
| 31  | `suppressBuiltInModel`            | Supresión de modelo ascendente obsoleto más sugerencia de error opcional para el usuario                                                                                      | El proveedor necesita ocultar filas ascendentes obsoletas o reemplazarlas con una sugerencia del proveedor                                                                                                                    |
| 32  | `augmentModelCatalog`             | Filas de catálogo sintéticas/finales añadidas después del descubrimiento                                                                                                      | El proveedor necesita filas sintéticas de compatibilidad futura en `models list` y selectores                                                                                                                                 |
| 33  | `resolveThinkingProfile`          | Configuración de nivel `/think` específica del modelo, etiquetas de visualización y valor predeterminado                                                                      | El proveedor expone una escalera de pensamiento personalizada o una etiqueta binaria para modelos seleccionados                                                                                                               |
| 34  | `isBinaryThinking`                | Gancho de compatibilidad del interruptor de razonamiento on/off                                                                                                               | El proveedor expone solo el pensamiento binario on/off                                                                                                                                                                        |
| 35  | `supportsXHighThinking`           | Gancho de compatibilidad de soporte de razonamiento `xhigh`                                                                                                                   | El proveedor desea `xhigh` solo en un subconjunto de modelos                                                                                                                                                                  |
| 36  | `resolveDefaultThinkingLevel`     | Gancho de compatibilidad del nivel `/think` predeterminado                                                                                                                    | El proveedor es propietario de la política `/think` predeterminada para una familia de modelos                                                                                                                                |
| 37  | `isModernModelRef`                | Comparador de modelo moderno para filtros de perfil en vivo y selección de pruebas                                                                                            | El proveedor posee la coincidencia de modelo preferido en vivo/pruebas                                                                                                                                                        |
| 38  | `prepareRuntimeAuth`              | Intercambiar una credencial configurada por el token/clave de tiempo de ejecución real justo antes de la inferencia                                                           | El proveedor necesita un intercambio de tokens o una credencial de solicitud de corta duración                                                                                                                                |
| 39  | `resolveUsageAuth`                | Resolver credenciales de uso/facturación para `/usage` y superficies de estado relacionadas                                                                                   | El proveedor necesita análisis personalizado de tokens de uso/cuota o una credencial de uso diferente                                                                                                                         |
| 40  | `fetchUsageSnapshot`              | Obtener y normalizar instantáneas de uso/cuota específicos del proveedor una vez resuelta la autenticación                                                                    | El proveedor necesita un punto de conexión de uso específico del proveedor o un analizador de carga útil                                                                                                                      |
| 41  | `createEmbeddingProvider`         | Construir un adaptador de incrustación propiedad del proveedor para memoria/búsqueda                                                                                          | El comportamiento de incrustación de memoria pertenece al complemento del proveedor                                                                                                                                           |
| 42  | `buildReplayPolicy`               | Devolver una política de repetición que controle el manejo de transcripciones para el proveedor                                                                               | El proveedor necesita una política de transcripción personalizada (por ejemplo, eliminación de bloques de pensamiento)                                                                                                        |
| 43  | `sanitizeReplayHistory`           | Reescribir el historial de repetición después de la limpieza genérica de la transcripción                                                                                     | El proveedor necesita reescrituras de repetición específicas del proveedor más allá de los asistentes de compactación compartidos                                                                                             |
| 44  | `validateReplayTurns`             | Validación o remodelación final del turno de repetición antes del ejecutor integrado                                                                                          | El transporte del proveedor necesita una validación de turno más estricta después de la saneamiento genérico                                                                                                                  |
| 45  | `onModelSelected`                 | Ejecutar efectos secundarios posteriores a la selección propiedad del proveedor                                                                                               | El proveedor necesita telemetría o estado propiedad del proveedor cuando un modelo se vuelve activo                                                                                                                           |

`normalizeModelId`, `normalizeTransport` y `normalizeConfig` primero verifican el
complemento del proveedor coincidente, luego pasan a otros complementos del proveedor con capacidad de enlace
hasta que uno realmente cambie el ID del modelo o el transporte/configuración. Eso mantiene
funcionando los shims de proveedores de alias/compatibilidad sin requerir que la persona que llama sepa qué
complemento empaquetado posee la reescritura. Si ningún enlace de proveedor reescribe una entrada de configuración
compatible con la familia de Google compatible, el normalizador de configuración de Google empaquetado aún aplica
esa limpieza de compatibilidad.

Si el proveedor necesita un protocolo de cable completamente personalizado o un ejecutor de solicitudes personalizado,
esa es una clase diferente de extensión. Estos enlaces son para el comportamiento del proveedor
que aún se ejecuta en el bucle de inferencia normal de OpenClaw.

### Ejemplo de proveedor

```ts
api.registerProvider({
  id: "example-proxy",
  label: "Example Proxy",
  auth: [],
  catalog: {
    order: "simple",
    run: async (ctx) => {
      const apiKey = ctx.resolveProviderApiKey("example-proxy").apiKey;
      if (!apiKey) {
        return null;
      }
      return {
        provider: {
          baseUrl: "https://proxy.example.com/v1",
          apiKey,
          api: "openai-completions",
          models: [{ id: "auto", name: "Auto" }],
        },
      };
    },
  },
  resolveDynamicModel: (ctx) => ({
    id: ctx.modelId,
    name: ctx.modelId,
    provider: "example-proxy",
    api: "openai-completions",
    baseUrl: "https://proxy.example.com/v1",
    reasoning: false,
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 128000,
    maxTokens: 8192,
  }),
  prepareRuntimeAuth: async (ctx) => {
    const exchanged = await exchangeToken(ctx.apiKey);
    return {
      apiKey: exchanged.token,
      baseUrl: exchanged.baseUrl,
      expiresAt: exchanged.expiresAt,
    };
  },
  resolveUsageAuth: async (ctx) => {
    const auth = await ctx.resolveOAuthToken();
    return auth ? { token: auth.token } : null;
  },
  fetchUsageSnapshot: async (ctx) => {
    return await fetchExampleProxyUsage(ctx.token, ctx.timeoutMs, ctx.fetchFn);
  },
});
```

### Ejemplos integrados

Los complementos del proveedor empaquetados combinan los enlaces anteriores para adaptarse al catálogo,
autenticación, pensamiento, repetición y uso de cada proveedor. El conjunto de enlaces autorizado vive con
cada complemento bajo `extensions/`; esta página ilustra las formas en lugar de
reflejar la lista.

<AccordionGroup>
  <Accordion title="Proveedores de catálogo de paso a través">OpenRouter, Kilocode, Z.AI, xAI registran `catalog` más `resolveDynamicModel` / `prepareDynamicModel` para que puedan mostrar IDs de modelos upstream antes del catálogo estático de OpenClaw.</Accordion>
  <Accordion title="Proveedores de OAuth y puntos finales de uso">GitHub Copilot, Gemini CLI, ChatGPT Codex, MiniMax, Xiaomi, z.ai emparejan `prepareRuntimeAuth` o `formatApiKey` con `resolveUsageAuth` + `fetchUsageSnapshot` para ser propietarios del intercambio de tokens y la integración de `/usage`.</Accordion>
  <Accordion title="Familias de repetición y limpieza de transcripciones">Las familias con nombre compartido (`google-gemini`, `passthrough-gemini`, `anthropic-by-model`, `hybrid-anthropic-openai`) permiten que los proveedores acepten la política de transcripciones a través de `buildReplayPolicy` en lugar de que cada complemento vuelva a implementar la limpieza.</Accordion>
  <Accordion title="Proveedores solo de catálogo">`byteplus`, `cloudflare-ai-gateway`, `huggingface`, `kimi-coding`, `nvidia`, `qianfan`, `synthetic`, `together`, `venice`, `vercel-ai-gateway` y `volcengine` registran solo `catalog` y utilizan el bucle de inferencia compartido.</Accordion>
  <Accordion title="Ayudantes de flujo específicos de Anthropic">Los encabezados beta, `/fast` / `serviceTier` y `context1m` residen dentro de la costura pública `api.ts` / `contract-api.ts` del complemento de Anthropic (`wrapAnthropicProviderStream`, `resolveAnthropicBetas`, `resolveAnthropicFastMode`, `resolveAnthropicServiceTier`) en lugar de en el SDK genérico.</Accordion>
</AccordionGroup>

## Ayudantes de tiempo de ejecución

Los complementos pueden acceder a ciertos ayudantes principales a través de `api.runtime`. Para TTS:

```ts
const clip = await api.runtime.tts.textToSpeech({
  text: "Hello from OpenClaw",
  cfg: api.config,
});

const result = await api.runtime.tts.textToSpeechTelephony({
  text: "Hello from OpenClaw",
  cfg: api.config,
});

const voices = await api.runtime.tts.listVoices({
  provider: "elevenlabs",
  cfg: api.config,
});
```

Notas:

- `textToSpeech` devuelve la carga útil de salida TTS central normal para superficies de archivo/nota de voz.
- Utiliza la configuración central `messages.tts` y la selección del proveedor.
- Devuelve el búfer de audio PCM + la frecuencia de muestreo. Los complementos deben remuestrear/codificar para los proveedores.
- `listVoices` es opcional por proveedor. Úselo para selectores de voz propiedad del proveedor o flujos de configuración.
- Las listas de voces pueden incluir metadatos más ricos, como configuración regional, género y etiquetas de personalidad para selectores con conocimiento del proveedor.
- OpenAI y ElevenLabs admiten telefonía hoy. Microsoft no.

Los complementos también pueden registrar proveedores de voz a través de `api.registerSpeechProvider(...)`.

```ts
api.registerSpeechProvider({
  id: "acme-speech",
  label: "Acme Speech",
  isConfigured: ({ config }) => Boolean(config.messages?.tts),
  synthesize: async (req) => {
    return {
      audioBuffer: Buffer.from([]),
      outputFormat: "mp3",
      fileExtension: ".mp3",
      voiceCompatible: false,
    };
  },
});
```

Notas:

- Mantenga la política, el respaldo y la entrega de respuestas de TTS en el núcleo.
- Use proveedores de voz para el comportamiento de síntesis propiedad del proveedor.
- La entrada `edge` heredada de Microsoft se normaliza al id. de proveedor `microsoft`.
- El modelo de propiedad preferido está orientado a la empresa: un complemento de proveedor puede ser propietario de
  proveedores de texto, voz, imagen y medios futuros a medida que OpenClaw agregue esos
  contratos de capacidad.

Para la comprensión de imagen/audio/video, los complementos registran un proveedor
de comprensión de medios con tipo en lugar de una bolsa genérica de clave/valor:

```ts
api.registerMediaUnderstandingProvider({
  id: "google",
  capabilities: ["image", "audio", "video"],
  describeImage: async (req) => ({ text: "..." }),
  transcribeAudio: async (req) => ({ text: "..." }),
  describeVideo: async (req) => ({ text: "..." }),
});
```

Notas:

- Mantenga la orquestación, el respaldo, la configuración y el cableado del canal en el núcleo.
- Mantenga el comportamiento del proveedor en el complemento del proveedor.
- La expansión aditiva debe mantenerse tipada: nuevos métodos opcionales, nuevos campos opcionales
  de resultado, nuevas capacidades opcionales.
- La generación de video ya sigue el mismo patrón:
  - el núcleo posee el contrato de capacidad y el ayudante de tiempo de ejecución
  - los complementos de proveedores registran `api.registerVideoGenerationProvider(...)`
  - los plugins de características/canales consumen `api.runtime.videoGeneration.*`

Para los asistentes de ejecución de comprensión multimedia, los plugins pueden llamar a:

```ts
const image = await api.runtime.mediaUnderstanding.describeImageFile({
  filePath: "/tmp/inbound-photo.jpg",
  cfg: api.config,
  agentDir: "/tmp/agent",
});

const video = await api.runtime.mediaUnderstanding.describeVideoFile({
  filePath: "/tmp/inbound-video.mp4",
  cfg: api.config,
});
```

Para la transcripción de audio, los plugins pueden usar el tiempo de ejecución de comprensión multimedia
o el alias STT anterior:

```ts
const { text } = await api.runtime.mediaUnderstanding.transcribeAudioFile({
  filePath: "/tmp/inbound-audio.ogg",
  cfg: api.config,
  // Optional when MIME cannot be inferred reliably:
  mime: "audio/ogg",
});
```

Notas:

- `api.runtime.mediaUnderstanding.*` es la superficie compartida preferida para
  la comprensión de imagen/audio/video.
- Utiliza la configuración de audio principal de comprensión multimedia (`tools.media.audio`) y el orden de reserva del proveedor.
- Devuelve `{ text: undefined }` cuando no se produce ninguna salida de transcripción (por ejemplo, entrada omitida/no admitida).
- `api.runtime.stt.transcribeAudioFile(...)` permanece como un alias de compatibilidad.

Los plugins también pueden iniciar ejecuciones de subagentes en segundo plano a través de `api.runtime.subagent`:

```ts
const result = await api.runtime.subagent.run({
  sessionKey: "agent:main:subagent:search-helper",
  message: "Expand this query into focused follow-up searches.",
  provider: "openai",
  model: "gpt-4.1-mini",
  deliver: false,
});
```

Notas:

- `provider` y `model` son anulaciones opcionales por ejecución, no cambios persistentes de sesión.
- OpenClaw solo respeta esos campos de anulación para llamadores de confianza.
- Para las ejecuciones de reserva propiedad del plugin, los operadores deben aceptar explícitamente con `plugins.entries.<id>.subagent.allowModelOverride: true`.
- Use `plugins.entries.<id>.subagent.allowedModels` para restringir los plugins de confianza a objetivos `provider/model` canónicos específicos, o `"*"` para permitir explícitamente cualquier objetivo.
- Las ejecuciones de subagentes de plugins que no son de confianza aún funcionan, pero las solicitudes de anulación se rechazan en lugar de recurrir silenciosamente.
- Las sesiones de subagentes creadas por plugins se etiquetan con el id del plugin creador. El recurso `api.runtime.subagent.deleteSession(...)` de reserva solo puede eliminar esas sesiones propias; la eliminación arbitraria de sesiones aún requiere una solicitud de Gateway con ámbito de administrador.

Para la búsqueda web, los plugins pueden consumir el asistente de ejecución compartido en lugar de
acceder al cableado de herramientas del agente:

```ts
const providers = api.runtime.webSearch.listProviders({
  config: api.config,
});

const result = await api.runtime.webSearch.search({
  config: api.config,
  args: {
    query: "OpenClaw plugin runtime helpers",
    count: 5,
  },
});
```

Los plugins también pueden registrar proveedores de búsqueda web a través de
`api.registerWebSearchProvider(...)`.

Notas:

- Mantenga la selección del proveedor, la resolución de credenciales y la semántica de solicitudes compartidas en el núcleo.
- Use proveedores de búsqueda web para transportes de búsqueda específicos del proveedor.
- `api.runtime.webSearch.*` es la superficie compartida preferida para los plugins de características/canales que necesitan comportamiento de búsqueda sin depender del contenedor de herramientas del agente.

### `api.runtime.imageGeneration`

```ts
const result = await api.runtime.imageGeneration.generate({
  config: api.config,
  args: { prompt: "A friendly lobster mascot", size: "1024x1024" },
});

const providers = api.runtime.imageGeneration.listProviders({
  config: api.config,
});
```

- `generate(...)`: genera una imagen utilizando la cadena de proveedores de generación de imágenes configurada.
- `listProviders(...)`: lista los proveedores de generación de imágenes disponibles y sus capacidades.

## Rutas HTTP del Gateway

Los complementos pueden exponer endpoints HTTP con `api.registerHttpRoute(...)`.

```ts
api.registerHttpRoute({
  path: "/acme/webhook",
  auth: "plugin",
  match: "exact",
  handler: async (_req, res) => {
    res.statusCode = 200;
    res.end("ok");
    return true;
  },
});
```

Campos de ruta:

- `path`: ruta de acceso bajo el servidor HTTP del gateway.
- `auth`: obligatorio. Use `"gateway"` para requerir la autenticación normal del gateway, o `"plugin"` para autenticación/verificación de webhook administrada por el complemento.
- `match`: opcional. `"exact"` (predeterminado) o `"prefix"`.
- `replaceExisting`: opcional. Permite que el mismo complemento reemplace su propio registro de ruta existente.
- `handler`: devuelve `true` cuando la ruta manejó la solicitud.

Notas:

- `api.registerHttpHandler(...)` se eliminó y causará un error de carga del complemento. Use `api.registerHttpRoute(...)` en su lugar.
- Las rutas de los complementos deben declarar `auth` explícitamente.
- Los conflictos exactos de `path + match` se rechazan a menos que `replaceExisting: true`, y un complemento no puede reemplazar la ruta de otro complemento.
- Las rutas superpuestas con diferentes niveles de `auth` se rechazan. Mantenga las cadenas de paso `exact`/`prefix` solo en el mismo nivel de autenticación.
- Las rutas `auth: "plugin"` **no** reciben alcances de tiempo de ejecución del operador automáticamente. Son para webhooks/verificación de firmas administrados por el complemento, no para llamadas de ayuda privilegiadas del Gateway.
- Las rutas `auth: "gateway"` se ejecutan dentro de un alcance de tiempo de ejecución de solicitud del Gateway, pero ese alcance es intencionalmente conservador:
  - la autenticación bearer de secreto compartido (`gateway.auth.mode = "token"` / `"password"`) mantiene los alcances de tiempo de ejecución de la ruta del complemento fijados a `operator.write`, incluso si el remitente envía `x-openclaw-scopes`
  - los modos HTTP que portan identidad de confianza (por ejemplo, `trusted-proxy` o `gateway.auth.mode = "none"` en un ingreso privado) respetan `x-openclaw-scopes` solo cuando el encabezado está explícitamente presente
  - si `x-openclaw-scopes` está ausente en esas solicitudes de ruta de complemento con identidad, el ámbito de tiempo de ejecución vuelve a `operator.write`
- Regla práctica: no asuma que una ruta de complemento de autenticación de puerta de enlace es una superficie de administrador implícita. Si su ruta necesita un comportamiento solo para administradores, requiera un modo de autenticación con identidad y documente el contrato explícito del encabezado `x-openclaw-scopes`.

## Rutas de importación del SDK de complementos

Utilice subrutas estrechas del SDK en lugar del barril raiz monolítico `openclaw/plugin-sdk`
al crear nuevos complementos. Subrutas principales:

| Subruta                             | Propósito                                           |
| ----------------------------------- | --------------------------------------------------- |
| `openclaw/plugin-sdk/plugin-entry`  | Primitivas de registro de complementos              |
| `openclaw/plugin-sdk/channel-core`  | Asistentes de entrada/construcción de canales       |
| `openclaw/plugin-sdk/core`          | Asistentes compartidos genéricos y contrato general |
| `openclaw/plugin-sdk/config-schema` | Esquema Zod raíz `openclaw.json` (`OpenClawSchema`) |

Los complementos de canal eligen de una familia de costuras estrechas — `channel-setup`,
`setup-runtime`, `setup-adapter-runtime`, `setup-tools`, `channel-pairing`,
`channel-contract`, `channel-feedback`, `channel-inbound`, `channel-lifecycle`,
`channel-reply-pipeline`, `command-auth`, `secret-input`, `webhook-ingress`,
`channel-targets`, y `channel-actions`. El comportamiento de aprobación debe consolidarse
en un contrato `approvalCapability` en lugar de mezclar entre campos de
complementos no relacionados. Consulte [Complementos de canal](/es/plugins/sdk-channel-plugins).

Los asistentes de tiempo de ejecución y configuración viven bajo subrutas `*-runtime` coincidentes
(`approval-runtime`, `config-runtime`, `infra-runtime`, `agent-runtime`,
`lazy-runtime`, `directory-runtime`, `text-runtime`, `runtime-store`, etc.).

<Info>`openclaw/plugin-sdk/channel-runtime` está obsoleto: un shim de compatibilidad para complementos antiguos. El código nuevo debe importar primitivas genéricas más estrechas en su lugar.</Info>

Puntos de entrada internos del repositorio (por raíz de paquete de complemento incluido):

- `index.js` — entrada de complemento incluido
- `api.js` — barril de ayudantes/tipos
- `runtime-api.js` — barril solo de tiempo de ejecución
- `setup-entry.js` — entrada de complemento de configuración

Los complementos externos solo deben importar subrutas `openclaw/plugin-sdk/*`. Nunca
importe el `src/*` de otro paquete de complementos desde el núcleo o desde otro complemento.
Los puntos de entrada cargados por fachada prefieren la instantánea activa de configuración de tiempo de ejecución cuando existe,
luego recurren al archivo de configuración resuelto en el disco.

Las subrutas específicas de capacidades como `image-generation`, `media-understanding`
y `speech` existen porque los complementos incluidos las usan hoy. No son
contratos externos congelados a largo plazo automáticamente: consulte la página de referencia del SDK
relevante cuando dependa de ellas.

## Esquemas de herramientas de mensajes

Los complementos deben ser propietarios de las contribuciones del esquema `describeMessageTool(...)` específicas del canal
para primitivas que no sean mensajes, como reacciones, lecturas y encuestas.
La presentación de envío compartida debe usar el contrato genérico `MessagePresentation`
en lugar de campos de botones, componentes, bloques o tarjetas nativos del proveedor.
Consulte [Message Presentation](/es/plugins/message-presentation) para obtener el contrato,
reglas de respaldo, mapeo de proveedores y lista de verificación para autores de complementos.

Los complementos con capacidad de envío declaran lo que pueden renderizar a través de capacidades de mensajes:

- `presentation` para bloques de presentación semántica (`text`, `context`, `divider`, `buttons`, `select`)
- `delivery-pin` para solicitudes de entrega fijada

El núcleo decide si renderizar la presentación de forma nativa o degradarla a texto.
No exponga escaparatas de IU nativas del proveedor desde la herramienta de mensajes genérica.
Los ayudantes del SDK obsoletos para esquemas nativos heredados siguen exportados para complementos
de terceros existentes, pero los nuevos complementos no deben usarlos.

## Resolución de objetivos del canal

Los complementos del canal deben ser propietarios de la semántica de los objetivos específicos del canal. Mantenga el host de salida compartido genérico y utilice la superficie del adaptador de mensajería para las reglas del proveedor:

- `messaging.inferTargetChatType({ to })` decide si un objetivo normalizado
  debe tratarse como `direct`, `group` o `channel` antes de la búsqueda en el directorio.
- `messaging.targetResolver.looksLikeId(raw, normalized)` indica al núcleo si una
  entrada debe saltar directamente a la resolución tipo id en lugar de a la búsqueda en el directorio.
- `messaging.targetResolver.resolveTarget(...)` es el respaldo del complemento cuando
  el núcleo necesita una resolución final propiedad del proveedor después de la normalización o después de
  un fallo en el directorio.
- `messaging.resolveOutboundSessionRoute(...)` es propietario de la construcción de rutas de sesión específicas del proveedor
  una vez que se resuelve un objetivo.

División recomendada:

- Use `inferTargetChatType` para decisiones de categoría que deben ocurrir antes de
  buscar pares/grupos.
- Use `looksLikeId` para comprobaciones de "tratar esto como un id de objetivo explícito/nativo".
- Use `resolveTarget` para el respaldo de normalización específico del proveedor, no para
  una búsqueda amplia en el directorio.
- Mantenga los ids nativos del proveedor como ids de chat, ids de hilos, JIDs, identificadores y ids de sala
  dentro de los valores `target` o parámetros específicos del proveedor, no en campos genéricos del SDK.

## Directorios respaldados por configuración

Los complementos que derivan entradas de directorio de la configuración deben mantener esa lógica en el
complemento y reutilizar los asistentes compartidos de
`openclaw/plugin-sdk/directory-runtime`.

Use esto cuando un canal necesita pares/grupos respaldados por configuración, tales como:

- pares de MD impulsados por lista de permitidos
- mapas de canal/grupo configurados
- respaldos de directorio estático con alcance de cuenta

Los asistentes compartidos en `directory-runtime` solo manejan operaciones genéricas:

- filtrado de consultas
- aplicación de límites
- asistentes de desduplicación/normalización
- construcción de `ChannelDirectoryEntry[]`

La inspección de cuentas y la normalización de ids específicas del canal deben permanecer en la
implementación del complemento.

## Catálogos de proveedores

Los complementos de proveedor pueden definir catálogos de modelos para inferencia con
`registerProvider({ catalog: { run(...) { ... } } })`.

`catalog.run(...)` devuelve la misma forma que OpenClaw escribe en
`models.providers`:

- `{ provider }` para una entrada de proveedor
- `{ providers }` para múltiples entradas de proveedor

Use `catalog` cuando el complemento es propietario de IDs de modelo específicos del proveedor, valores predeterminados de URL base o metadatos de modelo restringidos por autenticación.

`catalog.order` controla cuándo se fusiona el catálogo de un complemento en relación con los proveedores implícitos integrados de OpenClaw:

- `simple`: proveedores de API key simple o controlados por entorno
- `profile`: proveedores que aparecen cuando existen perfiles de autenticación
- `paired`: proveedores que sintetizan múltiples entradas de proveedor relacionadas
- `late`: última pasada, después de otros proveedores implícitos

Los proveedores posteriores ganan en caso de colisión de claves, por lo que los complementos pueden anular intencionalmente una entrada de proveedor integrada con el mismo ID de proveedor.

Compatibilidad:

- `discovery` todavía funciona como un alias heredado
- si se registran tanto `catalog` como `discovery`, OpenClaw usa `catalog`

## Inspección de canal de solo lectura

Si su complemento registra un canal, prefiera implementar
`plugin.config.inspectAccount(cfg, accountId)` junto con `resolveAccount(...)`.

Por qué:

- `resolveAccount(...)` es la ruta de ejecución. Se le permite asumir que las credenciales
  están completamente materializadas y puede fallar rápidamente cuando faltan los secretos requeridos.
- Las rutas de comandos de solo lectura, como `openclaw status`, `openclaw status --all`,
  `openclaw channels status`, `openclaw channels resolve`, y los flujos de reparación
  de doctor/config no deberían necesitar materializar credenciales de ejecución solo para
  describir la configuración.

Comportamiento recomendado de `inspectAccount(...)`:

- Devuelva solo el estado descriptivo de la cuenta.
- Conserve `enabled` y `configured`.
- Incluya campos de fuente/estado de credenciales cuando sea relevante, tales como:
  - `tokenSource`, `tokenStatus`
  - `botTokenSource`, `botTokenStatus`
  - `appTokenSource`, `appTokenStatus`
  - `signingSecretSource`, `signingSecretStatus`
- No es necesario devolver los valores brutos de los tokens solo para informar la disponibilidad de solo lectura. Devolver `tokenStatus: "available"` (y el campo de origen coincidente) es suficiente para los comandos de tipo estado.
- Use `configured_unavailable` cuando una credencial esté configurada vía SecretRef pero no esté disponible en la ruta del comando actual.

Esto permite que los comandos de solo lectura informen "configurado pero no disponible en esta ruta de comando" en lugar de fallar o informar erróneamente que la cuenta no está configurada.

## Paquetes de complementos

Un directorio de complementos puede incluir un `package.json` con `openclaw.extensions`:

```json
{
  "name": "my-pack",
  "openclaw": {
    "extensions": ["./src/safety.ts", "./src/tools.ts"],
    "setupEntry": "./src/setup-entry.ts"
  }
}
```

Cada entrada se convierte en un complemento. Si el paquete lista múltiples extensiones, el id del complemento se convierte en `name/<fileBase>`.

Si su complemento importa dependencias de npm, instálelas en ese directorio para que `node_modules` esté disponible (`npm install` / `pnpm install`).

Salvaguarda de seguridad: cada entrada de `openclaw.extensions` debe permanecer dentro del directorio del complemento después de la resolución de enlaces simbólicos. Las entradas que salen del directorio del paquete son rechazadas.

Nota de seguridad: `openclaw plugins install` instala las dependencias del complemento con un `npm install --omit=dev --ignore-scripts` local al proyecto (sin scripts de ciclo de vida, sin dependencias de desarrollo en tiempo de ejecución), ignorando la configuración heredada de la instalación global de npm. Mantenga los árboles de dependencias de los complementos como "JS/TS puro" y evite paquetes que requieran compilaciones `postinstall`.

Opcional: `openclaw.setupEntry` puede apuntar a un módulo ligero solo de configuración. Cuando OpenClaw necesita superficies de configuración para un complemento de canal deshabilitado, o cuando un complemento de canal está habilitado pero aún sin configurar, carga `setupEntry` en lugar de la entrada completa del complemento. Esto mantiene el inicio y la configuración más ligeros cuando su entrada principal del complemento también conecta herramientas, ganchos u otro código solo de tiempo de ejecución.

Opcional: `openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen` puede optar por que un complemento de canal siga la misma ruta `setupEntry` durante la fase de inicio previa a la escucha del gateway, incluso cuando el canal ya está configurado.

Use esto solo cuando `setupEntry` cubra completamente la superficie de inicio que debe existir antes de que el gateway comience a escuchar. En la práctica, eso significa que la entrada de configuración (setup entry) debe registrar cada capacidad propiedad del canal de la cual dependa el inicio, tales como:

- el registro del canal en sí
- cualquier ruta HTTP que debe estar disponible antes de que el gateway comience a escuchar
- cualquier método, herramienta o servicio del gateway que deba existir durante esa misma ventana

Si su entrada completa todavía posee alguna capacidad de inicio requerida, no active esta bandera. Mantenga el complemento en el comportamiento predeterminado y deje que OpenClaw cargue la entrada completa durante el inicio.

Los canales empaquetados (bundled channels) también pueden publicar auxiliares de superficie de contrato solo para configuración que el núcleo (core) puede consultar antes de que se cargue el tiempo de ejecución completo del canal. La superficie de promoción de configuración actual es:

- `singleAccountKeysToMove`
- `namedAccountPromotionKeys`
- `resolveSingleAccountPromotionTarget(...)`

El núcleo usa esa superficie cuando necesita promocionar una configuración de canal heredada de cuenta única a `channels.<id>.accounts.*` sin cargar la entrada completa del complemento. Matrix es el ejemplo empaquetado actual: mueve solo las claves de autenticación/inicio (bootstrap) a una cuenta promovida con nombre cuando ya existen cuentas con nombre, y puede preservar una clave de cuenta predeterminada configurada no canónica en lugar de siempre crear `accounts.default`.

Esos adaptadores de parches de configuración mantienen el descubrimiento de la superficie del contrato empaquetado diferido (lazy). El tiempo de importación se mantiene ligero; la superficie de promoción se carga solo en el primer uso en lugar de volver a entrar en el inicio del canal empaquetado al importar el módulo.

Cuando esas superficies de inicio incluyen métodos RPC del gateway, manténgalos en un prefijo específico del complemento. Los espacios de nombres de administración del núcleo (`config.*`, `exec.approvals.*`, `wizard.*`, `update.*`) permanecen reservados y siempre resuelven a `operator.admin`, incluso si un complemento solicita un alcance más estrecho.

Ejemplo:

```json
{
  "name": "@scope/my-channel",
  "openclaw": {
    "extensions": ["./index.ts"],
    "setupEntry": "./setup-entry.ts",
    "startup": {
      "deferConfiguredChannelFullLoadUntilAfterListen": true
    }
  }
}
```

### Metadatos del catálogo de canales

Los complementos de canal pueden anunciar metadatos de configuración/descubrimiento a través de `openclaw.channel` e consejos de instalación a través de `openclaw.install`. Esto mantiene el núcleo del catálogo libre de datos.

Ejemplo:

```json
{
  "name": "@openclaw/nextcloud-talk",
  "openclaw": {
    "extensions": ["./index.ts"],
    "channel": {
      "id": "nextcloud-talk",
      "label": "Nextcloud Talk",
      "selectionLabel": "Nextcloud Talk (self-hosted)",
      "docsPath": "/channels/nextcloud-talk",
      "docsLabel": "nextcloud-talk",
      "blurb": "Self-hosted chat via Nextcloud Talk webhook bots.",
      "order": 65,
      "aliases": ["nc-talk", "nc"]
    },
    "install": {
      "npmSpec": "@openclaw/nextcloud-talk",
      "localPath": "<bundled-plugin-local-path>",
      "defaultChoice": "npm"
    }
  }
}
```

Campos útiles de `openclaw.channel` más allá del ejemplo mínimo:

- `detailLabel`: etiqueta secundaria para superficies de catálogo/estado más ricas
- `docsLabel`: sobrescribir el texto del enlace para el enlace a la documentación
- `preferOver`: ids de complemento/canal de menor prioridad que esta entrada de catálogo debería superar
- `selectionDocsPrefix`, `selectionDocsOmitLabel`, `selectionExtras`: controles de copia de la superficie de selección
- `markdownCapable`: marca el canal como capaz de manejar markdown para decisiones de formato de salida
- `exposure.configured`: oculta el canal de las superficies de listado de canales configurados cuando se establece en `false`
- `exposure.setup`: oculta el canal de los selectores de configuración/configuración interactiva cuando se establece en `false`
- `exposure.docs`: marca el canal como interno/privado para las superficies de navegación de la documentación
- `showConfigured` / `showInSetup`: alias heredados aún aceptados por compatibilidad; se prefiere `exposure`
- `quickstartAllowFrom`: incorpora el canal al flujo `allowFrom` de inicio rápido estándar
- `forceAccountBinding`: requiere vinculación explícita de la cuenta incluso cuando solo existe una cuenta
- `preferSessionLookupForAnnounceTarget`: prefiere la búsqueda de sesión al resolver objetivos de anuncio

OpenClaw también puede fusionar **catálogos de canales externos** (por ejemplo, una exportación de registro de MPM). Coloque un archivo JSON en una de las siguientes ubicaciones:

- `~/.openclaw/mpm/plugins.json`
- `~/.openclaw/mpm/catalog.json`
- `~/.openclaw/plugins/catalog.json`

O apunte `OPENCLAW_PLUGIN_CATALOG_PATHS` (o `OPENCLAW_MPM_CATALOG_PATHS`) a
uno o más archivos JSON (delimitados por comas/puntos y comas/`PATH`). Cada archivo debe
contener `{ "entries": [ { "name": "@scope/pkg", "openclaw": { "channel": {...}, "install": {...} } } ] }`. El analizador también acepta `"packages"` o `"plugins"` como alias heredados para la clave `"entries"`.

Las entradas generadas del catálogo de canales y las entradas del catálogo de instalación de proveedores exponen hechos normalizados de la fuente de instalación junto al bloque `openclaw.install`. Los hechos normalizados identifican si la especificación de npm es una versión exacta o un selector flotante, si los metadatos de integridad esperados están presentes y si también hay una ruta de fuente local disponible. Cuando se conoce la identidad del catálogo/paquete, los hechos normalizados advierten si el nombre del paquete npm analizado se deriva de esa identidad. También advierten cuando `defaultChoice` no es válido o apunta a una fuente que no está disponible, y cuando los metadatos de integridad de npm están presentes sin una fuente npm válida. Los consumidores deben tratar `installSource` como un campo opcional aditivo para que las entradas construidas manualmente y los shims del catálogo no tengan que sintetizarlo. Esto permite que la incorporación y el diagnóstico expliquen el estado del plano de origen sin importar el tiempo de ejecución del complemento.

Las entradas externas oficiales de npm deben preferir un `npmSpec` exacto más `expectedIntegrity`. Los nombres de paquetes simples y las dist-tags todavía funcionan por compatibilidad, pero muestran advertencias del plano de origen para que el catálogo pueda avanzar hacia instalaciones ancladas y con verificación de integridad sin romper los complementos existentes. Al instalar desde una ruta de catálogo local, se registra una entrada de índice de complemento administrado con `source: "path"` y una `sourcePath` relativa al espacio de trabajo cuando sea posible. La ruta de carga operativa absoluta permanece en `plugins.load.paths`; el registro de instalación evita duplicar las rutas de la estación de trabajo local en la configuración de larga duración. Esto mantiene las instalaciones de desarrollo local visibles para los diagnósticos del plano de origen sin agregar una segunda superficie de divulgación de ruta de sistema de archivos sin procesar. El índice de complemento `plugins/installs.json` persistido es la fuente de verdad de la instalación y se puede actualizar sin cargar módulos de tiempo de ejecución del complemento. Su mapa `installRecords` es duradero incluso cuando falta o no es válido el manifiesto de un complemento; su matriz `plugins` es una vista de manifiesto/caché reconstruible.

## Complementos del motor de contexto

Los complementos del motor de contexto son propietarios de la orquestación del contexto de la sesión para la ingesta, el ensamblaje y la compactación. Regístrelos desde su complemento con `api.registerContextEngine(id, factory)` y luego seleccione el motor activo con `plugins.slots.contextEngine`.

Use esto cuando su complemento necesite reemplazar o extender la canalización de contexto predeterminada en lugar de simplemente agregar búsqueda de memoria o enlaces (hooks).

```ts
import { buildMemorySystemPromptAddition } from "openclaw/plugin-sdk/core";

export default function (api) {
  api.registerContextEngine("lossless-claw", () => ({
    info: { id: "lossless-claw", name: "Lossless Claw", ownsCompaction: true },
    async ingest() {
      return { ingested: true };
    },
    async assemble({ messages, availableTools, citationsMode }) {
      return {
        messages,
        estimatedTokens: 0,
        systemPromptAddition: buildMemorySystemPromptAddition({
          availableTools: availableTools ?? new Set(),
          citationsMode,
        }),
      };
    },
    async compact() {
      return { ok: true, compacted: false };
    },
  }));
}
```

Si su motor **no** es propietario del algoritmo de compactación, mantenga `compact()` implementado y delegúelo explícitamente:

```ts
import { buildMemorySystemPromptAddition, delegateCompactionToRuntime } from "openclaw/plugin-sdk/core";

export default function (api) {
  api.registerContextEngine("my-memory-engine", () => ({
    info: {
      id: "my-memory-engine",
      name: "My Memory Engine",
      ownsCompaction: false,
    },
    async ingest() {
      return { ingested: true };
    },
    async assemble({ messages, availableTools, citationsMode }) {
      return {
        messages,
        estimatedTokens: 0,
        systemPromptAddition: buildMemorySystemPromptAddition({
          availableTools: availableTools ?? new Set(),
          citationsMode,
        }),
      };
    },
    async compact(params) {
      return await delegateCompactionToRuntime(params);
    },
  }));
}
```

## Agregar una nueva capacidad

Cuando un complemento necesita un comportamiento que no se ajusta a la API actual, no omita el sistema de complementos con un acceso privado. Agregue la capacidad que falta.

Secuencia recomendada:

1. definir el contrato principal
   Decida qué comportamiento compartido debe ser propiedad del núcleo (core): políticas, respaldo, fusión de configuraciones, ciclo de vida, semántica orientada al canal y la forma del asistente de tiempo de ejecución.
2. agregar superficies de registro/tiempo de ejecución de complementos tipados
   Extienda `OpenClawPluginApi` y/o `api.runtime` con la superficie de capacidad tipada más pequeña y útil.
3. conectar el núcleo + consumidores de canal/características
   Los canales y los complementos de características deben consumir la nueva capacidad a través del núcleo, no importando directamente una implementación de proveedor.
4. registrar implementaciones de proveedores
   Luego, los complementos de proveedores registran sus backends frente a la capacidad.
5. agregar cobertura de contrato
   Agregue pruebas para que la propiedad y la forma de registro permanezcan explícitas con el tiempo.

Así es como OpenClaw se mantiene con opiniones definidas sin volverse rígido a la visión del mundo de un solo proveedor. Consulte el [Capability Cookbook](/es/tools/capability-cookbook) para obtener una lista de verificación de archivos concreta y un ejemplo trabajado.

### Lista de verificación de capacidad

Cuando agrega una nueva capacidad, la implementación generalmente debería tocar estas superficies juntas:

- tipos de contrato principal en `src/<capability>/types.ts`
- ejecutor principal/asistente de tiempo de ejecución en `src/<capability>/runtime.ts`
- superficie de registro de API de complementos en `src/plugins/types.ts`
- cableado del registro de complementos en `src/plugins/registry.ts`
- exposición del tiempo de ejecución del complemento en `src/plugins/runtime/*` cuando los complementos de características/canales necesiten consumirlo
- asistentes de captura/prueba en `src/test-utils/plugin-registration.ts`
- afirmaciones de propiedad/contrato en `src/plugins/contracts/registry.ts`
- documentación del operador/complemento en `docs/`

Si falta una de esas superficies, eso suele ser una señal de que la capacidad aún no está totalmente integrada.

### Plantilla de capacidad

Patrón mínimo:

```ts
// core contract
export type VideoGenerationProviderPlugin = {
  id: string;
  label: string;
  generateVideo: (req: VideoGenerationRequest) => Promise<VideoGenerationResult>;
};

// plugin API
api.registerVideoGenerationProvider({
  id: "openai",
  label: "OpenAI",
  async generateVideo(req) {
    return await generateOpenAiVideo(req);
  },
});

// shared runtime helper for feature/channel plugins
const clip = await api.runtime.videoGeneration.generate({
  prompt: "Show the robot walking through the lab.",
  cfg,
});
```

Patrón de prueba de contrato:

```ts
expect(findVideoGenerationProviderIdsForPlugin("openai")).toEqual(["openai"]);
```

Eso mantiene la regla simple:

- core posee el contrato de capacidad + orquestación
- los plugins de proveedor poseen las implementaciones de proveedor
- los plugins de función/canal consumen asistentes de tiempo de ejecución
- las pruebas de contrato mantienen la propiedad explícita

## Relacionado

- [Arquitectura de plugins](/es/plugins/architecture) — modelo y formas de capacidad pública
- [Subrutas del SDK de plugins](/es/plugins/sdk-subpaths)
- [Configuración del SDK de plugins](/es/plugins/sdk-setup)
- [Construcción de plugins](/es/plugins/building-plugins)
