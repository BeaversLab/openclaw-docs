---
summary: "Construye y prueba habilidades personalizadas del espacio de trabajo con SKILL.md"
title: "Creación de habilidades"
read_when:
  - You are creating a new custom skill in your workspace
  - You need a quick starter workflow for SKILL.md-based skills
---

Las habilidades enseñan al agente cómo y cuándo usar las herramientas. Cada habilidad es un directorio
que contiene un archivo `SKILL.md` con frontmatter YAML e instrucciones en markdown.

Para obtener información sobre cómo se cargan y priorizan las habilidades, consulte [Habilidades](/es/tools/skills).

## Crea tu primera habilidad

<Steps>
  <Step title="Crear el directorio de la habilidad">
    Las habilidades residen en tu espacio de trabajo. Crea una nueva carpeta:

    ```bash
    mkdir -p ~/.openclaw/workspace/skills/hello-world
    ```

  </Step>

  <Step title="Escribir SKILL.md">
    Cree `SKILL.md` dentro de ese directorio. Los metadatos del frontmatter definen
    y el cuerpo de markdown contiene instrucciones para el agente.

    ```markdown
    ---
    name: hello-world
    description: A simple skill that says hello.
    ---

    # Hello World Skill

    When the user asks for a greeting, use the `echo` tool to say
    "Hello from your custom skill!".
    ```

    Use guiones (hyphen-case) con letras minúsculas, dígitos y guiones para la habilidad
    `name`. Mantenga el nombre de la carpeta y el frontmatter `name` alineados.

  </Step>

  <Step title="Añadir herramientas (opcional)">
    Puede definir esquemas de herramientas personalizados en el frontmatter o instruir al agente
    para que utilice herramientas del sistema existentes (como `exec` o `browser`). Las habilidades también pueden
    incluirse dentro de complementos junto con las herramientas que documentan.

  </Step>

  <Step title="Cargar la habilidad">
    Inicia una nueva sesión para que OpenClaw reconozca la habilidad:

    ```bash
    # From chat
    /new

    # Or restart the gateway
    openclaw gateway restart
    ```

    Verifica que la habilidad se haya cargado:

    ```bash
    openclaw skills list
    ```

  </Step>

  <Step title="Probarla">
    Envía un mensaje que debería activar la habilidad:

    ```bash
    openclaw agent --message "give me a greeting"
    ```

    O simplemente chatea con el agente y pide un saludo.

  </Step>
</Steps>

## Referencia de metadatos de habilidades

El frontmatter YAML admite estos campos:

| Campo                               | Obligatorio | Descripción                                                          |
| ----------------------------------- | ----------- | -------------------------------------------------------------------- |
| `name`                              | Sí          | Identificador único que utiliza letras minúsculas, dígitos y guiones |
| `description`                       | Sí          | Descripción de una línea que se muestra al agente                    |
| `metadata.openclaw.os`              | No          | Filtro de sistema operativo (`["darwin"]`, `["linux"]`, etc.)        |
| `metadata.openclaw.requires.bins`   | No          | Binarios requeridos en PATH                                          |
| `metadata.openclaw.requires.config` | No          | Claves de configuración requeridas                                   |

## Características avanzadas

Una vez que una habilidad básica funciona, estos campos ayudan a que sea fiable y portátil:

- **Activación condicional** — use `requires.bins`, `requires.env` o
  `requires.config` para cargar la habilidad solo cuando las dependencias requeridas estén
  disponibles. Consulte [Referencia de habilidades: bloqueo](/es/tools/skills#gating).
- **Cableado de entorno y clave de API** — use `skills.entries.<name>.env` y
  `skills.entries.<name>.apiKey` para inyectar el entorno del lado del host para un turno
  de habilidad. Consulte [Referencia de habilidades: cableado de configuración](/es/tools/skills#config-wiring).
- **Control de invocación** — establezca `user-invocable: false` para ocultar un comando de barra,
  o `disable-model-invocation: true` para mantener una habilidad de estilo de comando fuera del
  prompt del modelo. Consulte [Referencia de habilidades: frontmatter](/es/tools/skills#frontmatter).
- **Despacho directo de comandos** — use `command-dispatch: tool` con
  `command-tool` cuando un comando de barra deba llamar a una herramienta directamente en lugar de
  enrutar a través del modelo.
- **Rutas portables** — use `{baseDir}` en `SKILL.md` al hacer referencia a scripts
  o activos dentro del directorio de la habilidad.
- **Publicación** — use la habilidad ClawHub al preparar una habilidad para su publicación.
  Documenta la forma actual del comando `clawhub publish` y los metadatos
  requeridos.

## Mejores prácticas

- **Sea conciso** — indique al modelo _qué_ hacer, no cómo ser una IA
- **Seguridad primero** — si su habilidad usa `exec`, asegúrese de que los prompts no permitan la inyección arbitraria de comandos desde entradas que no son confiables
- **Probar localmente** — use `openclaw agent --message "..."` para probar antes de compartir
- **Usar ClawHub** — navegue y contribuya con habilidades en [ClawHub](https://clawhub.ai)

## Dónde residen las habilidades

| Ubicación                       | Precedencia | Alcance                             |
| ------------------------------- | ----------- | ----------------------------------- |
| `\<workspace\>/skills/`         | La más alta | Por agente                          |
| `\<workspace\>/.agents/skills/` | Alta        | Agente por espacio de trabajo       |
| `~/.agents/skills/`             | Media       | Perfil de agente compartido         |
| `~/.openclaw/skills/`           | Media       | Compartido (todos los agentes)      |
| Incluido (enviado con OpenClaw) | Baja        | Global                              |
| `skills.load.extraDirs`         | El más bajo | Carpetas compartidas personalizadas |

## Relacionado

- [Referencia de habilidades](/es/tools/skills) — carga, precedencia y reglas de filtrado
- [Configuración de habilidades](/es/tools/skills-config) — esquema de configuración de `skills.*`
- [ClawHub](/es/clawhub) — registro público de habilidades
- [Construcción de complementos](/es/plugins/building-plugins) — los complementos pueden incluir habilidades
