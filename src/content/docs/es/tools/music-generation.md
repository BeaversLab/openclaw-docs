---
summary: "Genera música mediante music_generate a través de flujos de trabajo de ComfyUI, fal, Google Lyria, MiniMax y OpenRouter"
read_when:
  - Generating music or audio via the agent
  - Configuring music-generation providers and models
  - Understanding the music_generate tool parameters
title: "Generación de música"
sidebarTitle: "Generación de música"
---

La herramienta `music_generate` permite al agente crear música o audio a través de la
capacidad compartida de generación de música con proveedores configurados — ComfyUI,
fal, Google, MiniMax y OpenRouter hoy en día.

Para ejecuciones de agente con respaldo de sesión, OpenClaw inicia la generación de música como una
tarea en segundo plano, la rastrea en el libro de tareas y luego despierta al agente nuevamente
cuando la pista está lista para que el agente pueda informar al usuario y adjuntar el
audio terminado. Las finalizaciones de medios generados son entregadas por el agente a través de
la herramienta de mensaje; OpenClaw no publica automáticamente el archivo como respaldo si el
agente de finalización escribe solo una respuesta final privada. El despertar de finalización
advierte explícitamente al agente que las respuestas finales normales son privadas para esta
ruta.

<Note>La herramienta compartida integrada solo aparece cuando al menos un proveedor de generación de música está disponible. Si no ves `music_generate` en las herramientas de tu agente, configura `agents.defaults.musicGenerationModel` o configura una clave de API del proveedor.</Note>

## Inicio rápido

<Tabs>
  <Tab title="Proveedor compartido respaldado">
    <Steps>
      <Step title="Configurar autenticación">
        Establece una clave de API para al menos un proveedor — por ejemplo
        `GEMINI_API_KEY` o `MINIMAX_API_KEY`.
      </Step>
      <Step title="Elige un modelo predeterminado (opcional)">
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
      </Step>
      <Step title="Pide al agente">
        _"Genera una pista de synthpop animada sobre un viaje nocturno por una
        ciudad de neón."_

        El agente llama a `music_generate` automáticamente. No se necesita
        lista de permitidos de herramientas.
      </Step>
    </Steps>

    Para contextos sincrónicos directos sin una ejecución de agente con respaldo de sesión,
    la herramienta integrada aún recurre a la generación en línea y devuelve
    la ruta final de los medios en el resultado de la herramienta.

  </Tab>
  <Tab title="Flujo de trabajo de ComfyUI">
    <Steps>
      <Step title="Configurar el flujo de trabajo">
        Configure `plugins.entries.comfy.config.music` con un flujo de trabajo
        JSON y nodos de prompt/salida.
      </Step>
      <Step title="Autenticación en la nube (opcional)">
        Para Comfy Cloud, configure `COMFY_API_KEY` o `COMFY_CLOUD_API_KEY`.
      </Step>
      <Step title="Llamar a la herramienta">
        ```text
        /tool music_generate prompt="Warm ambient synth loop with soft tape texture"
        ```
      </Step>
    </Steps>
  </Tab>
</Tabs>

Ejemplos de prompts:

```text
Generate a cinematic piano track with soft strings and no vocals.
```

```text
Generate an energetic chiptune loop about launching a rocket at sunrise.
```

## Proveedores compatibles

| Proveedor  | Modelo predeterminado        | Entradas de referencia | Controles compatibles                                     | Autenticación                          |
| ---------- | ---------------------------- | ---------------------- | --------------------------------------------------------- | -------------------------------------- |
| ComfyUI    | `workflow`                   | Hasta 1 imagen         | Música o audio definido por el flujo de trabajo           | `COMFY_API_KEY`, `COMFY_CLOUD_API_KEY` |
| fal        | `fal-ai/minimax-music/v2.6`  | Ninguno                | `lyrics`, `instrumental`, `durationSeconds`, `format`     | `FAL_KEY` o `FAL_API_KEY`              |
| Google     | `lyria-3-clip-preview`       | Hasta 10 imágenes      | `lyrics`, `instrumental`, `format`                        | `GEMINI_API_KEY`, `GOOGLE_API_KEY`     |
| MiniMax    | `music-2.6`                  | Ninguno                | `lyrics`, `instrumental`, `durationSeconds`, `format=mp3` | `MINIMAX_API_KEY` u OAuth de MiniMax   |
| OpenRouter | `google/lyria-3-pro-preview` | Hasta 1 imagen         | `lyrics`, `instrumental`, `durationSeconds`, `format`     | `OPENROUTER_API_KEY`                   |

