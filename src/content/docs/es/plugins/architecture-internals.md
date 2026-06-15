---
summary: "Aspectos internos de la arquitectura de plugins: canalización de carga, registro, ganchos de tiempo de ejecución, rutas HTTP y tablas de referencia"
read_when:
  - Implementing provider runtime hooks, channel lifecycle, or package packs
  - Debugging plugin load order or registry state
  - Adding a new plugin capability or context engine plugin
title: "Aspectos internos de la arquitectura de plugins"
---

Para el modelo de capacidad pública, formas de complementos y contratos de
propiedad/ejecución, consulte [Arquitectura de complementos](/es/plugins/architecture). Esta página es la
referencia para los mecanismos internos: canalización de carga (load pipeline), registro, ganchos de ejecución (runtime hooks),
rutas HTTP de Gateway, rutas de importación y tablas de esquema.

## Canalización de carga

Al iniciarse, OpenClaw hace aproximadamente esto:

1. descubrir las raíces de los plugins candidatos
2. leer los manifiestos de paquetes nativos o compatibles y los metadatos del paquete
3. rechazar candidatos no seguros
4. normalizar la configuración del plugin (`plugins.enabled`, `allow`, `deny`, `entries`,
   `slots`, `load.paths`)
5. decidir la habilitación de cada candidato
6. cargar módulos nativos habilitados: los módulos integrados y empaquetados utilizan un cargador nativo;
   el código fuente local de terceros en TypeScript utiliza el respaldo de emergencia Jiti
7. llamar a los ganchos `register(api)` nativos y recopilar los registros en el registro de plugins
8. exponer el registro a comandos/superficies de tiempo de ejecución

<Note>`activate` es un alias heredado de `register` — el cargador resuelve cualquiera que esté presente (`def.register ?? def.activate`) y lo llama en el mismo punto. Todos los plugins empaquetados usan `register`; se prefiere `register` para nuevos plugins.</Note>

Los mecanismos de seguridad ocurren **antes** de la ejecución del tiempo de ejecución. Los candidatos se bloquean
cuando la entrada escapa de la raíz del plugin, la ruta es escribible por todos (world-writable), o la propiedad
de la ruta parece sospechosa para plugins no empaquetados.

Los candidatos bloqueados permanecen vinculados a su id de complemento para fines de diagnóstico. Si la configuración
aún hace referencia a ese id, la validación informa el complemento como presente pero bloqueado
y remite a la advertencia de seguridad de ruta en lugar de tratar la entrada de configuración
como obsoleta.

### Comportamiento primero del manifiesto

El manifiesto es la fuente de verdad del plano de control. OpenClaw lo utiliza para:

- identificar el complemento
- descubrir los canales/habilidades/esquema de configuración declarados o capacidades del paquete
- validar `plugins.entries.<id>.config`
- mejorar las etiquetas/marcadores de posición de la interfaz de usuario de Control
- mostrar metadatos de instalación/catálogo
- conservar descriptores de activación y configuración económicos sin cargar el tiempo de ejecución del complemento

Para los complementos nativos, el módulo de tiempo de ejecución es la parte del plano de datos. Registra
el comportamiento real, como ganchos, herramientas, comandos o flujos de proveedores.

Los bloques opcionales de manifiesto `activation` y `setup` permanecen en el plano de control.
Son descriptores solo de metadatos para la planificación de activación y el descubrimiento de configuración;
no reemplazan el registro de tiempo de ejecución, `register(...)` ni `setupEntry`.
Los primeros consumidores de activación en vivo ahora utilizan sugerencias de comando, canal y proveedor del manifiesto
para restringir la carga de complementos antes de la materialización más amplia del registro:

- la carga de la CLI se restringe a los complementos que poseen el comando principal solicitado
- la configuración del canal/resolución del complemento se restringe a los complementos que poseen el
  id de canal solicitado
- la configuración explícita del proveedor/resolución del tiempo de ejecución se restringe a los complementos que poseen el
  id de proveedor solicitado
- la planificación del inicio de Gateway utiliza `activation.onStartup` para importaciones de inicio
  explícitas y opt-outs de inicio; los complementos sin metadatos de inicio se cargan solo
  a través de disparadores de activación más restringidos

Las precargas del tiempo de ejecución en tiempo de solicitud que piden el ámbito `all` amplio aún derivan un
conjunto explícito de identificadores de plugin efectivo a partir de la configuración, la planificación de inicio, los canales configurados,
las ranuras y las reglas de habilitación automática. Si ese conjunto derivado está vacío, OpenClaw
carga un registro de tiempo de ejecución vacío en lugar de ampliarse a todos los plugins detectables.

El planificador de activación expone tanto una API de solo identificadores para los llamadores existentes como una
API de plan para nuevos diagnósticos. Las entradas del plan informan por qué se seleccionó un plugin,
separando las pistas explícitas `activation.*` del planificador de la propiedad de manifiesto
por defecto como `providers`, `channels`, `commandAliases`, `setup.providers`,
`contracts.tools` y hooks. Esa división de razones es el límite de compatibilidad:
los metadatos del plugin existentes siguen funcionando, mientras que el nuevo código puede detectar pistas amplias
o el comportamiento de reserva sin cambiar la semántica de carga del tiempo de ejecución.

El descubrimiento de configuración ahora prefiere los identificadores propiedad del descriptor, como `setup.providers` y
`setup.cliBackends`, para limitar los plugins candidatos antes de recurrir a
`setup-api` para los plugins que aún necesitan hooks de tiempo de ejecución en tiempo de configuración. Las listas de configuración
del proveedor usan el manifiesto `providerAuthChoices`, las opciones de configuración derivadas del descriptor
y los metadatos del catálogo de instalación sin cargar el tiempo de ejecución del proveedor. El `setup.requiresRuntime: false` explícito es un punto de corte solo para el descriptor; el `requiresRuntime` omitido
mantiene la alternativa de la API de configuración heredada para la compatibilidad. Si más
de un plugin descubierto reclama el mismo proveedor de configuración normalizado o el mismo ID de backend de CLI,
la búsqueda de configuración rechaza al propietario ambiguo en lugar de confiar en el
orden de descubrimiento. Cuando se ejecuta el tiempo de ejecución de configuración, los diagnósticos del registro informan
la divergencia entre `setup.providers` / `setup.cliBackends` y los proveedores o CLI
backends registrados por la API de configuración sin bloquear los plugins heredados.

### Límite de caché del plugin

OpenClaw no almacena en caché los resultados del descubrimiento de complementos ni los datos directos del registro de manifiestos detrás de ventanas de tiempo reloj. Las instalaciones, las ediciones de manifiestos y los cambios en la ruta de carga deben hacerse visibles en la siguiente lectura explícita de metadatos o reconstrucción de la instantánea. El analizador de archivos de manifiesto puede mantener una caché limitada de firmas de archivos indexada por la ruta del manifiesto abierto, inodo, tamaño y marcas de tiempo; esa caché solo evita volver a analizar los bytes sin cambios y no debe almacenar en caché el descubrimiento, el registro, el propietario ni las respuestas de política.

