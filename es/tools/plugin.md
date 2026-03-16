---
summary: "Plugins/extensions de OpenClaw: descubrimiento, configuración y seguridad"
read_when:
  - Adding or modifying plugins/extensions
  - Documenting plugin install or load rules
  - Working with Codex/Claude-compatible plugin bundles
title: "Plugins"
---

# Plugins (Extensiones)

## Inicio rápido (¿nuevo en los plugins?)

Un plugin es:

- un **plugin nativo de OpenClaw** (`openclaw.plugin.json` + módulo de tiempo de ejecución), o
- un **bundle** compatible (`.codex-plugin/plugin.json` o `.claude-plugin/plugin.json`)

Ambos aparecen bajo `openclaw plugins`, pero solo los plugins nativos de OpenClaw ejecutan
código de tiempo de ejecución dentro del proceso.

La mayor parte del tiempo, usarás plugins cuando quieras una función que aún no esté integrada
en el núcleo de OpenClaw (o quieras mantener las funciones opcionales fuera de tu instalación
principal).

Ruta rápida:

1. Ver lo que ya está cargado:

```bash
openclaw plugins list
```

2. Instalar un plugin oficial (ejemplo: Voice Call):

```bash
openclaw plugins install @openclaw/voice-call
```

Las especificaciones de Npm son **solo de registro** (nombre del paquete + **versión exacta** opcional o
**dist-tag**). Las especificaciones de Git/URL/archivo y los rangos de semver son rechazados.

Las especificaciones básicas y `@latest` se mantienen en la pista estable. Si npm resuelve cualquiera de
esas a una versión preliminar, OpenClaw se detiene y te pide que aceptes explícitamente con una
etiqueta preliminar como `@beta`/`@rc` o una versión preliminar exacta.

3. Reinicia el Gateway, luego configura bajo `plugins.entries.<id>.config`.

Consulta [Voice Call](/es/plugins/voice-call) para ver un ejemplo concreto de plugin.
¿Buscas listados de terceros? Consulta [Community plugins](/es/plugins/community).
¿Necesitas los detalles de compatibilidad de bundles? Consulta [Plugin bundles](/es/plugins/bundles).

Para los bundles compatibles, instala desde un directorio local o un archivo:

```bash
openclaw plugins install ./my-bundle
openclaw plugins install ./my-bundle.tgz
```

## Arquitectura

El sistema de plugins de OpenClaw tiene cuatro capas:

1. **Manifiesto + descubrimiento**
   OpenClaw encuentra plugins candidatos desde rutas configuradas, raíces del espacio de trabajo,
   raíces globales de extensiones y extensiones agrupadas. El descubrimiento lee primero los manifiestos
   nativos de `openclaw.plugin.json` además de los manifiestos de bundles soportados.
2. **Habilitación + validación**
   El núcleo decide si un plugin descubierto está habilitado, deshabilitado, bloqueado o
   seleccionado para una ranura exclusiva como la memoria.
3. **Carga en tiempo de ejecución**
   Los plugins nativos de OpenClaw se cargan en proceso a través de jiti y registran
   capacidades en un registro central. Los paquetes compatibles se normalizan en
   registros del registro sin importar código en tiempo de ejecución.
4. **Consumo superficial**
   El resto de OpenClaw lee el registro para exponer herramientas, canales,
   configuración del proveedor, ganchos, rutas HTTP, comandos CLI y servicios.

El límite de diseño importante:

- el descubrimiento + la validación de configuración deben funcionar a partir de **metadatos de manifiesto/esquema**
  sin ejecutar el código del plugin
- el comportamiento nativo en tiempo de ejecución proviene de la ruta `register(api)` del módulo del plugin

Esa división permite que OpenClaw valide la configuración, explique los plugins faltantes/deshabilitados y
construya sugerencias de interfaz/esquema antes de que el tiempo de ejecución completo esté activo.

## Paquetes compatibles

OpenClaw también reconoce dos diseños de paquetes externos compatibles:

- Paquetes estilo Codex: `.codex-plugin/plugin.json`
- Paquetes estilo Claude: `.claude-plugin/plugin.json` o el diseño de componente Claude
  predeterminado sin manifiesto
- Paquetes estilo Cursor: `.cursor-plugin/plugin.json`

Se muestran en la lista de plugins como `format=bundle`, con un subtipo de
`codex` o `claude` en la salida detallada/informativa.

Consulte [Paquetes de plugins](/es/plugins/bundles) para conocer las reglas de detección exactas, el comportamiento
de mapeo y la matriz de soporte actual.

Hoy en día, OpenClaw trata estos como **paquetes de capacidades**, no como plugins
de tiempo de ejecución nativos:

- soportado ahora: `skills` agrupados
- soportado ahora: raíces markdown `commands/` de Claude, mapeadas al cargador
  de habilidades normal de OpenClaw
- soportado ahora: valores predeterminados `settings.json` del paquete Claude para la configuración
  del agente Pi incorporado (con claves de anulación de shell saneadas)
- soportado ahora: raíces `.cursor/commands/*.md` de Cursor, mapeadas al cargador
  de habilidades normal de OpenClaw
- soportado ahora: directorios de ganchos de paquetes Codex que utilizan el diseño de hook-pack
  de OpenClaw (`HOOK.md` + `handler.ts`/`handler.js`)
- detectado pero aún no conectado: otras capacidades de paquete declaradas, como
  agentes, automatización de ganchos Claude, reglas/ganchos/metadatos MCP de Cursor, metadatos
  MCP/app/LSP, estilos de salida

Esto significa que la instalación/descubrimiento/lista/información/habilitación del bundle funciona, y las habilidades del bundle, habilidades de comandos de Claude, valores predeterminados de configuración del bundle de Claude, y directorios de hooks compatibles con Codex se cargan cuando el bundle está habilitado, pero el código de tiempo de ejecución del bundle no se ejecuta en proceso.

La compatibilidad con hooks de bundles se limita al formato de directorio de hooks normal de OpenClaw (`HOOK.md` más `handler.ts`/`handler.js` bajo las raíces de hooks declaradas). Los tiempos de ejecución de hooks específicos del proveedor en shell/JSON, incluidos los `hooks.json` de Claude, actualmente solo se detectan y no se ejecutan directamente.

## Modelo de ejecución

Los complementos nativos de OpenClaw se ejecutan **en proceso** con el Gateway. No están en modo sandbox. Un complemento nativo cargado tiene el mismo límite de confianza a nivel de proceso que el código principal.

Implicaciones:

- un complemento nativo puede registrar herramientas, manejadores de red, hooks y servicios
- un error en un complemento nativo puede bloquear o desestabilizar el gateway
- un complemento nativo malicioso es equivalente a la ejecución de código arbitrario dentro
  del proceso OpenClaw

Los bundles compatibles son más seguros por defecto porque OpenClaw actualmente los trata como paquetes de metadatos/contenido. En las versiones actuales, eso significa principalmente habilidades agrupadas.

Utilice listas de permitidos y rutas de instalación/carga explícitas para complementos no agrupados. Trate los complementos del espacio de trabajo como código en tiempo de desarrollo, no como valores predeterminados de producción.

Nota importante sobre la confianza:

- `plugins.allow` confía en los **ids de complemento**, no en el origen de la fuente.
- Un complemento del espacio de trabajo con el mismo id que un complemento agrupado oculta intencionalmente
  la copia agrupada cuando ese complemento del espacio de trabajo está habilitado/en la lista de permitidos.
- Esto es normal y útil para el desarrollo local, las pruebas de parches y las revisiones urgentes.

## Complementos disponibles (oficiales)

