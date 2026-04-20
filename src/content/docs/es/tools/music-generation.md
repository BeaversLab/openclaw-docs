---
summary: "Genera música con proveedores compartidos, incluyendo complementos respaldados por flujos de trabajo"
read_when:
  - Generating music or audio via the agent
  - Configuring music generation providers and models
  - Understanding the music_generate tool parameters
title: "Generación de música"
---

# Generación de música

La herramienta `music_generate` permite al agente crear música o audio a través de la
capacidad de generación de música compartida con proveedores configurados como Google,
MiniMax y ComfyUI configurado por flujo de trabajo.

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

El agente llama a `music_generate` automáticamente. No es necesario permitir la herramienta en la lista.

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

El complemento `comfy` incluido se conecta a la herramienta compartida `music_generate` a través
del registro de proveedores de generación de música.

1. Configure `models.providers.comfy.music` con un JSON de flujo de trabajo y
   nodos deprompt/salida.
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

### Matriz de capacidades declaradas

Este es el contrato de modo explícito utilizado por `music_generate`, pruebas de contrato
y el barrido en vivo compartido.

| Proveedor | `generate` | `edit` | Límite de edición | Carriles compartidos en vivo                                                    |
| --------- | ---------- | ------ | ----------------- | ------------------------------------------------------------------------------- |
| ComfyUI   | Sí         | Sí     | 1 imagen          | No en el barrido compartido; cubierto por `extensions/comfy/comfy.live.test.ts` |
| Google    | Sí         | Sí     | 10 imágenes       | `generate`, `edit`                                                              |
| MiniMax   | Sí         | No     | Ninguno           | `generate`                                                                      |

Use `action: "list"` para inspeccionar los proveedores compartidos y modelos disponibles en tiempo de ejecución:

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

| Parámetro         | Tipo     | Descripción                                                                                                           |
| ----------------- | -------- | --------------------------------------------------------------------------------------------------------------------- |
| `prompt`          | cadena   | Prompt de generación de música (requerido para `action: "generate"`)                                                  |
| `action`          | cadena   | `"generate"` (predeterminado), `"status"` para la tarea de la sesión actual, o `"list"` para inspeccionar proveedores |
| `model`           | cadena   | Anulación de proveedor/modelo, p. ej. `google/lyria-3-pro-preview` o `comfy/workflow`                                 |
| `lyrics`          | cadena   | Letra opcional cuando el proveedor admite la entrada explícita de letras                                              |
| `instrumental`    | booleano | Solicitar salida solo instrumental cuando el proveedor lo admite                                                      |
| `image`           | cadena   | Ruta o URL de una sola imagen de referencia                                                                           |
| `images`          | cadena[] | Múltiples imágenes de referencia (hasta 10)                                                                           |
| `durationSeconds` | número   | Duración objetivo en segundos cuando el proveedor admite sugerencias de duración                                      |
| `format`          | cadena   | Sugerencia de formato de salida (`mp3` o `wav`) cuando el proveedor lo admite                                         |
| `filename`        | cadena   | Sugerencia de nombre de archivo de salida                                                                             |

No todos los proveedores admiten todos los parámetros. OpenClaw sigue validando los límites estrictos, como los recuentos de entradas, antes del envío. Cuando un proveedor admite la duración pero usa un máximo más corto que el valor solicitado, OpenClaw lo ajusta automáticamente a la duración admitida más cercana. Las sugerencias opcionales realmente no compatibles se ignoran con una advertencia cuando el proveedor o modelo seleccionado no puede cumplirlas.

Los resultados de la herramienta informan de la configuración aplicada. Cuando OpenClaw ajusta la duración durante la reserva del proveedor, el `durationSeconds` devuelto refleja el valor enviado y `details.normalization.durationSeconds` muestra la asignación de solicitado a aplicado.

## Comportamiento asíncrono para la ruta respaldada por el proveedor compartido

- Ejecuciones de agente con sesión: `music_generate` crea una tarea en segundo plano, devuelve una respuesta de tarea/iniciada inmediatamente y publica la pista terminada más adelante en un mensaje de seguimiento del agente.
- Prevención de duplicados: mientras esa tarea en segundo plano sigue `queued` o `running`, las llamadas posteriores a `music_generate` en la misma sesión devuelven el estado de la tarea en lugar de iniciar otra generación.
- Consulta de estado: use `action: "status"` para inspeccionar la tarea de música activa respaldada por la sesión sin iniciar una nueva.
- Seguimiento de tareas: use `openclaw tasks list` o `openclaw tasks show <taskId>` para inspeccionar el estado en cola, en ejecución y final para la generación.
- Activación al completar: OpenClaw inyecta un evento interno de finalización de nuevo en la misma sesión para que el modelo pueda escribir el seguimiento orientado al usuario por sí mismo.
- Sugerencia de prompt: los turnos posteriores de usuario/manual en la misma sesión reciben una pequeña sugerencia en tiempo de ejecución cuando una tarea de música ya está en curso para que el modelo no llame ciegamente a `music_generate` de nuevo.
- Alternativa sin sesión: los contextos directos locales sin una sesión de agente real todavía se ejecutan en línea y devuelven el resultado de audio final en el mismo turno.

