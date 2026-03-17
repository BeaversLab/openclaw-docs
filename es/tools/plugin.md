---
summary: "Plugins (Extensiones) de OpenClaw: descubrimiento, configuración y seguridad"
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

Ambos aparecen en `openclaw plugins`, pero solo los plugins nativos de OpenClaw ejecutan
código de tiempo de ejecución en proceso.

La mayor parte del tiempo, usarás plugins cuando quieras una función que aún no está integrada
en el núcleo de OpenClaw (o quieres mantener las funciones opcionales fuera de tu instalación
principal).

Ruta rápida:

1. Ver qué ya está cargado:

```bash
openclaw plugins list
```

2. Instalar un plugin oficial (ejemplo: Llamada de voz):

```bash
openclaw plugins install @openclaw/voice-call
```

Las especificaciones de Npm son **solo de registro** (nombre del paquete + **versión exacta** opcional o
**dist-tag**). Las especificaciones de Git/URL/archivo y los rangos de semver se rechazan.

Las especificaciones simples y `@latest` se mantienen en la pista estable. Si npm resuelve cualquiera de
esas a una versión preliminar, OpenClaw se detiene y te pide que aceptes explícitamente con una
etiqueta preliminar como `@beta`/`@rc` o una versión preliminar exacta.

3. Reinicia el Gateway, luego configura bajo `plugins.entries.<id>.config`.

Consulta [Llamada de voz](/es/plugins/voice-call) para ver un ejemplo concreto de plugin.
¿Buscas listados de terceros? Consulta [Plugins de la comunidad](/es/plugins/community).
¿Necesitas los detalles de compatibilidad de bundles? Consulta [Bundles de plugins](/es/plugins/bundles).

Para bundles compatibles, instala desde un directorio local o un archivo:

```bash
openclaw plugins install ./my-bundle
openclaw plugins install ./my-bundle.tgz
```

Para las instalaciones del mercado de Claude, primero lista el mercado, luego instala por
nombre de entrada del mercado:

```bash
openclaw plugins marketplace list <marketplace-name>
openclaw plugins install <plugin-name>@<marketplace-name>
```

OpenClaw resuelve los nombres conocidos del mercado de Claude desde
`~/.claude/plugins/known_marketplaces.json`. También puedes pasar una fuente explícita
del mercado con `--marketplace`.

## Arquitectura

El sistema de plugins de OpenClaw tiene cuatro capas:

1. **Manifiesto + descubrimiento**
   OpenClaw encuentra plugins candidatos desde rutas configuradas, raíces del espacio de trabajo,
   raíces globales de extensiones y extensiones agrupadas. El descubrimiento lee los manifiestos
   nativos `openclaw.plugin.json` además de los manifiestos de bundles soportados primero.
2. **Habilitación y validación**
   Core decide si un plugin descubierto está habilitado, deshabilitado, bloqueado o
   seleccionado para un espacio exclusivo como la memoria.
3. **Carga en tiempo de ejecución**
   Los plugins nativos de OpenClaw se cargan en proceso a través de jiti y registran
   capacidades en un registro central. Los paquetes compatibles se normalizan en
   registros del registro sin importar código de tiempo de ejecución.
4. **Consumo de superficie**
   El resto de OpenClaw lee el registro para exponer herramientas, canales,
   configuración de proveedores, hooks, rutas HTTP, comandos CLI y servicios.

El límite de diseño importante:

- el descubrimiento y la validación de la configuración deben funcionar a partir de **metadatos de manifiesto/esquema**
  sin ejecutar el código del plugin
- el comportamiento nativo en tiempo de ejecución proviene de la ruta `register(api)` del módulo del plugin

Esa división permite a OpenClaw validar la configuración, explicar los plugins que faltan o están deshabilitados y
construir sugerencias de interfaz/esquema antes de que el tiempo de ejecución completo esté activo.

## Paquetes compatibles

OpenClaw también reconoce dos diseños de paquetes externos compatibles:

- Paquetes estilo Codex: `.codex-plugin/plugin.json`
- Paquetes estilo Claude: `.claude-plugin/plugin.json` o el diseño de componente Claude
  predeterminado sin manifiesto
- Paquetes estilo Cursor: `.cursor-plugin/plugin.json`

Las entradas del marketplace de Claude pueden apuntar a cualquiera de estos paquetes compatibles, o a
fuentes de plugins nativos de OpenClaw. OpenClaw resuelve primero la entrada del marketplace,
y luego ejecuta la ruta de instalación normal para la fuente resuelta.

Se muestran en la lista de plugins como `format=bundle`, con un subtipo de
`codex` o `claude` en la salida detallada/informativa.

Consulte [Plugin bundles](/es/plugins/bundles) para conocer las reglas exactas de detección, el comportamiento de mapeo
y la matriz de soporte actual.

Hoy, OpenClaw trata estos como **paquetes de capacidades**, no como plugins de tiempo de ejecución
nativos:

- soportado ahora: `skills` agrupado
- soportado ahora: raíces markdown de `commands/` de Claude, mapeadas al cargador
  de habilidades normal de OpenClaw
- soportado ahora: valores predeterminados de `settings.json` del paquete Claude para la configuración
  del agente Pi integrado (con claves de anulación de shell saneadas)
- soportado ahora: raíces `.cursor/commands/*.md` de Cursor, mapeadas al cargador
  de habilidades normal de OpenClaw
- compatibilidad ahora: directorios de hooks de bundles de Codex que utilizan el diseño de pack de hooks de OpenClaw (`HOOK.md` + `handler.ts`/`handler.js`)
- detectado pero aún no conectado: otras capacidades de bundle declaradas, como agentes, automatización de hooks de Claude, reglas/hooks/metadatos de MCP de Cursor, metadatos de MCP/app/LSP, estilos de salida

Esto significa que la instalación/descubrimiento/lista/información/habilitación del bundle funcionan, y las habilidades del bundle, habilidades de comandos de Claude, valores predeterminados de configuración del bundle de Claude y directorios de hooks de Codex compatibles se cargan cuando el bundle está habilitado, pero el código de tiempo de ejecución del bundle no se ejecuta en el proceso.

La compatibilidad con hooks de bundles se limita al formato normal de directorio de hooks de OpenClaw (`HOOK.md` más `handler.ts`/`handler.js` bajo las raíces de hooks declaradas). Los tiempos de ejecución de hooks shell/JSON específicos del proveedor, incluidos los de Claude `hooks.json`, solo se detectan hoy y no se ejecutan directamente.

## Modelo de ejecución

Los complementos nativos de OpenClaw se ejecutan **en el proceso** con el Gateway. No están sandboxed. Un complemento nativo cargado tiene el mismo límite de confianza a nivel de proceso que el código central.

Implicaciones:

- un complemento nativo puede registrar herramientas, controladores de red, hooks y servicios
- un error en un complemento nativo puede bloquear o desestabilizar la puerta de enlace
- un complemento nativo malicioso es equivalente a la ejecución de código arbitrario dentro del proceso de OpenClaw

Los bundles compatibles son más seguros de forma predeterminada porque OpenClaw actualmente los trata como paquetes de metadatos/contenido. En las versiones actuales, eso significa principalmente habilidades empaquetadas.

Use listas de permitidos y rutas de instalación/carga explícitas para complementos no empaquetados. Trate los complementos del espacio de trabajo como código en tiempo de desarrollo, no como valores predeterminados de producción.

Nota importante de confianza:

- `plugins.allow` confía en los **ids de complementos**, no en el origen de procedencia.
- Un complemento del espacio de trabajo con el mismo id que un complemento empaquetado oculta intencionalmente la copia empaquetada cuando ese complemento del espacio de trabajo está habilitado/en la lista de permitidos.
- Esto es normal y útil para el desarrollo local, las pruebas de parches y las correcciones rápidas.

## Complementos disponibles (oficiales)