- Microsoft Teams es exclusivamente un complemento a partir del 15.01.2026; instale `@openclaw/msteams` si usa Teams.
- Memoria (Core) — complemento de búsqueda de memoria agrupado (habilitado por defecto vía `plugins.slots.memory`)
- Memoria (LanceDB) — complemento de memoria a largo plazo agrupado (recuperación/captura automática; configure `plugins.slots.memory = "memory-lancedb"`)
- [Llamada de voz](/es/plugins/voice-call) — `@openclaw/voice-call`
- [Zalo Personal](/es/plugins/zalouser) — `@openclaw/zalouser`
- [Matrix](/es/channels/matrix) — `@openclaw/matrix`
- [Nostr](/es/channels/nostr) — `@openclaw/nostr`
- [Zalo](/es/channels/zalo) — `@openclaw/zalo`
- [Microsoft Teams](/es/channels/msteams) — `@openclaw/msteams`
- Tiempo de ejecución del proveedor Anthropic — empaquetado como `anthropic` (habilitado de forma predeterminada)
- Catálogo de proveedores BytePlus — empaquetado como `byteplus` (habilitado de forma predeterminada)
- Catálogo de proveedores Cloudflare AI Gateway — empaquetado como `cloudflare-ai-gateway` (habilitado de forma predeterminada)
- Búsqueda web de Google + Gemini CLI OAuth — empaquetado como `google` (la búsqueda web lo carga automáticamente; la autenticación del proveedor permanece opcional)
- Tiempo de ejecución del proveedor GitHub Copilot — empaquetado como `github-copilot` (habilitado de forma predeterminada)
- Catálogo de proveedores Hugging Face — empaquetado como `huggingface` (habilitado de forma predeterminada)
- Tiempo de ejecución del proveedor Kilo Gateway — empaquetado como `kilocode` (habilitado de forma predeterminada)
- Catálogo de proveedores Kimi Coding — empaquetado como `kimi-coding` (habilitado de forma predeterminada)
- Catálogo de proveedores + uso de MiniMax — empaquetado como `minimax` (habilitado de forma predeterminada)
- MiniMax OAuth (autenticación de proveedor + catálogo) — empaquetado como `minimax-portal-auth` (habilitado de forma predeterminada)
- Capacidades del proveedor Mistral — empaquetado como `mistral` (habilitado de forma predeterminada)
- Catálogo de proveedores Model Studio — empaquetado como `modelstudio` (habilitado de forma predeterminada)
- Tiempo de ejecución del proveedor Moonshot — empaquetado como `moonshot` (habilitado de forma predeterminada)
- Catálogo de proveedores NVIDIA — empaquetado como `nvidia` (habilitado de forma predeterminada)
- Tiempo de ejecución del proveedor OpenAI — empaquetado como `openai` (habilitado de forma predeterminada; posee tanto `openai` como `openai-codex`)
- Capacidades del proveedor OpenCode Go — empaquetado como `opencode-go` (habilitado de forma predeterminada)
- Capacidades del proveedor OpenCode Zen — empaquetado como `opencode` (habilitado de forma predeterminada)
- Tiempo de ejecución del proveedor OpenRouter — empaquetado como `openrouter` (habilitado de forma predeterminada)
- Catálogo de proveedores de Qianfan: empaquetado como `qianfan` (habilitado de forma predeterminada)
- OAuth de Qwen (autenticación de proveedor + catálogo): empaquetado como `qwen-portal-auth` (habilitado de forma predeterminada)
- Catálogo de proveedores sintético: empaquetado como `synthetic` (habilitado de forma predeterminada)
- Catálogo de proveedores de Together: empaquetado como `together` (habilitado de forma predeterminada)
- Catálogo de proveedores de Venice: empaquetado como `venice` (habilitado de forma predeterminada)
- Catálogo de proveedores de Vercel AI Gateway: empaquetado como `vercel-ai-gateway` (habilitado de forma predeterminada)
- Catálogo de proveedores de Volcengine: empaquetado como `volcengine` (habilitado de forma predeterminada)
- Catálogo de proveedores de Xiaomi + uso: empaquetado como `xiaomi` (habilitado de forma predeterminada)
- Tiempo de ejecución del proveedor Z.AI: empaquetado como `zai` (habilitado de forma predeterminada)
- Copilot Proxy (autenticación de proveedor): puente local de VS Code Copilot Proxy; distinto del inicio de sesión de dispositivo integrado `github-copilot` (empaquetado, deshabilitado de forma predeterminada)

Los complementos nativos de OpenClaw son **módulos de TypeScript** cargados en tiempo de ejecución a través de jiti.
**La validación de configuración no ejecuta el código del complemento**; en su lugar, utiliza el manifiesto del complemento
y JSON Schema. Consulte [Manifiesto del complemento](/es/plugins/manifest).

Los complementos nativos de OpenClaw pueden registrar:

- Métodos RPC de Gateway
- Rutas HTTP de Gateway
- Herramientas de agente
- Comandos de CLI
- Servicios en segundo plano
- Motores de contexto
- Flujos de autenticación de proveedor y catálogos de modelos
- Ganchos de tiempo de ejecución del proveedor para identificadores de modelos dinámicos, normalización de transporte, metadatos de capacidad, envoltura de flujo, política de TTL de caché, sugerencias de autenticación faltante, supresión de modelos integrados, aumento de catálogo, intercambio de autenticación en tiempo de ejecución, y resolución de autenticación de uso/facturación + instantánea
- Validación de configuración opcional
- **Habilidades** (enumerando directorios `skills` en el manifiesto del complemento)
- **Comandos de respuesta automática** (se ejecutan sin invocar al agente de IA)

Los complementos nativos de OpenClaw se ejecutan **en proceso** con el Gateway, así que trátalos como código confiable.
Guía de creación de herramientas: [Herramientas de agente de complemento](/es/plugins/agent-tools).

## Ganchos de tiempo de ejecución del proveedor

Los complementos de proveedor ahora tienen dos capas:

- ganchos de tiempo de configuración: `catalog` / `discovery` heredado
- ganchos de tiempo de ejecución: `resolveDynamicModel`, `prepareDynamicModel`, `normalizeResolvedModel`, `capabilities`, `prepareExtraParams`, `wrapStreamFn`, `isCacheTtlEligible`, `buildMissingAuthMessage`, `suppressBuiltInModel`, `augmentModelCatalog`, `prepareRuntimeAuth`, `resolveUsageAuth`, `fetchUsageSnapshot`

OpenClaw sigue siendo el propietario del bucle de agente genérico, la conmutación por error, el manejo de transcripciones y la política de herramientas. Estos ganchos son la costura para el comportamiento específico del proveedor sin necesidad de un transporte de inferencia personalizado completo.

### Orden de los ganchos

Para los complementos de modelo/proveedor, OpenClaw utiliza los ganchos en este orden aproximado:

1. `catalog`
   Publica la configuración del proveedor en `models.providers` durante la generación de `models.json`.
2. búsqueda de modelo integrado/descubierto
   OpenClaw intenta primero la ruta normal de registro/catálogo.
3. `resolveDynamicModel`
   Respaldo síncrono para los ID de modelo propiedad del proveedor que aún no están en el registro local.
4. `prepareDynamicModel`
   Calentamiento asíncrono solo en rutas de resolución de modelo asíncronas, luego `resolveDynamicModel` se ejecuta nuevamente.
5. `normalizeResolvedModel`
   Reescritura final antes de que el ejecutor integrado utilice el modelo resuelto.
6. `capabilities`
   Metadatos de transcripción/herramientas propiedad del proveedor utilizados por la lógica central compartida.
7. `prepareExtraParams`
   Normalización de parámetros de solicitud propiedad del proveedor antes de los envoltorios de opciones de transmisión genéricos.
8. `wrapStreamFn`
   Envoltorio de transmisión propiedad del proveedor después de que se aplican los envoltorios genéricos.
9. `isCacheTtlEligible`
   Política de caché de avisos propiedad del proveedor para proveedores de proxy/backhaul.
10. `buildMissingAuthMessage`
    Reemplazo propiedad del proveedor para el mensaje genérico de recuperación de autenticación faltante.
11. `suppressBuiltInModel`
    Supresión de modelo upstream obsoleto propiedad del proveedor más una sugerencia de error opcional orientada al usuario.
12. `augmentModelCatalog`
    Filas sintéticas/finales del catálogo propiedad del proveedor añadidas después del descubrimiento.
13. `prepareRuntimeAuth`
    Intercambia una credencial configurada por el token/clave de tiempo de ejecución real justo antes de la inferencia.
14. `resolveUsageAuth`
    Resuelve las credenciales de uso/facturación para `/usage` y superficies
    de estado relacionadas.
15. `fetchUsageSnapshot`
    Obtiene y normaliza instantáneas de uso/cuota específicas del proveedor una vez resuelta la autenticación.

### Qué hook usar

- `catalog`: publica la configuración del proveedor y los catálogos de modelos en `models.providers`
- `resolveDynamicModel`: maneja los ids de modelo de paso a través (pass-through) o compatibilidad hacia adelante que aún no están en el registro local
- `prepareDynamicModel`: calentamiento asíncrono antes de reintentar la resolución dinámica (por ejemplo, actualizar la caché de metadatos del proveedor)
- `normalizeResolvedModel`: reescribe el transporte/URL base/compatibilidad de un modelo resuelto antes de la inferencia
- `capabilities`: publica peculiaridades de la familia de proveedores y de transcripción/herramientas sin codificar (hardcoding) los ids de proveedor en el núcleo
- `prepareExtraParams`: establece los valores predeterminados del proveedor o normaliza los parámetros por modelo específicos del proveedor antes del envoltorio de transmisión genérico
- `wrapStreamFn`: agrega encabezados/carga útil/patches de compatibilidad de modelo específicos del proveedor mientras se sigue utilizando la ruta de ejecución normal de `pi-ai`
- `isCacheTtlEligible`: decide si los pares proveedor/modelo deben usar metadatos de TTL de caché
- `buildMissingAuthMessage`: reemplaza el error genérico del almacén de autenticación con una sugerencia de recuperación específica del proveedor
- `suppressBuiltInModel`: oculta filas obsoletas del upstream y opcionalmente devuelve un error propiedad del proveedor para fallos de resolución directa
- `augmentModelCatalog`: agrega filas sintéticas/finales del catálogo después del descubrimiento y la fusión de configuración
- `prepareRuntimeAuth`: intercambia una credencial configurada por el token/clave de tiempo de ejecución real de corta duración utilizado para las solicitudes
- `resolveUsageAuth`: resuelve credenciales propiedad del proveedor para puntos finales de uso/facturación sin codificar el análisis de tokens en el núcleo
- `fetchUsageSnapshot`: se encarga de la obtención/análisis del punto final de uso específico del proveedor mientras el núcleo mantiene la distribución y el formato del resumen

Regla general:

