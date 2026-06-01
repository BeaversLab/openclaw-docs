---
summary: "Guía de colaboradores para añadir una nueva capacidad compartida al sistema de complementos de OpenClaw"
read_when:
  - Adding a new core capability and plugin registration surface
  - Deciding whether code belongs in core, a vendor plugin, or a feature plugin
  - Wiring a new runtime helper for channels or tools
title: "Añadir capacidades (guía de colaboradores)"
sidebarTitle: "Añadir capacidades"
---

<Info>
  Esta es una **guía para colaboradores** para los desarrolladores del núcleo de OpenClaw. Si está construyendo un plugin externo, consulte [Construcción de plugins](/es/plugins/building-plugins) en su lugar. Para la referencia de arquitectura profunda (modelo de capacidad, propiedad, canalización de carga, asistentes de ejecución), consulte [Internos del plugin](/es/plugins/architecture).
</Info>

Use esto cuando OpenClaw necesite un dominio compartido nuevo como incrustaciones, generación
de imágenes, generación de video, o alguna área de características futura respaldada por un proveedor.

La regla:

- **complemento** = límite de propiedad
- **capacidad** = contrato principal compartido

No comience conectando directamente un proveedor a un canal o una herramienta. Comience definiendo la capacidad.

## Cuándo crear una capacidad

Cree una nueva capacidad cuando **todas** las siguientes condiciones sean verdaderas:

1. Más de un proveedor podría implementarlo de manera plausible.
2. Los canales, herramientas o complementos de características deberían consumirlo sin importar el proveedor.
3. Core debe ser el propietario del comportamiento de respaldo, políticas, configuración o entrega.

Si el trabajo es exclusivo de un proveedor y aún no existe un contrato compartido, deténgase y defina primero el contrato.

## La secuencia estándar

1. Defina el contrato principal tipado.
2. Añada el registro del complemento para ese contrato.
3. Añada un asistente de tiempo de ejecución compartido.
4. Conecte un complemento de proveedor real como prueba.
5. Mueva los consumidores de características/canales al asistente de tiempo de ejecución.
6. Añada pruebas de contrato.
7. Documente la configuración orientada al operador y el modelo de propiedad.

## Qué va dónde

**Core:**

- Tipos de solicitud/respuesta.
- Registro de proveedores + resolución.
- Comportamiento de respaldo.
- Esquema de configuración con metadatos de documentación `title` / `description` propagados en nodos de objeto anidado, comodín, elemento de matriz y composición.
- Superficie de ayuda en tiempo de ejecución.

**Plugin de proveedor:**

- Llamadas a la API del proveedor.
- Manejo de autenticación del proveedor.
- Normalización de solicitudes específica del proveedor.
- Registro de la implementación de la capacidad.

**Plugin de características/canal:**

- Llama a `api.runtime.*` o al asistente `plugin-sdk/*-runtime` correspondiente.
- Nunca llama a una implementación de proveedor directamente.

## Costuras del proveedor y del arnés

Use **ganchos del proveedor** cuando el comportamiento pertenezca al contrato del proveedor del modelo en lugar del bucle genérico del agente. Los ejemplos incluyen parámetros de solicitud específicos del proveedor después de la selección del transporte, preferencia del perfil de autenticación, superposiciones de avisos y enrutamiento de respaldo de seguimiento después de la conmutación por error del modelo/perfil.

Use **agent harness hooks** when the behavior belongs to the runtime that is executing a turn. Harnesses can classify successful-but-unusable attempt results such as empty, reasoning-only, or planning-only responses so the outer model fallback policy can make the retry decision.

Keep both seams narrow:

- Core owns the retry/fallback policy.
- Provider plugins own provider-specific request/auth/routing hints.
- Harness plugins own runtime-specific attempt classification.
- Third-party plugins return hints, not direct mutations of core state.

## File checklist

For a new capability, expect to touch these areas:

- `src/<capability>/types.ts`
- `src/<capability>/...registry/runtime.ts`
- `src/plugins/types.ts`
- `src/plugins/registry.ts`
- `src/plugins/captured-registration.ts`
- `src/plugins/contracts/registry.ts`
- `src/plugins/runtime/types-core.ts`
- `src/plugins/runtime/index.ts`
- `src/plugin-sdk/<capability>.ts`
- `src/plugin-sdk/<capability>-runtime.ts`
- Uno o más paquetes de complementos incluidos.
- Configuración, documentación, pruebas.

## Ejemplo práctico: generación de imágenes

La generación de imágenes sigue la forma estándar:

1. Core define `ImageGenerationProvider`.
2. Core expone `registerImageGenerationProvider(...)`.
3. Core expone `runtime.imageGeneration.generate(...)`.
4. Los complementos `openai`, `google`, `fal` y `minimax` registran implementaciones respaldadas por proveedores.
5. Los proveedores futuros registran el mismo contrato sin cambiar canales/herramientas.

La clave de configuración se separa intencionalmente del enrutamiento de análisis de visión:

- `agents.defaults.imageModel` analiza imágenes.
- `agents.defaults.imageGenerationModel` genera imágenes.

Mantenga esos elementos separados para que la reserva y la política sigan siendo explícitas.

## Proveedores de incrustaciones

Use `embeddingProviders` para proveedores reutilizables de incrustaciones de vectores. Este contrato
es intencionalmente más amplio que la memoria: herramientas, búsqueda, recuperación, importadores, o
complementos de características futuras pueden consumir incrustaciones sin depender del motor
de memoria.

La búsqueda de memoria puede consumir `embeddingProviders` genérico. El contrato
`memoryEmbeddingProviders` anterior está obsoleto por compatibilidad mientras los proveedores
existentes específicos de memoria migran; los nuevos proveedores de incrustaciones reutilizables deben usar
`embeddingProviders`.

## Lista de verificación de revisión

Antes de lanzar una nueva capacidad, verifique:

- Ningún canal/herramienta importa código de proveedor directamente.
- El asistente de tiempo de ejecución es la ruta compartida.
- Al menos una prueba de contrato afirme la propiedad agrupada.
- Los documentos de configuración nombran la nueva clave de modelo/configuración.
- Los documentos del complemento explican el límite de propiedad.

Si un PR se salta la capa de capacidad y codifica el comportamiento del proveedor en un canal/herramienta, devuélvalo y defina el contrato primero.

## Relacionado

- [Internos del plugin](/es/plugins/architecture) — modelo de capacidad, propiedad, canalización de carga, asistentes de ejecución.
- [Construcción de plugins](/es/plugins/building-plugins) — tutorial del primer plugin.
- [Descripción general del SDK](/es/plugins/sdk-overview) — mapa de importación y referencia de la API de registro.
- [Creación de habilidades](/es/tools/creating-skills) — superficie de colaboradores complementaria.
