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

Ese carril aprovisiona un servidor doméstico Tuwunel desechable en Docker, registra
usuarios temporales de controlador, SUT y observador, crea una sala privada y luego ejecuta
el complemento real de Matrix dentro de un hijo de puerta de enlace de QA. El carril de transporte en vivo mantiene
la configuración del hijo limitada al transporte bajo prueba, por lo que Matrix se ejecuta sin
`qa-channel` en la configuración del hijo.

Para un carril de humo de transporte real de Telegram, ejecute:

```bash
pnpm openclaw qa telegram
```

Ese carril tiene como objetivo un grupo privado real de Telegram en lugar de aprovisionar un
servidor desechable. Requiere `OPENCLAW_QA_TELEGRAM_GROUP_ID`,
`OPENCLAW_QA_TELEGRAM_DRIVER_BOT_TOKEN` y
`OPENCLAW_QA_TELEGRAM_SUT_BOT_TOKEN`, además de dos bots distintos en el mismo
grupo privado. El bot SUT debe tener un nombre de usuario de Telegram y la observación
bot a bot funciona mejor cuando ambos bots tienen el Modo de comunicación bot a bot
habilitado en `@BotFather`.

Los carriles de transporte en vivo ahora comparten un contrato más pequeño en lugar de que cada uno invente
su propia forma de lista de escenarios:

`qa-channel` sigue siendo el conjunto amplio de comportamiento de producto sintético y no es parte
de la matriz de cobertura de transporte en vivo.

| Carril   | Canario | Bloqueo de mención | Bloqueo de lista de permitidos | Respuesta de nivel superior | Reanudación del reinicio | Seguimiento de hilo | Aislamiento de hilo | Observación de reacción | Comando de ayuda |
| -------- | ------- | ------------------ | ------------------------------ | --------------------------- | ------------------------ | ------------------- | ------------------- | ----------------------- | ---------------- |
| Matrix   | x       | x                  | x                              | x                           | x                        | x                   | x                   | x                       |                  |
| Telegram | x       |                    |                                |                             |                          |                     |                     |                         | x                |

Esto mantiene `qa-channel` como la suite amplia de comportamiento del producto mientras que Matrix,
Telegram y futuros transportes en vivo comparten una lista de verificación
explícita del contrato de transporte.

Para un carril de VM Linux desechable sin traer Docker a la ruta de QA, ejecute:

```bash
pnpm openclaw qa suite --runner multipass --scenario channel-chat-baseline
```

Esto inicia un invitado Multipass nuevo, instala dependencias, construye OpenClaw
dentro del invitado, ejecuta `qa suite`, y luego copia el reporte de QA normal y
el resumen de vuelta a `.artifacts/qa-e2e/...` en el host.
Reutiliza el mismo comportamiento de selección de escenarios que `qa suite` en el host.
Las ejecuciones de suite en el host y en Multipass ejecutan múltiples escenarios seleccionados en paralelo
con trabajadores de puerta de enlace aislados por defecto, hasta 64 trabajadores o la cantidad de escenarios
seleccionada. Use `--concurrency <count>` para ajustar la cantidad de trabajadores, o
`--concurrency 1` para ejecución en serie.
Las ejecuciones en vivo reenvían las entradas de autenticación QA compatibles que sean prácticas para el
invitado: claves de proveedor basadas en entorno, la ruta de configuración del proveedor vivo de QA, y
`CODEX_HOME` cuando está presente. Mantenga `--output-dir` bajo la raíz del repositorio para que el invitado
pueda escribir de vuelta a través del espacio de trabajo montado.

## Semillas respaldadas por repositorio

Los activos semilla viven en `qa/`:

- `qa/scenarios/index.md`
- `qa/scenarios/*.md`

Estos están intencionalmente en git para que el plan de QA sea visible tanto para humanos como para el
agente. La lista base debe mantenerse lo suficientemente amplia para cubrir:

- Chat de MD y canal
- comportamiento de hilos
- ciclo de vida de acciones de mensaje
- retrollamadas cron
- recuerdo de memoria
- cambio de modelo
- traspaso de subagente
- lectura de repositorio y lectura de documentos
- una pequeña tarea de compilación como Lobster Invaders

## Informes

`qa-lab` exporta un reporte de protocolo Markdown desde la línea de tiempo del bus observada.
El reporte debe responder:

- Qué funcionó
- Qué falló
- Qué se mantuvo bloqueado
- Qué escenarios de seguimiento vale la pena añadir

Para comprobaciones de personaje y estilo, ejecute el mismo escenario a través de múltiples referencias
de modelos en vivo y escriba un reporte Markdown evaluado:

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

El comando ejecuta procesos secundarios locales de la puerta de enlace de QA, no Docker. Los escenarios de evaluación de personajes deben establecer el personaje a través de `SOUL.md`, luego ejecutar turnos de usuario ordinarios como chat, ayuda del espacio de trabajo y pequeñas tareas de archivos. No se debe decir al modelo candidato que está siendo evaluado. El comando conserva cada transcripción completa, registra estadísticas básicas de ejecución y luego pide a los modelos jueces en modo rápido con razonamiento `xhigh` que clasifiquen las ejecuciones por naturalidad, ambiente y humor.
Use `--blind-judge-models` al comparar proveedores: el prompt del juez aún recibe cada transcripción y estado de ejecución, pero las referencias de los candidatos se reemplazan con etiquetas neutrales como `candidate-01`; el informe asigna las clasificaciones de vuelta a las referencias reales después del análisis.
Las ejecuciones de candidatos por defecto usan pensamiento `high`, con `xhigh` para modelos de OpenAI que lo soportan. Anule un candidato específico en línea con `--model provider/model,thinking=<level>`. `--thinking <level>` todavía establece un respaldo global, y el formato más antiguo `--model-thinking <provider/model=level>` se mantiene por compatibilidad.
Las referencias de candidatos de OpenAI por defecto usan el modo rápido, por lo que se utiliza el procesamiento prioritario donde el proveedor lo soporta. Agregue `,fast`, `,no-fast` o `,fast=false` en línea cuando un solo candidato o juez necesite una anulación. Pase `--fast` solo cuando desee forzar el modo rápido en cada modelo candidato. Las duraciones de los candidatos y jueces se registran en el informe para el análisis comparativo, pero los prompts de los jueces dicen explícitamente que no clasifiquen por velocidad.
Las ejecuciones de modelos candidatos y jueces por defecto ambas usan concurrencia 16. Reduzca `--concurrency` o `--judge-concurrency` cuando los límites del proveedor o la presión de la puerta de enlace local hagan que una ejecución sea demasiado ruidosa.
Cuando no se pasa ningún `--model` candidato, la evaluación de personajes por defecto usa `openai/gpt-5.4`, `openai/gpt-5.2`, `openai/gpt-5`, `anthropic/claude-opus-4-6`, `anthropic/claude-sonnet-4-6`, `zai/glm-5.1`, `moonshot/kimi-k2.5` y `google/gemini-3.1-pro-preview` cuando no se pasa ningún `--model`.
Cuando no se pasa ningún `--judge-model`, los jueces por defecto son `openai/gpt-5.4,thinking=xhigh,fast` y `anthropic/claude-opus-4-6,thinking=high`.

## Documentos relacionados

- [Pruebas](/en/help/testing)
- [Canal de QA](/en/channels/qa-channel)
- [Panel](/en/web/dashboard)