- el proveedor posee un catálogo o valores predeterminados de URL base: usa `catalog`
- el proveedor acepta ids de modelo upstream arbitrarios: usa `resolveDynamicModel`
- el proveedor necesita metadatos de red antes de resolver IDs desconocidos: agregue `prepareDynamicModel`
- el proveedor necesita reescrituras de transporte pero aún usa un transporte central: use `normalizeResolvedModel`
- el proveedor necesita peculiaridades de transcripción/familia de proveedores: use `capabilities`
- el proveedor necesita parámetros de solicitud predeterminados o limpieza de parámetros por proveedor: use `prepareExtraParams`
- el proveedor necesita envoltorios de compatibilidad de encabezados/cuerpo/modelo de solicitud sin un transporte personalizado: use `wrapStreamFn`
- el proveedor necesita control de puerta de TTL de caché específico para el proxy: use `isCacheTtlEligible`
- el proveedor necesita una sugerencia de recuperación de autenticación faltante específica del proveedor: use `buildMissingAuthMessage`
- el proveedor necesita ocultar filas upstream obsoletas o reemplazarlas con una sugerencia del proveedor: use `suppressBuiltInModel`
- el proveedor necesita filas sintéticas de compatibilidad futura en `models list` y selectores: use `augmentModelCatalog`
- el proveedor necesita un intercambio de token o una credencial de solicitud de corta duración: use `prepareRuntimeAuth`
- el proveedor necesita análisis personalizado de token de uso/cuota o una credencial de uso diferente: use `resolveUsageAuth`
- el proveedor necesita un endpoint de uso específico del proveedor o un analizador de carga útil: use `fetchUsageSnapshot`

Si el proveedor necesita un protocolo de cable completamente personalizado o un ejecutor de solicitudes personalizado,
eso es una clase diferente de extensión. Estos enlaces son para el comportamiento del proveedor
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

- Anthropic usa `resolveDynamicModel`, `capabilities`, `resolveUsageAuth`,
  `fetchUsageSnapshot` y `isCacheTtlEligible` porque posee la compatibilidad futura de Claude 4.6,
  sugerencias de familia de proveedores, integración del endpoint de uso y
  elegibilidad de caché de solicitud.
- OpenAI usa `resolveDynamicModel`, `normalizeResolvedModel` y
  `capabilities` además de `buildMissingAuthMessage`, `suppressBuiltInModel` y
  `augmentModelCatalog` porque es propietario de la compatibilidad futura de GPT-5.4, la normalización directa de
  OpenAI `openai-completions` -> `openai-responses`, sugerencias de autenticación conscientes de Codex,
  supresión de Spark y filas sintéticas de la lista de OpenAI.
- OpenRouter usa `catalog` además de `resolveDynamicModel` y
  `prepareDynamicModel` porque el proveedor es de paso a través y puede exponer nuevos
  ids de modelo antes de que se actualice el catálogo estático de OpenClaw.
- GitHub Copilot usa `catalog`, `resolveDynamicModel` y
  `capabilities` además de `prepareRuntimeAuth` y `fetchUsageSnapshot` porque necesita
  el comportamiento de reserva del modelo, las peculiaridades de las transcripciones de Claude, un intercambio de token de GitHub ->
  token de Copilot y un endpoint de uso propiedad del proveedor.
- OpenAI Codex usa `catalog`, `resolveDynamicModel`,
  `normalizeResolvedModel` y `augmentModelCatalog` además de
  `prepareExtraParams`, `resolveUsageAuth` y `fetchUsageSnapshot` porque todavía
  se ejecuta en transportes centrales de OpenAI pero posee su propia normalización de transporte/URL base,
  la elección de transporte predeterminada, filas sintéticas del catálogo de Codex y la
  integración con el endpoint de uso de ChatGPT.
- Gemini CLI OAuth usa `resolveDynamicModel`, `resolveUsageAuth` y
  `fetchUsageSnapshot` porque es propietario de la reserva por compatibilidad futura de Gemini 3.1 además
  del análisis de tokens y la conexión del endpoint de cuota necesarios para `/usage`.
- OpenRouter usa `capabilities`, `wrapStreamFn` y `isCacheTtlEligible`
  para mantener los encabezados de solicitud específicos del proveedor, los metadatos de enrutamiento, los parches de
  razonamiento y la política de caché de avisos fuera del núcleo.
- Moonshot usa `catalog` además de `wrapStreamFn` porque todavía usa el transporte
  compartido de OpenAI pero necesita la normalización de carga de pensamiento propiedad del proveedor.
- Kilocode usa `catalog`, `capabilities`, `wrapStreamFn` y `isCacheTtlEligible` porque necesita encabezados de solicitud propiedad del proveedor, normalización de la carga útil de razonamiento, pistas de transcripción de Gemini y control de caché-TTL de Anthropic.
- Z.AI usa `resolveDynamicModel`, `prepareExtraParams`, `wrapStreamFn`, `isCacheTtlEligible`, `resolveUsageAuth` y `fetchUsageSnapshot` porque es propietario del respaldo GLM-5, los valores predeterminados de `tool_stream` y tanto la autenticación de uso como la obtención de cuotas.
- Mistral, OpenCode Zen y OpenCode Go usan solo `capabilities` para mantener las peculiaridades de transcripción/herramientas fuera del núcleo.
- Los proveedores empaquetados solo de catálogo como `byteplus`, `cloudflare-ai-gateway`, `huggingface`, `kimi-coding`, `minimax-portal`, `modelstudio`, `nvidia`, `qianfan`, `qwen-portal`, `synthetic`, `together`, `venice`, `vercel-ai-gateway` y `volcengine` usan solo `catalog`.
- MiniMax y Xiaomi usan `catalog` además de ganchos de uso porque su comportamiento `/usage` es propiedad del complemento, aunque la inferencia aún se ejecuta a través de los transportes compartidos.

## Canal de carga

Al iniciarse, OpenClaw hace aproximadamente esto:

1. descubrir las raíces de complementos candidatas
2. leer manifiestos de paquetes nativos o compatibles y metadatos del paquete
3. rechazar candidatos no seguros
4. normalizar la configuración del complemento (`plugins.enabled`, `allow`, `deny`, `entries`, `slots`, `load.paths`)
5. decidir la habilitación para cada candidato
6. cargar módulos nativos habilitados mediante jiti
7. llamar a los ganchos nativos `register(api)` y recopilar los registros en el registro de complementos
8. exponer el registro a las superficies de comandos/tiempo de ejecución

Los filtros de seguridad ocurren **antes** de la ejecución en tiempo de ejecución. Los candidatos se bloquean cuando la entrada escapa de la raíz del complemento, la ruta es de escritura mundial, o la propiedad de la ruta parece sospechosa para complementos no empaquetados.

### Comportamiento primero manifiesto

El manifiesto es la fuente de verdad del plano de control. OpenClaw lo utiliza para:

- identificar el complemento
- descubrir canales/habilidades/esquema de configuración declarados o capacidades del paquete
- validar `plugins.entries.<id>.config`
- aumentar etiquetas/marcadores de posición de la interfaz de usuario de control
- mostrar metadatos de instalación/catálogo

Para complementos nativos, el módulo de tiempo de ejecución es la parte del plano de datos. Registra el comportamiento real, como ganchos, herramientas, comandos o flujos de proveedores.

### Lo que almacena en caché el cargador

OpenClaw mantiene cachés cortos en proceso para:

- resultados de descubrimiento
- datos del registro de manifiestos
- registros de complementos cargados

Estos cachés reducen la sobrecarga de inicio intermitente y de comandos repetidos. Es seguro considerarlos como cachés de rendimiento a corto plazo, no persistencia.

## Asistentes de tiempo de ejecución

Los complementos pueden acceder a asistentes centrales seleccionados a través de `api.runtime`. Para TTS de telefonía:

```ts
const result = await api.runtime.tts.textToSpeechTelephony({
  text: "Hello from OpenClaw",
  cfg: api.config,
});
```

Notas:

- Utiliza la configuración central `messages.tts` (OpenAI o ElevenLabs).
- Devuelve un búfer de audio PCM + tasa de muestreo. Los complementos deben remuestrear/codificar para los proveedores.
- Edge TTS no es compatible con telefonía.

Para STT/transcripción, los complementos pueden llamar a:

```ts
const { text } = await api.runtime.stt.transcribeAudioFile({
  filePath: "/tmp/inbound-audio.ogg",
  cfg: api.config,
  // Optional when MIME cannot be inferred reliably:
  mime: "audio/ogg",
});
```

Notas:

- Utiliza la configuración de audio de comprensión de medios central (`tools.media.audio`) y el orden de reserva del proveedor.
- Devuelve `{ text: undefined }` cuando no se produce ninguna salida de transcripción (por ejemplo, entrada omitida/no admitida).

## Rutas HTTP de puerta de enlace

Los complementos pueden exponer puntos finales HTTP con `api.registerHttpRoute(...)`.

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

- `path`: ruta bajo el servidor HTTP de la puerta de enlace.
- `auth`: obligatorio. Use `"gateway"` para requerir la autenticación normal de la puerta de enlace, o `"plugin"` para la autenticación/verificación de webhooks gestionada por el complemento.
- `match`: opcional. `"exact"` (predeterminado) o `"prefix"`.
- `replaceExisting`: opcional. Permite que el mismo complemento reemplace su propio registro de ruta existente.
- `handler`: devuelve `true` cuando la ruta haya manejado la solicitud.

Notas:

- `api.registerHttpHandler(...)` está obsoleto. Usa `api.registerHttpRoute(...)`.
- Las rutas de los plugins deben declarar `auth` explícitamente.
- Los conflictos exactos de `path + match` se rechazan a menos que `replaceExisting: true`, y un plugin no puede reemplazar la ruta de otro plugin.
- Las rutas superpuestas con diferentes niveles de `auth` se rechazan. Mantén las cadenas de contingencia de `exact`/`prefix` solo en el mismo nivel de autenticación.

## Rutas de importación del SDK de plugins

Usa subrutas del SDK en lugar de la importación monolítica `openclaw/plugin-sdk` al
crear plugins:

- `openclaw/plugin-sdk/core` para APIs genéricas de plugins, tipos de autenticación de proveedores y ayudantes compartidos.
- `openclaw/plugin-sdk/compat` para código de plugin integrado/interno que necesite ayudantes de tiempo de ejecución compartidos más amplios que `core`.
- `openclaw/plugin-sdk/telegram` para plugins del canal Telegram.
- `openclaw/plugin-sdk/discord` para plugins del canal Discord.
- `openclaw/plugin-sdk/slack` para plugins del canal Slack.
- `openclaw/plugin-sdk/signal` para plugins del canal Signal.
- `openclaw/plugin-sdk/imessage` para plugins del canal iMessage.
- `openclaw/plugin-sdk/whatsapp` para plugins del canal WhatsApp.
- `openclaw/plugin-sdk/line` para plugins del canal LINE.
- `openclaw/plugin-sdk/msteams` para la superficie del plugin de Microsoft Teams integrado.
- Las subrutas específicas de extensiones agrupadas también están disponibles:
  `openclaw/plugin-sdk/acpx`, `openclaw/plugin-sdk/bluebubbles`,
  `openclaw/plugin-sdk/copilot-proxy`, `openclaw/plugin-sdk/device-pair`,
  `openclaw/plugin-sdk/diagnostics-otel`, `openclaw/plugin-sdk/diffs`,
  `openclaw/plugin-sdk/feishu`, `openclaw/plugin-sdk/googlechat`,
  `openclaw/plugin-sdk/irc`, `openclaw/plugin-sdk/llm-task`,
  `openclaw/plugin-sdk/lobster`, `openclaw/plugin-sdk/matrix`,
  `openclaw/plugin-sdk/mattermost`, `openclaw/plugin-sdk/memory-core`,
  `openclaw/plugin-sdk/memory-lancedb`,
  `openclaw/plugin-sdk/minimax-portal-auth`,
  `openclaw/plugin-sdk/nextcloud-talk`, `openclaw/plugin-sdk/nostr`,
  `openclaw/plugin-sdk/open-prose`, `openclaw/plugin-sdk/phone-control`,
  `openclaw/plugin-sdk/qwen-portal-auth`, `openclaw/plugin-sdk/synology-chat`,
  `openclaw/plugin-sdk/talk-voice`, `openclaw/plugin-sdk/test-utils`,
  `openclaw/plugin-sdk/thread-ownership`, `openclaw/plugin-sdk/tlon`,
  `openclaw/plugin-sdk/twitch`, `openclaw/plugin-sdk/voice-call`,
  `openclaw/plugin-sdk/zalo` y `openclaw/plugin-sdk/zalouser`.

## Catálogos de proveedores

Los complementos del proveedor pueden definir catálogos de modelos para inferencia con
`registerProvider({ catalog: { run(...) { ... } } })`.

`catalog.run(...)` devuelve la misma forma que OpenClaw escribe en
`models.providers`:

- `{ provider }` para una entrada de proveedor
- `{ providers }` para múltiples entradas de proveedor

Use `catalog` cuando el complemento posee IDs de modelos específicos del proveedor, valores predeterminados de URL base
o metadatos de modelos restringidos por autenticación.

`catalog.order` controla cuándo se fusiona el catálogo de un complemento en relación con los
proveedores implícitos integrados de OpenClaw:

- `simple`: proveedores simples basados en clave de API o variables de entorno
- `profile`: proveedores que aparecen cuando existen perfiles de autenticación
- `paired`: proveedores que sintetizan múltiples entradas de proveedor relacionadas
- `late`: último pase, después de otros proveedores implícitos

Los proveedores posteriores ganan en caso de colisión de claves, por lo que los complementos pueden anular intencionalmente una
entrada de proveedor integrada con el mismo ID de proveedor.

Compatibilidad:

- `discovery` aún funciona como alias heredado
- si tanto `catalog` como `discovery` están registrados, OpenClaw usa `catalog`

Nota de compatibilidad:

- `openclaw/plugin-sdk` sigue siendo compatible con complementos externos existentes.
- Los nuevos complementos agrupados y los migrados deben usar subrutas específicas del canal o la extensión; use `core` para superficies genéricas y `compat` solo cuando se necesiten auxiliares compartidos más amplios.

## Inspección de solo lectura del canal

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
- Incluya campos de origen/estado de las credenciales cuando sea relevante, como:
  - `tokenSource`, `tokenStatus`
  - `botTokenSource`, `botTokenStatus`
  - `appTokenSource`, `appTokenStatus`
  - `signingSecretSource`, `signingSecretStatus`
- No necesita devolver valores de token sin procesar solo para informar la disponibilidad
  de solo lectura. Devolver `tokenStatus: "available"` (y el campo de origen
  coincidente) es suficiente para los comandos de estilo de estado.
- Use `configured_unavailable` cuando una credencial esté configurada a través de SecretRef pero
  no disponible en la ruta de comando actual.

Esto permite que los comandos de solo lectura informen "configurado pero no disponible en esta ruta
de comando" en lugar de bloquearse o informar incorrectamente que la cuenta no está configurada.

Nota de rendimiento:

- El descubrimiento de complementos y los metadatos del manifiesto utilizan cachés cortos en proceso para reducir el trabajo de inicio/recarga por ráfagas.
- Establezca `OPENCLAW_DISABLE_PLUGIN_DISCOVERY_CACHE=1` o
  `OPENCLAW_DISABLE_PLUGIN_MANIFEST_CACHE=1` para desactivar estas cachés.
- Ajuste las ventanas de caché con `OPENCLAW_PLUGIN_DISCOVERY_CACHE_MS` y
  `OPENCLAW_PLUGIN_MANIFEST_CACHE_MS`.

## Descubrimiento y precedencia

OpenClaw escanea, en orden:

1. Rutas de configuración

- `plugins.load.paths` (archivo o directorio)

2. Extensiones del espacio de trabajo

- `<workspace>/.openclaw/extensions/*.ts`
- `<workspace>/.openclaw/extensions/*/index.ts`

3. Extensiones globales

- `~/.openclaw/extensions/*.ts`
- `~/.openclaw/extensions/*/index.ts`

4. Extensiones incluidas (enviadas con OpenClaw; mezcla de activadas por defecto/desactivadas por defecto)

- `<openclaw>/extensions/*`

Muchos complementos de proveedor incluidos están activados por defecto para que los catálogos de modelos/hooks de runtime sigan disponibles sin configuración adicional. Otros aún requieren activación explícita a través de `plugins.entries.<id>.enabled` o
`openclaw plugins enable <id>`.

Ejemplos de complementos incluidos activados por defecto:

- `byteplus`
- `cloudflare-ai-gateway`
- `device-pair`
- `github-copilot`
- `huggingface`
- `kilocode`
- `kimi-coding`
- `minimax`
- `minimax-portal-auth`
- `modelstudio`
- `moonshot`
- `nvidia`
- `ollama`
- `openai`
- `openrouter`
- `phone-control`
- `qianfan`
- `qwen-portal-auth`
- `sglang`
- `synthetic`
- `talk-voice`
- `together`
- `venice`
- `vercel-ai-gateway`
- `vllm`
- `volcengine`
- `xiaomi`
- complemento de ranura de memoria activa (ranura por defecto: `memory-core`)

Los complementos instalados están activados por defecto, pero se pueden desactivar de la misma manera.

Los complementos del espacio de trabajo están **deshabilitados de forma predeterminada** a menos que los habilite explícitamente
o los incluya en una lista de permitidos. Esto es intencional: un repositorio extraído no debería convertirse silenciosamente
en código de puerta de enlace de producción.

Notas de endurecimiento:

- Si `plugins.allow` está vacío y se pueden descubrir complementos no empaquetados, OpenClaw registra una advertencia de inicio con los ids y fuentes de los complementos.
- Las rutas candidatas se verifican por seguridad antes de la admisión del descubrimiento. OpenClaw bloquea a los candidatos cuando:
  - la entrada de extensión se resuelve fuera de la raíz del complemento (incluyendo enlaces simbólicos/escapes de recorrido de ruta),
  - la ruta raíz/fuente del complemento es escribible por todos (world-writable),
  - la propiedad de la ruta es sospechosa para complementos no empaquetados (el propietario POSIX no es ni el uid actual ni root).
- Los complementos no empaquetados cargados sin procedencia de instalación/ruta de carga emiten una advertencia para que pueda anclar la confianza (`plugins.allow`) o el seguimiento de instalación (`plugins.installs`).

Cada complemento nativo de OpenClaw debe incluir un archivo `openclaw.plugin.json` en su
raíz. Si una ruta apunta a un archivo, la raíz del complemento es el directorio del archivo y
debe contener el manifiesto.

