# Diseño de importación de temas personalizados de Tweakcn

Estado: aprobado en terminal el 2026-04-22

## Resumen

Añadir exactamente un espacio de tema personalizado de la interfaz de control (Control UI) local en el navegador que pueda importarse desde un enlace para compartir de tweakcn. Las familias de temas integradas existentes siguen siendo `claw`, `knot` y `dash`. La nueva familia `custom` se comporta como una familia de temas normal de OpenClaw y admite el modo `light`, `dark` y `system` cuando la carga útil de tweakcn importada incluye conjuntos de tokens claros y oscuros.

El tema importado se almacena solo en el perfil del navegador actual con el resto de la configuración de la interfaz de control. No se escribe en la configuración de la puerta de enlace (gateway) y no se sincroniza entre dispositivos o navegadores.

## Problema

El sistema de temas de la interfaz de control está actualmente limitado a tres familias de temas codificadas:

- `ui/src/ui/theme.ts`
- `ui/src/ui/views/config.ts`
- `ui/src/styles/base.css`

Los usuarios pueden cambiar entre las familias integradas y las variantes de modo, pero no pueden incorporar un tema de tweakcn sin editar el CSS del repositorio. El resultado solicitado es menor que un sistema de temas general: mantener los tres integrados y añadir un espacio importado controlado por el usuario que pueda reemplazarse desde un enlace de tweakcn.

## Objetivos

- Mantener las familias de temas integradas existentes sin cambios.
- Añadir exactamente un espacio personalizado importado, no una biblioteca de temas.
- Aceptar un enlace para compartir de tweakcn o una URL `https://tweakcn.com/r/themes/{id}` directa.
- Persistir el tema importado solo en el almacenamiento local del navegador.
- Hacer que el espacio importado funcione con los controles de modo `light`, `dark` y `system` existentes.
- Mantener el comportamiento de fallo seguro: una importación incorrecta nunca rompe el tema de la interfaz de usuario activa.

## Objetivos no incluidos

- No hay biblioteca de múltiples temas ni lista de importaciones locales en el navegador.
- No hay persistencia en la puerta de enlace (gateway) ni sincronización entre dispositivos.
- No hay editor de CSS arbitrario ni editor de JSON de temas sin formato.
- No hay carga automática de activos de fuentes remotas desde tweakcn.
- No hay intento de soportar cargas útiles de tweakcn que solo expongan un modo.
- No hay refactorización de temas en todo el repositorio más allá de las costuras necesarias para la interfaz de control.

## Decisiones de usuario ya tomadas

- Mantener los tres temas integrados.
- Añadir un espacio de importación impulsado por tweakcn.
- Almacene el tema importado en el navegador, no en la configuración de la puerta de enlace.
- Admita `light`, `dark` y `system` para la ranura importada.
- Sobrescribir la ranura personalizada con la siguiente importación es el comportamiento previsto.

## Enfoque recomendado

Agregue un cuarto id de familia de temas, `custom`, al modelo de temas de la interfaz de usuario de control. La familia `custom` solo se puede seleccionar cuando hay una importación válida de tweakcn. La carga útil importada se normaliza en un registro de tema personalizado específico de OpenClaw y se almacena en el almacenamiento local del navegador junto con el resto de la configuración de la interfaz de usuario.

En tiempo de ejecución, OpenClaw representa una etiqueta `<style>` administrada que define los bloques de variables CSS personalizadas resueltas:

```css
:root[data-theme="custom"] { ... }
:root[data-theme="custom-light"] { ... }
```

Esto mantiene las variables del tema personalizado dentro del alcance de la familia `custom` y evita que las variables CSS en línea se filtren en las familias integradas.

## Arquitectura

### Modelo de tema

Actualizar `ui/src/ui/theme.ts`:

- Extienda `ThemeName` para incluir `custom`.
- Extienda `ResolvedTheme` para incluir `custom` y `custom-light`.
- Extienda `VALID_THEME_NAMES`.
- Actualice `resolveTheme()` para que `custom` refleje el comportamiento de la familia existente:
  - `custom + dark` -> `custom`
  - `custom + light` -> `custom-light`
  - `custom + system` -> `custom` o `custom-light` según la preferencia del sistema operativo

No se agregan alias heredados para `custom`.

### Modelo de persistencia

Extienda la persistencia de `UiSettings` en `ui/src/ui/storage.ts` con una carga útil opcional de tema personalizado:

- `customTheme?: ImportedCustomTheme`

Forma de almacenamiento recomendada:

```ts
type ImportedCustomTheme = {
  sourceUrl: string;
  themeId: string;
  label: string;
  importedAt: string;
  light: Record<string, string>;
  dark: Record<string, string>;
};
```

