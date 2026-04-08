---
summary: "Generar música con proveedores compartidos, incluidos los complementos respaldados por flujos de trabajo"
read_when:
  - Generating music or audio via the agent
  - Configuring music generation providers and models
  - Understanding the music_generate tool parameters
title: "Generación de música"
---

# Generación de música

La herramienta `music_generate` permite al agente crear música o audio a través de la
capacidad compartida de generación de música con proveedores configurados como Google,
MiniMax y ComfyUI configurado con flujos de trabajo.

Para las sesiones de agente respaldadas por proveedores compartidos, OpenClaw inicia la generación de música como una
tarea en segundo plano, la rastrea en el libro mayor de tareas y luego despierta al agente nuevamente cuando
la pista está lista para que el agente pueda publicar el audio terminado de nuevo en el
canal original.

<Note>La herramienta compartida integrada solo aparece cuando al menos un proveedor de generación de música está disponible. Si no ves `music_generate` en las herramientas de tu agente, configura `agents.defaults.musicGenerationModel` o configura una clave de API de proveedor.</Note>

## Inicio rápido

### Generación respaldada por proveedores compartidos

1. Establezca una clave de API para al menos un proveedor, por ejemplo `GEMINI_API_KEY` o
   `MINIMAX_API_KEY`.
2. Opcionalmente, configure su modelo preferido:

```json5
{
  agents: {
    defaults: {
      musicGenerationModel: {
        primary: "google/lyria-3-clip-preview",
      },
    },
  },
}
```

3. Pídale al agente: _"Genera una pista de synthpop animada sobre un viaje nocturno
   a través de una ciudad de neón"._

El agente llama a `music_generate` automáticamente. No es necesario permitir la herramienta en una lista.

Para contextos sincrónicos directos sin una ejecución de agente respaldada por sesión, la herramienta
integrada aún recurre a la generación en línea y devuelve la ruta de medios final en
el resultado de la herramienta.

Ejemplos de instrucciones:

```text
Generate a cinematic piano track with soft strings and no vocals.
```

```text
Generate an energetic chiptune loop about launching a rocket at sunrise.
```

### Generación de Comfy impulsada por flujos de trabajo

El complemento incluido `comfy` se conecta a la herramienta compartida `music_generate` a través
del registro de proveedores de generación de música.

1. Configure `models.providers.comfy.music` con un JSON de flujo de trabajo y
   nodos de prompt/salida.
2. Si usa Comfy Cloud, configure `COMFY_API_KEY` o `COMFY_CLOUD_API_KEY`.
3. Pídale música al agente o llame a la herramienta directamente.

Ejemplo:

```text
/tool music_generate prompt="Warm ambient synth loop with soft tape texture"
```

## Soporte de proveedores incluidos compartidos

| Proveedor | Modelo predeterminado  | Entradas de referencia | Controles compatibles                                     | Clave de API                           |
| --------- | ---------------------- | ---------------------- | --------------------------------------------------------- | -------------------------------------- |
| ComfyUI   | `workflow`             | Hasta 1 imagen         | Música o audio definido por el flujo de trabajo           | `COMFY_API_KEY`, `COMFY_CLOUD_API_KEY` |
| Google    | `lyria-3-clip-preview` | Hasta 10 imágenes      | `lyrics`, `instrumental`, `format`                        | `GEMINI_API_KEY`, `GOOGLE_API_KEY`     |
| MiniMax   | `music-2.5+`           | Ninguno                | `lyrics`, `instrumental`, `durationSeconds`, `format=mp3` | `MINIMAX_API_KEY`                      |

Use `action: "list"` para inspeccionar los proveedores y modelos compartidos disponibles en tiempo de ejecución:

```text
/tool music_generate action=list
```

Use `action: "status"` para inspeccionar la tarea de música respaldada por la sesión activa:

```text
/tool music_generate action=status
```

Ejemplo de generación directa:

```text
/tool music_generate prompt="Dreamy lo-fi hip hop with vinyl texture and gentle rain" instrumental=true
```

## Parámetros de la herramienta integrada

| Parámetro         | Tipo     | Descripción                                                                                                        |
| ----------------- | -------- | ------------------------------------------------------------------------------------------------------------------ |
| `prompt`          | cadena   | Prompt de generación de música (requerido para `action: "generate"`)                                               |
| `action`          | cadena   | `"generate"` (predeterminado), `"status"` para la tarea de sesión actual, o `"list"` para inspeccionar proveedores |
| `model`           | cadena   | Anulación de proveedor/modelo, p. ej. `google/lyria-3-pro-preview` o `comfy/workflow`                              |
| `lyrics`          | cadena   | Letra opcional cuando el proveedor admite la entrada explícita de letras                                           |
| `instrumental`    | booleano | Solicitar salida solo instrumental cuando el proveedor lo admite                                                   |
| `image`           | cadena   | Ruta o URL de una sola imagen de referencia                                                                        |
| `images`          | cadena[] | Múltiples imágenes de referencia (hasta 10)                                                                        |
| `durationSeconds` | número   | Duración objetivo en segundos cuando el proveedor admite sugerencias de duración                                   |
| `format`          | cadena   | Sugerencia de formato de salida (`mp3` o `wav`) cuando el proveedor lo admite                                      |
| `filename`        | cadena   | Sugerencia de nombre de archivo de salida                                                                          |