Los paquetes compatibles pueden proporcionar en su lugar uno de:

- `.codex-plugin/plugin.json`
- `.claude-plugin/plugin.json`

Los directorios de los paquetes se descubren desde las mismas raíces que los complementos nativos.

Si varios complementos se resuelven al mismo id, la primera coincidencia en el orden anterior
gana y se ignoran las copias de menor precedencia.

Eso significa:

- los complementos del espacio de trabajo intencionalmente ensombrecen los complementos empaquetados con el mismo id
- `plugins.allow: ["foo"]` autoriza el complemento activo `foo` por id, incluso cuando
  la copia activa proviene del espacio de trabajo en lugar de la raíz de la extensión empaquetada
- si necesita un control de procedencia más estricto, use rutas de instalación/carga explícitas e
  inspeccione la fuente del complemento resuelto antes de habilitarlo

### Reglas de habilitación

La habilitación se resuelve después del descubrimiento:

- `plugins.enabled: false` deshabilita todos los complementos
- `plugins.deny` siempre gana
- `plugins.entries.<id>.enabled: false` deshabilita ese complemento
- los complementos de origen del espacio de trabajo están deshabilitados de forma predeterminada
- las listas de permitidos restringen el conjunto activo cuando `plugins.allow` no está vacío
- las listas de permitidos están **basadas en id**, no en la fuente
- los complementos empaquetados están deshabilitados de forma predeterminada a menos que:
  - el id del paquete incluido está en el conjunto predeterminado activo integrado, o
  - lo activa explícitamente, o
  - la configuración del canal activa implícitamente el complemento del canal incluido
- las ranuras exclusivas pueden forzar la activación del complemento seleccionado para esa ranura

En el núcleo actual, los ids predeterminados activos del paquete incluyen los ayudantes locales/de proveedor
antes mencionados más el complemento de ranura de memoria activa.

### Paquetes de paquetes

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

Cada entrada se convierte en un complemento. Si el paquete lista múltiples extensiones, el id del complemento
se convierte en `name/<fileBase>`.

Si su complemento importa dependencias de npm, instálelas en ese directorio para que
`node_modules` esté disponible (`npm install` / `pnpm install`).

Salvaguarda de seguridad: cada entrada `openclaw.extensions` debe permanecer dentro del directorio del complemento
después de la resolución de enlaces simbólicos. Las entradas que salen del directorio del paquete son
rechazadas.

Nota de seguridad: `openclaw plugins install` instala las dependencias del complemento con
`npm install --ignore-scripts` (sin scripts de ciclo de vida). Mantenga los árboles de dependencias del complemento
"JS/TS puro" y evite paquetes que requieran compilaciones `postinstall`.

Opcional: `openclaw.setupEntry` puede apuntar a un módulo ligero de solo configuración.
Cuando OpenClaw necesita superficies de incorporación/configuración para un complemento de canal deshabilitado, carga
`setupEntry` en lugar de la entrada completa del complemento. Esto mantiene el inicio y la
incorporación más ligeros cuando su entrada principal del complemento también conecta herramientas, enlaces u
otro código de solo tiempo de ejecución.

### Metadatos del catálogo de canales