### Matriz de capacidades

El contrato de modo explícito utilizado por `music_generate`, pruebas de contrato y el
barrido compartido en vivo:

| Proveedor  | `generate` | `edit` | Límite de edición | Carriles compartidos en vivo                                                    |
| ---------- | :--------: | :----: | ----------------- | ------------------------------------------------------------------------------- |
| ComfyUI    |     ✓      |   ✓    | 1 imagen          | No en el barrido compartido; cubierto por `extensions/comfy/comfy.live.test.ts` |
| fal        |     ✓      |   —    | Ninguno           | `generate`                                                                      |
| Google     |     ✓      |   ✓    | 10 imágenes       | `generate`, `edit`                                                              |
| MiniMax    |     ✓      |   —    | Ninguno           | `generate`                                                                      |
| OpenRouter |     ✓      |   ✓    | 1 imagen          | `generate`, `edit`                                                              |

Use `action: "list"` para inspeccionar los proveedores compartidos y modelos disponibles en tiempo de ejecución:

```text
/tool music_generate action=list
```

Use `action: "status"` para inspeccionar la tarea de música activa respaldada por sesión:

```text
/tool music_generate action=status
```

Ejemplo de generación directa:

```text
/tool music_generate prompt="Dreamy lo-fi hip hop with vinyl texture and gentle rain" instrumental=true
```

## Parámetros de la herramienta

<ParamField path="prompt" type="string" required>
  Prompt de generación de música. Requerido para `action: "generate"`.
</ParamField>
<ParamField path="action" type='"generate" | "status" | "list"' default="generate">
  `"status"` devuelve la tarea de la sesión actual; `"list"` inspecciona los proveedores.
</ParamField>
<ParamField path="model" type="string">
  Invalidación de proveedor/modelo (p. ej. `google/lyria-3-pro-preview`, `comfy/workflow`).
</ParamField>
<ParamField path="lyrics" type="string">
  Letra opcional cuando el proveedor admite la entrada explícita de letras.
</ParamField>
<ParamField path="instrumental" type="boolean">
  Solicitar salida solo instrumental cuando el proveedor lo admite.
</ParamField>
<ParamField path="image" type="string">
  Ruta o URL de una única imagen de referencia.
</ParamField>
<ParamField path="images" type="string[]">
  Múltiples imágenes de referencia (hasta 10 en proveedores compatibles).
</ParamField>
<ParamField path="durationSeconds" type="number">
  Duración objetivo en segundos cuando el proveedor admite sugerencias de duración.
</ParamField>
<ParamField path="format" type='"mp3" | "wav"'>
  Sugerencia de formato de salida cuando el proveedor lo admite.
</ParamField>
<ParamField path="filename" type="string">
  Sugerencia de nombre de archivo de salida.
</ParamField>

<Note>
  No todos los proveedores admiten todos los parámetros. OpenClaw aún valida los límites estrictos, como los recuentos de entrada, antes del envío. Cuando un proveedor admite la duración pero usa un máximo más corto que el valor solicitado, OpenClaw se ajusta a la duración admitida más cercana. Las sugerencias opcionales no admitidas realmente se ignoran con una advertencia cuando el proveedor o
  modelo seleccionado no puede cumplirlas. Los resultados de la herramienta reportan la configuración aplicada; `details.normalization` captura cualquier asignación de solicitado a aplicado.
</Note>

Los tiempos de espera de las solicitudes del proveedor son solo configuración del operador.
OpenClaw usa `agents.defaults.musicGenerationModel.timeoutMs` cuando está configurado, eleva los valores
por debajo de 120000ms a 120000ms y, de lo contrario, establece de forma predeterminada
las solicitudes del proveedor a 300000ms.