- Microsoft Teams es solo complemento a partir del 15.01.2026; instale `@openclaw/msteams` si usa Teams.
- Memoria (Core) — complemento de búsqueda de memoria incluido (habilitado de forma predeterminada mediante `plugins.slots.memory`)
- Memoria (LanceDB) — complemento de memoria a largo plazo incluido (recordatorio/captura automáticos; establezca `plugins.slots.memory = "memory-lancedb"`)
- [Llamada de voz](/es/plugins/voice-call) — `@openclaw/voice-call`
- [Zalo Personal](/es/plugins/zalouser) — `@openclaw/zalouser`
- [Matrix](/es/channels/matrix) — `@openclaw/matrix`
- [Nostr](/es/channels/nostr) — `@openclaw/nostr`
- [Zalo](/es/channels/zalo) — `@openclaw/zalo`
- [Microsoft Teams](/es/channels/msteams) — `@openclaw/msteams`
- Tiempo de ejecución del proveedor Anthropic — incluido como `anthropic` (habilitado de forma predeterminada)
- Catálogo de proveedores BytePlus — incluido como `byteplus` (habilitado de forma predeterminada)
- Catálogo de proveedores Cloudflare AI Gateway — incluido como `cloudflare-ai-gateway` (habilitado de forma predeterminada)
- Búsqueda web de Google + Gemini CLI OAuth — incluido como `google` (la búsqueda web lo carga automáticamente; la autenticación del proveedor sigue siendo opcional)
- Tiempo de ejecución del proveedor GitHub Copilot — incluido como `github-copilot` (habilitado de forma predeterminada)
- Catálogo de proveedores Hugging Face — incluido como `huggingface` (habilitado de forma predeterminada)
- Tiempo de ejecución del proveedor Kilo Gateway — incluido como `kilocode` (habilitado de forma predeterminada)
- Catálogo de proveedores Kimi Coding — incluido como `kimi-coding` (habilitado de forma predeterminada)
- Catálogo de proveedores MiniMax + uso + OAuth — incluido como `minimax` (habilitado de forma predeterminada; posee `minimax` y `minimax-portal`)
- Capacidades del proveedor Mistral — incluidas como `mistral` (habilitadas de forma predeterminada)
- Catálogo de proveedores Model Studio — incluido como `modelstudio` (habilitado de forma predeterminada)
- Tiempo de ejecución del proveedor Moonshot — incluido como `moonshot` (habilitado de forma predeterminada)
- Catálogo de proveedores NVIDIA — incluido como `nvidia` (habilitado de forma predeterminada)
- Tiempo de ejecución del proveedor OpenAI: empaquetado como `openai` (habilitado de forma predeterminada; posee tanto `openai` como `openai-codex`)
- Capacidades del proveedor OpenCode Go: empaquetadas como `opencode-go` (habilitado de forma predeterminada)
- Capacidades del proveedor OpenCode Zen: empaquetadas como `opencode` (habilitado de forma predeterminada)
- Tiempo de ejecución del proveedor OpenRouter: empaquetado como `openrouter` (habilitado de forma predeterminada)
- Catálogo del proveedor Qianfan: empaquetado como `qianfan` (habilitado de forma predeterminada)
- Qwen OAuth (autenticación del proveedor + catálogo): empaquetado como `qwen-portal-auth` (habilitado de forma predeterminada)
- Catálogo del proveedor sintético: empaquetado como `synthetic` (habilitado de forma predeterminada)
- Catálogo del proveedor Together: empaquetado como `together` (habilitado de forma predeterminada)
- Catálogo del proveedor Venice: empaquetado como `venice` (habilitado de forma predeterminada)
- Catálogo del proveedor Vercel AI Gateway: empaquetado como `vercel-ai-gateway` (habilitado de forma predeterminada)
- Catálogo del proveedor Volcengine: empaquetado como `volcengine` (habilitado de forma predeterminada)
- Catálogo del proveedor Xiaomi + uso: empaquetado como `xiaomi` (habilitado de forma predeterminada)
- Tiempo de ejecución del proveedor Z.AI: empaquetado como `zai` (habilitado de forma predeterminada)
- Copilot Proxy (autenticación del proveedor) — puente local del proxy VS Code Copilot; distinto del inicio de sesión de dispositivo `github-copilot` incorporado (empaquetado, deshabilitado de forma predeterminada)

Los complementos nativos de OpenClaw son **módulos de TypeScript** cargados en tiempo de ejecución a través de jiti.
**La validación de la configuración no ejecuta el código del complemento**; en su lugar, utiliza el manifiesto del complemento
y JSON Schema. Consulte [Manifiesto del complemento](/es/plugins/manifest).

Los complementos nativos de OpenClaw pueden registrar:

- Métodos RPC de Gateway
- Rutas HTTP de Gateway
- Herramientas de agente
- Comandos de CLI
- Servicios en segundo plano
- Motores de contexto
- Flujos de autenticación del proveedor y catálogos de modelos
- Ganchos de tiempo de ejecución del proveedor para IDs de modelos dinámicos, normalización del transporte, metadatos de capacidad, ajuste de flujo, política de TTL de caché, sugerencias de autenticación faltante, supresión de modelos incorporados, aumento de catálogos, intercambio de autenticación en tiempo de ejecución, y resolución de autenticación de uso/facturación + instantáneas
- Validación de configuración opcional
- **Habilidades** (mediante la lista de directorios `skills` en el manifiesto del complemento)
- **Comandos de respuesta automática** (se ejecutan sin invocar al agente de IA)

Los complementos nativos de OpenClaw se ejecutan **en proceso** con la puerta de enlace (Gateway), por lo que se deben tratar como código de confianza.
Guía de creación de herramientas: [Herramientas de agente de complemento](/es/plugins/agent-tools).

## Ganchos de tiempo de ejecución del proveedor

Los complementos del proveedor ahora tienen dos capas:

- metadatos del manifiesto: `providerAuthEnvVars` para una búsqueda rápida de autenticación de entorno antes
  de la carga en tiempo de ejecución, más `providerAuthChoices` para etiquetas rápidas de incorporación/elección de autenticación
  y metadatos de indicadores CLI antes de la carga en tiempo de ejecución
- ganchos de tiempo de configuración: `catalog` / heredado `discovery`
- ganchos de tiempo de ejecución: `resolveDynamicModel`, `prepareDynamicModel`, `normalizeResolvedModel`, `capabilities`, `prepareExtraParams`, `wrapStreamFn`, `formatApiKey`, `refreshOAuth`, `buildAuthDoctorHint`, `isCacheTtlEligible`, `buildMissingAuthMessage`, `suppressBuiltInModel`, `augmentModelCatalog`, `isBinaryThinking`, `supportsXHighThinking`, `resolveDefaultThinkingLevel`, `isModernModelRef`, `prepareRuntimeAuth`, `resolveUsageAuth`, `fetchUsageSnapshot`

OpenClaw todavía posee el bucle de agente genérico, la conmutación por error, el manejo de transcripciones y la
política de herramientas. Estos ganchos son la unión para el comportamiento específico del proveedor sin
necesitar un transporte de inferencia personalizado completo.

Use el manifiesto `providerAuthEnvVars` cuando el proveedor tenga credenciales basadas en entorno
que las rutas genéricas de autenticación/estado/selector de modelos deberían ver sin cargar el tiempo de ejecución del complemento. Use el manifiesto `providerAuthChoices` cuando las superficies CLI de incorporación/elección de autenticación
deban conocer el id de elección del proveedor, las etiquetas de grupo y el cableado
simple de autenticación de un indicador sin cargar el tiempo de ejecución del proveedor. Mantenga el tiempo de ejecución del proveedor
`envVars` para sugerencias orientadas al operador, como etiquetas de incorporación o variables de configuración
de id de cliente/secreto de cliente de OAuth.

### Orden de los ganchos

Para los complementos de modelo/proveedor, OpenClaw usa los ganchos en este orden aproximado:

1. `catalog`
   Publicar configuración del proveedor en `models.providers` durante la
   generación de `models.json`.
2. búsqueda de modelo integrado/descubierto
   OpenClaw intenta primero la ruta normal de registro/catálogo.
3. `resolveDynamicModel`
   Respaldo síncrono para IDs de modelos propiedad del proveedor que aún no están en el
   registro local.
4. `prepareDynamicModel`
   Calentamiento asíncrono solo en rutas de resolución de modelos asíncronos, luego
   `resolveDynamicModel` se ejecuta nuevamente.
5. `normalizeResolvedModel`
   Reescritura final antes de que el ejecutor integrado use el modelo resuelto.
6. `capabilities`
   Metadatos de transcripción/herramientas propiedad del proveedor utilizados por la lógica central compartida.
7. `prepareExtraParams`
   Normalización de parámetros de solicitud propiedad del proveedor antes de los envoltorios de opciones de transmisión genéricos.
8. `wrapStreamFn`
   Envoltorio de transmisión propiedad del proveedor después de que se aplican los envoltorios genéricos.
9. `formatApiKey`
   Formateador de perfil de autenticación propiedad del proveedor que se usa cuando un perfil de autenticación almacenado necesita
   convertirse en la cadena `apiKey` de tiempo de ejecución.
10. `refreshOAuth`
    Sobrescritura de actualización de OAuth propiedad del proveedor para puntos de conexión de actualización personalizados o
    política de fallas de actualización.
11. `buildAuthDoctorHint`
    Sugerencia de reparación propiedad del proveedor agregada cuando falla la actualización de OAuth.