Los complementos de canal pueden anunciar metadatos de incorporación a través de `openclaw.channel` y
sugerencias de instalación a través de `openclaw.install`. Esto mantiene el catálogo central libre de datos.

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
      "localPath": "extensions/nextcloud-talk",
      "defaultChoice": "npm"
    }
  }
}
```

OpenClaw también puede fusionar **catálogos de canales externos** (por ejemplo, una exportación
del registro MPM). Coloque un archivo JSON en uno de:

- `~/.openclaw/mpm/plugins.json`
- `~/.openclaw/mpm/catalog.json`
- `~/.openclaw/plugins/catalog.json`

O apunte `OPENCLAW_PLUGIN_CATALOG_PATHS` (o `OPENCLAW_MPM_CATALOG_PATHS`) a
uno o más archivos JSON (delimitados por comas/punto y coma/`PATH`). Cada archivo debe
contener `{ "entries": [ { "name": "@scope/pkg", "openclaw": { "channel": {...}, "install": {...} } } ] }`.

## IDs de complementos

Ids de complemento predeterminados:

- Paquetes de paquetes: `package.json` `name`
- Archivo independiente: nombre base del archivo (`~/.../voice-call.ts` → `voice-call`)

Si un complemento exporta `id`, OpenClaw lo usa pero advierte cuando no coincide con la id configurada.

## Modelo de registro

Los complementos cargados no mutan directamente las variables globales principales aleatorias. Se registran en un registro central de complementos.

El registro rastrea:

- registros de complementos (identidad, fuente, origen, estado, diagnósticos)
- herramientas
- ganchos heredados y ganchos tipados
- canales
- proveedores
- controladores RPC de puerta de enlace
- rutas HTTP
- registradores de CLI
- servicios en segundo plano
- comandos propiedad del complemento

Las funciones principales luego leen de ese registro en lugar de comunicarse directamente con los módulos de complemento. Esto mantiene la carga en una sola dirección:

- módulo de complemento -> registro de registro
- tiempo de ejecución principal -> consumo del registro

Esa separación es importante para la mantenibilidad. Significa que la mayoría de las superficies principales solo necesitan un punto de integración: "leer el registro", no "casos especiales para cada módulo de complemento".

## Configuración

```json5
{
  plugins: {
    enabled: true,
    allow: ["voice-call"],
    deny: ["untrusted-plugin"],
    load: { paths: ["~/Projects/oss/voice-call-extension"] },
    entries: {
      "voice-call": { enabled: true, config: { provider: "twilio" } },
    },
  },
}
```

Campos:

- `enabled`: interruptor maestro (predeterminado: true)
- `allow`: lista de permitidos (opcional)
- `deny`: lista de denegados (opcional; denegar gana)
- `load.paths`: archivos/dirs de complementos adicionales
- `slots`: selectores de ranura exclusivos como `memory` y `contextEngine`
- `entries.<id>`: interruptores + configuración por complemento

Los cambios en la configuración **requieren un reinicio de la puerta de enlace**.

Reglas de validación (estrictas):

- Las ids de complementos desconocidas en `entries`, `allow`, `deny` o `slots` son **errores**.
- Las claves `channels.<id>` desconocidas son **errores** a menos que un manifiesto de complemento declare la id del canal.
- La configuración del complemento nativo se valida utilizando el esquema JSON incrustado en `openclaw.plugin.json` (`configSchema`).
- Los paquetes compatibles actualmente no exponen esquemas de configuración nativos de OpenClaw.
- Si un complemento está deshabilitado, su configuración se conserva y se emite una **advertencia**.

### Deshabilitado vs. faltante vs. no válido

Estos estados son intencionalmente diferentes:

- **deshabilitado (disabled)**: el complemento existe, pero las reglas de habilitación lo desactivaron
- **falta (missing)**: la configuración hace referencia a un id de complemento que el descubrimiento no encontró
- **inválido (invalid)**: el complemento existe, pero su configuración no coincide con el esquema declarado

OpenClaw conserva la configuración de los complementos deshabilitados, por lo que volver a activarlos no es destructivo.

## Slots de complementos (categorías exclusivas)

Algunas categorías de complementos son **exclusivas** (solo una activa a la vez). Use
`plugins.slots` para seleccionar qué complemento posee el slot:

```json5
{
  plugins: {
    slots: {
      memory: "memory-core", // or "none" to disable memory plugins
      contextEngine: "legacy", // or a plugin id such as "lossless-claw"
    },
  },
}
```

Slots exclusivos compatibles:

- `memory`: complemento de memoria activo (`"none"` deshabilita los complementos de memoria)
- `contextEngine`: complemento de motor de contexto activo (`"legacy"` es el predeterminado integrado)

Si varios complementos declaran `kind: "memory"` o `kind: "context-engine"`, solo
se carga el complemento seleccionado para ese slot. Los demás se deshabilitan con diagnósticos.

### Complementos de motor de contexto

Los complementos de motor de contexto poseen la orquestación del contexto de sesión para ingestión, ensamblaje
y compactación. Regístrelos desde su complemento con
`api.registerContextEngine(id, factory)`, luego seleccione el motor activo con
`plugins.slots.contextEngine`.

Use esto cuando su complemento necesite reemplazar o extender la canalización de contexto predeterminada en lugar de simplemente agregar búsqueda de memoria o hooks.

## Interfaz de control (schema + etiquetas)

La interfaz de control usa `config.schema` (JSON Schema + `uiHints`) para representar mejores formularios.

OpenClaw aumenta `uiHints` en tiempo de ejecución basándose en los complementos descubiertos:

- Agrega etiquetas por complemento para `plugins.entries.<id>` / `.enabled` / `.config`
- Fusiona pistas opcionales de campos de configuración proporcionadas por el complemento bajo:
  `plugins.entries.<id>.config.<field>`

Si desea que los campos de configuración de su complemento muestren buenas etiquetas/marcadores de posición (y marcar secretos como confidenciales),
proporcione `uiHints` junto con su JSON Schema en el manifiesto del complemento.

Ejemplo:

```json
{
  "id": "my-plugin",
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {
      "apiKey": { "type": "string" },
      "region": { "type": "string" }
    }
  },
  "uiHints": {
    "apiKey": { "label": "API Key", "sensitive": true },
    "region": { "label": "Region", "placeholder": "us-east-1" }
  }
}
```

## CLI

```bash
openclaw plugins list
openclaw plugins info <id>
openclaw plugins install <path>                 # copy a local file/dir into ~/.openclaw/extensions/<id>
openclaw plugins install ./extensions/voice-call # relative path ok
openclaw plugins install ./plugin.tgz           # install from a local tarball
openclaw plugins install ./plugin.zip           # install from a local zip
openclaw plugins install -l ./extensions/voice-call # link (no copy) for dev
openclaw plugins install @openclaw/voice-call # install from npm
openclaw plugins install @openclaw/voice-call --pin # store exact resolved name@version
openclaw plugins update <id>
openclaw plugins update --all
openclaw plugins enable <id>
openclaw plugins disable <id>
openclaw plugins doctor
```

`openclaw plugins list` muestra el formato de nivel superior como `openclaw` o `bundle`.
La salida de lista/información detallada también muestra el subtipo de paquete (`codex` o `claude`) más
las capacidades del paquete detectadas.

`plugins update` solo funciona para instalaciones de npm rastreadas bajo `plugins.installs`.
Si los metadatos de integridad almacenados cambian entre actualizaciones, OpenClaw advierte y pide confirmación (use el global `--yes` para omitir los avisos).

Los complementos también pueden registrar sus propios comandos de nivel superior (ejemplo: `openclaw voicecall`).

## API de complementos (descripción general)

Los complementos exportan ya sea:

- Una función: `(api) => { ... }`
- Un objeto: `{ id, name, configSchema, register(api) { ... } }`

`register(api)` es donde los complementos adjuntan comportamientos. Los registros comunes incluyen:

- `registerTool`
- `registerHook`
- `on(...)` para ganchos del ciclo de vida tipados
- `registerChannel`
- `registerProvider`
- `registerHttpRoute`
- `registerCommand`
- `registerCli`
- `registerContextEngine`
- `registerService`

Los complementos del motor de contexto también pueden registrar un administrador de contexto propiedad del tiempo de ejecución:

```ts
export default function (api) {
  api.registerContextEngine("lossless-claw", () => ({
    info: { id: "lossless-claw", name: "Lossless Claw", ownsCompaction: true },
    async ingest() {
      return { ingested: true };
    },
    async assemble({ messages }) {
      return { messages, estimatedTokens: 0 };
    },
    async compact() {
      return { ok: true, compacted: false };
    },
  }));
}
```

Luego habilítelo en la configuración:

```json5
{
  plugins: {
    slots: {
      contextEngine: "lossless-claw",
    },
  },
}
```

## Ganchos de complementos

Los complementos pueden registrar ganchos en tiempo de ejecución. Esto permite que un complemento incluya automatización impulsada por eventos
sin una instalación separada de un paquete de ganchos.

### Ejemplo

```ts
export default function register(api) {
  api.registerHook(
    "command:new",
    async () => {
      // Hook logic here.
    },
    {
      name: "my-plugin.command-new",
      description: "Runs when /new is invoked",
    },
  );
}
```

Notas:

- Registre ganchos explícitamente a través de `api.registerHook(...)`.
- Las reglas de elegibilidad de ganchos todavía aplican (requisitos de SO/bins/env/config).
- Los ganchos administrados por complementos aparecen en `openclaw hooks list` con `plugin:<id>`.
- No puede habilitar/deshabilitar ganchos administrados por complementos a través de `openclaw hooks`; en su lugar, habilite/deshabilite el complemento.

### Ganchos del ciclo de vida del agente (`api.on`)

Para ganchos del ciclo de vida de tiempo de ejecución tipados, use `api.on(...)`:

```ts
export default function register(api) {
  api.on(
    "before_prompt_build",
    (event, ctx) => {
      return {
        prependSystemContext: "Follow company style guide.",
      };
    },
    { priority: 10 },
  );
}
```

Ganchos importantes para la construcción de indicaciones:

- `before_model_resolve`: se ejecuta antes de la carga de la sesión (`messages` no están disponibles). Úselo para anular de manera determinista `modelOverride` o `providerOverride`.
- `before_prompt_build`: se ejecuta después de la carga de la sesión (`messages` están disponibles). Úselo para dar forma a la entrada del prompt.
- `before_agent_start`: enlace de compatibilidad heredado. Se prefieren los dos enlaces explícitos anteriores.

Política de enlace aplicada por el núcleo:

- Los operadores pueden deshabilitar los enlaces de mutación de prompt por complemento a través de `plugins.entries.<id>.hooks.allowPromptInjection: false`.
- Cuando está deshabilitado, OpenClaw bloquea `before_prompt_build` e ignora los campos de mutación de prompt devueltos por el `before_agent_start` heredado, al tiempo que conserva los `modelOverride` y `providerOverride` heredados.

Campos de resultado `before_prompt_build`:

- `prependContext`: antepone texto al prompt del usuario para esta ejecución. Es mejor para contenido específico del turno o dinámico.
- `systemPrompt`: anulación completa del prompt del sistema.
- `prependSystemContext`: antepone texto al prompt del sistema actual.
- `appendSystemContext`: añade texto al prompt del sistema actual.

Orden de construcción del prompt en el tiempo de ejecución integrado:

1. Aplicar `prependContext` al prompt del usuario.
2. Aplicar la anulación `systemPrompt` cuando se proporcione.
3. Aplicar `prependSystemContext + current system prompt + appendSystemContext`.

Notas de fusión y precedencia:

- Los controladores de enlace se ejecutan por prioridad (primero los más altos).
- Para los campos de contexto fusionados, los valores se concatenan en orden de ejecución.
- Los valores `before_prompt_build` se aplican antes que los valores de respaldo heredados `before_agent_start`.

Guía de migración:

- Mueva la guía estática de `prependContext` a `prependSystemContext` (o `appendSystemContext`) para que los proveedores puedan almacenar en caché el contenido estable del prefijo del sistema.
- Mantenga `prependContext` para el contexto dinámico por turno que debe permanecer vinculado al mensaje del usuario.

## Complementos de proveedor (autenticación de modelo)

Los complementos pueden registrar **proveedores de modelos** para que los usuarios puedan ejecutar la configuración de OAuth o claves de API dentro de OpenClaw, mostrar la configuración del proveedor en la incorporación/selectores de modelos y contribuir al descubrimiento implícito de proveedores.

Los complementos de proveedor son la costura de extensión modular para la configuración de proveedores de modelos. Ya no son solo "ayudantes de OAuth".

### Ciclo de vida del complemento de proveedor

Un complemento de proveedor puede participar en cinco fases distintas:

1. **Auth**
   `auth[].run(ctx)` realiza OAuth, captura de clave de API, código de dispositivo o configuración personalizada
   y devuelve perfiles de autenticación más parches de configuración opcionales.
2. **Configuración no interactiva**
   `auth[].runNonInteractive(ctx)` maneja `openclaw onboard --non-interactive`
   sin avisos. Use esto cuando el proveedor necesita una configuración personalizada sin cabeza (headless) más allá de las rutas simples de clave de API integradas.
3. **Integración con el asistente**
   `wizard.onboarding` añade una entrada a `openclaw onboard`.
   `wizard.modelPicker` añade una entrada de configuración al selector de modelos.
4. **Descubrimiento implícito**
   `discovery.run(ctx)` puede contribuir automáticamente con la configuración del proveedor durante
   la resolución/listado de modelos.
5. **Seguimiento posterior a la selección**
   `onModelSelected(ctx)` se ejecuta después de elegir un modelo. Úselo para trabajos
   específicos del proveedor, como descargar un modelo local.

Esta es la división recomendada porque estas fases tienen diferentes requisitos de ciclo de vida:

- auth es interactivo y escribe credenciales/configuración
- la configuración no interactiva se controla mediante marcas/variables de entorno y no debe solicitar nada
- los metadatos del asistente son estáticos y orientados a la interfaz de usuario
- el descubrimiento debe ser seguro, rápido y tolerante a fallos
- los ganchos posteriores a la selección son efectos secundarios vinculados al modelo elegido

### Contrato de autenticación del proveedor

`auth[].run(ctx)` devuelve:

- `profiles`: perfiles de autenticación para escribir
- `configPatch`: cambios opcionales de `openclaw.json`
- `defaultModel`: referencia opcional de `provider/model`
- `notes`: notas opcionales para el usuario

El núcleo entonces:

1. escribe los perfiles de autenticación devueltos
2. aplica el cableado de configuración del perfil de autenticación
3. fusiona el parche de configuración
4. opcionalmente aplica el modelo predeterminado
5. ejecuta el gancho `onModelSelected` del proveedor cuando sea apropiado

Esto significa que un complemento de proveedor posee la lógica de configuración específica del proveedor, mientras que el núcleo (core) es propietario de la ruta de persistencia genérica y combinación de configuraciones.

### Contrato no interactivo del proveedor

`auth[].runNonInteractive(ctx)` es opcional. Implementarlo cuando el proveedor necesita una configuración desatendida que no puede expresarse a través de los flujos genéricos integrados de claves de API.

El contexto no interactivo incluye:

- la configuración actual y base
- opciones de CLI de incorporación analizadas
- asistentes de registro/errores en tiempo de ejecución
- directorios de agente/espacio de trabajo
- `resolveApiKey(...)` para leer claves de proveedor desde indicadores, variables de entorno o perfiles de autenticación existentes respetando `--secret-input-mode`
- `toApiKeyCredential(...)` para convertir una clave resuelta en una credencial de perfil de autenticación con el almacenamiento adecuado de texto plano frente a referencia secreta

Utilice esta superficie para proveedores tales como:

- tiempos de ejecución compatibles con OpenAI autohospedados que necesitan `--custom-base-url` +
  `--custom-model-id`
- verificación no interactiva específica del proveedor o síntesis de configuración

No solicite datos desde `runNonInteractive`. Rechace las entradas faltantes con errores accionables en su lugar.

### Metadatos del asistente del proveedor

`wizard.onboarding` controla cómo aparece el proveedor en la incorporación agrupada:

- `choiceId`: valor de elección de autenticación
- `choiceLabel`: etiqueta de opción
- `choiceHint`: pista corta
- `groupId`: id de cubo de grupo
- `groupLabel`: etiqueta de grupo
- `groupHint`: pista de grupo
- `methodId`: método de autenticación a ejecutar

`wizard.modelPicker` controla cómo aparece un proveedor como una entrada de "configurar esto ahora" en la selección de modelo:

- `label`
- `hint`
- `methodId`

Cuando un proveedor tiene múltiples métodos de autenticación, el asistente puede apuntar a un método explícito o dejar que OpenClaw sintetice elecciones por método.

OpenClaw valida los metadatos del asistente del proveedor cuando se registra el complemento:

- se rechazan los ids de métodos de autenticación duplicados o en blanco
- se ignoran los metadatos del asistente cuando el proveedor no tiene métodos de autenticación
- los enlaces `methodId` no válidos se degradan a avisos y se recurre a los
  métodos de autenticación restantes del proveedor

### Contrato de descubrimiento de proveedores

`discovery.run(ctx)` devuelve uno de:

- `{ provider }`
- `{ providers }`
- `null`

Use `{ provider }` para el caso común en el que el complemento posee un id de proveedor.
Use `{ providers }` cuando un complemento descubre múltiples entradas de proveedor.

El contexto de descubrimiento incluye:

- la configuración actual
- dirs agent/workspace
- entorno de proceso (process env)
- un asistente para resolver la clave API del proveedor y un valor de clave API seguro para el descubrimiento

El descubrimiento debe ser:

- rápido
- mejor esfuerzo (best-effort)
- seguro de omitir en caso de fallo
- cuidadoso con los efectos secundarios

No debe depender de mensajes (prompts) ni de configuraciones de larga duración.

### Orden de descubrimiento

El descubrimiento de proveedores se ejecuta en fases ordenadas:

- `simple`
- `profile`
- `paired`
- `late`

Use:

- `simple` para un descubrimiento barato solo de entorno
- `profile` cuando el descubrimiento depende de perfiles de autenticación
- `paired` para proveedores que necesitan coordinarse con otro paso de descubrimiento
- `late` para sondas costosas o de red local

La mayoría de los proveedores autohospedados deberían usar `late`.

### Buenos límites de complemento de proveedor

Buena opción para complementos de proveedor:

- proveedores locales/autohospedados con flujos de configuración personalizados
- inicio de sesión OAuth/código de dispositivo específico del proveedor
- descubrimiento implícito de servidores de modelos locales
- efectos secundarios posteriores a la selección, como las descargas de modelos

Opción menos convincente:

- proveedores triviales solo de clave API que difieren solo por variable de entorno, URL base y un
  modelo predeterminado

Esos aún pueden convertirse en complementos, pero el principal beneficio de modularidad proviene de
extraer primero proveedores con comportamiento rico.

Registre un proveedor a través de `api.registerProvider(...)`. Cada proveedor expone uno
o más métodos de autenticación (OAuth, clave API, código de dispositivo, etc.). Esos métodos pueden
proporcionar:

- `openclaw models auth login --provider <id> [--method <id>]`
- `openclaw onboard`
- entradas de configuración de "proveedor personalizado" en el selector de modelos
- descubrimiento implícito de proveedores durante la resolución/listado de modelos

Ejemplo:

```ts
api.registerProvider({
  id: "acme",
  label: "AcmeAI",
  auth: [
    {
      id: "oauth",
      label: "OAuth",
      kind: "oauth",
      run: async (ctx) => {
        // Run OAuth flow and return auth profiles.
        return {
          profiles: [
            {
              profileId: "acme:default",
              credential: {
                type: "oauth",
                provider: "acme",
                access: "...",
                refresh: "...",
                expires: Date.now() + 3600 * 1000,
              },
            },
          ],
          defaultModel: "acme/opus-1",
        };
      },
    },
  ],
  wizard: {
    onboarding: {
      choiceId: "acme",
      choiceLabel: "AcmeAI",
      groupId: "acme",
      groupLabel: "AcmeAI",
      methodId: "oauth",
    },
    modelPicker: {
      label: "AcmeAI (custom)",
      hint: "Connect a self-hosted AcmeAI endpoint",
      methodId: "oauth",
    },
  },
  discovery: {
    order: "late",
    run: async () => ({
      provider: {
        baseUrl: "https://acme.example/v1",
        api: "openai-completions",
        apiKey: "${ACME_API_KEY}",
        models: [],
      },
    }),
  },
});
```

Notas:

- `run` recibe un `ProviderAuthContext` con las funciones auxiliares `prompter`, `runtime`,
  `openUrl` y `oauth.createVpsAwareHandlers`.
- `runNonInteractive` recibe un `ProviderAuthMethodNonInteractiveContext`
  con las funciones auxiliares `opts`, `resolveApiKey` y `toApiKeyCredential` para
  la incorporación sin interfaz gráfica.
- Devuelva `configPatch` cuando necesite agregar modelos predeterminados o configuración del proveedor.
- Devuelva `defaultModel` para que `--set-default` pueda actualizar los valores predeterminados del agente.
- `wizard.onboarding` añade una opción de proveedor a `openclaw onboard`.
- `wizard.modelPicker` añade una entrada de “configurar este proveedor” al selector de modelos.
- `discovery.run` devuelve `{ provider }` para el ID del propio proveedor del complemento
  o `{ providers }` para el descubrimiento de múltiples proveedores.
- `discovery.order` controla cuándo se ejecuta el proveedor en relación con las fases de
  descubrimiento integradas: `simple`, `profile`, `paired` o `late`.
- `onModelSelected` es el enlace posterior a la selección para trabajos de seguimiento
  específicos del proveedor, como extraer un modelo local.

### Registrar un canal de mensajería

Los complementos pueden registrar **complementos de canal** que se comportan como los canales
integrados (WhatsApp, Telegram, etc.). La configuración del canal se encuentra en `channels.<id>` y es
validada por el código de su complemento de canal.

```ts
const myChannel = {
  id: "acmechat",
  meta: {
    id: "acmechat",
    label: "AcmeChat",
    selectionLabel: "AcmeChat (API)",
    docsPath: "/channels/acmechat",
    blurb: "demo channel plugin.",
    aliases: ["acme"],
  },
  capabilities: { chatTypes: ["direct"] },
  config: {
    listAccountIds: (cfg) => Object.keys(cfg.channels?.acmechat?.accounts ?? {}),
    resolveAccount: (cfg, accountId) =>
      cfg.channels?.acmechat?.accounts?.[accountId ?? "default"] ?? {
        accountId,
      },
  },
  outbound: {
    deliveryMode: "direct",
    sendText: async () => ({ ok: true }),
  },
};