## Comportamiento asíncrono

La generación de música con respaldo de sesión se ejecuta como una tarea en segundo plano:

- **Tarea en segundo plano:** `music_generate` crea una tarea en segundo plano, devuelve una
  respuesta de tarea iniciada de inmediato y publica la pista terminada más adelante
  en un mensaje de seguimiento del agente.
- **Prevención de duplicados:** mientras una tarea está `queued` o `running`, las llamadas
  posteriores a `music_generate` en la misma sesión devuelven el estado de la tarea en lugar de
  iniciar otra generación. Use `action: "status"` para verificar explícitamente.
- **Consulta de estado:** `openclaw tasks list` o `openclaw tasks show <taskId>`
  inspeccionan el estado en cola, en ejecución y terminal.
- **Activación de finalización:** OpenClaw inyecta un evento de finalización interno de nuevo
  en la misma sesión para que el modelo pueda escribir él mismo el seguimiento orientado al usuario.
- **Sugerencia de prompt:** los turnos posteriores del usuario/manual en la misma sesión reciben una pequeña
  sugerencia en tiempo de ejecución cuando una tarea de música ya está en curso, para que el modelo
  no llame ciegamente a `music_generate` nuevamente.
- **Alternativa sin sesión:** los contextos directos locales sin una sesión de agente
  real se ejecutan en línea y devuelven el resultado de audio final en el mismo turno.

### Ciclo de vida de la tarea

| Estado      | Significado                                                                                                    |
| ----------- | -------------------------------------------------------------------------------------------------------------- |
| `queued`    | Tarea creada, esperando a que el proveedor la acepte.                                                          |
| `running`   | El proveedor está procesando (típicamente de 30 segundos a 3 minutos dependiendo del proveedor y la duración). |
| `succeeded` | Pista lista; el agente se activa y la publica en la conversación.                                              |
| `failed`    | Error o tiempo de espera del proveedor; el agente se despierta con detalles del error.                         |

Verificar el estado desde la CLI:

```bash
openclaw tasks list
openclaw tasks show <taskId>
openclaw tasks cancel <taskId>
```

## Configuración

### Selección del modelo

```json5
{
  agents: {
    defaults: {
      musicGenerationModel: {
        primary: "google/lyria-3-clip-preview",
        fallbacks: ["fal/fal-ai/minimax-music/v2.6", "minimax/music-2.6"],
      },
    },
  },
}
```

### Orden de selección del proveedor

OpenClaw prueba los proveedores en este orden:

1. parámetro `model` de la llamada a la herramienta (si el agente especifica uno).
2. `musicGenerationModel.primary` desde la configuración.
3. `musicGenerationModel.fallbacks` en orden.
4. Detección automática utilizando solo los valores predeterminados del proveedor respaldados por autenticación:
   - primero el proveedor predeterminado actual;
   - proveedores de generación de música registrados restantes en orden de ID de proveedor.

Si un proveedor falla, se prueba automáticamente el siguiente candidato. Si todos fallan,
el error incluye detalles de cada intento.

Establezca `agents.defaults.mediaGenerationAutoProviderFallback: false` para usar solo
entradas explícitas `model`, `primary` y `fallbacks`.

## Notas del proveedor

<AccordionGroup>
  <Accordion title="ComfyUI">Basado en flujos de trabajo y depende del gráfico configurado más la asignación de nodos para los campos de entrada/salida. El complemento `comfy` incluido se conecta a la herramienta compartida `music_generate` a través del registro de proveedores de generación de música.</Accordion>
  <Accordion title="fal">Utiliza endpoints de modelos fal a través de la ruta de autenticación de proveedores compartida. El proveedor incluido usa por defecto `fal-ai/minimax-music/v2.6` y también expone `fal-ai/ace-step/prompt-to-audio` y `fal-ai/stable-audio-25/text-to-audio` para solicitudes de prompt a audio.</Accordion>
  <Accordion title="Google (Lyria 3)">Utiliza la generación por lotes de Lyria 3. El flujo incluido actual admite prompt, texto de letra opcional e imágenes de referencia opcionales.</Accordion>
  <Accordion title="MiniMax">Utiliza el endpoint por lotes `music_generation`. Admite prompt, letra opcional, modo instrumental, control de duración y salida mp3 a través de autenticación con clave de API `minimax` u OAuth `minimax-portal`.</Accordion>
  <Accordion title="OpenRouter">Utiliza la salida de audio de las finalizaciones de chat de OpenRouter con transmisión habilitada. El proveedor incluido por defecto es `google/lyria-3-pro-preview` y también expone `openrouter/google/lyria-3-clip-preview`.</Accordion>
