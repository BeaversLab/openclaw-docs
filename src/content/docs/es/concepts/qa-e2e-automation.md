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

Ese carril tiene como objetivo un grupo real privado de Telegram en lugar de
aprovisionar un servidor desechable. Requiere `OPENCLAW_QA_TELEGRAM_GROUP_ID`,
`OPENCLAW_QA_TELEGRAM_DRIVER_BOT_TOKEN` y
`OPENCLAW_QA_TELEGRAM_SUT_BOT_TOKEN`, además de dos bots distintos en el mismo
grupo privado. El bot SUT debe tener un nombre de usuario de Telegram, y la
observación de bot a bot funciona mejor cuando ambos bots tienen el Modo de
comunicación de bot a bot habilitado en `@BotFather`.

Los carriles de transporte en vivo ahora comparten un contrato más pequeño en lugar de que cada uno invente
su propia forma de lista de escenarios:

`qa-channel` sigue siendo la suite amplia de comportamiento
sintético del producto y no forma parte de la matriz de cobertura del transporte
en vivo.

| Carril   | Canario | Bloqueo de mención | Bloqueo de lista de permitidos | Respuesta de nivel superior | Reanudación del reinicio | Seguimiento de hilo | Aislamiento de hilo | Observación de reacción | Comando de ayuda |
| -------- | ------- | ------------------ | ------------------------------ | --------------------------- | ------------------------ | ------------------- | ------------------- | ----------------------- | ---------------- |
| Matrix   | x       | x                  | x                              | x                           | x                        | x                   | x                   | x                       |                  |
| Telegram | x       |                    |                                |                             |                          |                     |                     |                         | x                |

Esto mantiene a `qa-channel` como la suite amplia de comportamiento
del producto, mientras que Matrix, Telegram y futuros transportes en vivo
comparten una lista de verificación explícita de contratos de transporte.

Para un carril de VM Linux desechable sin traer Docker a la ruta de QA, ejecute:

```bash
pnpm openclaw qa suite --runner multipass --scenario channel-chat-baseline
```

Esto inicia un invitado nuevo de Multipass, instala dependencias, construye
OpenClaw dentro del invitado, ejecuta `qa suite`, luego copia
el informe y el resumen de QA normales de vuelta a `.artifacts/qa-e2e/...`
en el host.
Reutiliza el mismo comportamiento de selección de escenarios que
`qa suite` en el host.
Las ejecuciones de suites en el host y en Multipass ejecutan múltiples escenarios
seleccionados en paralelo con trabajadores de puerta de enlace aislados de forma
predeterminada, hasta 64 trabajadores o el recuento de escenarios seleccionado.
Use `--concurrency <count>` para ajustar el recuento de trabajadores, o
`--concurrency 1` para ejecución en serie.
Las ejecuciones en vivo reenvían las entradas de autenticación de QA admitidas
que son prácticas para el invitado: claves de proveedor basadas en variables de
entorno, la ruta de configuración del proveedor en vivo de QA y
`CODEX_HOME` cuando está presente. Mantenga `--output-dir`
debajo de la raíz del repositorio para que el invitado pueda volver a escribir
a través del espacio de trabajo montado.

## Semillas respaldadas por repositorio

Los activos de semilla viven en `qa/`:

- `qa/scenarios/index.md`
- `qa/scenarios/<theme>/*.md`

Estos están intencionalmente en git para que el plan de QA sea visible tanto para humanos como para el agente.

`qa-lab` debe seguir siendo un ejecutor de markdown genérico. Cada archivo de escenario de markdown es
la fuente de verdad para una ejecución de prueba y debe definir:

- metadatos del escenario
- metadatos opcionales de categoría, capacidad, carril y riesgo
- documentación y referencias de código
- requisitos de complemento opcionales
- parche de configuración de gateway opcional
- el `qa-flow` ejecutable

Se permite que la superficie de tiempo de ejecución reutilizable que respalda a `qa-flow` se mantenga genérica
y transversal. Por ejemplo, los escenarios de markdown pueden combinar asistentes del lado del transporte
con asistentes del lado del navegador que impulsan la interfaz de usuario de Control integrada a través de la
costura `browser.request` de Gateway sin agregar un ejecutor de caso especial.

Los archivos de escenarios deben agruparse por capacidad del producto en lugar de por carpeta del árbol de fuentes.
Mantenga los ID de escenarios estables cuando se muevan los archivos; use `docsRefs` y `codeRefs`
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

`qa suite` tiene dos carriles simulados de proveedor locales:

- `mock-openai` es el simulador de OpenClaw con reconocimiento de escenarios. Sigue siendo el carril
  simulado determinista predeterminado para QA con respaldo en repositorio y puertas de paridad.
- `aimock` inicia un servidor de proveedor respaldado por AIMock para protocolo experimental,
  accesorios, grabación/reproducción y cobertura de caos. Es aditivo y no
  reemplaza al despachador de escenarios `mock-openai`.

La implementación del carril del proveedor reside en `extensions/qa-lab/src/providers/`.
Cada proveedor posee sus valores predeterminados, el inicio del servidor local, la configuración del modelo de gateway,
las necesidades de almacenamiento de perfiles de autenticación y las banderas de capacidad en vivo/simulado. El código compartido y el
código de gateway deben enrutar a través del registro del proveedor en lugar de bifurcarse en los
nombres de los proveedores.

## Adaptadores de transporte

`qa-lab` posee una costura de transporte genérica para escenarios de QA en markdown.
`qa-channel` es el primer adaptador en esa costura, pero el objetivo de diseño es más amplio:
los canales reales o sintéticos futuros deben conectarse al mismo ejecutor de suite
en lugar de agregar un ejecutor de QA específico del transporte.

A nivel de arquitectura, la división es:

- `qa-lab` se encarga de la ejecución genérica de escenarios, la concurrencia de trabajadores, la escritura de artefactos y los informes.
- el adaptador de transporte se encarga de la configuración de la puerta de enlace, la preparación, la observación de entrada y salida, las acciones de transporte y el estado de transporte normalizado.
- los archivos de escenarios markdown bajo `qa/scenarios/` definen la ejecución de la prueba; `qa-lab` proporciona la superficie de ejecución reutilizable que los ejecuta.

La guía de adopción para mantenedores de nuevos adaptadores de canal se encuentra en
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

El comando ejecuta procesos secundarios locales de la puerta de enlace de QA, no Docker. Los escenarios de evaluación de caracteres deben establecer el personaje a través de `SOUL.md`, luego ejecutar turnos de usuario ordinarios como chat, ayuda del espacio de trabajo y pequeñas tareas de archivos. No se debe informar al modelo candidato que está siendo evaluado. El comando conserva cada transcripción completa, registra estadísticas básicas de ejecución y luego pide a los modelos jueces en modo rápido con razonamiento `xhigh` que clasifiquen las ejecuciones por naturalidad, ambiente y humor. Use `--blind-judge-models` al comparar proveedores: el aviso del juez todavía recibe cada transcripción y estado de ejecución, pero las referencias de los candidatos se reemplazan con etiquetas neutras como `candidate-01`; el informe mapea las clasificaciones de vuelta a las referencias reales después del análisis. Las ejecuciones de los candidatos por defecto a pensamiento `high`, con `xhigh` para los modelos de OpenAI que lo soportan. Anule un candidato específico en línea con `--model provider/model,thinking=<level>`. `--thinking <level>` todavía establece un respaldo global, y la forma más antigua `--model-thinking <provider/model=level>` se mantiene por compatibilidad. Las referencias de los candidatos de OpenAI por defecto al modo rápido, por lo que se utiliza el procesamiento prioritario donde el proveedor lo soporta. Agregue `,fast`, `,no-fast`, o `,fast=false` en línea cuando un solo candidato o juez necesite una anulación. Pase `--fast` solo cuando desee forzar el modo rápido para cada modelo candidato. Las duraciones de los candidatos y los jueces se registran en el informe para el análisis de referencia, pero los avisos de los jueces dicen explícitamente que no clasifiquen por velocidad. Las ejecuciones de los modelos candidatos y de los jueces por defecto a una concurrencia de 16. Reduzca `--concurrency` o `--judge-concurrency` cuando los límites del proveedor o la presión de la puerta de enlace local hagan que una ejecución sea demasiado ruidosa. Cuando no se pasa ningún candidato `--model`, la evaluación de caracteres por defecto a `openai/gpt-5.4`, `openai/gpt-5.2`, `openai/gpt-5`, `anthropic/claude-opus-4-6`, `anthropic/claude-sonnet-4-6`, `zai/glm-5.1`, `moonshot/kimi-k2.5`, y `google/gemini-3.1-pro-preview` cuando no se pasa ningún `--model`. Cuando no se pasa ningún `--judge-model`, los jueces por defecto a `openai/gpt-5.4,thinking=xhigh,fast` y `anthropic/claude-opus-4-6,thinking=high`.

## Documentos relacionados

- [Pruebas](/es/help/testing)
- [Canal de QA](/es/channels/qa-channel)
- [Panel](/es/web/dashboard)