export default function (api) {
  api.registerChannel({ plugin: myChannel });
}
```

Notas:

- Coloque la configuración en `channels.<id>` (no en `plugins.entries`).
- `meta.label` se usa para las etiquetas en las listas de la interfaz de línea de comandos (CLI) y de usuario (UI).
- `meta.aliases` añade ID alternativos para la normalización y las entradas de la CLI.
- `meta.preferOver` enumera los ID de los canales para omitir la activación automática cuando ambos estén configurados.
- `meta.detailLabel` y `meta.systemImage` permiten que las interfaces muestren etiquetas/iconos de canal más completos.

### Enlaces de configuración del canal

División de configuración preferida:

- `plugin.setup` se encarga de la normalización, validación y escritura de configuración del account-id.
- `plugin.setupWizard` permite al host ejecutar el flujo común del asistente mientras que el canal solo proporciona descriptores de estado, credenciales, lista de permitidos de DM y acceso al canal.

`plugin.setupWizard` es mejor para los canales que se ajustan al patrón compartido:

- un selector de cuenta impulsado por `plugin.config.listAccountIds`
- paso opcional de verificación previa/preparación antes de solicitar (por ejemplo, trabajo de instalador/inicialización)
- prompt opcional de acceso directo de entorno para conjuntos de credenciales empaquetados (por ejemplo, tokens de bot/aplicación emparejados)
- uno o más prompts de credenciales, donde cada paso escribe a través de `plugin.setup.applyAccountConfig` o un parche parcial propiedad del canal
- prompts opcionales de texto no secreto (por ejemplo, rutas de CLI, URL base, ids de cuenta)
- prompts opcionales de lista de permitidos de acceso al canal/grupo resueltos por el host
- resolución opcional de la lista de permitidos de DM (por ejemplo, `@username` -> id numérico)
- nota opcional de finalización después de que termina la configuración

### Escribir un nuevo canal de mensajería (paso a paso)

Use esto cuando desee una **nueva superficie de chat** (un "canal de mensajería"), no un proveedor de modelo.
La documentación del proveedor de modelo se encuentra en `/providers/*`.

1. Elija un id + forma de configuración

- Toda la configuración del canal reside bajo `channels.<id>`.
- Prefiera `channels.<id>.accounts.<accountId>` para configuraciones de múltiples cuentas.

2. Defina los metadatos del canal

- `meta.label`, `meta.selectionLabel`, `meta.docsPath`, `meta.blurb` controlan las listas de CLI/interfaz de usuario.
- `meta.docsPath` debe apuntar a una página de documentación como `/channels/<id>`.
- `meta.preferOver` permite que un complemento reemplace otro canal (la activación automática lo prefiere).
- `meta.detailLabel` y `meta.systemImage` son utilizados por las interfaces de usuario para texto de detalle/iconos.

3. Implemente los adaptadores requeridos

- `config.listAccountIds` + `config.resolveAccount`
- `capabilities` (tipos de chat, medios, hilos, etc.)
- `outbound.deliveryMode` + `outbound.sendText` (para envío básico)

4. Añada adaptadores opcionales según sea necesario

- `setup` (validación + escrituras de configuración), `setupWizard` (asistente propiedad del host), `security` (política de DM), `status` (salud/diagnósticos)
- `gateway` (inicio/parada/inicio de sesión), `mentions`, `threading`, `streaming`
- `actions` (acciones de mensaje), `commands` (comportamiento de comando nativo)

5. Registrar el canal en tu complemento

- `api.registerChannel({ plugin })`

Ejemplo de configuración mínima:

```json5
{
  channels: {
    acmechat: {
      accounts: {
        default: { token: "ACME_TOKEN", enabled: true },
      },
    },
  },
}
```

Complemento de canal mínimo (solo salida):

```ts
const plugin = {
  id: "acmechat",
  meta: {
    id: "acmechat",
    label: "AcmeChat",
    selectionLabel: "AcmeChat (API)",
    docsPath: "/channels/acmechat",
    blurb: "AcmeChat messaging channel.",
    aliases: ["acme"],
  },
  capabilities: { chatTypes: ["direct"] },
  config: {
    listAccountIds: (cfg) => Object.keys(cfg.channels?.acmechat?.accounts ?? {}),
    resolveAccount: (cfg, accountId) =>
      cfg.channels?.acmechat?.accounts?.[accountId ?? "default"] ?? {
        accountId,
      },
  },
  outbound: {
    deliveryMode: "direct",
    sendText: async ({ text }) => {
      // deliver `text` to your channel here
      return { ok: true };
    },
  },
};

export default function (api) {
  api.registerChannel({ plugin });
}
```

Carga el complemento (directorio de extensiones o `plugins.load.paths`), reinicia la puerta de enlace,
luego configura `channels.<id>` en tu configuración.

### Herramientas de agente

Consulta la guía dedicada: [Herramientas de agente de complemento](/es/plugins/agent-tools).

### Registrar un método RPC de puerta de enlace

```ts
export default function (api) {
  api.registerGatewayMethod("myplugin.status", ({ respond }) => {
    respond(true, { ok: true });
  });
}
```

### Registrar comandos de CLI

```ts
export default function (api) {
  api.registerCli(
    ({ program }) => {
      program.command("mycmd").action(() => {
        console.log("Hello");
      });
    },
    { commands: ["mycmd"] },
  );
}
```

### Registrar comandos de respuesta automática

Los complementos pueden registrar comandos de barra personalizados que se ejecutan **sin invocar al
agente de IA**. Esto es útil para comandos de alternancia, verificaciones de estado o acciones rápidas
que no necesitan procesamiento de LLM.

```ts
export default function (api) {
  api.registerCommand({
    name: "mystatus",
    description: "Show plugin status",
    handler: (ctx) => ({
      text: `Plugin is running! Channel: ${ctx.channel}`,
    }),
  });
}
```

Contexto del controlador de comandos:

- `senderId`: El ID del remitente (si está disponible)
- `channel`: El canal donde se envió el comando
- `isAuthorizedSender`: Si el remitente es un usuario autorizado
- `args`: Argumentos pasados después del comando (si `acceptsArgs: true`)
- `commandBody`: El texto completo del comando
- `config`: La configuración actual de OpenClaw

Opciones de comando:

- `name`: Nombre del comando (sin la `/` inicial)
- `nativeNames`: Alias de comandos nativos opcionales para superficies de barra/menú. Usa `default` para todos los proveedores nativos, o claves específicas del proveedor como `discord`
- `description`: Texto de ayuda mostrado en las listas de comandos
- `acceptsArgs`: Si el comando acepta argumentos (predeterminado: false). Si es false y se proporcionan argumentos, el comando no coincidirá y el mensaje pasará a otros controladores
- `requireAuth`: Si se requiere un remitente autorizado (predeterminado: true)
- `handler`: Función que devuelve `{ text: string }` (puede ser asíncrona)

Ejemplo con autorización y argumentos:

```ts
api.registerCommand({
  name: "setmode",
  description: "Set plugin mode",
  acceptsArgs: true,
  requireAuth: true,
  handler: async (ctx) => {
    const mode = ctx.args?.trim() || "default";
    await saveMode(mode);
    return { text: `Mode set to: ${mode}` };
  },
});
```

Notas:

- Los comandos de los complementos se procesan **antes** que los comandos integrados y el agente de IA
- Los comandos se registran globalmente y funcionan en todos los canales
- Los nombres de los comandos no distinguen entre mayúsculas y minúsculas (`/MyStatus` coincide con `/mystatus`)
- Los nombres de los comandos deben comenzar con una letra y contener solo letras, números, guiones y guiones bajos
- Los nombres de comandos reservados (como `help`, `status`, `reset`, etc.) no pueden ser anulados por los complementos
- El registro duplicado de comandos en diferentes complementos fallará con un error de diagnóstico

### Registrar servicios en segundo plano

```ts
export default function (api) {
  api.registerService({
    id: "my-service",
    start: () => api.logger.info("ready"),
    stop: () => api.logger.info("bye"),
  });
}
```

## Convenciones de nomenclatura

- Métodos de puerta de enlace: `pluginId.action` (ejemplo: `voicecall.status`)
- Herramientas: `snake_case` (ejemplo: `voice_call`)
- Comandos de CLI: kebab o camel, pero evita conflictos con los comandos principales

## Habilidades

Los complementos pueden incluir una habilidad en el repositorio (`skills/<name>/SKILL.md`).
Actívala con `plugins.entries.<id>.enabled` (u otros mecanismos de configuración) y asegúrate
de que esté presente en tus ubicaciones de habilidades gestionadas/en el espacio de trabajo.

## Distribución (npm)

Empaquetado recomendado:

- Paquete principal: `openclaw` (este repositorio)
- Complementos: paquetes npm separados bajo `@openclaw/*` (ejemplo: `@openclaw/voice-call`)

Contrato de publicación:

- El complemento `package.json` debe incluir `openclaw.extensions` con uno o más archivos de entrada.
- Opcional: `openclaw.setupEntry` puede apuntar a una entrada ligera solo de configuración para la incorporación/configuración de canales deshabilitados.
- Los archivos de entrada pueden ser `.js` o `.ts` (jiti carga TS en tiempo de ejecución).
- `openclaw plugins install <npm-spec>` usa `npm pack`, extrae en `~/.openclaw/extensions/<id>/` y lo habilita en la configuración.
- Estabilidad de la clave de configuración: los paquetes con ámbito se normalizan al id **sin ámbito** para `plugins.entries.*`.

## Ejemplo de complemento: Llamada de voz

Este repositorio incluye un complemento de llamada de voz (Twilio o registro de respaldo):

- Fuente: `extensions/voice-call`
- Habilidad: `skills/voice-call`
- CLI: `openclaw voicecall start|status`
- Herramienta: `voice_call`
- RPC: `voicecall.start`, `voicecall.status`
- Configuración (twilio): `provider: "twilio"` + `twilio.accountSid/authToken/from` (opcional `statusCallbackUrl`, `twimlUrl`)
- Configuración (dev): `provider: "log"` (sin red)

Consulte [Llamada de voz](/es/plugins/voice-call) y `extensions/voice-call/README.md` para la configuración y el uso.

## Notas de seguridad

Los complementos se ejecutan en proceso con la Gateway. Trátelos como código de confianza:

- Solo instale complementos en los que confíe.
- Prefiera listas de permitidos de `plugins.allow`.
- Recuerde que `plugins.allow` se basa en el id, por lo que un complemento de espacio de trabajo habilitado puede
  intencionalmente sombrear un complemento incluido con el mismo id.
- Reinicie la Gateway después de realizar cambios.

## Prueba de complementos

Los complementos pueden (y deben) incluir pruebas:

- Los complementos en el repositorio pueden mantener las pruebas de Vitest bajo `src/**` (ejemplo: `src/plugins/voice-call.plugin.test.ts`).
- Los complementos publicados por separado deben ejecutar su propio CI (lint/build/test) y validar que `openclaw.extensions` apunte al punto de entrada compilado (`dist/index.js`).

import es from "/components/footer/es.mdx";

<es />
