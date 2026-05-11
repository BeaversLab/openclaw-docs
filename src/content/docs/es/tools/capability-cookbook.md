---
summary: "Guía del colaborador para añadir una nueva capacidad compartida al sistema de complementos de OpenClaw"
read_when:
  - Adding a new core capability and plugin registration surface
  - Deciding whether code belongs in core, a vendor plugin, or a feature plugin
  - Wiring a new runtime helper for channels or tools
title: "Añadir capacidades (guía para colaboradores)"
sidebarTitle: "Añadir capacidades"
---

<Info>Esta es una **guía para colaboradores** para los desarrolladores del núcleo de OpenClaw. Si estás construyendo un plugin externo, consulta [Construcción de Plugins](/es/plugins/building-plugins) en su lugar.</Info>

Use esto cuando OpenClaw necesite un nuevo dominio como la generación de imágenes, generación de
video, o alguna área de características futura respaldada por un proveedor.

La regla:

- plugin = límite de propiedad
- capacidad = contrato central compartido

Eso significa que no debes comenzar conectando un proveedor directamente a un canal o una
herramienta. Comienza definiendo la capacidad.

## Cuándo crear una capacidad

Cree una nueva capacidad cuando todo lo siguiente sea cierto:

1. más de un proveedor podría implementarla plausiblemente
2. los canales, herramientas o plugins de características deben consumirla sin importar
   el proveedor
3. el núcleo necesita ser dueño del comportamiento de respaldo, política, configuración o entrega

Si el trabajo es solo del proveedor y aún no existe un contrato compartido, deténgase y defina
primero el contrato.

## La secuencia estándar

1. Defina el contrato central tipado.
2. Añada el registro del plugin para ese contrato.
3. Añada un asistente de tiempo de ejecución compartido.
4. Conecte un plugin de proveedor real como prueba.
5. Mueva los consumidores de características/canales al asistente de tiempo de ejecución.
6. Añada pruebas de contrato.
7. Documente la configuración orientada al operador y el modelo de propiedad.

## Qué va dónde

Núcleo:

- tipos de solicitud/respuesta
- registro de proveedores + resolución
- comportamiento de respaldo
- esquema de configuración más metadatos de documentación propagados `title` / `description` en nodos de objeto anidado, comodín, elemento de matriz y composición
- superficie del asistente de tiempo de ejecución

Plugin de proveedor:

- llamadas a la API del proveedor
- manejo de autenticación del proveedor
- normalización de solicitudes específica del proveedor
- registro de la implementación de la capacidad

Plugin de característica/canal:

- llama a `api.runtime.*` o al asistente `plugin-sdk/*-runtime` correspondiente
- nunca llama a una implementación de proveedor directamente

## Costuras del proveedor y del arnés

Use los ganchos del proveedor cuando el comportamiento pertenezca al contrato del proveedor del modelo
en lugar del bucle genérico del agente. Los ejemplos incluyen parámetros de solicitud
específicos del proveedor después de la selección del transporte, preferencia de perfil de autenticación, superposiciones de instrucciones (prompt overlays), y
enrutamiento de respaldo de seguimiento después de la conmutación por error de modelo/perfil.

Use los hooks del arnés del agente cuando el comportamiento pertenezca al tiempo de ejecución que está ejecutando un turno. Los arneses pueden clasificar resultados de intentos exitosos pero inutilizables, como respuestas vacías, de solo razonamiento o de solo planificación, para que la política de respaldo del modelo externo pueda tomar la decisión de reintentar.

Mantenga ambas uniones estrechas:

- core es propietario de la política de reintentos/respaldo
- los complementos del proveedor son propietarios de las pistas de solicitud/autenticación/enrutamiento específicas del proveedor
- los complementos del arnés son propietarios de la clasificación de intentos específica del tiempo de ejecución
- los complementos de terceros devuelven pistas, no mutaciones directas del estado de core

## Lista de archivos

Para una nueva capacidad, espere tocar estas áreas:

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
- uno o más paquetes de complementos incluidos
- config/docs/tests

## Ejemplo: generación de imágenes

La generación de imágenes sigue la forma estándar:

1. core define `ImageGenerationProvider`
2. core expone `registerImageGenerationProvider(...)`
3. core expone `runtime.imageGeneration.generate(...)`
4. los complementos `openai`, `google`, `fal` y `minimax` registran implementaciones respaldadas por proveedores
5. los proveedores futuros pueden registrar el mismo contrato sin cambiar los canales/herramientas

La clave de configuración es independiente del enrutamiento de análisis de visión:

- `agents.defaults.imageModel` = analizar imágenes
- `agents.defaults.imageGenerationModel` = generar imágenes

Menga esos separados para que el respaldo y la política sigan siendo explícitos.

## Lista de revisión

Antes de lanzar una nueva capacidad, verifique:

- ningún canal/herramienta importa código de proveedor directamente
- el asistente de tiempo de ejecución es la ruta compartida
- al menos una prueba de contrato afirma la propiedad incluida
- los documentos de config nombran la nueva clave de modelo/configuración
- los documentos del complemento explican el límite de propiedad

Si un PR omite la capa de capacidad y codifica el comportamiento del proveedor en un canal/herramienta, devuélvalo y defina el contrato primero.

## Relacionado

- [Complemento](/es/tools/plugin)
- [Crear habilidades](/es/tools/creating-skills)
- [Herramientas y complementos](/es/tools)
