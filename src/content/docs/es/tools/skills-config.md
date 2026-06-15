---
title: "Configuración de habilidades"
sidebarTitle: "Configuración de habilidades"
summary: "Referencia completa del esquema de configuración skills.*, listas de permitidos de agentes, configuración del taller y manejo de variables de entorno del sandbox."
read_when:
  - Configuring skill loading, install, or gating behavior
  - Setting per-agent skill visibility
  - Adjusting Skill Workshop limits or approval policy
---

La mayor parte de la configuración de habilidades reside en `skills` en
`~/.openclaw/openclaw.json`. La visibilidad específica del agente reside en
`agents.defaults.skills` y `agents.list[].skills`.

```json5
{
  skills: {
    allowBundled: ["gemini", "peekaboo"],
    load: {
      extraDirs: ["~/Projects/agent-scripts/skills"],
      allowSymlinkTargets: ["~/Projects/manager/skills"],
      watch: true,
      watchDebounceMs: 250,
    },
    install: {
      preferBrew: true,
      nodeManager: "npm",
      allowUploadedArchives: false,
    },
    workshop: {
      autonomous: { enabled: false },
      approvalPolicy: "pending",
      maxPending: 50,
      maxSkillBytes: 40000,
    },
    entries: {
      "image-lab": {
        enabled: true,
        apiKey: { source: "env", provider: "default", id: "GEMINI_API_KEY" },
        env: { GEMINI_API_KEY: "GEMINI_KEY_HERE" },
      },
      peekaboo: { enabled: true },
      sag: { enabled: false },
    },
  },
}
```

<Note>Para la generación de imágenes integrada, use `agents.defaults.imageGenerationModel` junto con la herramienta central `image_generate` en lugar de `skills.entries`. Las entradas de habilidades son solo para flujos de trabajo de habilidades personalizados o de terceros.</Note>

## Cargando (`skills.load`)

<ParamField path="skills.load.extraDirs" type="string[]">
  Directorios de habilidades adicionales para escanear, con la menor prioridad (después de las habilidades agrupadas y de los complementos). Las rutas se expanden con compatibilidad con `~`.
</ParamField>

<ParamField path="skills.load.allowSymlinkTargets" type="string[]">
  Directorios de destino reales de confianza a los que las carpetas de habilidades con enlaces simbólicos pueden resolver,
  incluso cuando el enlace simbólico reside fuera de la raíz configurada. Use esto para
  diseños intencionales de repositorios hermanos como
  `<workspace>/skills/manager -> ~/Projects/manager/skills`. Mantenga esta lista
  reducida — no apunte a raíces amplias como `~` o `~/Projects`.
</ParamField>

<ParamField path="skills.load.watch" type="boolean" default="true">
  Vigila las carpetas de habilidades y actualiza la instantánea de habilidades cuando los archivos `SKILL.md` cambian. Cubre archivos anidados bajo raíces de habilidades agrupadas.
</ParamField>

<ParamField path="skills.load.watchDebounceMs" type="number" default="250">
  Ventana de rebote para los eventos del observador de habilidades en milisegundos.
</ParamField>

## Instalación (`skills.install`)

<ParamField path="skills.install.preferBrew" type="boolean" default="true">
  Prefiere los instaladores de Homebrew cuando `brew` esté disponible.
</ParamField>

<ParamField path="skills.install.nodeManager" type='"npm" | "pnpm" | "yarn" | "bun"' default='"npm"'>
  Preferencia del administrador de paquetes de Node para la instalación de habilidades. Esto solo afecta las instalaciones de habilidades — el tiempo de ejecución de Gateway aún debería usar Node (no se recomienda Bun para WhatsApp/Telegram). Use `openclaw setup --node-manager` para npm, pnpm o bun; configure `"yarn"` manualmente para instalaciones de habilidades respaldadas por Yarn.
</ParamField>

<ParamField path="skills.install.allowUploadedArchives" type="boolean" default="false">
  Permitir que los clientes de Gateway `operator.admin` de confianza instalen archivos zip privados preparados a través de `skills.upload.*`. Las instalaciones normales de ClawHub no necesitan esta configuración.
</ParamField>

## Lista de permitidos de habilidades agrupadas

<ParamField path="skills.allowBundled" type="string[]">
  Lista de permitidos opcional solo para habilidades **agrupadas**. Cuando se establece, solo las habilidades agrupadas de la lista son elegibles. Las habilidades gestionadas, de nivel de agente y del espacio de trabajo no se ven afectadas.
</ParamField>

## Entradas por habilidad (`skills.entries`)

Las claves bajo `entries` coinciden con el `name` de la habilidad de manera predeterminada. Si una habilidad define `metadata.openclaw.skillKey`, use esa clave en su lugar. Ponga entre comillas los nombres con guiones (JSON5 permite claves entre comillas).

<ParamField path="skills.entries.<key>.enabled" type="boolean">
  `false` deshabilita la habilidad incluso cuando está agrupada o instalada. La habilidad agrupada `coding-agent` es opcional — configúrela en `true` y asegúrese de que uno de `claude`, `codex`, `opencode` u otra CLI compatible esté instalada y autenticada.
</ParamField>

<ParamField path="skills.entries.<key>.apiKey" type='string | { source, provider, id }'>
  Campo de conveniencia para habilidades que declaran `metadata.openclaw.primaryEnv`.
  Soporta una cadena de texto sin formato o una SecretRef: `{ source: "env", provider: "default", id: "VAR_NAME" }`.
</ParamField>

<ParamField path="skills.entries.<key>.env" type="Record<string, string>">
  Variables de entorno inyectadas para la ejecución del agente. Solo se inyectan cuando la variable aún no está establecida en el proceso.
