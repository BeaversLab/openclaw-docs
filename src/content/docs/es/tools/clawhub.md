---
summary: "ClawHub: registro público para habilidades y complementos de OpenClaw, flujos de instalación nativos y la CLI de clawhub"
read_when:
  - Searching for, installing, or updating skills or plugins
  - Publishing skills or plugins to the registry
  - Configuring the clawhub CLI or its environment overrides
title: "ClawHub"
sidebarTitle: "ClawHub"
---

ClawHub es el registro público para **habilidades y plugins de OpenClaw**.

- Use los comandos nativos `openclaw` para buscar, instalar y actualizar habilidades, y para instalar complementos desde ClawHub.
- Use la CLI independiente `clawhub` para la autenticación en el registro, publicación, eliminación/restauración y flujos de trabajo de sincronización.

Sitio: [clawhub.ai](https://clawhub.ai)

## Inicio rápido

<Steps>
  <Step title="Buscar">
    ```bash
    openclaw skills search "calendar"
    ```
  </Step>
  <Step title="Instalar">
    ```bash
    openclaw skills install <skill-slug>
    ```
  </Step>
  <Step title="Usar">
    Inicie una nueva sesión de OpenClaw; esta detectará la nueva habilidad.
  </Step>
  <Step title="Publicar (opcional)">
    Para flujos de trabajo autenticados en el registro (publicar, sincronizar, administrar), instale
    la CLI independiente `clawhub`:

    ```bash
    npm i -g clawhub
    # or
    pnpm add -g clawhub
    ```

  </Step>
</Steps>

## Flujos nativos de OpenClaw

<Tabs>
  <Tab title="Habilidades">
    ```bash
    openclaw skills search "calendar"
    openclaw skills install <skill-slug>
    openclaw skills update --all
    ```

    Los comandos nativos `openclaw` se instalan en su espacio de trabajo activo y
    guardan los metadatos de origen para que las llamadas posteriores a `update` puedan permanecer en ClawHub.

  </Tab>
  <Tab title="Complementos">
    ```bash
    openclaw plugins install clawhub:<package>
    openclaw plugins update --all
    ```

    También se intentan especificaciones de complementos simples compatibles con npm en ClawHub antes que en npm:

    ```bash
    openclaw plugins install openclaw-codex-app-server
    ```

    Use `npm:<package>` cuando desee una resolución solo de npm sin una
    búsqueda en ClawHub:

    ```bash
    openclaw plugins install npm:openclaw-codex-app-server
    ```

    Las instalaciones de complementos validan la compatibilidad anunciada de `pluginApi` y
    `minGatewayVersion` antes de ejecutar la instalación del archivo, por lo que
    los hosts incompatibles fallan de forma cerrada temprano en lugar de instalar parcialmente
    el paquete.

  </Tab>
</Tabs>

<Note>
`openclaw plugins install clawhub:...` solo acepta familias de complementos
instalables. Si un paquete de ClawHub es en realidad una habilidad, OpenClaw se detiene y
le indica que use `openclaw skills install <slug>` en su lugar.

Las instalaciones anónimas de complementos de ClawHub también fallan de forma cerrada para paquetes privados.
Los canales comunitarios u otros no oficiales aún pueden instalar, pero OpenClaw
advierte para que los operadores puedan revisar el origen y la verificación antes de habilitarlos.

</Note>

## Qué es ClawHub

- Un registro público para habilidades y complementos de OpenClaw.
- Un almacén versionado de paquetes de habilidades y metadatos.
- Una superficie de descubrimiento para búsqueda, etiquetas y señales de uso.

Una habilidad típica es un paquete versionado de archivos que incluye:

- Un archivo `SKILL.md` con la descripción principal y el uso.
- Configuraciones opcionales, scripts o archivos de soporte utilizados por la habilidad.
- Metadatos como etiquetas, resumen y requisitos de instalación.

ClawHub utiliza metadatos para potenciar el descubrimiento y exponer de manera segura las capacidades de las
habilidades. El registro rastrea señales de uso (estrellas, descargas) para
mejorar la clasificación y la visibilidad. Cada publicación crea una nueva versión semver,
y el registro mantiene el historial de versiones para que los usuarios puedan auditar
los cambios.

## Carga del espacio de trabajo y de habilidades

La CLI `clawhub` también instala habilidades en `./skills` dentro
de su directorio de trabajo actual. Si un espacio de trabajo de OpenClaw está configurado,
`clawhub` recurre a ese espacio de trabajo a menos que anule `--workdir`
(o `CLAWHUB_WORKDIR`). OpenClaw carga las habilidades del espacio de trabajo desde
`<workspace>/skills` y las recoge en la **siguiente** sesión.

Si ya usa `~/.openclaw/skills` o habilidades empaquetadas, las habilidades del
espacio de trabajo tienen prioridad. Para obtener más detalles sobre cómo se cargan,comparten y restringen las habilidades, consulte [Habilidades](/es/tools/skills).

## Características del servicio

| Característica          | Notas                                                                          |
| ----------------------- | ------------------------------------------------------------------------------ |
| Navegación pública      | Las habilidades y su contenido `SKILL.md` son visibles públicamente.           |
| Búsqueda                | Impulsado por incrustaciones (búsqueda vectorial), no solo por palabras clave. |
| Control de versiones    | Semver, registros de cambios y etiquetas (incluyendo `latest`).                |
| Descargas               | Zip por versión.                                                               |
| Estrellas y comentarios | Comentarios de la comunidad.                                                   |
| Moderación              | Aprobaciones y auditorías.                                                     |
| API amigable para CLI   | Adecuado para automatización y creación de guiones (scripting).                |

## Seguridad y moderación

ClawHub es abierto por defecto: cualquiera puede subir habilidades (skills), pero una cuenta de GitHub
debe tener **al menos una semana de antigüedad** para publicar. Esto ralentiza
el abuso sin bloquear a los contribuyentes legítimos.

<AccordionGroup>
  <Accordion title="Reporting">- Cualquier usuario que haya iniciado sesión puede reportar una habilidad. - Se requieren y registran los motivos del reporte. - Cada usuario puede tener hasta 20 reportes activos a la vez. - Las habilidades con más de 3 reportes únicos se ocultan automáticamente por defecto.</Accordion>
  <Accordion title="Moderation">- Los moderadores pueden ver las habilidades ocultas, mostrarlas, eliminarlas o prohibir a los usuarios. - El abuso de la función de reporte puede resultar en prohibiciones de cuenta. - ¿Interesado en convertirte en moderador? Pregúntalo en el Discord de OpenClaw y contacta a un moderador o mantenedor.</Accordion>
</AccordionGroup>

## CLI de ClawHub

Solo necesitas esto para flujos de trabajo autenticados en el registro, tales como
publicar/sincronizar.

### Opciones globales

<ParamField path="--workdir <dir>" type="string">
  Directorio de trabajo. Predeterminado: directorio actual; recurre al espacio de trabajo de OpenClaw.
</ParamField>
<ParamField path="--dir <dir>" type="string" default="skills">
  Directorio de habilidades, relativo al directorio de trabajo.
</ParamField>
<ParamField path="--site <url>" type="string">
  URL base del sitio (inicio de sesión en el navegador).
</ParamField>
<ParamField path="--registry <url>" type="string">
  URL base de la API del registro.
</ParamField>
<ParamField path="--no-input" type="boolean">
  Desactivar mensajes (no interactivo).
</ParamField>
<ParamField path="-V, --cli-version" type="boolean">
  Imprimir la versión de la CLI.
</ParamField>

### Comandos

<AccordionGroup>
  <Accordion title="Auth (login / logout / whoami)">
    ```bash
    clawhub login              # browser flow
    clawhub login --token <token>
    clawhub logout
    clawhub whoami
    ```

    Opciones de inicio de sesión:

    - `--token <token>` — pegar un token de API.
    - `--label <label>` — etiqueta almacenada para tokens de inicio de sesión del navegador (predeterminado: `CLI token`).
    - `--no-browser` — no abrir un navegador (requiere `--token`).

  </Accordion>
  <Accordion title="Buscar">
    ```bash
    clawhub search "query"
    ```

    - `--limit <n>` — máximos resultados.

  </Accordion>
  <Accordion title="Instalar / actualizar / listar">
    ```bash
    clawhub install <slug>
    clawhub update <slug>
    clawhub update --all
    clawhub list
    ```

    Opciones:

    - `--version <version>` — instalar o actualizar a una versión específica (solo un solo slug en `update`).
    - `--force` — sobrescribir si la carpeta ya existe, o cuando los archivos locales no coinciden con ninguna versión publicada.
    - `clawhub list` lee `.clawhub/lock.json`.

  </Accordion>
  <Accordion title="Publicar habilidades">
    ```bash
    clawhub skill publish <path>
    ```

    Opciones:

    - `--slug <slug>` — slug de la habilidad.
    - `--name <name>` — nombre para mostrar.
    - `--version <version>` — versión semver.
    - `--changelog <text>` — texto del registro de cambios (puede estar vacío).
    - `--tags <tags>` — etiquetas separadas por comas (predeterminado: `latest`).

  </Accordion>
  <Accordion title="Publicar complementos">
    ```bash
    clawhub package publish <source>
    ```

    `<source>` puede ser una carpeta local, `owner/repo`, `owner/repo@ref`, o una
    URL de GitHub.

    Opciones:

    - `--dry-run` — crear el plan de publicación exacto sin subir nada.
    - `--json` — emitir salida legible por máquina para CI.
    - `--source-repo`, `--source-commit`, `--source-ref` — anulaciones opcionales cuando la detección automática no es suficiente.

  </Accordion>
  <Accordion title="Eliminar / restaurar (propietario o administrador)">
    ```bash
    clawhub delete <slug> --yes
    clawhub undelete <slug> --yes
    ```
  </Accordion>
  <Accordion title="Sync (escanear local + publicar nuevo o actualizado)">
    ```bash
    clawhub sync
    ```

    Opciones:

    - `--root <dir...>` — raíces de escaneo adicionales.
    - `--all` — subir todo sin confirmaciones.
    - `--dry-run` — mostrar qué se subiría.
    - `--bump <type>` — `patch|minor|major` para las actualizaciones (predeterminado: `patch`).
    - `--changelog <text>` — registro de cambios para actualizaciones no interactivas.
    - `--tags <tags>` — etiquetas separadas por comas (predeterminado: `latest`).
    - `--concurrency <n>` — comprobaciones del registro (predeterminado: `4`).

  </Accordion>
</AccordionGroup>

## Flujos de trabajo comunes

<Tabs>
  <Tab title="Buscar">```bash clawhub search "postgres backups" ```</Tab>
  <Tab title="Instalar">```bash clawhub install my-skill-pack ```</Tab>
  <Tab title="Actualizar todo">```bash clawhub update --all ```</Tab>
  <Tab title="Publicar una sola habilidad">```bash clawhub skill publish ./my-skill --slug my-skill --name "My Skill" --version 1.0.0 --tags latest ```</Tab>
  <Tab title="Sincronizar muchas habilidades">```bash clawhub sync --all ```</Tab>
  <Tab title="Publicar un complemento desde GitHub">```bash clawhub package publish your-org/your-plugin --dry-run clawhub package publish your-org/your-plugin clawhub package publish your-org/your-plugin@v1.0.0 clawhub package publish https://github.com/your-org/your-plugin ```</Tab>
</Tabs>

### Metadatos del paquete de complementos

Los complementos de código deben incluir los metadatos requeridos de OpenClaw en
`package.json`:

```json
{
  "name": "@myorg/openclaw-my-plugin",
  "version": "1.0.0",
  "type": "module",
  "openclaw": {
    "extensions": ["./src/index.ts"],
    "runtimeExtensions": ["./dist/index.js"],
    "compat": {
      "pluginApi": ">=2026.3.24-beta.2",
      "minGatewayVersion": "2026.3.24-beta.2"
    },
    "build": {
      "openclawVersion": "2026.3.24-beta.2",
      "pluginSdkVersion": "2026.3.24-beta.2"
    }
  }
}
```

Los paquetes publicados deben distribuir **JavaScript compilado** y señalar
`runtimeExtensions` a esa salida. Las instalaciones de Git checkout aún pueden volver
al código fuente TypeScript cuando no existen archivos compilados, pero las entradas
de tiempo de ejecución compiladas evitan la compilación de TypeScript en tiempo de ejecución durante el inicio, el doctor y
las rutas de carga de complementos.

## Versionado, archivo de bloqueo y telemetría

<AccordionGroup>
  <Accordion title="Versionado y etiquetas">
    - Cada publicación crea una nueva versión **semver** `SkillVersion`.
    - Las etiquetas (como `latest`) apuntan a una versión; mover las etiquetas te permite revertir cambios.
    - Los registros de cambios se adjuntan por versión y pueden estar vacíos al sincronizar o publicar actualizaciones.
  </Accordion>
  <Accordion title="Cambios locales vs. versiones del registro">
    Las actualizaciones comparan el contenido de la habilidad local con las versiones del registro utilizando un
    hash de contenido. Si los archivos locales no coinciden con ninguna versión publicada, la
    CLI pregunta antes de sobrescribir (o requiere `--force` en
    ejecuciones no interactivas).
  </Accordion>
  <Accordion title="Escaneo de sincronización y raíces de reserva">
    `clawhub sync` escanea primero tu directorio de trabajo actual. Si no se encuentran habilidades,
    recurre a ubicaciones heredadas conocidas (por ejemplo
    `~/openclaw/skills` y `~/.openclaw/skills`). Esto está diseñado para
    encontrar instalaciones de habilidades antiguas sin banderas adicionales.
  </Accordion>
  <Accordion title="Almacenamiento y archivo de bloqueo">
    - Las habilidades instaladas se registran en `.clawhub/lock.json` en tu directorio de trabajo.
    - Los tokens de autenticación se almacenan en el archivo de configuración de la CLI de ClawHub (anular mediante `CLAWHUB_CONFIG_PATH`).
  </Accordion>
  <Accordion title="Telemetría (recuentos de instalación)">
    Cuando ejecutas `clawhub sync` mientras estás conectado, la CLI envía una
    instantánea mínima para calcular los recuentos de instalación. Puedes desactivar esto por completo:

    ```bash
    export CLAWHUB_DISABLE_TELEMETRY=1
    ```

  </Accordion>
</AccordionGroup>

## Variables de entorno

| Variable                      | Efecto                                               |
| ----------------------------- | ---------------------------------------------------- |
| `CLAWHUB_SITE`                | Anular la URL del sitio.                             |
| `CLAWHUB_REGISTRY`            | Anular la URL de la API del registro.                |
| `CLAWHUB_CONFIG_PATH`         | Anular dónde la CLI almacena el token/configuración. |
| `CLAWHUB_WORKDIR`             | Anular el directorio de trabajo predeterminado.      |
| `CLAWHUB_DISABLE_TELEMETRY=1` | Desactivar telemetría en `sync`.                     |

## Relacionado

- [Complementos de la comunidad](/es/plugins/community)
- [Complementos](/es/tools/plugin)
- [Habilidades](/es/tools/skills)