12. `isCacheTtlEligible`
    Política de caché de solicitudes propiedad del proveedor para proveedores de proxy/backhaul.
13. `buildMissingAuthMessage`
    Reemplazo propiedad del proveedor para el mensaje genérico de recuperación de autenticación faltante.
14. `suppressBuiltInModel`
    Supresión de modelo ascendente obsoleto propiedad del proveedor más sugerencia opcional de error
    orientada al usuario.
15. `augmentModelCatalog`
    Filas sintéticas/finales de catálogo propiedad del proveedor agregadas después del descubrimiento.
16. `isBinaryThinking`
    Interruptor de razonamiento activado/desactivado propiedad del proveedor para proveedores de pensamiento binario.
17. `supportsXHighThinking`
    Soporte de razonamiento `xhigh` propiedad del proveedor para modelos seleccionados.
18. `resolveDefaultThinkingLevel`
    Nivel `/think` predeterminado propiedad del proveedor para una familia de modelos específica.
19. `isModernModelRef`
    Comparador de modelos modernos propiedad del proveedor utilizado por filtros de perfiles en vivo y selección de pruebas rápidas (smoke).
20. `prepareRuntimeAuth`
    Intercambia una credencial configurada por el token/clave de tiempo de ejecución real justo antes de la inferencia.
21. `resolveUsageAuth`
    Resuelve las credenciales de uso/facturación para `/usage` y superficies de estado relacionadas.
22. `fetchUsageSnapshot`
    Obtiene y normaliza instantáneas de uso/cuota específicas del proveedor después de que se resuelve la autenticación.

### Qué gancho usar

- `catalog`: publicar la configuración del proveedor y los catálogos de modelos en `models.providers`
- `resolveDynamicModel`: manejar los IDs de modelo de paso a través (pass-through) o compatibilidad con versiones futuras que aún no están en el registro local
- `prepareDynamicModel`: calentamiento asíncrono antes de reintentar la resolución dinámica (por ejemplo, actualizar la caché de metadatos del proveedor)
- `normalizeResolvedModel`: reescribir el transporte/URL base/compat de un modelo resuelto antes de la inferencia
- `capabilities`: publicar peculiaridades de la familia de proveedores y de la transcripción/herramientas sin codificar IDs de proveedores en el núcleo
- `prepareExtraParams`: establecer valores predeterminados del proveedor o normalizar parámetros por modelo específicos del proveedor antes del ajuste de flujo genérico
- `wrapStreamFn`: agregar encabezados/carga útil/revisiones de compatibilidad de modelos específicos del proveedor mientras se sigue usando la ruta de ejecución normal `pi-ai`
- `formatApiKey`: convertir un perfil de autenticación almacenado en la cadena `apiKey` de tiempo de ejecución sin codificar blobs de token de proveedor en el núcleo
- `refreshOAuth`: gestionar la actualización de OAuth para proveedores que no se ajustan a los actualizadores `pi-ai` compartidos
- `buildAuthDoctorHint`: agregar orientación de reparación de autenticación propiedad del proveedor cuando falla la actualización
- `isCacheTtlEligible`: decidir si los pares proveedor/modelo deben usar metadatos de TTL de caché
- `buildMissingAuthMessage`: reemplazar el error genérico del almacén de autenticación con una sugerencia de recuperación específica del proveedor
- `suppressBuiltInModel`: ocultar filas obsoletas de origen y, opcionalmente, devolver un error propiedad del proveedor para fallos de resolución directa
- `augmentModelCatalog`: anexar filas de catálogo sintéticas/finales después del descubrimiento y la fusión de configuración
- `isBinaryThinking`: exponer UX de razonamiento binario encendido/apagado sin codificar los ids del proveedor en `/think`
- `supportsXHighThinking`: optar por modelos específicos en el nivel de razonamiento `xhigh`
- `resolveDefaultThinkingLevel`: mantener la política de razonamiento predeterminada del proveedor/modelo fuera del núcleo
- `isModernModelRef`: mantener las reglas de inclusión de familias de modelos en vivo/prueba con el proveedor
- `prepareRuntimeAuth`: intercambiar una credencial configurada por el token/clave de tiempo de ejecución de corta duración real utilizado para las solicitudes
- `resolveUsageAuth`: resolver credenciales propiedad del proveedor para endpoints de uso/facturación sin codificar el análisis de tokens en el núcleo
- `fetchUsageSnapshot`: encargarse de la obtención/análisis del endpoint de uso específico del proveedor mientras el núcleo mantiene el abanico y el formato del resumen

Regla general:

- el proveedor posee un catálogo o valores predeterminados de URL base: usar `catalog`
- el proveedor acepta ids de modelos ascendentes arbitrarios: usar `resolveDynamicModel`
- el proveedor necesita metadatos de red antes de resolver ids desconocidos: agregar `prepareDynamicModel`
- el proveedor necesita reescrituras de transporte pero aún usa un transporte central: usar `normalizeResolvedModel`
- el proveedor necesita peculiaridades de transcripción/familia del proveedor: usar `capabilities`
- el proveedor necesita parámetros de solicitud predeterminados o limpieza de parámetros por proveedor: usar `prepareExtraParams`
- el proveedor necesita contenedores de compatibilidad de encabezados/cuerpo/modelo de solicitud sin un transporte personalizado: usar `wrapStreamFn`
- el proveedor almacena metadatos adicionales en perfiles de autenticación y necesita una forma de token de tiempo de ejecución personalizada: usar `formatApiKey`
- el proveedor necesita un endpoint de actualización de OAuth personalizado o una política de falla de actualización: usar `refreshOAuth`
- el proveedor necesita orientación de reparación de autenticación propiedad del proveedor después de una falla de actualización: usar `buildAuthDoctorHint`
- el proveedor necesita control de TTL de caché específico del proxy: usar `isCacheTtlEligible`
- el proveedor necesita un consejo de recuperación de autenticación faltante específico del proveedor: usar `buildMissingAuthMessage`
- el proveedor necesita ocultar filas obsoletas de origen o reemplazarlas con una sugerencia del proveedor: use `suppressBuiltInModel`
- el proveedor necesita filas de compatibilidad progresiva sintéticas en `models list` y selectores: use `augmentModelCatalog`
- el proveedor solo expone pensamiento binario encendido/apagado: use `isBinaryThinking`
- el proveedor desea `xhigh` solo en un subconjunto de modelos: use `supportsXHighThinking`
- el proveedor posee la política predeterminada `/think` para una familia de modelos: use `resolveDefaultThinkingLevel`
- el proveedor gestiona la coincidencia de modelo preferido en vivo/prueba: use `isModernModelRef`
- el proveedor necesita un intercambio de tokens o una credencial de solicitud de corta duración: use `prepareRuntimeAuth`
- el proveedor necesita análisis de tokens de uso/cuota personalizado o una credencial de uso diferente: use `resolveUsageAuth`
- el proveedor necesita un punto final de uso específico del proveedor o un analizador de carga útil: use `fetchUsageSnapshot`

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

- Anthropic usa `resolveDynamicModel`, `capabilities`, `buildAuthDoctorHint`,
  `resolveUsageAuth`, `fetchUsageSnapshot`, `isCacheTtlEligible`,
  `resolveDefaultThinkingLevel`, y `isModernModelRef` porque posee la compatibilidad
  progresiva de Claude 4.6, sugerencias de familia de proveedores, guía de reparación de autenticación, integración
  del punto final de uso, elegibilidad de caché de solicitudes, y la política de pensamiento
  predeterminada/adaptativa de Claude.
- OpenAI usa `resolveDynamicModel`, `normalizeResolvedModel` y
  `capabilities` más `buildMissingAuthMessage`, `suppressBuiltInModel`,
  `augmentModelCatalog`, `supportsXHighThinking` y `isModernModelRef`
  porque posee la compatibilidad hacia adelante de GPT-5.4, la normalización
  directa de OpenAI `openai-completions` -> `openai-responses`, sugerencias de
  autenticación compatibles con Codex, supresión de Spark, filas sintéticas de
  listas de OpenAI y la política de pensamiento GPT-5 / modelo en vivo.
- OpenRouter usa `catalog` más `resolveDynamicModel` y
  `prepareDynamicModel` porque el proveedor es de paso y puede exponer
  nuevos identificadores de modelo antes de que se actualice el catálogo estático
  de OpenClaw.
- GitHub Copilot usa `catalog`, `auth`, `resolveDynamicModel` y
  `capabilities` más `prepareRuntimeAuth` y `fetchUsageSnapshot` porque
  necesita un inicio de sesión de dispositivo propiedad del proveedor, el
  comportamiento de reserva del modelo, peculiaridades de las transcripciones de
  Claude, un intercambio de token de GitHub -> token de Copilot y un punto de
  conexión de uso propiedad del proveedor.
