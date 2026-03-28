---
summary: "Guía de ClawHub: registro público, flujos de instalación nativos de OpenClaw y flujos de trabajo de la CLI de ClawHub"
read_when:
  - Introducing ClawHub to new users
  - Installing, searching, or publishing skills
  - Explaining ClawHub CLI flags and sync behavior
title: "ClawHub"
---

# ClawHub

ClawHub es el registro público para **habilidades y plugins de OpenClaw**.

- Utilice comandos nativos de `openclaw` para buscar/instalar/actualizar habilidades e instalar
  plugins desde ClawHub.
- Use la CLI `clawhub` separada cuando necesite autenticación de registro, publicación, eliminación,
  restauración o flujos de trabajo de sincronización.

Sitio: [clawhub.ai](https://clawhub.ai)

## Flujos nativos de OpenClaw

Habilidades:

```bash
openclaw skills search "calendar"
openclaw skills install <skill-slug>
openclaw skills update --all
```

Plugins:

```bash
openclaw plugins install clawhub:<package>
openclaw plugins update --all
```

Las especificaciones de plugin "bare" compatibles con npm también se intentan en ClawHub antes que en npm:

```bash
openclaw plugins install openclaw-codex-app-server
```

Los comandos nativos de `openclaw` se instalan en su espacio de trabajo activo y persisten los metadatos
de origen para que las llamadas posteriores a `update` puedan permanecer en ClawHub.

## Qué es ClawHub

- Un registro público para habilidades de OpenClaw.
- Un almacén versionado de paquetes de habilidades y metadatos.
- Una superficie de descubrimiento para búsqueda, etiquetas y señales de uso.

## Cómo funciona

1. Un usuario publica un paquete de habilidades (archivos + metadatos).
2. ClawHub almacena el paquete, analiza los metadatos y asigna una versión.
3. El registro indexa la habilidad para búsqueda y descubrimiento.
4. Los usuarios navegan, descargan e instalan habilidades en OpenClaw.

## Lo que puedes hacer

- Publicar nuevas habilidades y nuevas versiones de habilidades existentes.
- Descubrir habilidades por nombre, etiquetas o búsqueda.
- Descargar paquetes de habilidades e inspeccionar sus archivos.
- Reportar habilidades que sean abusivas o inseguras.
- Si es moderador, ocultar, mostrar, eliminar o prohibir.

## Para quién es esto (amigable para principiantes)

Si desea agregar nuevas capacidades a su agente de OpenClaw, ClawHub es la forma más fácil de encontrar e instalar habilidades. No necesita saber cómo funciona el backend. Puede:

- Buscar habilidades en lenguaje sencillo.
- Instalar una habilidad en su espacio de trabajo.
- Actualizar habilidades más tarde con un solo comando.
- Hacer una copia de seguridad de sus propias habilidades publicándolas.

## Inicio rápido (no técnico)

1. Busque algo que necesite:
   - `openclaw skills search "calendar"`
2. Instalar una habilidad:
   - `openclaw skills install <skill-slug>`
3. Inicie una nueva sesión de OpenClaw para que recoja la nueva habilidad.
4. Si desea publicar o administrar la autenticación del registro, instale también la CLI
   `clawhub` por separado.

## Instalar la CLI de ClawHub

Solo necesitas esto para flujos de trabajo autenticados en el registro, como publicar/sincronizar:

```bash
npm i -g clawhub
```

```bash
pnpm add -g clawhub
```

## Cómo se integra en OpenClaw

Las instalaciones nativas de `openclaw skills install` se realizan en el directorio del espacio de trabajo activo `skills/`. `openclaw plugins install clawhub:...` registra una instalación de complemento administrada normal más los metadatos de origen de ClawHub para las actualizaciones.

La CLI separada `clawhub` también instala habilidades en `./skills` en su directorio de trabajo actual. Si se configura un espacio de trabajo de OpenClaw, `clawhub` recurre a ese espacio de trabajo a menos que anule `--workdir` (o `CLAWHUB_WORKDIR`). OpenClaw carga las habilidades del espacio de trabajo desde `<workspace>/skills` y las recogerá en la **siguiente** sesión. Si ya usa `~/.openclaw/skills` o habilidades incluidas, las habilidades del espacio de trabajo tienen prioridad.

Para obtener más detalles sobre cómo se cargan, comparten y restringen las habilidades, consulte [Habilidades](/es/tools/skills).

## Resumen del sistema de habilidades

Una habilidad es un paquete versionado de archivos que enseña a OpenClaw a realizar una tarea específica. Cada publicación crea una nueva versión y el registro mantiene un historial de versiones para que los usuarios puedan auditar los cambios.

Una habilidad típica incluye:

- Un archivo `SKILL.md` con la descripción principal y el uso.
- Configuraciones, scripts o archivos de soporte opcionales utilizados por la habilidad.
- Metadatos como etiquetas, resumen y requisitos de instalación.

ClawHub utiliza metadatos para potenciar el descubrimiento y exponer de manera segura las capacidades de las habilidades. El registro también rastrea señales de uso (como estrellas y descargas) para mejorar la clasificación y la visibilidad.

## Lo que proporciona el servicio (características)

- **Navegación pública** de habilidades y su contenido de `SKILL.md`.
- **Búsqueda** impulsada por incrustaciones (búsqueda vectorial), no solo por palabras clave.
- **Control de versiones** con semver, registros de cambios y etiquetas (incluyendo `latest`).
- **Descargas** como un archivo zip por versión.
- **Estrellas y comentarios** para los comentarios de la comunidad.
- **Ganchos de moderación** para aprobaciones y auditorías.
- **API compatible con CLI** para automatización y secuencias de comandos.

## Seguridad y moderación

ClawHub es abierto por defecto. Cualquiera puede cargar habilidades, pero una cuenta de GitHub debe tener al menos una semana de antigüedad para publicar. Esto ayuda a frenar el abuso sin bloquear a los colaboradores legítimos.

Informes y moderación:

- Cualquier usuario que haya iniciado sesión puede reportar una habilidad.
- Las razones del reporte son obligatorias y se registran.
- Cada usuario puede tener hasta 20 reportes activos a la vez.
- Las habilidades con más de 3 reportes únicos se ocultan automáticamente por defecto.
- Los moderadores pueden ver las habilidades ocultas, mostrarlas, eliminarlas o prohibir a los usuarios.
- El abuso de la función de reporte puede resultar en prohibiciones de cuenta.

¿Interesado en convertirte en moderador? Pregunta en el Discord de OpenClaw y contacta a un moderador o mantenedor.

## Comandos y parámetros de la CLI

Opciones globales (aplican a todos los comandos):

- `--workdir <dir>`: Directorio de trabajo (predeterminado: directorio actual; usa el espacio de trabajo de OpenClaw como alternativa).
- `--dir <dir>`: Directorio de habilidades, relativo al directorio de trabajo (predeterminado: `skills`).
- `--site <url>`: URL base del sitio (inicio de sesión del navegador).
- `--registry <url>`: URL base de la API del registro.
- `--no-input`: Desactivar avisos (no interactivo).
- `-V, --cli-version`: Imprimir versión de la CLI.

Autenticación:

- `clawhub login` (flujo del navegador) o `clawhub login --token <token>`
- `clawhub logout`
- `clawhub whoami`

Opciones:

- `--token <token>`: Pegar un token de API.
- `--label <label>`: Etiqueta almacenada para los tokens de inicio de sesión del navegador (predeterminado: `CLI token`).
- `--no-browser`: No abrir un navegador (requiere `--token`).

Buscar:

- `clawhub search "query"`
- `--limit <n>`: Máximo de resultados.

Instalar:

- `clawhub install <slug>`
- `--version <version>`: Instalar una versión específica.
- `--force`: Sobrescribir si la carpeta ya existe.

Actualizar:

- `clawhub update <slug>`
- `clawhub update --all`
- `--version <version>`: Actualizar a una versión específica (solo un slug individual).
- `--force`: Sobrescribir cuando los archivos locales no coinciden con ninguna versión publicada.

Listar:

- `clawhub list` (lee `.clawhub/lock.json`)

Publicar:

- `clawhub publish <path>`
- `--slug <slug>`: Slug de habilidad.
- `--name <name>`: Nombre para mostrar.
- `--version <version>`: Versión Semver.
- `--changelog <text>`: Texto del registro de cambios (puede estar vacío).
- `--tags <tags>`: Etiquetas separadas por comas (predeterminado: `latest`).

Eliminar/Restaurar (solo propietario/administrador):

- `clawhub delete <slug> --yes`
- `clawhub undelete <slug> --yes`

Sincronizar (escanear habilidades locales + publicar nuevas/actualizadas):

- `clawhub sync`
- `--root <dir...>`: Raíces de escaneo adicionales.
- `--all`: Subir todo sin preguntas.
- `--dry-run`: Mostrar qué se subiría.
- `--bump <type>`: `patch|minor|major` para actualizaciones (predeterminado: `patch`).
- `--changelog <text>`: Registro de cambios para actualizaciones no interactivas.
- `--tags <tags>`: Etiquetas separadas por comas (predeterminado: `latest`).
- `--concurrency <n>`: Verificaciones del registro (predeterminado: 4).

## Flujos de trabajo comunes para agentes

### Buscar habilidades

```bash
clawhub search "postgres backups"
```

### Descargar nuevas habilidades

```bash
clawhub install my-skill-pack
```

### Actualizar habilidades instaladas

```bash
clawhub update --all
```

### Hacer copia de seguridad de sus habilidades (publicar o sincronizar)

Para una sola carpeta de habilidad:

```bash
clawhub publish ./my-skill --slug my-skill --name "My Skill" --version 1.0.0 --tags latest
```

Para escanear y hacer copia de seguridad de muchas habilidades a la vez:

```bash
clawhub sync --all
```

## Detalles avanzados (técnicos)

### Control de versiones y etiquetas

- Cada publicación crea una nueva versión **semver** `SkillVersion`.
- Las etiquetas (como `latest`) apuntan a una versión; mover las etiquetas le permite revertir.
- Los registros de cambios se adjuntan por versión y pueden estar vacíos al sincronizar o publicar actualizaciones.

### Cambios locales vs. versiones del registro

Las actualizaciones comparan el contenido de la habilidad local con las versiones del registro utilizando un hash de contenido. Si los archivos locales no coinciden con ninguna versión publicada, la CLI pregunta antes de sobrescribir (o requiere `--force` en ejecuciones no interactivas).

### Escaneo de sincronización y raíces de respaldo

`clawhub sync` escanea su directorio de trabajo actual primero. Si no se encuentran habilidades, recurre a ubicaciones heredadas conocidas (por ejemplo `~/openclaw/skills` y `~/.openclaw/skills`). Esto está diseñado para encontrar instalaciones de habilidades antiguas sin indicadores adicionales.

### Almacenamiento y archivo de bloqueo

- Las habilidades instaladas se registran en `.clawhub/lock.json` en tu directorio de trabajo.
- Los tokens de autenticación se almacenan en el archivo de configuración de la CLI de ClawHub (se pueden sobrescribir mediante `CLAWHUB_CONFIG_PATH`).

### Telemetría (recuentos de instalaciones)

Cuando ejecutas `clawhub sync` mientras has iniciado sesión, la CLI envía una instantánea mínima para calcular los recuentos de instalaciones. Puedes desactivar esto por completo:

```bash
export CLAWHUB_DISABLE_TELEMETRY=1
```

## Variables de entorno

- `CLAWHUB_SITE`: Sobrescribe la URL del sitio.
- `CLAWHUB_REGISTRY`: Sobrescribe la URL de la API del registro.
- `CLAWHUB_CONFIG_PATH`: Sobrescribe dónde la CLI almacena el token/configuración.
- `CLAWHUB_WORKDIR`: Sobrescribe el directorio de trabajo predeterminado.
- `CLAWHUB_DISABLE_TELEMETRY=1`: Desactiva la telemetría en `sync`.
