---
summary: "Tablero de trabajo opcional del panel para tarjetas propiedad de agentes y transferencia de sesión"
read_when:
  - You want a Kanban-style workboard in the Control UI
  - You are enabling or disabling the bundled Workboard plugin
  - You want to track planned agent work without an external project manager
title: "Plugin de Workboard"
---

El plugin Workboard añade un tablero opcional estilo Kanban al
[Control UI](/es/web/control-ui). Úselo para recopilar tarjetas de trabajo del tamaño de un agente, asignarlas
a agentes y saltar desde una tarjeta a la sesión del panel vinculada.

Workboard es intencionalmente pequeño. Rastrea el trabajo operativo local para un
OpenClaw Gateway; no es un reemplazo para GitHub Issues, Linear, Jira u
otros sistemas de gestión de proyectos de equipo.

## Estado predeterminado

Workboard es un plugin incluido y está deshabilitado de forma predeterminada a menos que lo habilite
en la configuración del plugin.

Habilítelo con:

```bash
openclaw plugins enable workboard
openclaw gateway restart
```

Luego abra el panel:

```bash
openclaw dashboard
```

La pestaña Workboard aparece en la navegación del panel. Si la pestaña es visible
pero el plugin está deshabilitado o bloqueado por `plugins.allow` / `plugins.deny`, la
vista muestra un estado de plugin no disponible en lugar de los datos de tarjetas locales.

## Qué contienen las tarjetas

Cada tarjeta almacena:

- título y notas
- estado: `backlog`, `todo`, `running`, `review`, `blocked`, o `done`
- prioridad: `low`, `normal`, `high`, o `urgent`
- etiquetas
- id de agente opcional
- sesión vinculada opcional, ejecución, tarea o URL de origen
- metadatos de ejecución opcionales para una sesión de Codex o Claude iniciada desde la tarjeta
- metadatos compactos para intentos, comentarios, enlaces, pruebas, plantillas, estado de archivo y detección de sesión obsoleta
- eventos recientes de la tarjeta como creada, movida, vinculada, intento, prueba, archivada, obsoleta o cambios actualizados por el agente

Las tarjetas se almacenan en el estado del Gateway del plugin. Son locales para el directorio de
estado del Gateway y se mueven con el resto del estado de OpenClaw de ese Gateway.

Workboard mantiene metadatos compactos por tarjeta para que los operadores puedan ver cómo se movió una tarjeta a través del tablero sin abrir la sesión vinculada. Los eventos, resúmenes de intentos, fragmentos de prueba, enlaces relacionados, comentarios, marcadores de archivo y marcadores de sesión obsoleta son metadatos intencionalmente locales; no reemplazan las transcripciones de sesión ni el historial de problemas de GitHub.

## Ejecuciones de tarjetas

Las tarjetas no vinculadas pueden iniciar el trabajo desde la tarjeta. Iniciar utiliza el agente predeterminado y el modelo configurado del Gateway. Las acciones de Codex y Claude son opciones explícitas de modelo opcionales:

- Ejecutar Codex o Ejecutar Claude crea una sesión del panel, envía el aviso de la tarjeta y marca la tarjeta `running`.
- Abrir Codex o Abrir Claude crea una sesión del panel vinculada sin enviar el aviso de la tarjeta ni mover la tarjeta, por lo que puede trabajar manualmente mientras permanece adjunta al tablero.

Los metadatos de ejecución almacenan el motor seleccionado, el modo, la referencia del modelo, la clave de sesión, el id. de ejecución y el estado del ciclo de vida en la tarjeta. Las ejecuciones de Codex utilizan `openai/gpt-5.5`; las ejecuciones de Claude utilizan `anthropic/claude-sonnet-4-6`.

Cada ejecución vinculada también registra un resumen de intento en el mismo registro de tarjeta. El resumen de intento mantiene el motor, el modo, el modelo, el id. de ejecución, las marcas de tiempo, el estado y el recuento acumulado de fallos para que los fallos repetidos sigan siendo visibles en el tablero.

## Sincronización del ciclo de vida de la sesión

Las tarjetas se pueden vincular a sesiones existentes del panel o a la sesión creada cuando inicia el trabajo desde una tarjeta. Las tarjetas vinculadas muestran el ciclo de vida de la sesión en línea: en ejecución, obsoleto, inactiva vinculada, completado, con errores o no disponible.

