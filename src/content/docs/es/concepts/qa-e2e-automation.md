---
summary: "Forma de automatización de QA privada para qa-lab, qa-channel, escenarios sembrados e informes de protocolo"
read_when:
  - Extending qa-lab or qa-channel
  - Adding repo-backed QA scenarios
  - Building higher-realism QA automation around the Gateway dashboard
title: "Automatización E2E de QA"
---

# Automatización E2E de QA

La pila privada de QA está diseñada para ejercitar OpenClaw de una manera más realista,
con forma de canal, de lo que puede hacer una sola prueba unitaria.

Piezas actuales:

- `extensions/qa-channel`: canal de mensajes sintético con MD, canal, hilo,
  reacción, editar y eliminar superficies.
- `extensions/qa-lab`: interfaz de usuario del depurador y bus de QA para observar la transcripción,
  inyectar mensajes entrantes y exportar un informe Markdown.
- `qa/`: activos semilla respaldados por repositorio para la tarea de inicio y escenarios de QA
  de línea base.

El flujo actual del operador de QA es un sitio de QA de dos paneles:

- Izquierda: panel de Gateway (Interfaz de usuario de control) con el agente.
- Derecha: QA Lab, mostrando la transcripción tipo Slack y el plan de escenarios.

Ejecútelo con:

```bash
pnpm qa:lab:up
```

Eso construye el sitio de QA, inicia el carril de puerta de enlace respaldado por Docker y expone la
página QA Lab donde un operador o bucle de automatización puede dar al agente una misión de QA,
observar el comportamiento real del canal y registrar lo que funcionó, falló o
se mantuvo bloqueado.

Para una iteración más rápida de la interfaz de usuario de QA Lab sin reconstruir la imagen de Docker cada vez,
inicie la pila con un paquete QA Lab montado con bind:

```bash
pnpm openclaw qa docker-build-image
pnpm qa:lab:build
pnpm qa:lab:up:fast
pnpm qa:lab:watch
```

`qa:lab:up:fast` mantiene los servicios Docker en una imagen precompilada y monta `extensions/qa-lab/web/dist` en el contenedor `qa-lab`. `qa:lab:watch`
reconstruye ese paquete cuando hay cambios y el navegador se recarga automáticamente cuando cambia el hash del activo de QA Lab.

Para un carril de humo (smoke lane) de transporte real de Matrix, ejecute:

```bash
pnpm openclaw qa matrix
```

Ese carril aprovisiona un homeserver Tuwunel desechable en Docker, registra
usuarios temporales de controlador, SUT y observador, crea una sala privada,
luego ejecuta el complemento real de Matrix dentro de un hijo de puerta de
enlace de QA. El carril de transporte en vivo mantiene la configuración del
hijo limitada al transporte bajo prueba, por lo que Matrix se ejecuta sin
`qa-channel` en la configuración del hijo. Escribe los artefactos
del informe estructurado y un registro combinado de stdout/stderr en el directorio
de salida de QA de Matrix seleccionado. Para capturar también la salida de
construcción/iniciador externa `scripts/run-node.mjs`, establezca
`OPENCLAW_RUN_NODE_OUTPUT_LOG=<path>` en un archivo de registro local del repositorio.

Para un carril de humo de transporte real de Telegram, ejecute:

```bash
pnpm openclaw qa telegram
```

Ese lane apunta a un grupo privado real de Telegram en lugar de aprovisionar un
servidor desechable. Requiere `OPENCLAW_QA_TELEGRAM_GROUP_ID`,
`OPENCLAW_QA_TELEGRAM_DRIVER_BOT_TOKEN` y
`OPENCLAW_QA_TELEGRAM_SUT_BOT_TOKEN`, además de dos bots distintos en el mismo
grupo privado. El bot SUT debe tener un nombre de usuario de Telegram, y la
observación de bot a bot funciona mejor cuando ambos bots tienen el Modo de
Comunicación Bot-a-Bot habilitado en `@BotFather`.
El comando sale con un valor distinto de cero cuando falla cualquier escenario.
Use `--allow-failures` cuando desee artefactos sin un código de salida fallido.

Los carriles de transporte en vivo ahora comparten un contrato más pequeño en lugar de que cada uno invente
su propia forma de lista de escenarios:

`qa-channel` sigue siendo la suite sintética amplia de comportamiento del
producto y no es parte de la matriz de cobertura de transporte en vivo.

| Carril   | Canario | Bloqueo de mención | Bloqueo de lista de permitidos | Respuesta de nivel superior | Reanudación del reinicio | Seguimiento de hilo | Aislamiento de hilo | Observación de reacción | Comando de ayuda |
| -------- | ------- | ------------------ | ------------------------------ | --------------------------- | ------------------------ | ------------------- | ------------------- | ----------------------- | ---------------- |
| Matrix   | x       | x                  | x                              | x                           | x                        | x                   | x                   | x                       |                  |
| Telegram | x       |                    |                                |                             |                          |                     |                     |                         | x                |