Notas:

- `sourceUrl` almacena la entrada original del usuario después de la normalización.
- `themeId` es el id del tema tweakcn extraído de la URL.
- `label` es el campo `name` de tweakcn cuando está presente, de lo contrario `Custom`.
- `light` y `dark` ya son mapas de tokens de OpenClaw normalizados, no cargas útiles (payloads) de tweakcn sin procesar.
- La carga útil importada reside junto a otras configuraciones locales del navegador y se serializa en el mismo documento de almacenamiento local.
- Si los datos del tema personalizado almacenado faltan o no son válidos al cargar, ignore la carga útil y vuelva a `theme: "claw"` cuando la familia persistida era `custom`.

### Aplicación en tiempo de ejecución

Agregue un administrador de hojas de estilo de temas personalizados (custom-theme) estrecho en el tiempo de ejecución de la interfaz de usuario de control (Control UI), propietario cerca de `ui/src/ui/app-settings.ts` y `ui/src/ui/theme.ts`.

Responsabilidades:

- Crear o actualizar una etiqueta `<style id="openclaw-custom-theme">` estable en `document.head`.
- Emitir CSS solo cuando existe una carga útil de tema personalizado válida.
- Eliminar el contenido de la etiqueta de estilo cuando se borra la carga útil.
- Mantenga el CSS de la familia integrada en `ui/src/styles/base.css`; no empalme los tokens importados en la hoja de estilo registrada.

Este administrador se ejecuta cada vez que se cargan, guardan, importan o borran las configuraciones.

### Selectores de modo claro

La implementación debe preferir `data-theme-mode="light"` para el estilo claro entre familias en lugar de hacer un caso especial para `custom-light`. Si un selector existente está fijado a `data-theme="light"` y necesita aplicarse a cada familia clara, amplíelo como parte de este trabajo.

## UX de importación

Actualice `ui/src/ui/views/config.ts` en la sección `Appearance`:

- Agregue una tarjeta de tema `Custom` junto a `Claw`, `Knot` y `Dash`.
- Muestre la tarjeta como deshabilitada cuando no existe ningún tema personalizado importado.
- Agregue un panel de importación debajo de la cuadrícula de temas con:
  - una entrada de texto para un enlace para compartir de tweakcn o una URL `/r/themes/{id}`
  - un botón `Import`
  - una ruta `Replace` cuando ya existe una carga útil personalizada
  - una acción `Clear` cuando ya existe una carga útil personalizada
- Muestre la etiqueta del tema importado y el host de origen cuando existe una carga útil.
- Si el tema activo es `custom`, la importación de un reemplazo se aplica de inmediato.
- Si el tema activo no es `custom`, la importación solo almacena la nueva carga útil hasta que el usuario seleccione la tarjeta `Custom`.

El selector de tema de configuración rápida en `ui/src/ui/views/config-quick.ts` también debería mostrar `Custom` solo cuando existe una carga útil.

## Análisis de URL y obtención remota

La ruta de importación del navegador acepta:

- `https://tweakcn.com/themes/{id}`
- `https://tweakcn.com/r/themes/{id}`

La implementación debe normalizar ambos formularios a:

- `https://tweakcn.com/r/themes/{id}`

Luego, el navegador busca directamente el punto final `/r/themes/{id}` normalizado.

Utilice un validador de esquema estrecho para la carga útil externa. Se prefiere un esquema zod porque este es un límite externo que no es de confianza.

Campos remotos obligatorios:

- `name` de nivel superior como cadena opcional
- `cssVars.theme` como objeto opcional
- `cssVars.light` como objeto
- `cssVars.dark` como objeto

Si falta `cssVars.light` o `cssVars.dark`, rechace la importación. Esto es deliberado: el comportamiento del producto aprobado es el soporte completo del modo, no la síntesis de mejor esfuerzo de un lado faltante.

## Asignación de tokens

No refleje ciegamente las variables de tweakcn. Normalice un subconjunto limitado en tokens de OpenClaw y derive el resto en un asistente.

### Tokens importados directamente

De cada bloque de modo tweakcn:

- `background`
- `foreground`
- `card`
- `card-foreground`
- `popover`
- `popover-foreground`
- `primary`
- `primary-foreground`
- `secondary`
- `secondary-foreground`
- `muted`
- `muted-foreground`
- `accent`
- `accent-foreground`
- `destructive`
- `destructive-foreground`
- `border`
- `input`
- `ring`
- `radius`

Del `cssVars.theme` compartido cuando esté presente:

- `font-sans`
- `font-mono`

Si un bloque de modo anula `font-sans`, `font-mono` o `radius`, prevalece el valor local del modo.