- OpenAI Codex usa `catalog`, `resolveDynamicModel`,
  `normalizeResolvedModel`, `refreshOAuth` y `augmentModelCatalog` más
  `prepareExtraParams`, `resolveUsageAuth` y `fetchUsageSnapshot` porque
  todavía se ejecuta en los transportes principales de OpenAI pero posee su propia
  normalización de transporte/URL base, la política de reserva de actualización de
  OAuth, la elección de transporte predeterminada, las filas sintéticas del catálogo
  de Codex y la integración del punto de conexión de uso de ChatGPT.
- Google AI Studio y Gemini CLI OAuth usan `resolveDynamicModel` y
  `isModernModelRef` porque poseen la reserva de compatibilidad hacia
  adelante de Gemini 3.1 y la coincidencia de modelos modernos; Gemini CLI OAuth
  también usa `formatApiKey`, `resolveUsageAuth` y
  `fetchUsageSnapshot` para el formato de token, el análisis de token y la
  conexión del punto de conexión de cuota.
- OpenRouter usa `capabilities`, `wrapStreamFn` y `isCacheTtlEligible`
  para mantener los encabezados de solicitud específicos del proveedor, los metadatos de enrutamiento, los parches de razonamiento
  y la política de caché de prompts fuera del núcleo.
- Moonshot usa `catalog` más `wrapStreamFn` porque todavía usa el transporte
  compartido de OpenAI pero necesita la normalización del payload de pensamiento propiedad del proveedor.
- Kilocode usa `catalog`, `capabilities`, `wrapStreamFn` y
  `isCacheTtlEligible` porque necesita encabezados de solicitud propiedad del proveedor,
  normalización del payload de razonamiento, sugerencias de transcripción de Gemini y control
  de TTL de caché de Anthropic.
- Z.AI usa `resolveDynamicModel`, `prepareExtraParams`, `wrapStreamFn`,
  `isCacheTtlEligible`, `isBinaryThinking`, `isModernModelRef`,
  `resolveUsageAuth` y `fetchUsageSnapshot` porque es propietario del respaldo GLM-5,
  valores predeterminados de `tool_stream`, experiencia de usuario de pensamiento binario, coincidencia de modelos modernos y tanto
  la autenticación de uso como la obtención de cuotas.
- Mistral, OpenCode Zen y OpenCode Go usan `capabilities` solo para mantener
  las peculiaridades de transcripción/herramientas fuera del núcleo.
- Los proveedores agrupados solo de catálogo como `byteplus`, `cloudflare-ai-gateway`,
  `huggingface`, `kimi-coding`, `modelstudio`, `nvidia`, `qianfan`,
  `synthetic`, `together`, `venice`, `vercel-ai-gateway` y `volcengine` usan
  solo `catalog`.
- El portal Qwen usa `catalog`, `auth` y `refreshOAuth`.
- MiniMax y Xiaomi usan `catalog` más ganchos de uso porque su comportamiento de `/usage`
  es propiedad del complemento aunque la inferencia aún se ejecuta a través de los
  transportes compartidos.

## Canal de carga

Al iniciar, OpenClaw hace aproximadamente esto:

1. descubrir las raíces de los complementos candidatas
2. leer los manifiastos nativos o compatibles y los metadatos del paquete
3. rechazar candidatos no seguros
4. normalizar la configuración del complemento (`plugins.enabled`, `allow`, `deny`, `entries`,
   `slots`, `load.paths`)
5. decidir la habilitación para cada candidato
6. cargar los módulos nativos habilitados a través de jiti
7. llamar a los ganchos `register(api)` nativos y recopilar los registros en el registro de complementos
8. exponer el registro a las superficies de comandos/ejecución

Los mecanismos de seguridad ocurren **antes** de la ejecución en tiempo de ejecución. Los candidatos se bloquean
cuando la entrada sale de la raíz del complemento, la ruta es de escritura mundial, o la propiedad
de la ruta parece sospechosa para complementos no empaquetados.

### Comportamiento basado primero en el manifiesto

El manifiesto es la fuente de verdad del plano de control. OpenClaw lo utiliza para:

- identificar el complemento
- descubrir los canales/habilidades/esquema de configuración declarados o capacidades del paquete
- validar `plugins.entries.<id>.config`
- aumentar las etiquetas/marcadores de posición de la Interfaz de Control
- mostrar metadatos de instalación/catálogo

Para los complementos nativos, el módulo de tiempo de ejecución es la parte del plano de datos. Registra
el comportamiento real, como ganchos, herramientas, comandos o flujos de proveedores.

### Lo que el cargador almacena en caché

OpenClaw mantiene cachés breves en el proceso para:

- resultados del descubrimiento
- datos del registro de manifiestos
- registros de complementos cargados

Estas cachés reducen la carga de inicio y la sobrecarga de comandos repetidos. Es seguro
considerarlas como cachés de rendimiento de corta duración, no como persistencia.

## Asistentes de tiempo de ejecución

Los complementos pueden acceder a asistentes centrales seleccionados a través de `api.runtime`. Para telefonía TTS:

```ts
const result = await api.runtime.tts.textToSpeechTelephony({
  text: "Hello from OpenClaw",
  cfg: api.config,
});
```

Notas:

- Utiliza la configuración `messages.tts` central (OpenAI o ElevenLabs).
- Devuelve el búfer de audio PCM + la frecuencia de muestreo. Los complementos deben remuestrear/codificar para los proveedores.
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

- Utiliza la configuración de audio de comprensión multimedia central (`tools.media.audio`) y el orden de reserva del proveedor.
- Devuelve `{ text: undefined }` cuando no se produce ninguna salida de transcripción (por ejemplo, entrada omitida/no admitida).

## Rutas HTTP de la puerta de enlace

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

- `path`: ruta bajo el servidor HTTP de la puerta de enlace (gateway).
- `auth`: obligatorio. Use `"gateway"` para requerir la autenticación normal de la puerta de enlace, o `"plugin"` para la autenticación gestionada por el complemento / verificación de webhooks.
- `match`: opcional. `"exact"` (predeterminado) o `"prefix"`.
- `replaceExisting`: opcional. Permite que el mismo complemento reemplace su propio registro de ruta existente.
- `handler`: devuelva `true` cuando la ruta haya manejado la solicitud.

Notas:

- `api.registerHttpHandler(...)` está obsoleto. Use `api.registerHttpRoute(...)`.
- Las rutas de los complementos deben declarar `auth` explícitamente.
- Los conflictos exactos de `path + match` se rechazan a menos que `replaceExisting: true`, y un complemento no puede reemplazar la ruta de otro complemento.
- Las rutas superpuestas con diferentes niveles de `auth` se rechazan. Mantenga las cadenas de reserva de `exact`/`prefix` solo en el mismo nivel de autenticación.

## Rutas de importación del SDK de complementos

Use subrutas del SDK en lugar de la importación monolítica `openclaw/plugin-sdk` al
crear complementos:

- `openclaw/plugin-sdk/core` para las API genéricas de complementos, tipos de autenticación de proveedores y asistentes compartidos, como utilidades de enrutamiento/sesión y tiempos de ejecución respaldados por registradores.
- `openclaw/plugin-sdk/compat` para el código de complemento incluido/interno que necesite asistentes de tiempo de ejecución compartidos más amplios que `core`.
- `openclaw/plugin-sdk/telegram` para los tipos de complementos de canal de Telegram y asistentes compartidos orientados al canal. Los detalles internos de la implementación de Telegram integrada permanecen privados para la extensión incluida.
- `openclaw/plugin-sdk/discord` para los tipos de complementos de canal de Discord y asistentes compartidos orientados al canal. Los detalles internos de la implementación de Discord integrada permanecen privados para la extensión incluida.
- `openclaw/plugin-sdk/slack` para los tipos de complementos de canal de Slack y asistentes compartidos orientados al canal. Los detalles internos de la implementación de Slack integrada permanecen privados para la extensión incluida.
- `openclaw/plugin-sdk/signal` para los tipos de complementos del canal Signal y las asistentes compartidas orientadas al canal. Los detalles internos de la implementación de Signal integrada permanecen privados para la extensión empaquetada.
- `openclaw/plugin-sdk/imessage` para los tipos de complementos del canal iMessage y las asistentes compartidas orientadas al canal. Los detalles internos de la implementación de iMessage integrada permanecen privados para la extensión empaquetada.
- `openclaw/plugin-sdk/whatsapp` para los tipos de complementos del canal WhatsApp y las asistentes compartidas orientadas al canal. Los detalles internos de la implementación de WhatsApp integrada permanecen privados para la extensión empaquetada.
- `openclaw/plugin-sdk/line` para complementos del canal LINE.
- `openclaw/plugin-sdk/msteams` para la superficie del complemento de Microsoft Teams empaquetado.
- También están disponibles las subrutas específicas de la extensión empaquetada:
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