Si la sesión vinculada falta, la tarjeta permanece vinculada por contexto y aún ofrece controles de inicio para que pueda reiniciar el trabajo en una nueva sesión del panel. Si una sesión vinculada activa deja de informar actividad reciente, Workboard marca la tarjeta como obsoleta y almacena el marcador como metadatos de la tarjeta hasta que el ciclo de vida lo borre.

También puede capturar una sesión existente del panel desde la pestaña Sesiones con Agregar a Workboard. La tarjeta se vincula a esa sesión, utiliza la etiqueta de la sesión o el aviso reciente del usuario como título y propaga notas desde el aviso reciente del usuario más la respuesta más reciente del asistente cuando el historial de chat está disponible.

Workboard sigue la sesión vinculada mientras la tarjeta aún está en un estado de trabajo activo:

- sesión vinculada activa -> `running`
- sesión vinculada completada -> `review`
- sesión vinculada fallida, eliminada, con tiempo de espera agotado o abortada -> `blocked`

Los estados de revisión manual tienen prioridad. Si mueves una tarjeta a `review`, `blocked` o `done`,
Workboard deja de mover automáticamente esa tarjeta hasta que la muevas de vuelta a `todo` o
`running`.

## Flujo de trabajo del panel

1. Abre la pestaña Workboard en el Control UI.
2. Crea una tarjeta con un título, notas, prioridad, etiquetas, un agente opcional y
   una sesión vinculada opcional.
3. O abre Sesiones y elige Añadir a Workboard para una sesión existente.
4. Arrastra la tarjeta entre columnas o usa los controles de la columna.
5. Inicia el trabajo desde la tarjeta para crear o reutilizar una sesión del panel.
6. Abre la sesión vinculada desde la tarjeta mientras el agente trabaja.
7. Permite que la sincronización del ciclo de vida mueva el trabajo en ejecución a revisión o bloqueado, y luego mueve
   manualmente la tarjeta a hecho cuando se acepte.

Iniciar una tarjeta utiliza las sesiones normales del Gateway. El complemento Workboard solo almacena
metadatos de tarjetas y enlaces; la transcripción de la conversación, la selección del modelo y el ciclo de vida
de ejecución siguen siendo propiedad del sistema regular de sesiones.

Usa Detener en una tarjeta vinculada en vivo para abortar la ejecución de la sesión activa. Workboard marca
esa tarjeta como `blocked` para que permanezca visible para el seguimiento.

Las nuevas tarjetas pueden comenzar a partir de plantillas de Workboard para correcciones de errores, documentos, lanzamientos, revisiones
de PR o trabajo de complementos. Las plantillas rellenan previamente el título, las notas, las etiquetas y la prioridad,
y el id de la plantilla seleccionada se almacena como metadatos de la tarjeta.

## Permisos

El complemento registra métodos RPC de Gateway bajo el espacio de nombres `workboard.*`:

- `workboard.cards.list` requiere `operator.read`
- `workboard.cards.export` requiere `operator.read`
- los métodos create, update, move, delete, comment, link, proof y archive requieren `operator.write`

Los navegadores conectados con acceso de operador de solo lectura pueden inspeccionar el tablero pero
no pueden mutar las tarjetas.

## Configuración

Workboard no tiene configuración específica del complemento hoy. Actívalo o desactívalo con la
entrada de complemento estándar:

```json5
{
  plugins: {
    entries: {
      workboard: {
        enabled: true,
        config: {},
      },
    },
  },
}
```

Desactívalo de nuevo con:

```bash
openclaw plugins disable workboard
openclaw gateway restart
```

## Solución de problemas

### La pestaña indica que Workboard no está disponible

Verifica la política de complementos:

```bash
openclaw plugins inspect workboard --runtime --json
```

Si `plugins.allow` está configurado, añada `workboard` a esa lista de permitidos. Si
`plugins.deny` contiene `workboard`, elimínelo antes de activar el complemento.

### Las tarjetas no se guardan

Confirme que la conexión del navegador tenga acceso `operator.write`. Las sesiones de
operador de solo lectura pueden listar las tarjetas, pero no pueden crearlas, editarlas, moverlas ni eliminarlas.

### Iniciar una tarjeta no abre la sesión esperada

Workboard crea enlaces a sesiones normales del panel de control. Verifique el id del agente de la
tarjeta y la sesión vinculada, luego abra la vista de Sesiones o Chat para inspeccionar el estado real
de ejecución.

## Relacionado

- [Control UI](/es/web/control-ui)
- [Complementos](/es/tools/plugin)
- [Administrar complementos](/es/plugins/manage-plugins)
- [Sesiones](/es/concepts/session)