### Tokens derivados para OpenClaw

El importador deriva variables exclusivas de OpenClaw a partir de los colores base importados:

- `--bg-accent`
- `--bg-elevated`
- `--bg-hover`
- `--panel`
- `--panel-strong`
- `--panel-hover`
- `--chrome`
- `--chrome-strong`
- `--text`
- `--text-strong`
- `--chat-text`
- `--muted`
- `--muted-strong`
- `--accent-hover`
- `--accent-muted`
- `--accent-subtle`
- `--accent-glow`
- `--focus`
- `--focus-ring`
- `--focus-glow`
- `--secondary`
- `--secondary-foreground`
- `--danger`
- `--danger-muted`
- `--danger-subtle`

Las reglas de derivación residen en un asistente puro para que puedan probarse de forma independiente. Las fórmulas exactas de mezcla de colores son un detalle de implementación, pero el asistente debe satisfacer dos restricciones:

- conservar un contraste legible cercano a la intención del tema importado
- producir una salida estable para la misma carga útil importada

### Tokens ignorados en v1

Estos tokens de tweakcn se ignoran intencionalmente en la primera versión:

- `chart-*`
- `sidebar-*`
- `font-serif`
- `shadow-*`
- `tracking-*`
- `letter-spacing`
- `spacing`

Esto mantiene el alcance en los tokens que la interfaz de usuario de Control actual realmente necesita.

### Fuentes

Las cadenas de pilas de fuentes se importan si están presentes, pero OpenClaw no carga activos de fuentes remotas en v1. Si la pila importada hace referencia a fuentes que no están disponibles en el navegador, se aplica el comportamiento de reserva normal.

## Comportamiento de fallo

Las importaciones incorrectas deben fallar de forma cerrada.

- Formato de URL no válido: mostrar un error de validación en línea, no obtener.
- Host o ruta no admitida: mostrar error de validación en línea, no realizar la recuperación.
- Fallo de red, respuesta no OK o JSON mal formado: mostrar error en línea, mantener el payload almacenado actual sin cambios.
- Fallo de esquema o bloques claro/oscuro faltantes: mostrar error en línea, mantener el payload almacenado actual sin cambios.
- Acción de limpiar (Clear):
  - elimina el payload personalizado almacenado
  - elimina el contenido de la etiqueta de estilo personalizada gestionada
  - si `custom` está activo, cambia la familia del tema de vuelta a `claw`
- Payload personalizado almacenado no válido en la primera carga:
  - ignorar el payload almacenado
  - no emitir CSS personalizado
  - si la familia del tema persistida era `custom`, volver a `claw`

En ningún momento una importación fallida debe dejar el documento activo con variables CSS personalizadas parciales aplicadas.

## Archivos que se espera que cambien en la implementación

Archivos principales:

- `ui/src/ui/theme.ts`
- `ui/src/ui/storage.ts`
- `ui/src/ui/app-settings.ts`
- `ui/src/ui/views/config.ts`
- `ui/src/ui/views/config-quick.ts`
- `ui/src/styles/base.css`

Probables nuevos ayudantes:

- `ui/src/ui/custom-theme.ts`

Pruebas:

- `ui/src/ui/app-settings.test.ts`
- `ui/src/ui/storage.node.test.ts`
- `ui/src/ui/views/config.browser.test.ts`
- nuevas pruebas enfocadas en el análisis de URL y la normalización de payloads

## Pruebas

Cobertura mínima de implementación:

- analizar la URL del enlace compartido en el ID del tema tweakcn
- normalizar `/themes/{id}` y `/r/themes/{id}` en la URL de búsqueda
- rechazar hosts no admitidos e IDs malformados
- validar la forma del payload de tweakcn
- mapear un payload válido de tweakcn en mapas de tokens normalizados de OpenClaw claro y oscuro
- cargar y guardar el payload personalizado en la configuración local del navegador
- resolver `custom` para `light`, `dark` y `system`
- deshabilitar la selección de `Custom` cuando no existe ningún payload
- aplicar el tema importado inmediatamente cuando `custom` ya está activo
- volver a `claw` cuando se borra el tema personalizado activo

Objetivo de verificación manual:

- importar un tema conocido de tweakcn desde Configuración
- alternar entre `light`, `dark` y `system`
- alternar entre `custom` y las familias integradas
- recargar la página y confirmar que el tema personalizado importado persiste localmente

## Notas de implementación

Esta característica es intencionalmente pequeña. Si los usuarios piden más adelante múltiples temas importados, cambiar el nombre, exportar o la sincronización entre dispositivos, trátelo como un diseño de seguimiento. No construya previamente una abstracción de biblioteca de temas en esta implementación.