No todos los proveedores admiten todos los parámetros. OpenClaw aún valida los límites estrictos, como los recuentos de entradas, antes del envío, pero las sugerencias opcionales no compatibles se ignoran con una advertencia cuando el proveedor o modelo seleccionado no puede cumplirlas.

## Comportamiento asíncrono para la ruta respaldada por proveedor compartido

- Ejecuciones de agente con sesión: `music_generate` crea una tarea en segundo plano, devuelve una respuesta de inicio/tarea inmediatamente y publica la pista terminada más tarde en un mensaje de seguimiento del agente.
- Prevención de duplicados: mientras esa tarea en segundo plano todavía esté `queued` o `running`, las llamadas posteriores a `music_generate` en la misma sesión devuelven el estado de la tarea en lugar de iniciar otra generación.
- Consulta de estado: use `action: "status"` para inspeccionar la tarea de música activa respaldada por la sesión sin iniciar una nueva.
- Seguimiento de tareas: use `openclaw tasks list` o `openclaw tasks show <taskId>` para inspeccionar el estado en cola, en ejecución y terminal de la generación.
- Activación al completar: OpenClaw inyecta un evento interno de finalización de nuevo en la misma sesión para que el modelo pueda escribir el seguimiento orientado al usuario por sí mismo.
- Sugerencia de prompt: los turnos posteriores de usuario/manual en la misma sesión reciben una pequeña sugerencia en tiempo de ejecución cuando una tarea de música ya está en curso, para que el modelo no llame ciegamente a `music_generate` de nuevo.
- Alternativa sin sesión: los contextos directos-locales sin una sesión de agente real todavía se ejecutan en línea y devuelven el resultado de audio final en el mismo turno.

## Configuración

### Selección del modelo

```json5
{
  agents: {
    defaults: {
      musicGenerationModel: {
        primary: "google/lyria-3-clip-preview",
        fallbacks: ["minimax/music-2.5+"],
      },
    },
  },
}
```

### Orden de selección del proveedor

Al generar música, OpenClaw prueba los proveedores en este orden:

1. Parámetro `model` de la llamada a la herramienta, si el agente especifica uno
2. `musicGenerationModel.primary` de la configuración
3. `musicGenerationModel.fallbacks` en orden
4. Detección automática utilizando solo los valores predeterminados del proveedor respaldados por autenticación:
   - primero el proveedor predeterminado actual
   - proveedores de generación de música registrados restantes en orden de id de proveedor

Si un proveedor falla, se prueba automáticamente el siguiente candidato. Si todos fallan, el error incluye detalles de cada intento.

## Notas del proveedor

- Google usa la generación por lotes Lyria 3. El flujo empaquetado actual admite prompt, texto de letra opcional e imágenes de referencia opcionales.
- MiniMax usa el endpoint por lotes `music_generation`. El flujo empaquetado actual admite prompt, letra opcional, modo instrumental, dirección de duración y salida mp3.
- El soporte de ComfyUI está impulsado por flujos de trabajo y depende del gráfico configurado más el mapeo de nodos para los campos de prompt/salida.

## Elegir la ruta correcta

- Utilice la ruta respaldada por proveedores compartidos cuando desee selección de modelos, conmutación por error de proveedores y el flujo de tareas/estado asíncrono integrado.
- Utilice una ruta de complemento como ComfyUI cuando necesite un gráfico de flujo de trabajo personalizado o un proveedor que no sea parte de la capacidad de música compartida incluida.
- Si está depurando el comportamiento específico de ComfyUI, consulte [ComfyUI](/en/providers/comfy). Si está depurando el comportamiento del proveedor compartido, comience con [Google (Gemini)](/en/providers/google) o [MiniMax](/en/providers/minimax).

## Pruebas en vivo

Cobertura en vivo opcional para los proveedores compartidos incluidos:

```bash
OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/music-generation-providers.live.test.ts
```

Cobertura en vivo opcional para la ruta de música ComfyUI incluida:

```bash
OPENCLAW_LIVE_TEST=1 COMFY_LIVE_TEST=1 pnpm test:live -- extensions/comfy/comfy.live.test.ts
```

El archivo en vivo de Comfy también cubre los flujos de trabajo de imagen y video cómodos cuando esas
secciones están configuradas.

## Relacionado

- [Tareas en segundo plano](/en/automation/tasks) - seguimiento de tareas para ejecuciones desacopladas de `music_generate`
- [Referencia de configuración](/en/gateway/configuration-reference#agent-defaults) - configuración `musicGenerationModel`
- [ComfyUI](/en/providers/comfy)
- [Google (Gemini)](/en/providers/google)
- [MiniMax](/en/providers/minimax)
- [Modelos](/en/concepts/models) - configuración y conmutación por error de modelos
- [Descripción general de herramientas](/en/tools)