Esto mantiene `qa-channel` como la suite amplia de comportamiento del producto
mientras que Matrix, Telegram y futuros transportes en vivo comparten una lista
de verificación de contrato de transporte explícita.

Para un carril de VM Linux desechable sin traer Docker a la ruta de QA, ejecute:

```bash
pnpm openclaw qa suite --runner multipass --scenario channel-chat-baseline
```

Esto inicia un huésped Multipass nuevo, instala dependencias, compila OpenClaw
dentro del huésped, ejecuta `qa suite` y luego copia el informe de QA normal
y el resumen de vuelta a `.artifacts/qa-e2e/...` en el host.
Reutiliza el mismo comportamiento de selección de escenarios que `qa suite` en el host.
Las ejecuciones de suites en el host y en Multipass ejecutan múltiples escenarios
seleccionados en paralelo con trabajadores de gateway aislados de forma predeterminada.
`qa-channel` tiene una concurrencia predeterminada de 4, limitada por la
cantidad de escenarios seleccionados. Use `--concurrency <count>` para ajustar la
cantidad de trabajadores, o `--concurrency 1` para ejecución en serie.
El comando sale con un valor distinto de cero cuando falla cualquier escenario.
Use `--allow-failures` cuando desee artefactos sin un código de salida fallido.
Las ejecuciones en vivo reenvían las entradas de autenticación de QA admitidas que
son prácticas para el huésped: claves de proveedor basadas en entorno, la ruta de
configuración del proveedor en vivo de QA y `CODEX_HOME` cuando está presente.
Mantenga `--output-dir` bajo la raíz del repositorio para que el huésped
pueda escribir de vuelta a través del espacio de trabajo montado.

## Semillas respaldadas por repositorio

Los recursos semilla viven en `qa/`:

- `qa/scenarios/index.md`
- `qa/scenarios/<theme>/*.md`

Estos están intencionalmente en git para que el plan de QA sea visible tanto para humanos como para el agente.

`qa-lab` debe seguir siendo un ejecutor de markdown genérico. Cada archivo
markdown de escenario es la fuente de verdad para una ejecución de prueba y debe definir:

- metadatos del escenario
- metadatos opcionales de categoría, capacidad, carril y riesgo
- documentación y referencias de código
- requisitos de complemento opcionales
- parche de configuración de gateway opcional
- el ejecutable `qa-flow`

La superficie de runtime reutilizable que respalda `qa-flow` puede permanecer genérica
y transversal. Por ejemplo, los escenarios de markdown pueden combinar auxiliares del lado del transporte
con auxiliares del lado del navegador que controlan la interfaz de usuario de Control integrada a través de
la costura `browser.request` de Gateway sin agregar un runner de caso especial.

Los archivos de escenarios deben agruparse por capacidad del producto en lugar de por carpeta del árbol de origen.
Mantenga los ID de los escenarios estables cuando se muevan los archivos; use `docsRefs` y `codeRefs`
para la trazabilidad de la implementación.

La lista base debe mantenerse lo suficientemente amplia para cubrir:

- chat de MD y canal
- comportamiento del hilo
- ciclo de vida de la acción del mensaje
- devoluciones de llamada cron
- recuperación de memoria
- cambio de modelo
- transferencia de subagente
- lectura de repositorio y lectura de documentos
- una pequeña tarea de compilación como Lobster Invaders

## Carriles simulados de proveedor

`qa suite` tiene dos carriles (lanes) de simulación (mock) de proveedor locales:

- `mock-openai` es el simulador OpenClaw consciente de escenarios. Sigue siendo el carril
  de simulación determinista predeterminado para QA respaldado por repositorio y puertas de paridad.
- `aimock` inicia un servidor de proveedor respaldado por AIMock para protocolo experimental,
  accesorios (fixtures), grabación/reproducción y cobertura de caos. Es aditivo y no
  reemplaza al despachador de escenarios `mock-openai`.

La implementación del carril del proveedor reside bajo `extensions/qa-lab/src/providers/`.
Cada proveedor posee sus valores predeterminados, el inicio del servidor local, la configuración del modelo de puerta de enlace,
las necesidades de preparación del perfil de autenticación y los indicadores de capacidad en vivo/simulados. El código compartido del suite y
de la puerta de enlace debe enrutar a través del registro del proveedor en lugar de bifurcarse según
los nombres de los proveedores.

## Adaptadores de transporte

`qa-lab` posee una costura de transporte genérica para escenarios QA de markdown.
`qa-channel` es el primer adaptador en esa costura, pero el objetivo de diseño es más amplio:
los canales reales o sintéticos futuros deben conectarse al mismo ejecutor de suites
en lugar de agregar un ejecutor de QA específico del transporte.