Los complementos de proveedor pueden definir catálogos de modelos para inferencia con
`registerProvider({ catalog: { run(...) { ... } } })`.

`catalog.run(...)` devuelve el mismo formato que OpenClaw escribe en
`models.providers`:

- `{ provider }` para una entrada de proveedor
- `{ providers }` para múltiples entradas de proveedor

Use `catalog` cuando el complemento posee ids de modelo específicos del proveedor, valores predeterminados de URL base o metadatos de modelo con puerta de autenticación.

`catalog.order` controla cuándo se fusiona el catálogo de un complemento en relación con los proveedores implícitos integrados de OpenClaw:

- `simple`: proveedores de API key simples o controlados por variables de entorno
- `profile`: proveedores que aparecen cuando existen perfiles de autenticación
- `paired`: proveedores que sintetizan múltiples entradas de proveedores relacionadas
- `late`: última pasada, después de otros proveedores implícitos

Los proveedores posteriores ganan en caso de colisión de claves, por lo que los complementos pueden anular intencionalmente una entrada de proveedor integrada con el mismo id de proveedor.

Compatibilidad:

- `discovery` todavía funciona como un alias heredado
- si se registran tanto `catalog` como `discovery`, OpenClaw usa `catalog`

Nota de compatibilidad:

- `openclaw/plugin-sdk` sigue siendo compatible con complementos externos existentes.
- Los complementos nuevos y migrados deben usar subrutas específicas del canal o la extensión; use `core` para superficies genéricas y `compat` solo cuando se necesiten asistentes compartidos más amplios.

## Inspección de canal de solo lectura

Si su complemento registra un canal, prefiera implementar
`plugin.config.inspectAccount(cfg, accountId)` junto con `resolveAccount(...)`.

Por qué:

- `resolveAccount(...)` es la ruta de ejecución. Se permite asumir que las credenciales
  están totalmente materializadas y puede fallar rápido cuando faltan los secretos requeridos.
- Las rutas de comandos de solo lectura como `openclaw status`, `openclaw status --all`,
  `openclaw channels status`, `openclaw channels resolve` y los flujos de reparación de doctor/config
  no deberían necesitar materializar las credenciales de ejecución solo para
  describir la configuración.

Comportamiento recomendado de `inspectAccount(...)`:

- Devuelva solo el estado descriptivo de la cuenta.
- Conserve `enabled` y `configured`.
- Incluya campos de origen/estado de credenciales cuando sea relevante, como:
  - `tokenSource`, `tokenStatus`
  - `botTokenSource`, `botTokenStatus`
  - `appTokenSource`, `appTokenStatus`
  - `signingSecretSource`, `signingSecretStatus`
- No necesita devolver valores de token brutos solo para informar la disponibilidad de solo lectura. Devolver `tokenStatus: "available"` (y el campo fuente coincidente) es suficiente para los comandos de tipo de estado.
- Use `configured_unavailable` cuando una credencial está configurada a través de SecretRef pero no disponible en la ruta de comando actual.

Esto permite que los comandos de solo lectura informen "configurado pero no disponible en esta ruta de comando" en lugar de bloquearse o informar incorrectamente que la cuenta no está configurada.

Nota de rendimiento:

- El descubrimiento de complementos y los metadatos del manifiesto usan cachés en proceso cortos para reducir el trabajo de inicio/recarga repentino.
- Establezca `OPENCLAW_DISABLE_PLUGIN_DISCOVERY_CACHE=1` o
  `OPENCLAW_DISABLE_PLUGIN_MANIFEST_CACHE=1` para deshabilitar estas cachés.
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

4. Extensiones incluidas (enviadas con OpenClaw; activadas/desactivadas por defecto mixtas)

- `<openclaw>/extensions/*`

Muchos complementos de proveedor incluidos están habilitados por defecto para que los catálogos de modelos/ganchos de tiempo de ejecución permanezcan disponibles sin configuración adicional. Otros aún requieren habilitación explícita a través de `plugins.entries.<id>.enabled` o
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
- `minimax`
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
- complemento de ranura de memoria activa (ranura predeterminada: `memory-core`)

Los complementos instalados están habilitados de forma predeterminada, pero se pueden deshabilitar de la misma manera.

Los complementos del espacio de trabajo están **deshabilitados de forma predeterminada** a menos que los habilite explícitamente
o los agregue a una lista de permitidos. Esto es intencional: un repositorio verificado no debería convertirse silenciosamente
en código de puerta de enlace de producción.

Notas de endurecimiento:

- Si `plugins.allow` está vacío y los complementos no agrupados son detectables, OpenClaw registra una advertencia de inicio con los identificadores y fuentes de los complementos.
- Las rutas candidatas se verifican por seguridad antes de la admisión de detección. OpenClaw bloquea los candidatos cuando:
  - la entrada de la extensión se resuelve fuera de la raíz del complemento (incluyendo escapes de enlace simbólico/recorrido de ruta),
  - la ruta raíz/fuente del complemento es de escritura mundial,
  - la propiedad de la ruta es sospechosa para complementos no agrupados (el propietario POSIX no es el uid actual ni root).
- Los complementos no agrupados cargados sin procedencia de instalación/ruta de carga emiten una advertencia para que pueda anclar la confianza (`plugins.allow`) o el seguimiento de instalación (`plugins.installs`).

Cada complemento nativo de OpenClaw debe incluir un archivo `openclaw.plugin.json` en su
raíz. Si una ruta apunta a un archivo, la raíz del complemento es el directorio del archivo y
debe contener el manifiesto.

Los paquetes compatibles pueden proporcionar en su lugar uno de:

- `.codex-plugin/plugin.json`
- `.claude-plugin/plugin.json`

Los directorios de paquetes se descubren desde las mismas raíces que los complementos nativos.

Si varios complementos se resuelven al mismo id, la primera coincidencia en el orden anterior
gana y se ignoran las copias de menor precedencia.

Eso significa:

- los complementos del espacio de_workspace ensombrecen intencionalmente los complementos agrupados con el mismo id
- `plugins.allow: ["foo"]` autoriza el complemento `foo` activo por id, incluso cuando
  la copia activa proviene del espacio de trabajo en lugar de la raíz de la extensión agrupada
- si necesita un control más estricto del origen, use rutas de instalación/carga explícitas e
  inspeccione el código fuente del plugin resuelto antes de habilitarlo

### Reglas de habilitación

La habilitación se resuelve después del descubrimiento:

- `plugins.enabled: false` deshabilita todos los plugins
- `plugins.deny` siempre tiene prioridad
- `plugins.entries.<id>.enabled: false` deshabilita ese plugin
- los plugins de origen del espacio de trabajo (workspace) están deshabilitados de forma predeterminada
- las listas permitidas (allowlists) restringen el conjunto activo cuando `plugins.allow` no está vacío
- las listas permitidas son **basadas en ID**, no basadas en origen
- los plugins empaquetados están deshabilitados de forma predeterminada a menos que:
  - el ID empaquetado esté en el conjunto predeterminado activado, o
  - lo habilite explícitamente, o
  - la configuración del canal habilita implícitamente el plugin del canal empaquetado
- las ranuras exclusivas (exclusive slots) pueden forzar la habilitación del plugin seleccionado para esa ranura

En el núcleo (core) actual, los IDs empaquetados activados por defecto incluyen los asistentes local/provider de
arriba más el plugin de ranura de memoria activa.

### Paquetes (Package packs)

Un directorio de plugins puede incluir un `package.json` con `openclaw.extensions`:

```json
{
  "name": "my-pack",
  "openclaw": {
    "extensions": ["./src/safety.ts", "./src/tools.ts"],
    "setupEntry": "./src/setup-entry.ts"
  }
}
```

Cada entrada se convierte en un plugin. Si el paquete enumera múltiples extensiones, el ID del plugin
se convierte en `name/<fileBase>`.

Si su plugin importa dependencias npm, instálelas en ese directorio para que
`node_modules` esté disponible (`npm install` / `pnpm install`).

Salvaguarda de seguridad: cada entrada `openclaw.extensions` debe permanecer dentro del directorio del plugin
después de la resolución de enlaces simbólicos. Las entradas que salen del directorio del paquete son
rechazadas.

Nota de seguridad: `openclaw plugins install` instala las dependencias del plugin con
`npm install --ignore-scripts` (sin scripts de ciclo de vida). Mantenga los árboles de dependencia del plugin como
"JS/TS puro" y evite paquetes que requieran compilaciones `postinstall`.