La ruta rápida segura para los metadatos es la propiedad explícita del objeto, no una caché oculta. Las rutas rápidas de inicio de Gateway deben pasar el `PluginMetadataSnapshot` actual, el `PluginLookUpTable` derivado o un registro de manifiesto explícito a través de la cadena de llamadas. La validación de configuración, la habilitación automática al inicio, el arranque del complemento y la selección del proveedor pueden reutilizar esos objetos mientras representen la configuración actual y el inventario de complementos. La búsqueda de configuración aún reconstruye los metadatos del manifiesto bajo demanda a menos que la ruta de configuración específica reciba un registro de manifiesto explícito; manténgalo como una alternativa de ruta fría en lugar de agregar cachés de búsqueda ocultos. Cuando la entrada cambia, reconstruya y reemplace la instantánea en lugar de mutarla o mantener copias históricas.
Las vistas sobre el registro de complementos activo y los asistentes de arranque de canales incluidos deben volver a calcularse desde el registro/raíz actual. Los mapas de corta duración son aceptables dentro de una sola llamada para deduplicar trabajo o proteger contra reentrada; no deben convertirse en cachés de metadatos de proceso.

Para la carga de complementos, la capa de caché persistente es la carga en tiempo de ejecución. Puede reutilizar el estado del cargador cuando el código o los artefactos instalados se cargan realmente, tales como:

- `PluginLoaderCacheState` y registros de tiempo de ejecución activos compatibles
- cachés de jiti/módulo y cachés de cargador de superficie pública utilizados para evitar importar repetidamente la misma superficie de tiempo de ejecución
- cachés del sistema de archivos para los artefactos de complementos instalados
- mapas por llamada de corta duración para la normalización de rutas o la resolución de duplicados

Esas cachés son detalles de implementación del plano de datos. No deben responder preguntas del plano de control como "¿qué complemento posee este proveedor?" a menos que la persona que llama solicite deliberadamente la carga en tiempo de ejecución.

No agregue cachés persistentes o de tiempo reloj para:

- resultados del descubrimiento
- registros de manifiesto directos
- registros de manifiesto reconstruidos a partir del índice de complementos instalados
- búsqueda del propietario del proveedor, supresión del modelo, política del proveedor o metadatos de artefacto público
- cualquier otra respuesta derivada del manifiesto donde un manifiesto modificado, índice instalado o ruta de carga debe ser visible en la siguiente lectura de metadatos

Los llamadores que reconstruyen los metadatos del manifiesto a partir del índice persistente de complementos instalados reconstruyen ese registro a pedido. El índice instalado es un estado duradero del plano de origen; no es una caché de metadatos oculta en proceso.

## Modelo de registro

Los complementos cargados no modifican directamente las variables globales principales aleatorias. Se registran en un registro central de complementos.

El registro rastrea:

- registros de complementos (identidad, fuente, origen, estado, diagnósticos)
- herramientas
- ganchos heredados y ganchos tipados
- canales
- proveedores
- manejadores RPC de puerta de enlace
- rutas HTTP
- registradores de CLI
- servicios en segundo plano
- comandos propiedad del complemento

Las características principales luego leen de ese registro en lugar de comunicarse directamente con los módulos de complementos. Esto mantiene la carga en una sola dirección:

- módulo de complemento -> registro de registro
- tiempo de ejecución principal -> consumo del registro

Esa separación es importante para la mantenibilidad. Significa que la mayoría de las superficies principales solo necesitan un punto de integración: "leer el registro", en lugar de "casos especiales para cada módulo de complemento".

## Retrollamadas de vinculación de conversación

Los complementos que vinculan una conversación pueden reaccionar cuando se resuelve una aprobación.

Use `api.onConversationBindingResolved(...)` para recibir una retrollamada después de que una solicitud de vinculación se aprueba o deniega:

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

Campos de carga útil de la retrollamada:

- `status`: `"approved"` o `"denied"`
- `decision`: `"allow-once"`, `"allow-always"` o `"deny"`
- `binding`: la vinculación resuelta para las solicitudes aprobadas
- `request`: el resumen de la solicitud original, sugerencia de separación, identificador del remitente y metadatos de la conversación

Esta retrollamada es solo de notificación. No cambia quién tiene permiso para vincular una conversación y se ejecuta después de que finaliza el manejo de aprobación principal.

## Ganchos de tiempo de ejecución del proveedor

Los complementos de proveedor tienen tres capas:

- **Metadatos del manifiesto** para búsqueda previa a la ejecución de bajo costo:
  `setup.providers[].envVars`, compatibilidad obsoleta `providerAuthEnvVars`,
  `providerAuthAliases`, `providerAuthChoices` y `channelEnvVars`.
- **Hooks de tiempo de configuración**: `catalog` (`discovery` heredado) más
  `applyConfigDefaults`.
