---
summary: "Cómo OpenClaw maneja el acceso local a archivos de forma segura y por qué el asistente fs-safe opcional de Python está desactivado por defecto"
read_when:
  - Changing file access, archive extraction, workspace storage, or plugin filesystem helpers
title: "Operaciones seguras de archivos"
---

OpenClaw utiliza [`@openclaw/fs-safe`](https://github.com/openclaw/fs-safe) para operaciones locales de archivos sensibles a la seguridad: lecturas/escrituras limitadas a la raíz, reemplazo atómico, extracción de archivos, espacios de trabajo temporales, estado JSON y manejo de archivos secretos.

El objetivo es una **barandilla de biblioteca** (library guardrail) consistente para el código de confianza de OpenClaw que recibe nombres de ruta no confiables. No es un entorno de pruebas (sandbox). Los permisos del sistema de archivos del host, los usuarios del sistema operativo, los contenedores y la política del agente/herramienta siguen definiendo el radio de explosión real.

## Por defecto: sin asistente de Python

OpenClaw establece por defecto el asistente fs-safe de Python POSIX en **desactivado** (off).

Por qué:

- la puerta de enlace (gateway) no debería iniciar un sidecar de Python persistente a menos que un operador haya optado por ello;
- muchas instalaciones no necesitan el endurecimiento adicional de mutación del directorio principal;
- desactivar Python mantiene el comportamiento del paquete/tiempo de ejecución más predecible en los entornos de escritorio, Docker, CI y aplicaciones empaquetadas.

OpenClaw solo cambia el valor predeterminado. Si establece explícitamente un modo, fs-safe lo respeta:

```bash
# Default OpenClaw behavior: Node-only fs-safe fallbacks.
OPENCLAW_FS_SAFE_PYTHON_MODE=off

# Opt into the helper when available, falling back if unavailable.
OPENCLAW_FS_SAFE_PYTHON_MODE=auto

# Fail closed if the helper cannot start.
OPENCLAW_FS_SAFE_PYTHON_MODE=require

# Optional explicit interpreter.
OPENCLAW_FS_SAFE_PYTHON=/usr/bin/python3
```

Los nombres genéricos de fs-safe también funcionan: `FS_SAFE_PYTHON_MODE` y `FS_SAFE_PYTHON`.

## Qué permanece protegido sin Python

Con el asistente desactivado, OpenClaw todavía utiliza las rutas Node de fs-safe para:

- rechazar escapes de ruta relativa como `..`, rutas absolutas y separadores de ruta donde solo se permiten nombres;
- resolver operaciones a través de un identificador raíz de confianza en lugar de comprobaciones `path.resolve(...).startsWith(...)` ad-hoc;
- rechazar patrones de enlaces simbólicos y enlaces duros en las API que requieren esa política;
- abrir archivos con comprobaciones de identidad donde la API devuelve o consume el contenido del archivo;
- escrituras atómicas de archivos temporales hermanos para archivos de estado/configuración;
- límites de bytes para lecturas y extracción de archivos;
- modos privados para secretos y archivos de estado donde la API los requiere.

Estas protecciones cubren el modelo de amenaza normal de OpenClaw: código de puerta de enlace de confianza que maneja entrada de ruta de modelo/complemento/canal no confiable dentro de un único límite de operador de confianza.

## Qué añade Python

En POSIX, el asistente opcional de fs-safe mantiene un proceso Python persistente y utiliza operaciones de sistema de archivos relativas al fd para mutaciones de directorios principales como cambiar el nombre, eliminar, mkdir, stat/list y algunas rutas de escritura.

Eso reduce las ventanas de carrera del mismo UID donde otro proceso puede intercambiar un directorio principal entre la validación y la mutación. Es una defensa en profundidad para hosts donde procesos locales no confiables pueden modificar los mismos directorios en los que OpenClaw está operando.

Si su implementación tiene ese riesgo y se garantiza la existencia de Python, use:

```bash
OPENCLAW_FS_SAFE_PYTHON_MODE=require
```

Use `require` en lugar de `auto` cuando el asistente es parte de su postura de seguridad; `auto` recurre intencionalmente al comportamiento solo de Node si el asistente no está disponible.

## Orientación para complementos y núcleo

- El acceso a archivos orientado a complementos debe pasar a través de los asistentes `openclaw/plugin-sdk/*`, no `fs` sin procesar, cuando una ruta proviene de un mensaje, salida del modelo, configuración o entrada del complemento.
- El código central debe usar los contenedores locales de fs-safe bajo `src/infra/*` para que la política de procesos de OpenClaw se aplique de manera consistente.
- La extracción de archivos debe usar los asistentes de archivo fs-safe con límites explícitos de tamaño, recuento de entradas, enlace y destino.
- Los secretos deben usar los asistentes de secretos de OpenClaw o los asistentes de estado privado/secreto de fs-safe; no implemente comprobaciones de modo manual alrededor de `fs.writeFile`.
- Si necesita aislamiento de usuarios locales hostiles, no confíe solo en fs-safe. Ejecute pasarelas separadas bajo usuarios/sistemas operativos separados o use sandboxing.

Relacionado: [Seguridad](/es/gateway/security), [Sandboxing](/es/gateway/sandboxing), [Aprobaciones de ejecución](/es/tools/exec-approvals), [Secretos](/es/gateway/secrets).
