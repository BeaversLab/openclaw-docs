---
summary: "Cookbook para agregar una nueva capacidad compartida a OpenClaw"
read_when:
  - Agregar una nueva capacidad central y superficie de registro de complementos
  - Decidir si el código pertenece al núcleo, un complemento de proveedor o un complemento de características
  - Conectar un nuevo asistente de tiempo de ejecución para canales o herramientas
title: "Capability Cookbook"
---

# Capability Cookbook

Use esto cuando OpenClaw necesite un nuevo dominio como generación de imágenes, generación de video
o alguna área de características futura respaldada por el proveedor.

La regla:

- complemento = límite de propiedad
- capacidad = contrato central compartido

Eso significa que no debes comenzar conectando un proveedor directamente a un canal o una
herramienta. Comienza definiendo la capacidad.

## Cuándo crear una capacidad

Cree una nueva capacidad cuando todos estos sean ciertos:

1. más de un proveedor podría implementarlo de manera plausible
2. los canales, herramientas o complementos de características deben consumirlo sin importarles
   el proveedor
3. el núcleo debe ser propietario del comportamiento de reserva, política, configuración o entrega

Si el trabajo es solo del proveedor y aún no existe un contrato compartido, deténgase y defina
primero el contrato.

## La secuencia estándar

1. Defina el contrato central tipado.
2. Agregue el registro del complemento para ese contrato.
3. Agregue un asistente de tiempo de ejecución compartido.
4. Conecte un complemento de proveedor real como prueba.
5. Mueva los consumidores de características/canales al asistente de tiempo de ejecución.
6. Agregue pruebas de contrato.
7. Documente la configuración orientada al operador y el modelo de propiedad.

## Qué va dónde

Núcleo:

- tipos de solicitud/respuesta
- registro de proveedores + resolución
- comportamiento de reserva
- esquema de configuración y etiquetas/ayuda
- superficie del asistente de tiempo de ejecución

Complemento de proveedor:

- llamadas a la API del proveedor
- manejo de autenticación del proveedor
- normalización de solicitudes específicas del proveedor
- registro de la implementación de la capacidad

Complemento de características/canal:

- llama a `api.runtime.*` o al asistente `plugin-sdk/*-runtime` coincidente
- nunca llama a una implementación de proveedor directamente

## Lista de verificación de archivos

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
- uno o más `extensions/<vendor>/...`
- config/docs/tests

## Ejemplo: generación de imágenes

La generación de imágenes sigue la forma estándar:

1. core define `ImageGenerationProvider`
2. core expone `registerImageGenerationProvider(...)`
3. core expone `runtime.imageGeneration.generate(...)`
4. los plugins `openai` y `google` registran implementaciones respaldadas por proveedores
5. los proveedores futuros pueden registrar el mismo contrato sin cambiar canales/herramientas

La clave de configuración es independiente del enrutamiento de análisis de visión:

- `agents.defaults.imageModel` = analizar imágenes
- `agents.defaults.imageGenerationModel` = generar imágenes

Manténgalos separados para que la reserva y la política sigan siendo explícitas.

## Lista de verificación de revisión

Antes de lanzar una nueva capacidad, verifique:

- ningún canal/herramienta importa código de proveedor directamente
- el asistente de tiempo de ejecución es la ruta compartida
- al menos una prueba de contrato afirma la propiedad agrupada
- los documentos de configuración nombran la nueva clave de modelo/configuración
- los documentos del complemento explican el límite de propiedad

Si un PR omite la capa de capacidad y codifica el comportamiento del proveedor en un canal/herramienta, devuélvalo y defina el contrato primero.

import en from "/components/footer/en.mdx";

<en />