A nivel de arquitectura, la división es:

- `qa-lab` posee la ejecución genérica de escenarios, la concurrencia de trabajadores, la escritura de artefactos y los informes.
- el adaptador de transporte se encarga de la configuración de la puerta de enlace, la preparación, la observación de entrada y salida, las acciones de transporte y el estado de transporte normalizado.
- los archivos de escenarios de markdown bajo `qa/scenarios/` definen la ejecución de la prueba; `qa-lab` proporciona la superficie de runtime reutilizable que los ejecuta.

La guía de adopción orientada a los mantenedores para nuevos adaptadores de canal se encuentra en
[Testing](/es/help/testing#adding-a-channel-to-qa).

## Informes

`qa-lab` exporta un informe de protocolo Markdown a partir de la línea de tiempo del bus observado.
El informe debe responder:

- Qué funcionó
- Qué falló
- Qué permaneció bloqueado
- Qué escenarios de seguimiento vale la pena agregar

Para verificaciones de carácter y estilo, ejecute el mismo escenario en múltiples referencias de modelo en vivo
y escriba un informe Markdown juzgado:

```bash
pnpm openclaw qa character-eval \
  --model openai/gpt-5.4,thinking=xhigh \
  --model openai/gpt-5.2,thinking=xhigh \
  --model openai/gpt-5,thinking=xhigh \
  --model anthropic/claude-opus-4-6,thinking=high \
  --model anthropic/claude-sonnet-4-6,thinking=high \
  --model zai/glm-5.1,thinking=high \
  --model moonshot/kimi-k2.5,thinking=high \
  --model google/gemini-3.1-pro-preview,thinking=high \
  --judge-model openai/gpt-5.4,thinking=xhigh,fast \
  --judge-model anthropic/claude-opus-4-6,thinking=high \
  --blind-judge-models \
  --concurrency 16 \
  --judge-concurrency 16
```

El comando ejecuta procesos secundarios locales de la puerta de enlace de QA, no Docker. Los escenarios de evaluación de caracteres deben establecer el personaje a través de `SOUL.md` y luego ejecutar turnos de usuario ordinarios como chat, ayuda del espacio de trabajo y pequeñas tareas de archivos. No se debe informar al modelo candidato que está siendo evaluado. El comando conserva cada transcripción completa, registra estadísticas básicas de ejecución y luego pide a los modelos jueces en modo rápido con razonamiento `xhigh` que clasifiquen las ejecuciones por naturalidad, ambiente y humor. Use `--blind-judge-models` al comparar proveedores: el aviso del juez todavía recibe cada transcripción y estado de ejecución, pero las referencias de los candidatos se reemplazan por etiquetas neutrales como `candidate-01`; el informe asigna las clasificaciones a las referencias reales después del análisis. Las ejecuciones de los candidatos tienen por defecto el pensamiento `high`, con `xhigh` para los modelos de OpenAI que lo admiten. Anule un candidato específico en línea con `--model provider/model,thinking=<level>`. `--thinking <level>` todavía establece un respaldo global, y la forma más antigua `--model-thinking <provider/model=level>` se mantiene por compatibilidad. Las referencias de los candidatos de OpenAI tienen por defecto el modo rápido, por lo que se utiliza el procesamiento prioritario donde el proveedor lo admite. Agregue `,fast`, `,no-fast` o `,fast=false` en línea cuando un solo candidato o juez necesite una anulación. Pase `--fast` solo cuando desee forzar el modo rápido para cada modelo candidato. Las duraciones del candidato y del juez se registran en el informe para el análisis de referencia, pero los avisos de los jueces indican explícitamente que no clasifiquen por velocidad. Las ejecuciones de los modelos de candidatos y jueces tienen por defecto una concurrencia de 16. Reduzca `--concurrency` o `--judge-concurrency` cuando los límites del proveedor o la presión de la puerta de enlace local hagan que una ejecución sea demasiado ruidosa. Cuando no se pasa ningún candidato `--model`, la evaluación de caracteres tiene por defecto `openai/gpt-5.4`, `openai/gpt-5.2`, `openai/gpt-5`, `anthropic/claude-opus-4-6`, `anthropic/claude-sonnet-4-6`, `zai/glm-5.1`, `moonshot/kimi-k2.5` y `google/gemini-3.1-pro-preview` cuando no se pasa ningún `--model`. Cuando no se pasa ningún `--judge-model`, los jueces tienen por defecto `openai/gpt-5.4,thinking=xhigh,fast` y `anthropic/claude-opus-4-6,thinking=high`.

## Documentos relacionados

- [Pruebas](/es/help/testing)
- [Canal de QA](/es/channels/qa-channel)
- [Panel](/es/web/dashboard)