</AccordionGroup>

## Elegir la ruta adecuada

- **Con proveedor compartido** cuando desees selección de modelo, conmutación por error del
  proveedor y el flujo de tarea/estado asíncrono integrado.
- **Ruta de complemento (ComfyUI)** cuando necesites un gráfico de flujo de trabajo personalizado o un
  proveedor que no sea parte de la capacidad de música compartida incluida.

Si estás depurando un comportamiento específico de ComfyUI, consulta
[ComfyUI](/es/providers/comfy). Si estás depurando el comportamiento del proveedor
compartido, comienza con [fal](/es/providers/fal), [Google (Gemini)](/es/providers/google),
[MiniMax](/es/providers/minimax) u [OpenRouter](/es/providers/openrouter).

## Modos de capacidad del proveedor

El contrato de generación de música compartida admite declaraciones de modo explícitas:

- `generate` para la generación solo con mensaje (prompt).
- `edit` cuando la solicitud incluye una o más imágenes de referencia.

Las nuevas implementaciones de proveedores deben preferir bloques de modo explícitos:

```typescript
capabilities: {
  generate: {
    maxTracks: 1,
    supportsLyrics: true,
    supportsFormat: true,
  },
  edit: {
    enabled: true,
    maxTracks: 1,
    maxInputImages: 1,
    supportsFormat: true,
  },
}
```

Los campos planos heredados como `maxInputImages`, `supportsLyrics` y
`supportsFormat` **no** son suficientes para anunciar soporte de edición. Los proveedores
deben declarar `generate` y `edit` explícitamente para que las pruebas en vivo, pruebas de contrato
y la herramienta compartida `music_generate` puedan validar el soporte de modo
de manera determinista.

## Pruebas en vivo

Cobertura en vivo opcional para los proveedores compartidos incluidos:

```bash
OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/music-generation-providers.live.test.ts
```

Contenedor del repositorio:

```bash
pnpm test:live:media music
```

Este archivo en vivo utiliza las variables de entorno del proveedor ya exportadas por delante de los perfiles de autenticación
almacenados de forma predeterminada, y ejecuta tanto `generate` como la cobertura declarada `edit` cuando
el proveedor habilita el modo de edición. Cobertura actual:

- `google`: `generate` más `edit`
- `fal`: solo `generate`
- `minimax`: solo `generate`
- `openrouter`: `generate` más `edit`
- `comfy`: cobertura en vivo separada de Comfy, no el barrido compartido del proveedor

Cobertura en vivo opcional para la ruta de música de ComfyUI incluida:

```bash
OPENCLAW_LIVE_TEST=1 COMFY_LIVE_TEST=1 pnpm test:live -- extensions/comfy/comfy.live.test.ts
```

El archivo en vivo de Comfy también cubre los flujos de trabajo de imagen y video de Comfy cuando esas
secciones están configuradas.

## Relacionado

- [Tareas en segundo plano](/es/automation/tasks) — seguimiento de tareas para ejecuciones `music_generate` desacopladas
- [ComfyUI](/es/providers/comfy)
- [Referencia de configuración](/es/gateway/config-agents#agent-defaults) — configuración `musicGenerationModel`
- [Google (Gemini)](/es/providers/google)
- [MiniMax](/es/providers/minimax)
- [Modelos](/es/concepts/models) — configuración y conmutación por error de modelos
- [Descripción general de herramientas](/es/tools)