- **Ganchos de ejecución (Runtime hooks)**: más de 40 ganchos opcionales que cubren autenticación, resolución de modelos,
  envoltura de flujos (stream wrapping), niveles de pensamiento, políticas de repetición y puntos finales de uso. Vea
  la lista completa en [Orden y uso de los ganchos](#hook-order-and-usage).

OpenClaw sigue siendo propietario del bucle genérico del agente, la conmutación por error, el manejo de transcripciones y la
política de herramientas. Estos hooks son la superficie de extensión para comportamientos específicos del proveedor
sin necesidad de un transporte de inferencia personalizado completo.

Use el manifiesto `setup.providers[].envVars` cuando el proveedor tenga credenciales basadas en variables de entorno que las rutas genéricas de autenticación/estado/selector de modelos deberían ver sin
cargar el tiempo de ejecución del complemento. El campo obsoleto `providerAuthEnvVars` todavía lo lee el
adaptador de compatibilidad durante el período de obsolescencia, y los complementos no empaquetados
que lo usan reciben un diagnóstico del manifiesto. Use el manifiesto `providerAuthAliases`
cuando un ID de proveedor deba reutilizar las variables de entorno, perfiles de autenticación,
autenticación respaldada por configuración y la elección de incorporación de clave API de otro ID de proveedor. Use el manifiesto
`providerAuthChoices` cuando las superficies de CLI de incorporación/elección de autenticación deban conocer el
ID de elección del proveedor, las etiquetas de grupo y el cableado simple de autenticación de una sola bandera sin
cargar el tiempo de ejecución del proveedor. Mantenga el tiempo de ejecución del proveedor
`envVars` para sugerencias orientadas al operador, como etiquetas de incorporación o variables de configuración del
ID de cliente/secreto de cliente de OAuth.

Use el manifiesto `channelEnvVars` cuando un canal tenga autenticación o configuración impulsada por variables de entorno que la reserva genérica del entorno de shell, las verificaciones de configuración/estado o los mensajes de configuración deban ver
sin cargar el tiempo de ejecución del canal.

### Orden y uso de los hooks

Para los complementos de modelo/proveedor, OpenClaw llama a los hooks en este orden aproximado.
La columna "Cuándo usar" es la guía de decisión rápida.
Los campos de proveedor solo de compatibilidad que OpenClaw ya no llama, como
`ProviderPlugin.capabilities` y `suppressBuiltInModel`, no están incluidos
intencionalmente aquí.

| #   | Hook                              | Lo que hace                                                                                                                                                                  | Cuándo usar                                                                                                                                                                                                                   |
| --- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `catalog`                         | Publicar la configuración del proveedor en `models.providers` durante la generación de `models.json`                                                                         | El proveedor posee un catálogo o valores predeterminados de URL base                                                                                                                                                          |
| 2   | `applyConfigDefaults`             | Aplicar valores predeterminados de configuración global propios del proveedor durante la materialización de la configuración                                                 | Los valores predeterminados dependen del modo de autenticación, el entorno o la semántica de la familia de modelos del proveedor                                                                                              |
| --  | _(búsqueda de modelo integrada)_  | OpenClaw intenta primero la ruta normal de registro/catálogo                                                                                                                 | _(no es un enlace de complemento)_                                                                                                                                                                                            |
| 3   | `normalizeModelId`                | Normalizar alias de ID de modelo heredados o de vista previa antes de la búsqueda                                                                                            | El proveedor es responsable de la limpieza de alias antes de la resolución del modelo canónico                                                                                                                                |
| 4   | `normalizeTransport`              | Normalizar `api` / `baseUrl` de la familia del proveedor antes del ensamblaje del modelo genérico                                                                            | El proveedor es propietario de la limpieza del transporte para los ID de proveedor personalizados en la misma familia de transporte                                                                                           |
| 5   | `normalizeConfig`                 | Normalizar `models.providers.<id>` antes de la resolución del runtime/proveedor                                                                                              | El proveedor necesita una limpieza de configuración que debe residir con el complemento; los asistentes incluidos de la familia de Google también sirven de respaldo para las entradas de configuración de Google compatibles |
| 6   | `applyNativeStreamingUsageCompat` | Aplicar reescrituras de compatibilidad de uso de transmisión nativa a los proveedores de configuración                                                                       | El proveedor necesita correcciones de metadatos de uso de transmisión nativa impulsadas por el endpoint                                                                                                                       |
| 7   | `resolveConfigApiKey`             | Resolver la autenticación de marcadores de entorno para los proveedores de configuración antes de la carga de autenticación del runtime                                      | Los proveedores exponen sus propios ganchos de resolución de claves API de marcadores de entorno                                                                                                                              |
| 8   | `resolveSyntheticAuth`            | Exponer la autenticación local/autoalojada o respaldada por configuración sin conservar texto sin formato                                                                    | El proveedor puede operar con un marcador de credenciales sintético/local                                                                                                                                                     |
| 9   | `resolveExternalAuthProfiles`     | Superponer perfiles de autenticación externa propiedad del proveedor; el `persistence` predeterminado es `runtime-only` para las credenciales propiedad de la CLI/aplicación | El proveedor reutiliza las credenciales de autenticación externa sin persistir los tokens de actualización copiados; declarar `contracts.externalAuthProviders` en el manifiesto                                              |
| 10  | `shouldDeferSyntheticProfileAuth` | Reducir los marcadores de posición de perfil sintético almacenados detrás de la autenticación respaldada por entorno/configuración                                           | El proveedor almacena perfiles de marcadores de posición sintéticos que no deben ganar precedencia                                                                                                                            |
| 11  | `resolveDynamicModel`             | Respaldo de sincronización para IDs de modelos propiedad del proveedor que aún no están en el registro local                                                                 | El proveedor acepta IDs de modelos ascendentes arbitrarios                                                                                                                                                                    |
| 12  | `prepareDynamicModel`             | Calentamiento asíncrono, luego `resolveDynamicModel` se ejecuta nuevamente                                                                                                   | El proveedor necesita metadatos de red antes de resolver identificadores desconocidos                                                                                                                                         |
| 13  | `normalizeResolvedModel`          | Reescritura final antes de que el ejecutor integrado utilice el modelo resuelto                                                                                              | El proveedor necesita reescrituras de transporte pero aún utiliza un transporte central                                                                                                                                       |
| 14  | `normalizeToolSchemas`            | Normalizar esquemas de herramientas antes de que el ejecutor integrado los vea                                                                                               | El proveedor necesita limpieza del esquema de la familia de transporte                                                                                                                                                        |
| 15  | `inspectToolSchemas`              | Exponer diagnósticos de esquema propiedad del proveedor después de la normalización                                                                                          | El proveedor quiere advertencias de palabras clave sin enseñar reglas específicas del proveedor al núcleo                                                                                                                     |
| 16  | `resolveReasoningOutputMode`      | Seleccionar el contrato de salida de razonamiento nativo frente a etiquetado                                                                                                 | El proveedor necesita salida de razonamiento/final etiquetada en lugar de campos nativos                                                                                                                                      |
| 17  | `prepareExtraParams`              | Normalización de parámetros de solicitud antes de los envoltorios de opciones de flujo genéricos                                                                             | El proveedor necesita parámetros de solicitud predeterminados o limpieza de parámetros por proveedor                                                                                                                          |
| 18  | `createStreamFn`                  | Reemplazar completamente la ruta de flujo normal con un transporte personalizado                                                                                             | El proveedor necesita un protocolo de cable personalizado, no solo un envoltorio                                                                                                                                              |
| 20  | `wrapStreamFn`                    | Envoltorio de flujo después de que se aplican los envoltorios genéricos                                                                                                      | El proveedor necesita envoltorios de compatibilidad de encabezados/cuerpo/modelo de solicitud sin un transporte personalizado                                                                                                 |
| 21  | `resolveTransportTurnState`       | Adjuntar encabezados o metadatos de transporte nativos por turno                                                                                                             | El proveedor quiere que los transportes genéricos envíen la identidad de turno nativa del proveedor                                                                                                                           |
| 22  | `resolveWebSocketSessionPolicy`   | Adjuntar encabezados nativos de WebSocket o política de enfriamiento de sesión                                                                                               | El proveedor quiere que los transportes WS genéricos ajusten los encabezados de sesión o la política de reserva                                                                                                               |
| 23  | `formatApiKey`                    | Formateador de perfil de autenticación: el perfil almacenado se convierte en la cadena `apiKey` en tiempo de ejecución                                                       | El proveedor almacena metadatos de autenticación adicionales y necesita una forma de token de tiempo de ejecución personalizada                                                                                               |
| 24  | `refreshOAuth`                    | Invalidación de la actualización de OAuth para endpoints de actualización personalizados o política de fallas de actualización                                               | El proveedor no se ajusta a los actualizadores compartidos de OpenClaw                                                                                                                                                        |
| 25  | `buildAuthDoctorHint`             | Sugerencia de reparación adjuntada cuando falla la actualización de OAuth                                                                                                    | El proveedor necesita orientación de reparación de autenticación propia del proveedor después de una falla de actualización                                                                                                   |
| 26  | `matchesContextOverflowError`     | Comparador de desbordamiento de ventana de contexto propio del proveedor                                                                                                     | El proveedor tiene errores de desbordamiento sin procesar que las heurísticas genéricas pasarían por alto                                                                                                                     |
| 27  | `classifyFailoverReason`          | Clasificación de motivo de conmutación por error propia del proveedor                                                                                                        | El proveedor puede asignar errores de API/transporte sin procesar a límite de tasa/sobrecarga/etc.                                                                                                                            |
| 28  | `isCacheTtlEligible`              | Política de caché de solicitudes para proveedores de proxy/transporte de retorno                                                                                             | El proveedor necesita un control de TTL de caché específico del proxy                                                                                                                                                         |
| 29  | `buildMissingAuthMessage`         | Reemplazo del mensaje genérico de recuperación de autenticación faltante                                                                                                     | El proveedor necesita una sugerencia de recuperación de autenticación faltante específica del proveedor                                                                                                                       |
| 30  | `augmentModelCatalog`             | Filas sintéticas/finales del catálogo anexadas después del descubrimiento                                                                                                    | El proveedor necesita filas de compatibilidad hacia adelante sintéticas en `models list` y selectores                                                                                                                         |
| 31  | `resolveThinkingProfile`          | Conjunto de nivel `/think` específico del modelo, etiquetas de visualización y valor predeterminado                                                                          | El proveedor expone una escalera de pensamiento personalizada o una etiqueta binaria para los modelos seleccionados                                                                                                           |
| 32  | `isBinaryThinking`                | Gancho de compatibilidad del interruptor de razonamiento activado/desactivado                                                                                                | El proveedor expone solo pensamiento binario activado/desactivado                                                                                                                                                             |
| 33  | `supportsXHighThinking`           | Gancho de compatibilidad de soporte de razonamiento `xhigh`                                                                                                                  | El proveedor quiere `xhigh` solo en un subconjunto de modelos                                                                                                                                                                 |
| 34  | `resolveDefaultThinkingLevel`     | Gancho de compatibilidad del nivel `/think` predeterminado                                                                                                                   | El proveedor posee la política `/think` predeterminada para una familia de modelos                                                                                                                                            |
| 35  | `isModernModelRef`                | Emparejador de modelos modernos para filtros de perfil en vivo y selección de pruebas (smoke selection)                                                                      | El proveedor posee el emparejamiento de modelos preferidos en vivo/pruebas                                                                                                                                                    |
| 36  | `prepareRuntimeAuth`              | Intercambiar una credencial configurada por el token/clave de tiempo de ejecución real justo antes de la inferencia                                                          | El proveedor necesita un intercambio de tokens o una credencial de solicitud de corta duración                                                                                                                                |
| 37  | `resolveUsageAuth`                | Resolver credenciales de uso/facturación para `/usage` y superficies de estado relacionadas                                                                                  | El proveedor necesita análisis personalizado de tokens de uso/cuota o una credencial de uso diferente                                                                                                                         |
| 38  | `fetchUsageSnapshot`              | Obtener y normalizar instantáneas de uso/cuota específicas del proveedor después de resolver la autenticación                                                                | El proveedor necesita un endpoint de uso específico del proveedor o un analizador de carga útil                                                                                                                               |
| 39  | `createEmbeddingProvider`         | Construir un adaptador de incrustaciones (embeddings) propiedad del proveedor para memoria/búsqueda                                                                          | El comportamiento de incrustación de memoria pertenece al complemento del proveedor                                                                                                                                           |
| 40  | `buildReplayPolicy`               | Devolver una política de repetición que controle el manejo de transcripciones para el proveedor                                                                              | El proveedor necesita una política de transcripción personalizada (por ejemplo, eliminación de bloques de pensamiento)                                                                                                        |
| 41  | `sanitizeReplayHistory`           | Reescribir el historial de repetición después de la limpieza genérica de la transcripción                                                                                    | El proveedor necesita reescrituras de repetición específicas del proveedor más allá de los asistentes de compactación compartidos                                                                                             |
| 42  | `validateReplayTurns`             | Validación o reconfiguración final del turno de repetición antes del ejecutor integrado                                                                                      | El transporte del proveedor necesita una validación de turno más estricta después de la saneación genérica                                                                                                                    |
| 43  | `onModelSelected`                 | Ejecutar efectos secundarios posteriores a la selección propiedad del proveedor                                                                                              | El proveedor necesita telemetría o estado propiedad del proveedor cuando un modelo se activa                                                                                                                                  |

`normalizeModelId`, `normalizeTransport` y `normalizeConfig` primero verifican el
proveedor de complementos coincidente, luego pasan a otros proveedores de complementos capaces de engancharse
hasta que uno realmente cambie el id del modelo o el transporte/configuración. Eso mantiene
funcionando los shims de alias/compatibilidad de los proveedores sin requerir que la persona que llama sepa qué
complemento incluido posee la reescritura. Si ningún gancho de proveedor reescribe una entrada de configuración
compatible con la familia de Google compatible, el normalizador de configuración de Google incluido aún aplica
esa limpieza de compatibilidad.

Si el proveedor necesita un protocolo de cable completamente personalizado o un ejecutor de solicitudes personalizado,
esa es una clase diferente de extensión. Estos ganchos son para el comportamiento del proveedor
que aún se ejecuta en el bucle de inferencia normal de OpenClaw.

`resolveUsageAuth` decide si OpenClaw debe llamar a `fetchUsageSnapshot` o
recurre a la resolución genérica de credenciales para superficies de uso/estado. Devuelva
`{ token, accountId? }` cuando el proveedor tenga una credencial de uso, devuelva
`{ handled: true }` cuando la autenticación de uso propiedad del proveedor haya manejado la solicitud y
deba suprimir la alternativa genérica de API-key/OAuth, y devuelva `null` o `undefined`
cuando el proveedor no manejó la autenticación de uso.

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

Los complementos de proveedor agrupados combinan los ganchos anteriores para adaptarse al catálogo,
autenticación, pensamiento, repetición y necesidades de uso de cada proveedor. El conjunto de ganchos autorizado reside con
cada complemento bajo `extensions/`; esta página ilustra las formas en lugar de
reflejar la lista.

<AccordionGroup>
  <Accordion title="Proveedores de catálogo de paso a través">OpenRouter, Kilocode, Z.AI, xAI registran `catalog` más `resolveDynamicModel` / `prepareDynamicModel` para que puedan mostrar identificadores de modelos ascendentes por adelantado respecto al catálogo estático de OpenClaw.</Accordion>
  <Accordion title="Proveedores de puntos finales OAuth y de uso">GitHub Copilot, Gemini CLI, ChatGPT Codex, MiniMax, Xiaomi, z.ai emparejan `prepareRuntimeAuth` o `formatApiKey` con `resolveUsageAuth` + `fetchUsageSnapshot` para apropiarse del intercambio de tokens y la integración de `/usage`.</Accordion>
  <Accordion title="Familias de reproducción y limpieza de transcripciones">Las familias con nombre compartido (`google-gemini`, `passthrough-gemini`, `anthropic-by-model`, `hybrid-anthropic-openai`) permiten que los proveedores se adhieran a la política de transcripciones a través de `buildReplayPolicy` en lugar de que cada complemento reimplemente la limpieza.</Accordion>
  <Accordion title="Proveedores solo de catálogo">`byteplus`, `cloudflare-ai-gateway`, `huggingface`, `kimi-coding`, `nvidia`, `qianfan`, `synthetic`, `together`, `venice`, `vercel-ai-gateway` y `volcengine` registran solo `catalog` y utilizan el bucle de inferencia compartido.</Accordion>
  <Accordion title="Auxiliares de flujo específicos de Anthropic">Los encabezados beta, `/fast` / `serviceTier`, y `context1m` se encuentran dentro de la costura pública `api.ts` / `contract-api.ts` del complemento Anthropic (`wrapAnthropicProviderStream`, `resolveAnthropicBetas`, `resolveAnthropicFastMode`, `resolveAnthropicServiceTier`) en lugar de en el SDK genérico.</Accordion>
</AccordionGroup>

## Auxiliares de tiempo de ejecución

Los complementos pueden acceder a ciertos auxiliares principales a través de `api.runtime`. Para TTS:

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

- `textToSpeech` devuelve la carga útil de salida TTS principal normal para superficies de archivo/nota de voz.
- Utiliza la configuración principal `messages.tts` y la selección del proveedor.
- Devuelve un búfer de audio PCM + frecuencia de muestreo. Los complementos deben remuestrear/codificar para los proveedores.
- `listVoices` es opcional por proveedor. Úselo para selectores de voz o flujos de configuración propiedad del proveedor.
- Las listas de voces pueden incluir metadatos más ricos, como configuración regional, género y etiquetas de personalidad, para selectores compatibles con el proveedor.
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

- Mantenga la política de TTS, la reserva y la entrega de respuestas en el núcleo.
- Utilice proveedores de voz para el comportamiento de síntesis propiedad del proveedor.
- La entrada heredada de Microsoft `edge` se normaliza al id. de proveedor `microsoft`.
- El modelo de propiedad preferido está orientado a la empresa: un complemento de proveedor puede ser propietario de proveedores de texto, voz, imagen y medios futuros a medida que OpenClaw agregue esos contratos de capacidad.

Para la comprensión de imagen/audio/video, los complementos registran un proveedor de comprensión de medios con tipo en lugar de un bolsa genérica de clave/valor:

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

- Mantenga la orquestación, la reserva, la configuración y el cableado del canal en el núcleo.
- Mantenga el comportamiento del proveedor en el complemento del proveedor.
- La expansión aditiva debe permanecer tipada: nuevos métodos opcionales, nuevos campos de resultado opcionales, nuevas capacidades opcionales.
- La generación de video ya sigue el mismo patrón:
  - el núcleo posee el contrato de capacidad y el asistente de ejecución
  - los complementos del proveedor registran `api.registerVideoGenerationProvider(...)`
  - los complementos de características/canales consumen `api.runtime.videoGeneration.*`

Para los asistentes de ejecución de comprensión de medios, los complementos pueden llamar a:

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

const extraction = await api.runtime.mediaUnderstanding.extractStructuredWithModel({
  provider: "codex",
  model: "gpt-5.5",
  input: [
    {
      type: "image",
      buffer: receiptImageBuffer,
      fileName: "receipt.png",
      mime: "image/png",
    },
    { type: "text", text: "Use the printed fields as the source of truth." },
  ],
  instructions: "Return entities and searchable tags.",
  schemaName: "example.evidence",
  jsonSchema: {
    type: "object",
    properties: {
      entities: { type: "array", items: { type: "string" } },
      tags: { type: "array", items: { type: "string" } },
    },
  },
  cfg: api.config,
});
```

Para la transcripción de audio, los complementos pueden usar el tiempo de ejecución de comprensión de medios o el alias STT anterior:

```ts
const { text } = await api.runtime.mediaUnderstanding.transcribeAudioFile({
  filePath: "/tmp/inbound-audio.ogg",
  cfg: api.config,
  // Optional when MIME cannot be inferred reliably:
  mime: "audio/ogg",
});
```

Notas:

- `api.runtime.mediaUnderstanding.*` es la superficie compartida preferida para la comprensión de imagen/audio/video.
- `extractStructuredWithModel(...)` es la costura orientada al complemento para la extracción primero de imagen y propiedad del proveedor delimitada. Incluya al menos una entrada de imagen; las entradas de texto son contexto complementario.
  los complementos del producto son propietarios de sus rutas y esquemas, mientras que OpenClaw posee el límite del proveedor/tiempo de ejecución.
- Utiliza la configuración de audio de comprensión de medios del núcleo (`tools.media.audio`) y el orden de reserva del proveedor.
- Devuelve `{ text: undefined }` cuando no se produce ninguna salida de transcripción (por ejemplo, entrada omitida/no admitida).
- `api.runtime.stt.transcribeAudioFile(...)` permanece como un alias de compatibilidad.

Los complementos también pueden iniciar ejecuciones de subagentes en segundo plano a través de `api.runtime.subagent`:

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

- `provider` y `model` son anulaciones opcionales por ejecución, no cambios de sesión persistentes.
- OpenClaw solo respeta esos campos de anulación para las llamadas de confianza.
- Para las ejecuciones de reserva owned por el complemento, los operadores deben optar con `plugins.entries.<id>.subagent.allowModelOverride: true`.
- Use `plugins.entries.<id>.subagent.allowedModels` para restringir los complementos de confianza a objetivos `provider/model` canónicos específicos, o `"*"` para permitir cualquier objetivo explícitamente.
- Las ejecuciones de subagentes de complementos que no son de confianza todavía funcionan, pero las solicitudes de anulación se rechazan en lugar de recurrir silenciosamente.
- Las sesiones de subagentes creadas por complementos se etiquetan con el ID del complemento creador. El respaldo `api.runtime.subagent.deleteSession(...)` solo puede eliminar esas sesiones propiedad; la eliminación de sesiones arbitrarias todavía requiere una solicitud de Gateway con alcance de administrador.

Para la búsqueda web, los complementos pueden consumir el asistente de tiempo de ejecución compartido en lugar de
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

Los complementos también pueden registrar proveedores de búsqueda web a través de
`api.registerWebSearchProvider(...)`.

Notas:

- Mantenga la selección del proveedor, la resolución de credenciales y la semántica de solicitudes compartidas en el núcleo.
- Utilice proveedores de búsqueda web para transportes de búsqueda específicos del proveedor.
- `api.runtime.webSearch.*` es la superficie compartida preferida para los complementos de características/canales que necesitan comportamiento de búsqueda sin depender del contenedor de herramientas del agente.

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
- `listProviders(...)`: enumera los proveedores de generación de imágenes disponibles y sus capacidades.

## Rutas HTTP de Gateway

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

- `path`: ruta de la ruta bajo el servidor HTTP de gateway.
- `auth`: obligatorio. Use `"gateway"` para requerir la autenticación normal de la puerta de enlace, o `"plugin"` para la autenticación administrada por el complemento/verificación de webhooks.
- `match`: opcional. `"exact"` (predeterminado) o `"prefix"`.
- `replaceExisting`: opcional. Permite que el mismo complemento reemplace su propio registro de ruta existente.
- `handler`: devuelve `true` cuando la ruta maneja la solicitud.

Notas:

- `api.registerHttpHandler(...)` se eliminó y causará un error de carga del complemento. Use `api.registerHttpRoute(...)` en su lugar.
- Las rutas de los complementos deben declarar `auth` explícitamente.
- Los conflictos exactos de `path + match` se rechazan a menos que `replaceExisting: true`, y un complemento no puede reemplazar la ruta de otro complemento.
- Las rutas superpuestas con diferentes niveles de `auth` se rechazan. Mantenga las cadenas de paso a través `exact`/`prefix` solo en el mismo nivel de autenticación.
- Las rutas `auth: "plugin"` **no** reciben automáticamente alcances de tiempo de ejecución del operador. Son para webhooks gestionados por complementos/verificación de firmas, no para llamadas auxiliares con privilegios de Gateway.
- Las rutas `auth: "gateway"` se ejecutan dentro de un alcance de tiempo de ejecución de solicitud de Gateway, pero ese alcance es intencionalmente conservador:
  - la autenticación de portador de secreto compartido (`gateway.auth.mode = "token"` / `"password"`) mantiene los alcances de tiempo de ejecución de la ruta del plugin fijados en `operator.write`, incluso si el llamador envía `x-openclaw-scopes`
  - los modos HTTP que portan identidad de confianza (por ejemplo `trusted-proxy` o `gateway.auth.mode = "none"` en un ingreso privado) respetan `x-openclaw-scopes` solo cuando el encabezado está explícitamente presente
  - si `x-openclaw-scopes` está ausente en esas solicitudes de ruta de plugin que portan identidad, el alcance de tiempo de ejecución regresa a `operator.write`
- Regla práctica: no asuma que una ruta de plugin con autenticación de gateway es una superficie de administrador implícita. Si su ruta necesita comportamiento solo para administradores, requiera un modo de autenticación que porte identidad y documente el contrato explícito del encabezado `x-openclaw-scopes`.

## Rutas de importación del Plugin SDK

Utilice subrutas estrechas del SDK en lugar del barril raíz monolítico `openclaw/plugin-sdk` al crear nuevos complementos. Subrutas principales:

| Subruta                             | Propósito                                           |
| ----------------------------------- | --------------------------------------------------- |
| `openclaw/plugin-sdk/plugin-entry`  | Primitivas de registro de complementos              |
| `openclaw/plugin-sdk/channel-core`  | Ayudantes de entrada/creación de canales            |
| `openclaw/plugin-sdk/core`          | Ayudantes genéricos compartidos y contrato paraguas |
| `openclaw/plugin-sdk/config-schema` | Esquema Zod raíz `openclaw.json` (`OpenClawSchema`) |

Los complementos de canal eligen de una familia de costuras estrechas — `channel-setup`,
`setup-runtime`, `setup-tools`, `channel-pairing`,
`channel-contract`, `channel-feedback`, `channel-inbound`, `channel-outbound`,
`command-auth`, `secret-input`, `webhook-ingress`,
`channel-targets` y `channel-actions`. El comportamiento de aprobación debe consolidarse
en un contrato `approvalCapability` en lugar de mezclarse entre campos de
complementos no relacionados. Consulte [Channel plugins](/es/plugins/sdk-channel-plugins).

Los asistentes de configuración y de ejecución se encuentran en subrutas `*-runtime` enfocadas correspondientes
(`approval-runtime`, `agent-runtime`, `lazy-runtime`, `directory-runtime`,
`text-runtime`, `runtime-store`, `system-event-runtime`, `heartbeat-runtime`,
`channel-activity-runtime`, etc.). Se prefieren `config-contracts`,
`plugin-config-runtime`, `runtime-config-snapshot` y `config-mutation`
en lugar del barril de compatibilidad `config-runtime` más amplio.

<Info>
  `openclaw/plugin-sdk/channel-runtime`, `openclaw/plugin-sdk/channel-lifecycle`, fachadas pequeñas de ayuda de canal, `openclaw/plugin-sdk/outbound-runtime`, `openclaw/plugin-sdk/outbound-send-deps`, `openclaw/plugin-sdk/config-runtime`, y `openclaw/plugin-sdk/infra-runtime` son shims de compatibilidad en desuso para complementos más antiguos. El código nuevo debe importar primitivas genéricas
  más estrechas en su lugar.
</Info>

Puntos de entrada internos del repositorio (por raíz del paquete del complemento empaquetado):

- `index.js` — entrada de complemento empaquetado
- `api.js` — barril de ayuda/tipos
- `runtime-api.js` — barril solo de tiempo de ejecución
- `setup-entry.js` — entrada de complemento de configuración

Los complementos externos solo deben importar `openclaw/plugin-sdk/*` subrutas. Nunca
importe `src/*` del paquete de otro complemento desde el núcleo o desde otro complemento.
Los puntos de entrada cargados por fachada prefieren la instantánea de configuración de tiempo de ejecución activa cuando existe
una, y luego recurren al archivo de configuración resuelto en disco.

Las subrutas específicas de capacidades como `image-generation`, `media-understanding`,
y `speech` existen porque los complementos empaquetados las usan hoy en día. No son
automáticamente contratos externos congelados a largo plazo: consulte la página de referencia del SDK
pertinente cuando dependa de ellas.

## Esquemas de herramientas de mensaje

Los complementos deben ser propietarios de las contribuciones del esquema `describeMessageTool(...)` específicas del canal
para primitivas que no son mensajes, como reacciones, lecturas y encuestas.
La presentación de envío compartida debe usar el contrato genérico `MessagePresentation`
en lugar de campos de botón, componente, bloque o tarjeta nativos del proveedor.
Consulte [Message Presentation](/es/plugins/message-presentation) para conocer el contrato,
las reglas de reserva, el mapeo del proveedor y la lista de verificación para autores de complementos.

Los complementos con capacidad de envío declaran lo que pueden representar a través de capacidades de mensaje:

- `presentation` para bloques de presentación semántica (`text`, `context`, `divider`, `buttons`, `select`)
- `delivery-pin` para solicitudes de entrega fijada

El núcleo decide si representar la presentación de forma nativa o degradarla a texto.
No exponga salidas de escape de IU nativas del proveedor desde la herramienta de mensaje genérica.
Los auxiliares del SDK en desuso para esquemas nativos heredados siguen exportándose para complementos
de terceros existentes, pero los nuevos complementos no deben usarlos.

## Resolución del objetivo del canal

Los complementos del canal deben ser propietarios de la semántica de objetivo específica del canal. Mantenga el host
de salida compartido genérico y use la superficie del adaptador de mensajería para las reglas del proveedor:

- `messaging.inferTargetChatType({ to })` decide si un objetivo normalizado
  debe tratarse como `direct`, `group` o `channel` antes de la búsqueda en el directorio.
- `messaging.targetResolver.looksLikeId(raw, normalized)` indica al núcleo si una entrada debe saltar directamente a la resolución tipo id en lugar de la búsqueda de directorio.
- `messaging.targetResolver.resolveTarget(...)` es el respaldo (fallback) del complemento cuando el núcleo necesita una resolución final propiedad del proveedor después de la normalización o después de un fallo en el directorio.
- `messaging.resolveOutboundSessionRoute(...)` gestiona la construcción de rutas de sesión específicas del proveedor una vez que se resuelve un objetivo.

División recomendada:

- Use `inferTargetChatType` para decisiones de categoría que deben ocurrir antes de buscar pares/grupos.
- Use `looksLikeId` para comprobaciones de "tratar esto como un id de objetivo explícito/nativo".
- Use `resolveTarget` para el respaldo de normalización específico del proveedor, no para una búsqueda amplia de directorio.
- Mantenga los ids nativos del proveedor como ids de chat, ids de hilo, JIDs, identificadores (handles) e ids de sala dentro de los valores `target` o parámetros específicos del proveedor, no en campos genéricos del SDK.

## Directorios respaldados por configuración

Los complementos que derivan entradas de directorio de la configuración deben mantener esa lógica en el complemento y reutilizar los asistentes compartidos de `openclaw/plugin-sdk/directory-runtime`.

Use esto cuando un canal necesite pares/grupos respaldados por configuración, tales como:

- pares de MD impulsados por lista de permitidos (allowlist)
- mapas de canal/grupo configurados
- respaldos de directorio estáticos con ámbito de cuenta

Los asistentes compartidos en `directory-runtime` solo manejan operaciones genéricas:

- filtrado de consultas
- aplicación de límites
- asistentes de deduplicación/normalización
- construcción de `ChannelDirectoryEntry[]`

La inspección de cuenta específica del canal y la normalización de ids deben permanecer en la implementación del complemento.

## Catálogos de proveedores

Los complementos de proveedores pueden definir catálogos de modelos para inferencia con `registerProvider({ catalog: { run(...) { ... } } })`.

`catalog.run(...)` devuelve la misma forma que OpenClaw escribe en `models.providers`:

- `{ provider }` para una entrada de proveedor
- `{ providers }` para múltiples entradas de proveedor

Use `catalog` cuando el complemento posee ids de modelo específicos del proveedor, valores predeterminados de URL base o metadatos de modelo restringidos por autenticación.

`catalog.order` controla cuándo se fusiona el catálogo de un complemento en relación con los proveedores implícitos integrados de OpenClaw:

- `simple`: proveedores de API-key sin formato o impulsados por env
- `profile`: proveedores que aparecen cuando existen perfiles de autenticación
- `paired`: proveedores que sintetizan múltiples entradas de proveedores relacionadas
- `late`: último pase, después de otros proveedores implícitos

Los proveedores posteriores ganan en caso de colisión de claves, por lo que los plugins pueden anular intencionalmente una entrada de proveedor integrada con el mismo id de proveedor.

Los plugins también pueden publicar filas de modelo de solo lectura a través de
`api.registerModelCatalogProvider({ provider, kinds, staticCatalog, liveCatalog
})`. Esta es la ruta para las superficies de lista/ayuda/selector y admite
filas `text`, `image_generation`, `video_generation` y `music_generation`.
Los plugins de proveedor todavía son propietarios de las llamadas en vivo al endpoint, el intercambio de tokens y el mapeo de respuestas del proveedor; el núcleo es propietario de la forma común de la fila, las etiquetas de origen y el formato de ayuda de la herramienta multimedia. Los registros de proveedores de generación multimedia sintetizan filas de catálogo estático automáticamente a partir de `defaultModel`, `models` y `capabilities`.

Compatibilidad:

- `discovery` todavía funciona como un alias heredado, pero emite una advertencia de obsolescencia
- si se registran tanto `catalog` como `discovery`, OpenClaw usa `catalog`
- `augmentModelCatalog` está obsoleto; los proveedores empaquetados deben publicar
  filas complementarias a través de `registerModelCatalogProvider`

## Inspección de canal de solo lectura

Si su plugin registra un canal, prefiera implementar
`plugin.config.inspectAccount(cfg, accountId)` junto con `resolveAccount(...)`.

Por qué:

- `resolveAccount(...)` es la ruta de tiempo de ejecución. Se le permite asumir que las credenciales
  están completamente materializadas y puede fallar rápido cuando faltan los secretos requeridos.
- Las rutas de comandos de solo lectura, como `openclaw status`, `openclaw status --all`,
  `openclaw channels status`, `openclaw channels resolve` y los flujos de reparación
  de doctor/config no deberían necesitar materializar las credenciales de tiempo de ejecución solo para
  describir la configuración.

Comportamiento recomendado de `inspectAccount(...)`:

- Devuelve solo el estado descriptivo de la cuenta.
- Preserva `enabled` y `configured`.
- Incluye campos de fuente/estado de credenciales cuando sea relevante, tales como:
  - `tokenSource`, `tokenStatus`
  - `botTokenSource`, `botTokenStatus`
  - `appTokenSource`, `appTokenStatus`
  - `signingSecretSource`, `signingSecretStatus`
- No es necesario devolver los valores sin procesar de los tokens solo para informar la disponibilidad de solo lectura. Devolver `tokenStatus: "available"` (y el campo fuente coincidente) es suficiente para los comandos de estilo de estado.
- Usa `configured_unavailable` cuando una credencial está configurada vía SecretRef pero no está disponible en la ruta de comando actual.

Esto permite que los comandos de solo lectura informen "configurado pero no disponible en esta ruta de comando" en lugar de fallar o informar erróneamente que la cuenta no está configurada.

## Paquetes de paquetes (Package packs)

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

Cada entrada se convierte en un complemento. Si el paquete enumera múltiples extensiones, el id del complemento se convierte en `name/<fileBase>`.

Si tu complemento importa dependencias de npm, instálalas en ese directorio para que `node_modules` esté disponible (`npm install` / `pnpm install`).

Salvaguarda de seguridad: cada entrada de `openclaw.extensions` debe permanecer dentro del directorio del complemento después de la resolución de enlaces simbólicos. Las entradas que escapan del directorio del paquete son rechazadas.

Nota de seguridad: `openclaw plugins install` instala las dependencias del complemento con un `npm install --omit=dev --ignore-scripts` local al proyecto (sin scripts de ciclo de vida, sin dependencias de desarrollo en tiempo de ejecución), ignorando la configuración heredada de instalación global de npm. Mantén los árboles de dependencias del complemento como "JS/TS puro" y evita paquetes que requieran compilaciones `postinstall`.

Opcional: `openclaw.setupEntry` puede apuntar a un módulo ligero solo de configuración.
Cuando OpenClaw necesita superficies de configuración para un complemento de canal deshabilitado, o
cuando un complemento de canal está habilitado pero aún sin configurar, carga `setupEntry`
en lugar de la entrada completa del complemento. Esto mantiene el inicio y la configuración más ligeros
cuando la entrada principal de tu complemento también conecta herramientas, ganchos u otro código
de solo tiempo de ejecución.

Opcional: `openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen`
puede optar por un complemento de canal para que siga la misma ruta `setupEntry` durante la fase
de inicio previa a la escucha del gateway, incluso cuando el canal ya está configurado.

Usa esto solo cuando `setupEntry` cubra completamente la superficie de inicio que debe existir
antes de que el gateway comience a escuchar. En la práctica, eso significa que la entrada de configuración
debe registrar cada capacidad propiedad del canal de la cual depende el inicio, tales como:

- el propio registro del canal
- cualquier ruta HTTP que debe estar disponible antes de que el gateway comience a escuchar
- cualquier método, herramienta o servicio del gateway que deba existir durante esa misma ventana

Si tu entrada completa todavía posee alguna capacidad de inicio requerida, no habilites
este indicador. Mantén el complemento con el comportamiento predeterminado y deja que OpenClaw cargue la
entrada completa durante el inicio.

Los canales empaquetados también pueden publicar auxiliares de superficie de contrato solo de configuración que el núcleo
puede consultar antes de que se cargue el tiempo de ejecución completo del canal. La superficie actual de
promoción de configuración es:

- `singleAccountKeysToMove`
- `namedAccountPromotionKeys`
- `resolveSingleAccountPromotionTarget(...)`

El núcleo usa esa superficie cuando necesita promover una configuración heredada de canal de cuenta única
a `channels.<id>.accounts.*` sin cargar la entrada completa del complemento.
Matrix es el ejemplo empaquetado actual: mueve solo las claves de autenticación/arranque a una
cuenta promovida con nombre cuando ya existen cuentas con nombre, y puede preservar una
clave de cuenta predeterminada no canónica configurada en lugar de crear siempre
`accounts.default`.

Esos adaptadores de parches de configuración mantienen el descubrimiento de la superficie de contrato empaquetada diferido. El tiempo
de importación se mantiene ligero; la superficie de promoción se carga solo en el primer uso en lugar de
volver a entrar en el inicio del canal empaquetado al importar el módulo.

Cuando esas superficies de inicio incluyan métodos RPC de la puerta de enlace, manténgalas en un
prefijo específico del complemento. Los espacios de nombres de administración principal (`config.*`,
`exec.approvals.*`, `wizard.*`, `update.*`) permanecen reservados y siempre se resuelven
a `operator.admin`, incluso si un complemento solicita un ámbito más estrecho.

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

Los complementos de canal pueden anunciar metadatos de configuración/descubrimiento a través de `openclaw.channel` e
indicaciones de instalación a través de `openclaw.install`. Esto mantiene el catálogo principal libre de datos.

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

Campos `openclaw.channel` útiles más allá del ejemplo mínimo:

- `detailLabel`: etiqueta secundaria para superficies de catálogo/estado más ricas
- `docsLabel`: anular el texto del enlace para el enlace de documentación
- `preferOver`: IDs de complemento/canal de menor prioridad que esta entrada de catálogo debe superar
- `selectionDocsPrefix`, `selectionDocsOmitLabel`, `selectionExtras`: controles de copia de la superficie de selección
- `markdownCapable`: marca el canal como capaz de manejar markdown para decisiones de formato de salida
- `exposure.configured`: oculta el canal de las superficies de listado de canales configurados cuando se establece en `false`
- `exposure.setup`: oculta el canal de los selectores de configuración/configuración interactiva cuando se establece en `false`
- `exposure.docs`: marca el canal como interno/privado para las superficies de navegación de la documentación
- `showConfigured` / `showInSetup`: alias heredados aún aceptados por compatibilidad; se prefiere `exposure`
- `quickstartAllowFrom`: optar por que el canal se incluya en el flujo estándar de inicio rápido `allowFrom`
- `forceAccountBinding`: requerir vinculación explícita de la cuenta incluso cuando solo existe una cuenta
- `preferSessionLookupForAnnounceTarget`: preferir la búsqueda de sesión al resolver objetivos de anuncio

OpenClaw también puede fusionar **catálogos de canales externos** (por ejemplo, una exportación de registro de MPM). Coloque un archivo JSON en uno de:

- `~/.openclaw/mpm/plugins.json`
- `~/.openclaw/mpm/catalog.json`
- `~/.openclaw/plugins/catalog.json`

O apunte `OPENCLAW_PLUGIN_CATALOG_PATHS` (o `OPENCLAW_MPM_CATALOG_PATHS`) a
uno o más archivos JSON (delimitados por comas/puntos y comas/`PATH`). Cada archivo debe
contener `{ "entries": [ { "name": "@scope/pkg", "openclaw": { "channel": {...}, "install": {...} } } ] }`. El analizador también acepta `"packages"` o `"plugins"` como alias heredados para la clave `"entries"`.

Las entradas generadas del catálogo de canales y las entradas del catálogo de instalación de proveedores exponen datos normalizados del origen de instalación junto al bloque `openclaw.install` en bruto. Los datos normalizados identifican si la especificación de npm es una versión exacta o un selector flotante, si los metadatos de integridad esperados están presentes y si una ruta de origen local también está disponible. Cuando se conoce la identidad del catálogo/paquete, los datos normalizados advierten si el nombre del paquete npm analizado se deriva de esa identidad. También advierten cuando `defaultChoice` no es válido o apunta a un origen que no está disponible, y cuando los metadatos de integridad de npm están presentes sin un origen de npm válido. Los consumidores deben tratar `installSource` como un campo opcional aditivo para que las entradas creadas manualmente y los adaptadores del catálogo no tengan que sintetizarlo. Esto permite que la incorporación y los diagnósticos expliquen el estado del plano de origen sin importar el tiempo de ejecución del complemento.

Las entradas externas oficiales de npm deben preferir un `npmSpec` exacto más
`expectedIntegrity`. Los nombres de paquetes simples y las etiquetas de distribución (dist-tags) aún funcionan para
compatibilidad, pero muestran advertencias del plano de origen para que el catálogo pueda moverse
hacia instalaciones fijas y verificadas por integridad sin romper los complementos existentes.
Al incorporar instalaciones desde una ruta de catálogo local, registra una entrada de índice de complemento
administrado con `source: "path"` y un `sourcePath` relativo al espacio de trabajo
cuando sea posible. La ruta de carga operativa absoluta permanece en
`plugins.load.paths`; el registro de instalación evita duplicar las rutas de la estación de trabajo local
en la configuración de larga duración. Esto mantiene las instalaciones de desarrollo local visibles para
los diagnósticos del plano de origen sin agregar una segunda superficie de divulgación de ruta del sistema de archivos sin procesar.
La fila SQLite persistente `installed_plugin_index` es la fuente
de verdad de la instalación y se puede actualizar sin cargar los módulos de tiempo de ejecución del complemento.
Su mapa `installRecords` es duradero incluso cuando falta un manifiesto de complemento o
es inválido; su carga útil `plugins` es una vista de manifiesto reconstruible.

## Complementos del motor de contexto

Los complementos del motor de contexto gestionan la orquestación del contexto de la sesión para la ingesta, el ensamblaje y la compactación. Regístrelos desde su complemento con `api.registerContextEngine(id, factory)` y luego seleccione el motor activo con `plugins.slots.contextEngine`.

Use esto cuando su complemento necesite reemplazar o extender la canalización de contexto predeterminada en lugar de simplemente agregar búsqueda de memoria o enlaces.

```ts
import { buildMemorySystemPromptAddition } from "openclaw/plugin-sdk/core";

export default function (api) {
  api.registerContextEngine("lossless-claw", (ctx) => ({
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

La fábrica `ctx` expone valores opcionales `config`, `agentDir` y `workspaceDir` para la inicialización en tiempo de construcción.

`assemble()` puede devolver `contextProjection` cuando el arnés activo tiene un subproceso de backend persistente. Omítalo para la heredada proyección por turno. Devuelva `{ mode: "thread_bootstrap", epoch }` cuando el contexto ensamblado deba inyectarse una vez en un subproceso de backend y reutilizarse hasta que cambie la época. Cambie la época después de que cambie el contexto semántico del motor, como después de un pase de compactación propiedad del motor. Los hosts pueden preservar los metadatos de llamada a herramienta, la forma de entrada y los resultados de herramientas redactados en una proyección de arranque de subproceso para que los subprocesos de backend nuevos retengan la continuidad de la herramienta sin copiar cargas útiles sin procesar que porten secretos.

Si su motor **no** posee el algoritmo de compactación, mantenga `compact()` implementado y delegúelo explícitamente:

```ts
import { buildMemorySystemPromptAddition, delegateCompactionToRuntime } from "openclaw/plugin-sdk/core";

export default function (api) {
  api.registerContextEngine("my-memory-engine", (ctx) => ({
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

Cuando un complemento necesita un comportamiento que no se ajusta a la API actual, no omita el sistema de complementos con un acceso privado. Agregue la capacidad faltante.

Secuencia recomendada:

1. definir el contrato principal
   Decida qué comportamiento compartido debe poseer el núcleo: política, reserva, fusión de configuración, ciclo de vida, semántica orientada al canal y forma del asistente de tiempo de ejecución.
2. agregar superficies de registro/tiempo de ejecución de complementos tipadas
   Extienda `OpenClawPluginApi` y/o `api.runtime` con la superficie de capacidad tipada más pequeña útil.
3. conectar núcleo + consumidores de canal/características
   Los canales y los complementos de características deben consumir la nueva capacidad a través del núcleo, no importando directamente una implementación de proveedor.
4. registrar implementaciones de proveedores
   Luego, los complementos de proveedores registran sus backends contra la capacidad.
5. agregar cobertura de contrato
   Agregue pruebas para que la propiedad y la forma de registro sigan siendo explícitas con el tiempo.

Así es como OpenClaw se mantiene con opiniones sin volverse codificado a la visión del mundo de un solo proveedor. Vea el [Capability Cookbook](/es/tools/capability-cookbook) para una lista de verificación de archivos concreta y un ejemplo trabajado.

### Lista de verificación de capacidad

Cuando agrega una nueva capacidad, la implementación generalmente debe tocar estas superfices juntas:

- tipos de contrato principal en `src/<capability>/types.ts`
- ejecutor principal/asistente de tiempo de ejecución en `src/<capability>/runtime.ts`
- superficie de registro de API de complementos en `src/plugins/types.ts`
- cableado del registro de complementos en `src/plugins/registry.ts`
- exposición del tiempo de ejecución del complemento en `src/plugins/runtime/*` cuando los complementos de características/canales necesitan consumirlo
- funciones auxiliares de captura/prueba en `src/test-utils/plugin-registration.ts`
- afirmaciones de propiedad/contrato en `src/plugins/contracts/registry.ts`
- documentación del operador/complemento en `docs/`

Si falta una de esas superficies, generalmente es una señal de que la capacidad aún no está completamente integrada.

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

- el núcleo posee el contrato de capacidad + orquestación
- los complementos de proveedores poseen las implementaciones de proveedores
- los complementos de características/canales consumen las funciones auxiliares de tiempo de ejecución
- las pruebas de contrato mantienen la propiedad explícita

## Relacionado

- [Arquitectura de complementos](/es/plugins/architecture) — modelo público de capacidad y formas
- [Subrutas del SDK de complementos](/es/plugins/sdk-subpaths)
- [Configuración del SDK de complementos](/es/plugins/sdk-setup)
- [Compilación de complementos](/es/plugins/building-plugins)