</ParamField>

<ParamField path="skills.entries.<key>.config" type="object">
  Bolsa opcional para campos de configuración personalizados por habilidad.
</ParamField>

## Listas de permitidos de agentes (`agents`)

Use la configuración del agente cuando desee las mismas raíces de habilidad de máquina/espacio de trabajo pero un conjunto de habilidades visible diferente para cada agente.

```json5
{
  agents: {
    defaults: {
      skills: ["github", "weather"], // shared baseline
    },
    list: [
      { id: "writer" }, // inherits github, weather
      { id: "docs", skills: ["docs-search"] }, // replaces defaults entirely
      { id: "locked-down", skills: [] }, // no skills
    ],
  },
}
```

<ParamField path="agents.defaults.skills" type="string[]">
  Lista de permitidos base compartida heredada por los agentes que omiten `agents.list[].skills`. Omita por completo para dejar las habilidades sin restricciones de forma predeterminada.
</ParamField>

<ParamField path="agents.list[].skills" type="string[]">
  Conjunto final de habilidades explícito para ese agente. Las listas explícitas **reemplazan** los valores predeterminados heredados; no se fusionan. Establézcalo en `[]` para no exponer habilidades para ese agente.
</ParamField>

## Taller (`skills.workshop`)

<ParamField path="skills.workshop.autonomous.enabled" type="boolean" default="false">
  Cuando es `true`, los agentes pueden crear propuestas pendientes a partir de señales de conversación duraderas después de turnos exitosos. La creación de habilidades solicitada por el usuario siempre pasa por el Taller de habilidades independientemente de esta configuración.
</ParamField>

<ParamField path="skills.workshop.approvalPolicy" type='"pending" | "auto"' default='"pending"'>
  `pending` requiere la aprobación del operador antes de aplicar, rechazar o poner en cuarentena iniciado por el agente. `auto` permite esas acciones sin aprobación.
</ParamField>

<ParamField path="skills.workshop.maxPending" type="number" default="50">
  Máximo de propuestas pendientes y en cuarentena retenidas por espacio de trabajo.
</ParamField>

<ParamField path="skills.workshop.maxSkillBytes" type="number" default="40000">
  Tamaño máximo del cuerpo de la propuesta en bytes. Las descripciones de las propuestas tienen un límite estricto de 160 bytes porque aparecen en los resultados de descubrimiento y listado.
</ParamField>

## Raíces de habilidades con enlaces simbólicos

De forma predeterminada, las raíces de habilidades del espacio de trabajo, agente de proyecto, directorio adicional y agrupadas son límites de contención. Se omite una carpeta de habilidad con enlaces simbólicos bajo `<workspace>/skills` que se resuelve fuera de la raíz con un mensaje de registro.

Para permitir un diseño intencional de enlaces simbólicos, declare el objetivo de confianza:

```json5
{
  skills: {
    load: {
      extraDirs: ["~/Projects/manager/skills"],
      allowSymlinkTargets: ["~/Projects/manager/skills"],
    },
  },
}
```

Con esta configuración, `<workspace>/skills/manager -> ~/Projects/manager/skills` se
acepta después de la resolución de realpath. `extraDirs` escanea directamente el repositorio hermano;
`allowSymlinkTargets` conserva la ruta del enlace simbólico para diseños existentes.

Los directorios gestionados `~/.openclaw/skills` y personales `~/.agents/skills`
ya aceptan enlaces simbólicos a directorios de habilidades (el confinamiento `SKILL.md` por habilidad todavía
se aplica).

## Habilidades en sandbox y variables de entorno

<Warning>
  `skills.entries.<skill>.env` y `apiKey` se aplican solo a ejecuciones en el **host**. Dentro
de un sandbox no tienen ningún efecto; una habilidad que depende de `GEMINI_API_KEY` fallará
con `apiKey not configured` a menos que se proporcione la variable al sandbox
por separado.
</Warning>

Pase secretos a un sandbox de Docker con:

```json5
{
  agents: {
    defaults: {
      sandbox: {
        docker: {
          env: { GEMINI_API_KEY: "your-key-here" },
        },
      },
    },
  },
}
```

<Note>Los usuarios con acceso al demonio de Docker pueden inspeccionar los valores de `sandbox.docker.env` a través de los metadatos de Docker. Use un archivo secreto montado, una imagen personalizada u otra ruta de entrega cuando esa exposición no sea aceptable.</Note>

## Recordatorio del orden de carga

```text
workspace/skills      (highest)
workspace/.agents/skills
~/.agents/skills
~/.openclaw/skills
bundled skills
skills.load.extraDirs (lowest)
```

Los cambios en las habilidades y la configuración entran en vigor en la próxima nueva sesión cuando el
observador está habilitado, o en el próximo turno del agente cuando el observador detecta un cambio.

## Relacionado

<CardGroup cols={2}>
  <Card title="Referencia de habilidades" href="/es/tools/skills" icon="puzzle-piece">
    Qué son las habilidades, el orden de carga, la regulación y el formato SKILL.md.
  </Card>
  <Card title="Creación de habilidades" href="/es/tools/creating-skills" icon="hammer">
    Creación de habilidades personalizadas para el espacio de trabajo.
  </Card>
  <Card title="Taller de habilidades" href="/es/tools/skill-workshop" icon="flask">
    Cola de propuestas para habilidades redactadas por el agente.
  </Card>
  <Card title="Comandos de barra" href="/es/tools/slash-commands" icon="terminal">
    Catálogo nativo de comandos de barra y directivas de chat.
  </Card>
</CardGroup>