Opcional: `openclaw.setupEntry` puede apuntar a un módulo ligero solo de configuración.
Cuando OpenClaw necesita superficies de configuración para un plugin de canal deshabilitado, o
cuando un plugin de canal está habilitado pero aún sin configurar, carga `setupEntry`
en lugar de la entrada completa del plugin. Esto mantiene el inicio y la configuración más ligeros
cuando su entrada principal del plugin también conecta herramientas, ganchos u otro código
de solo tiempo de ejecución.

Opcional: `openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen`
puede optar a que un plugin de canal tome el mismo `setupEntry` path durante la fase de inicio
previa a la escucha del gateway, incluso cuando el canal ya esté configurado.

Use esto solo cuando `setupEntry` cubra completamente la superficie de inicio que debe existir
antes de que el gateway comience a escuchar. En la práctica, esto significa que la entrada de configuración (setup entry)
debe registrar cada capacidad propiedad del canal de la que dependa el inicio, tales como:

- el propio registro del canal
- cualquier ruta HTTP que debe estar disponible antes de que el gateway comience a escuchar
- cualquier método, herramienta o servicio del gateway que deba existir durante esa misma ventana

Si su entrada completa todavía posee alguna capacidad de inicio requerida, no active
esta bandera. Mantenga el plugin en el comportamiento predeterminado y deje que OpenClaw cargue la
entrada completa durante el inicio.

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

Los plugins de canal pueden anunciar metadatos de configuración/descubrimiento a través de `openclaw.channel` y
sugerencias de instalación a través de `openclaw.install`. Esto mantiene el catálogo principal libre de datos.

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
del registro MPM). Suelte un archivo JSON en uno de:

- `~/.openclaw/mpm/plugins.json`
- `~/.openclaw/mpm/catalog.json`
- `~/.openclaw/plugins/catalog.json`

O apunte `OPENCLAW_PLUGIN_CATALOG_PATHS` (o `OPENCLAW_MPM_CATALOG_PATHS`) a
uno o más archivos JSON (delimitados por comas/punto y coma/`PATH`). Cada archivo debe
contener `{ "entries": [ { "name": "@scope/pkg", "openclaw": { "channel": {...}, "install": {...} } } ] }`.

## IDs de Plugins

IDs de plugins predeterminados:

- Paquetes de paquetes: `package.json` `name`
- Archivo independiente: nombre base del archivo (`~/.../voice-call.ts` → `voice-call`)

Si un plugin exporta `id`, OpenClaw lo usa pero advierte cuando no coincide con el
id configurado.

## Modelo de registro

Los plugins cargados no mutan directamente las variables globales principales aleatorias. Se registran en un
registro central de plugins.

El registro rastrea:

- registros de plugins (identidad, fuente, origen, estado, diagnósticos)
- herramientas
- hooks heredados y hooks tipados
- canales
- proveedores
- manejadores RPC del gateway
- rutas HTTP
- registradores de CLI
- servicios en segundo plano
- comandos propiedad del plugin

Las funciones principales luego leen de ese registro en lugar de comunicarse con los módulos de complementos
directamente. Esto mantiene la carga en una sola dirección:

- módulo de complemento -> registro de registro
- tiempo de ejecución principal -> consumo del registro

Esa separación es importante para el mantenimiento. Significa que la mayoría de las superficies principales solo
necesitan un punto de integración: "leer el registro", no "casos especiales para cada módulo de
complemento".

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
- `deny`: lista de bloqueados (opcional; denegar gana)
- `load.paths`: archivos/dirs de complementos extra
- `slots`: selectores de ranura exclusivos como `memory` y `contextEngine`
- `entries.<id>`: interruptores por complemento + configuración

Los cambios de configuración **requieren un reinicio de la puerta de enlace**.

Reglas de validación (estrictas):

- Los ids de complementos desconocidos en `entries`, `allow`, `deny` o `slots` son **errores**.
- Las claves `channels.<id>` desconocidas son **errores** a menos que un manifiesto de complemento declare
  el id del canal.
- La configuración del complemento nativo se valida usando el JSON Schema incrustado en
  `openclaw.plugin.json` (`configSchema`).
- Los paquetes compatibles actualmente no exponen esquemas de configuración nativos de OpenClaw.
- Si un complemento está deshabilitado, su configuración se conserva y se emite una **advertencia**.

### Deshabilitado vs. faltante vs. no válido

Estos estados son intencionalmente diferentes:

- **deshabilitado**: el complemento existe, pero las reglas de habilitación lo desactivaron
- **faltante**: la configuración hace referencia a un id de complemento que el descubrimiento no encontró
- **no válido**: el complemento existe, pero su configuración no coincide con el esquema declarado

OpenClaw conserva la configuración de los complementos deshabilitados para que volver a activarlos no sea
destructivo.

## Ranuras de complementos (categorías exclusivas)

Algunas categorías de complementos son **exclusivas** (solo una activa a la vez). Use
`plugins.slots` para seleccionar qué complemento posee la ranura:

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

Ranuras exclusivas compatibles:

- `memory`: complemento de memoria activa (`"none"` deshabilita los complementos de memoria)
- `contextEngine`: complemento del motor de contexto activo (`"legacy"` es el predeterminado integrado)

Si varios complementos declaran `kind: "memory"` o `kind: "context-engine"`, solo
se carga el complemento seleccionado para esa ranura. Los demás se deshabilitan con diagnósticos.

### Complementos del motor de contexto

Los complementos del motor de contexto poseen la orquestación del contexto de la sesión para ingestión, ensamblaje
y compactación. Regístrelos desde su complemento con
`api.registerContextEngine(id, factory)`, luego seleccione el motor activo con
`plugins.slots.contextEngine`.

Use esto cuando su complemento necesite reemplazar o extender la canalización de contexto predeterminada
en lugar de simplemente agregar búsqueda de memoria o ganchos.

## Interfaz de usuario de control (esquema + etiquetas)

La interfaz de usuario de control usa `config.schema` (JSON Schema + `uiHints`) para renderizar mejores formularios.

OpenClaw aumenta `uiHints` en tiempo de ejecución basándose en los complementos descubiertos:

- Agrega etiquetas por complemento para `plugins.entries.<id>` / `.enabled` / `.config`
- Fusiona sugerencias opcionales de campos de configuración proporcionadas por el complemento bajo:
  `plugins.entries.<id>.config.<field>`

Si desea que los campos de configuración de su complemento muestren buenas etiquetas/marcadores de posición (y marcar secretos como sensibles),
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
Si los metadatos de integridad almacenados cambian entre actualizaciones, OpenClaw advierte y pide confirmación (use el global `--yes` para omitir las preguntas).

Los complementos también pueden registrar sus propios comandos de nivel superior (ejemplo: `openclaw voicecall`).

## API de complementos (descripción general)

Los complementos exportan:

- Una función: `(api) => { ... }`
- Un objeto: `{ id, name, configSchema, register(api) { ... } }`

`register(api)` es donde los complementos adjuntan comportamiento. Los registros comunes incluyen:

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
- Las reglas de elegibilidad de ganchos todavía se aplican (requisitos de SO/bins/env/config).
- Los ganchos administrados por complementos aparecen en `openclaw hooks list` con `plugin:<id>`.
- No puede habilitar/deshabilitar los ganchos administrados por complementos a través de `openclaw hooks`; en su lugar, habilite/deshabilite el complemento.

### Ganchos del ciclo de vida del agente (`api.on`)

Para los ganchos del ciclo de vida del tiempo de ejecución tipados, use `api.on(...)`:

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

Ganchos importantes para la construcción de avisos (prompts):

- `before_model_resolve`: se ejecuta antes de la carga de la sesión (`messages` no están disponibles). Use esto para anular de manera determinista `modelOverride` o `providerOverride`.
- `before_prompt_build`: se ejecuta después de la carga de la sesión (`messages` están disponibles). Use esto para dar forma a la entrada del aviso (prompt).
- `before_agent_start`: gancho de compatibilidad heredada. Prefiera los dos ganchos explícitos anteriores.

Política de gancho aplicada por el núcleo:

- Los operadores pueden deshabilitar los ganchos de mutación de aviso por complemento a través de `plugins.entries.<id>.hooks.allowPromptInjection: false`.
- Cuando se deshabilitan, OpenClaw bloquea `before_prompt_build` e ignora los campos de mutación de aviso devueltos desde el `before_agent_start` heredado mientras preserva los `modelOverride` y `providerOverride` heredados.

Campos de resultado de `before_prompt_build`:

- `prependContext`: anteponde texto al prompt del usuario para esta ejecución. Es mejor para contenido específico del turno o dinámico.
- `systemPrompt`: anulación completa del prompt del sistema.
- `prependSystemContext`: anteponde texto al prompt del sistema actual.
- `appendSystemContext`: añade texto al final del prompt del sistema actual.

Orden de construcción del prompt en el entorno de ejecución integrado:

1. Aplicar `prependContext` al prompt del usuario.
2. Aplicar la anulación `systemPrompt` cuando se proporciona.
3. Aplicar `prependSystemContext + current system prompt + appendSystemContext`.

Notas sobre fusión y precedencia:

- Los manejadores de "hooks" se ejecutan por prioridad (primero los más altos).
- Para los campos de contexto fusionados, los valores se concatenan en orden de ejecución.
- Los valores de `before_prompt_build` se aplican antes que los valores de respaldo heredados `before_agent_start`.

Guía de migración:

- Mueva la guía estática de `prependContext` a `prependSystemContext` (o `appendSystemContext`) para que los proveedores puedan cachear el contenido estable del prefijo del sistema.
- Mantenga `prependContext` para el contexto dinámico por turno que debe permanecer vinculado al mensaje del usuario.

## Complementos de proveedor (autenticación de modelo)

Los complementos pueden registrar **proveedores de modelos** para que los usuarios puedan realizar la configuración de OAuth o claves de API dentro de OpenClaw, mostrar la configuración del proveedor en la incorporación/selectores de modelos y contribuir al descubrimiento implícito de proveedores.

Los complementos de proveedor son la costura de extensión modular para la configuración de proveedores de modelos. Ya no son solo "ayudantes de OAuth".

### Ciclo de vida del complemento de proveedor

Un complemento de proveedor puede participar en cinco fases distintas:

1. **Auth** (Autenticación)
   `auth[].run(ctx)` realiza OAuth, captura de clave de API, código de dispositivo o configuración
   personalizada y devuelve perfiles de autenticación más parches de configuración opcionales.
2. **Configuración no interactiva**
   `auth[].runNonInteractive(ctx)` maneja `openclaw onboard --non-interactive`
   sin avisos. Use esto cuando el proveedor necesite una configuración personalizada sin cabeza más allá de las rutas simples de clave de API integradas.
3. **Integración con el asistente**
   `wizard.setup` añade una entrada a `openclaw onboard`.
   `wizard.modelPicker` añade una entrada de configuración al selector de modelos.
4. **Descubrimiento implícito**
   `discovery.run(ctx)` puede contribuir automáticamente con la configuración del proveedor durante
   la resolución/listado de modelos.
5. **Seguimiento posterior a la selección**
   `onModelSelected(ctx)` se ejecuta después de que se elige un modelo. Úselo para tareas
   específicas del proveedor, como descargar un modelo local.

Esta es la división recomendada porque estas fases tienen diferentes requisitos de
ciclo de vida:

- la autenticación es interactiva y escribe credenciales/configuración
- la configuración no interactiva se impulsa mediante marcadores/variables de entorno y no debe solicitar información
- los metadatos del asistente son estáticos y orientados a la interfaz de usuario
- el descubrimiento debe ser seguro, rápido y tolerante a fallos
- los enlaces de post-selección son efectos secundarios vinculados al modelo elegido

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
4. aplica opcionalmente el modelo predeterminado
5. ejecuta el enlace `onModelSelected` del proveedor cuando corresponda

Eso significa que un complemento de proveedor es propietario de la lógica de configuración específica del proveedor, mientras que el núcleo
es propietario de la ruta genérica de persistencia y fusión de configuración.

### Contrato no interactivo del proveedor

`auth[].runNonInteractive(ctx)` es opcional. Implementelo cuando el proveedor
necesite una configuración sin cabeza que no pueda expresarse a través de los flujos de
clave de API genéricos integrados.

El contexto no interactivo incluye:

- la configuración actual y base
- opciones de CLI de incorporación analizadas
- asistentes de registro/errores de tiempo de ejecución
- directorios de agente/espacio de trabajo para que el proveedor pueda persistir la autenticación en el mismo almacén
  con alcance utilizado por el resto de la incorporación
- `resolveApiKey(...)` para leer claves de proveedor desde marcadores, variables de entorno o perfiles de autenticación
  existentes mientras se respeta `--secret-input-mode`
- `toApiKeyCredential(...)` para convertir una clave resuelta en una credencial de perfil de autenticación
  con el almacenamiento adecuado de texto plano vs referencia secreta

Utilice esta superficie para proveedores tales como:

- runtimes compatibles con OpenAI autoalojados que necesitan `--custom-base-url` +
  `--custom-model-id`
- verificación no interactiva específica del proveedor o síntesis de configuración

No solicite desde `runNonInteractive`. Rechace las entradas faltantes con errores
accinables en su lugar.

### Metadatos del asistente del proveedor

Los metadatos de autenticación/incorporación del proveedor pueden residir en dos capas:

- manifiesto `providerAuthChoices`: etiquetas económicas, agrupación, ids `--auth-choice`
  y metadatos simples de indicadores de CLI disponibles antes de la carga del runtime
- runtime `wizard.setup` / `auth[].wizard`: comportamiento más rico que depende de
  código de proveedor cargado

Use metadatos de manifiesto para etiquetas/indicadores estáticos. Use metadatos del asistente en tiempo de ejecución cuando
la configuración dependa de métodos de autenticación dinámicos, método alternativo o validación en tiempo de ejecución.

`wizard.setup` controla cómo aparece el proveedor en la incorporación agrupada:

- `choiceId`: valor de elección de autenticación
- `choiceLabel`: etiqueta de opción
- `choiceHint`: pista corta
- `groupId`: id de grupo
- `groupLabel`: etiqueta de grupo
- `groupHint`: pista de grupo
- `methodId`: método de autenticación para ejecutar
- `modelAllowlist`: política de lista blanca posterior a la autenticación opcional (`allowedKeys`, `initialSelections`, `message`)

`wizard.modelPicker` controla cómo aparece un proveedor como una entrada "configurar esto ahora"
en la selección del modelo:

- `label`
- `hint`
- `methodId`

Cuando un proveedor tiene múltiples métodos de autenticación, el asistente puede apuntar a un
método explícito o dejar que OpenClaw sintetice elecciones por método.

OpenClaw valida los metadatos del asistente del proveedor cuando el complemento se registra:

- se rechazan los ids de método de autenticación duplicados o en blanco
- se ignoran los metadatos del asistente cuando el proveedor no tiene métodos de autenticación
- los enlaces `methodId` no válidos se degradan a advertencias y recurren a los
  métodos de autenticación restantes del proveedor

### Contrato de descubrimiento del proveedor

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
- un asistente para resolver la clave de API del proveedor y un valor de clave de API seguro para el descubrimiento

El descubrimiento debe ser:

- rápido
- mejor esfuerzo posible (best-effort)
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

- `simple` para un descubrimiento económico solo de entorno
- `profile` cuando el descubrimiento depende de perfiles de autenticación
- `paired` para proveedores que necesitan coordinarse con otro paso de descubrimiento
- `late` para sondeos costosos o de red local

La mayoría de los proveedores autohospedados deberían usar `late`.

### Buenos límites de complementos de proveedor

Buen ajuste para los complementos de proveedor:

- proveedores locales/autohospedados con flujos de configuración personalizados
- inicio de sesión OAuth/código de dispositivo específico del proveedor
- descubrimiento implícito de servidores de modelos locales
- efectos secundarios posteriores a la selección, como extracciones de modelos

Menos ajuste convincente:

- proveedores triviales solo de clave de API que difieren solo por variable de entorno, URL base y un
  modelo predeterminado

Estos aún pueden convertirse en complementos, pero la principal ventaja de modularidad proviene de
extraer primero proveedores ricos en comportamiento.

Registre un proveedor a través de `api.registerProvider(...)`. Cada proveedor expone uno
o más métodos de autenticación (OAuth, clave de API, código de dispositivo, etc.). Esos métodos pueden
activar:

- `openclaw models auth login --provider <id> [--method <id>]`
- `openclaw onboard`
- entradas de configuración de “proveedor personalizado” del selector de modelos
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
    setup: {
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

- `run` recibe un `ProviderAuthContext` con el estado de los ayudantes `prompter`, `runtime`,
  `openUrl`, `oauth.createVpsAwareHandlers`, `secretInputMode` y
  `allowSecretRefPrompt`. Los flujos de incorporación/configuración pueden usar
  estos para respetar `--secret-input-mode` u ofrecer captura de secret-ref env/file/exec,
  mientras que `openclaw models auth` mantiene una superficie de prompt más ajustada.
- `runNonInteractive` recibe un `ProviderAuthMethodNonInteractiveContext`
  con los ayudantes `opts`, `agentDir`, `resolveApiKey` y `toApiKeyCredential`
  para la incorporación sin cabeza.
- Devuelva `configPatch` cuando necesite agregar modelos predeterminados o configuración del proveedor.
- Devuelva `defaultModel` para que `--set-default` pueda actualizar los valores predeterminados del agente.
- `wizard.setup` agrega una opción de proveedor a las superficies de incorporación, tales como
  `openclaw onboard` / `openclaw setup --wizard`.
- `wizard.setup.modelAllowlist` permite al proveedor limitar el prompt de la lista de permitidos
  del modelo de seguimiento durante la incorporación/configuración.
- `wizard.modelPicker` agrega una entrada "configurar este proveedor" al selector de modelos.
- `deprecatedProfileIds` permite al proveedor poseer la limpieza de `openclaw doctor` para
  los ids de perfiles de autenticación retirados.
- `discovery.run` devuelve `{ provider }` para el id de proveedor propio del complemento
  o `{ providers }` para el descubrimiento de múltiples proveedores.
- `discovery.order` controla cuándo se ejecuta el proveedor en relación con las fases
  de descubrimiento integradas: `simple`, `profile`, `paired` o `late`.
- `onModelSelected` es el hook posterior a la selección para el trabajo de seguimiento
  específico del proveedor, como extraer un modelo local.

### Registrar un canal de mensajería

Los complementos pueden registrar **channel plugins** que se comportan como canales integrados
(WhatsApp, Telegram, etc.). La configuración del canal se encuentra en `channels.<id>` y es
validada por el código de tu complemento de canal.

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

- Pon la configuración en `channels.<id>` (no en `plugins.entries`).
- `meta.label` se usa para las etiquetas en las listas de CLI/UI.
- `meta.aliases` añade ids alternativos para la normalización y entradas de CLI.
- `meta.preferOver` lista los ids de canales para omitir la activación automática cuando ambos están configurados.
- `meta.detailLabel` y `meta.systemImage` permiten que las UI muestren etiquetas/iconos de canal más enriquecidos.

### Ganchos de configuración del canal

División de configuración preferida:

- `plugin.setup` se encarga de la normalización del id de cuenta, la validación y la escritura de la configuración.
- `plugin.setupWizard` permite al host ejecutar el flujo común del asistente mientras que el canal solo suministra el estado, las credenciales, la lista de permitidos de DM y los descriptores de acceso al canal.

`plugin.setupWizard` es mejor para los canales que se ajustan al patrón compartido:

- un selector de cuenta impulsado por `plugin.config.listAccountIds`
- paso opcional de verificación previa/preparación antes de solicitar (por ejemplo, trabajo de instalador/inicialización)
- solicitud opcional de atajo de entorno para conjuntos de credenciales empaquetados (por ejemplo, tokens de bot/aplicación emparejados)
- una o más solicitudes de credenciales, donde cada paso escribe a través de `plugin.setup.applyAccountConfig` o un parche parcial propiedad del canal
- solicitudes opcionales de texto no secreto (por ejemplo, rutas de CLI, URLs base, ids de cuenta)
- solicitudes opcionales de lista de permitidos de acceso a canal/grupo resueltas por el host
- resolución opcional de lista de permitidos de DM (por ejemplo, `@username` -> id numérico)
- nota opcional de finalización después de que termine la configuración

### Escribir un nuevo canal de mensajería (paso a paso)

Usa esto cuando quieras una **nueva superficie de chat** (un "canal de mensajería"), no un proveedor de modelo.
La documentación del proveedor de modelo se encuentra en `/providers/*`.

1. Elige un id + forma de configuración

- Toda la configuración del canal se encuentra en `channels.<id>`.
- Prefiere `channels.<id>.accounts.<accountId>` para configuraciones de varias cuentas.

2. Define los metadatos del canal

- `meta.label`, `meta.selectionLabel`, `meta.docsPath`, `meta.blurb` controlan las listas de CLI/UI.
- `meta.docsPath` debe apuntar a una página de documentación como `/channels/<id>`.
- `meta.preferOver` permite que un complemento reemplace otro canal (la habilitación automática lo prefiere).
- `meta.detailLabel` y `meta.systemImage` son utilizados por las interfaces de usuario para el texto de detalle/iconos.

3. Implementar los adaptadores requeridos

- `config.listAccountIds` + `config.resolveAccount`
- `capabilities` (tipos de chat, medios, hilos, etc.)
- `outbound.deliveryMode` + `outbound.sendText` (para envío básico)

4. Añadir adaptadores opcionales según sea necesario

- `setup` (validación + escrituras de configuración), `setupWizard` (asistente propiedad del host), `security` (política DM), `status` (salud/diagnósticos)
- `gateway` (iniciar/detener/iniciar sesión), `mentions`, `threading`, `streaming`
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

### Registrar comandos CLI

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

- `name`: Nombre del comando (sin el `/` inicial)
- `nativeNames`: Alias de comandos nativos opcionales para superficies de barra/menú. Use `default` para todos los proveedores nativos, o claves específicas del proveedor como `discord`
- `description`: Texto de ayuda mostrado en las listas de comandos
- `acceptsArgs`: Si el comando acepta argumentos (predeterminado: false). Si es false y se proporcionan argumentos, el comando no coincidirá y el mensaje pasará a otros controladores
- `requireAuth`: Si se requiere remitente autorizado (predeterminado: true)
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
- El registro de comandos duplicados en diferentes complementos fallará con un error de diagnóstico

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
- Comandos de CLI: kebab o camel, pero evite conflictos con los comandos principales

## Habilidades

Los complementos pueden incluir una habilidad en el repositorio (`skills/<name>/SKILL.md`).
Actívela con `plugins.entries.<id>.enabled` (u otros indicadores de configuración) y asegúrese
de que esté presente en sus ubicaciones de espacio de trabajo/habilidades administradas.

## Distribución (npm)

Empaquetado recomendado:

- Paquete principal: `openclaw` (este repositorio)
- Plugins: paquetes npm separados bajo `@openclaw/*` (ejemplo: `@openclaw/voice-call`)

Contrato de publicación:

- El plugin `package.json` debe incluir `openclaw.extensions` con uno o más archivos de entrada.
- Opcional: `openclaw.setupEntry` puede apuntar a una entrada ligera solo de configuración para canales deshabilitados o aún sin configurar.
- Opcional: `openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen` puede optar a que un plugin de canal use `setupEntry` durante el inicio de la puerta de enlace previa a la escucha, pero solo cuando esa entrada de configuración cubra completamente la superficie crítica de inicio del plugin.
- Los archivos de entrada pueden ser `.js` o `.ts` (jiti carga TS en tiempo de ejecución).
- `openclaw plugins install <npm-spec>` usa `npm pack`, extrae en `~/.openclaw/extensions/<id>/` y lo habilita en la configuración.
- Estabilidad de la clave de configuración: los paquetes con ámbito se normalizan al id **sin ámbito** para `plugins.entries.*`.

## Ejemplo de plugin: Llamada de voz

Este repositorio incluye un plugin de llamada de voz (Twilio o respaldo de registro):

- Fuente: `extensions/voice-call`
- Habilidad: `skills/voice-call`
- CLI: `openclaw voicecall start|status`
- Herramienta: `voice_call`
- RPC: `voicecall.start`, `voicecall.status`
- Configuración (twilio): `provider: "twilio"` + `twilio.accountSid/authToken/from` (opcional `statusCallbackUrl`, `twimlUrl`)
- Configuración (desarrollo): `provider: "log"` (sin red)

Consulte [Llamada de voz](/es/plugins/voice-call) y `extensions/voice-call/README.md` para la configuración y el uso.

## Notas de seguridad

Los plugins se ejecutan en el mismo proceso que la puerta de enlace (Gateway). Trátelos como código confiable:

- Solo instale plugins en los que confíe.
- Prefiera listas de permitidos de `plugins.allow`.
- Recuerde que `plugins.allow` se basa en id, por lo que un plugin de espacio de trabajo habilitado puede
  intencionalmente hacer sombra a un plugin incluido con el mismo id.
- Reinicie la puerta de enlace (Gateway) después de realizar cambios.

## Prueba de plugins

Los plugins pueden (y deben) incluir pruebas:

- Los plugins en el repositorio pueden mantener pruebas de Vitest bajo `src/**` (ejemplo: `src/plugins/voice-call.plugin.test.ts`).
- Los plugins publicados por separado deben ejecutar su propia CI (lint/build/test) y validar que `openclaw.extensions` apunte al punto de entrada construido (`dist/index.js`).

import es from "/components/footer/es.mdx";

<es />