### Ciclo de vida de la tarea

Cada solicitud `music_generate` pasa por cuatro estados:

1. **en cola** -- tarea creada, esperando a que el proveedor la acepte.
2. **en ejecución** -- el proveedor está procesando (típicamente de 30 segundos a 3 minutos dependiendo del proveedor y la duración).
3. **exitosa** -- pista lista; el agente se activa y la publica en la conversación.
4. **fallida** -- error o tiempo de espera del proveedor; el agente se activa con detalles del error.

Verificar el estado desde la CLI:

```bash
openclaw tasks list
openclaw tasks show <taskId>
openclaw tasks cancel <taskId>
```

Prevención de duplicados: si una tarea de música ya está `queued` o `running` para la sesión actual, `music_generate` devuelve el estado de la tarea existente en lugar de iniciar una nueva. Use `action: "status"` para verificar explícitamente sin activar una nueva generación.

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

1. parámetro `model` de la llamada a la herramienta, si el agente especifica uno
2. `musicGenerationModel.primary` de la configuración
3. `musicGenerationModel.fallbacks` en orden
4. Detección automática usando solo los proveedores predeterminados respaldados por autenticación:
   - primero el proveedor predeterminado actual
   - proveedores de generación de música registrados restantes en orden de ID de proveedor

Si un proveedor falla, se intenta automáticamente el siguiente candidato. Si todos fallan, el error incluye detalles de cada intento.

Establezca `agents.defaults.mediaGenerationAutoProviderFallback: false` si desea que la generación de música use solo las entradas explícitas `model`, `primary` y `fallbacks`.

## Notas del proveedor

- Google usa la generación por lotes Lyria 3. El flujo empaquetado actual soporta un mensaje, texto de letras opcional e imágenes de referencia opcionales.
- MiniMax usa el endpoint por lotes `music_generation`. El flujo empaquetado actual soporta mensaje, letras opcionales, modo instrumental, control de duración y salida mp3.
- El soporte de ComfyUI se basa en flujos de trabajo y depende del gráfico configurado además del mapeo de nodos para los campos de mensaje/salida.

## Modos de capacidad del proveedor

El contrato de generación de música compartida ahora soporta declaraciones explícitas de modo:

- `generate` para generación solo con mensaje
- `edit` cuando la solicitud incluye una o más imágenes de referencia

Las nuevas implementaciones de proveedores deberían preferir bloques de modo explícitos:

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

Los campos planos heredados como `maxInputImages`, `supportsLyrics` y `supportsFormat` no son suficientes para anunciar soporte de edición. Los proveedores deben declarar `generate` y `edit` explícitamente para que las pruebas en vivo, pruebas de contrato y la herramienta compartida `music_generate` puedan validar el soporte de modo determinísticamente.

## Elegir la ruta correcta

- Use la ruta compartida respaldada por el proveedor cuando quiera selección de modelo, conmutación por error de proveedor y el flujo integrado de tareas/estado asíncrono.
- Use una ruta de complemento como ComfyUI cuando necesite un gráfico de flujo de trabajo personalizado o un proveedor que no sea parte de la capacidad de música empaquetada compartida.
- Si está depurando un comportamiento específico de ComfyUI, consulte [ComfyUI](/es/providers/comfy). Si está depurando el comportamiento compartido del proveedor, comience con [Google (Gemini)](/es/providers/google) o [MiniMax](/es/providers/minimax).

## Pruebas en vivo

Cobertura en vivo opcional para los proveedores integrados compartidos:

```bash
OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/music-generation-providers.live.test.ts
```

Envoltorio del repositorio:

```bash
pnpm test:live:media music
```

Este archivo en vivo carga las variables de entorno del proveedor que faltan desde `~/.profile`, prefiere
las claves API de live/env por encima de los perfiles de autenticación almacenados por defecto, y ejecuta tanto la
cobertura `generate` como la declarada `edit` cuando el proveedor habilita el modo de edición.

Hoy eso significa:

- `google`: `generate` más `edit`
- `minimax`: solo `generate`
- `comfy`: cobertura en vivo separada de Comfy, no el barrido del proveedor compartido

Cobertura en vivo opcional para la ruta de música ComfyUI integrada:

```bash
OPENCLAW_LIVE_TEST=1 COMFY_LIVE_TEST=1 pnpm test:live -- extensions/comfy/comfy.live.test.ts
```

El archivo en vivo de Comfy también cubre flujos de trabajo de imagen y video de Comfy cuando esas
secciones están configuradas.

## Relacionado

- [Tareas en segundo plano](/es/automation/tasks) - seguimiento de tareas para ejecuciones desacopladas de `music_generate`
- [Referencia de configuración](/es/gateway/configuration-reference#agent-defaults) - configuración `musicGenerationModel`
- [ComfyUI](/es/providers/comfy)
- [Google (Gemini)](/es/providers/google)
- [MiniMax](/es/providers/minimax)
- [Modelos](/es/concepts/models) - configuración de modelos y conmutación por error
- [Resumen de herramientas](/es/tools)
