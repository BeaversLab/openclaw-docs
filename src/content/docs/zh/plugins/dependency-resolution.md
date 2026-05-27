---
summary: "OpenClawOpenClaw 如何安装插件包并解析插件依赖"
read_when:
  - You are debugging plugin package installs
  - You are changing plugin startup, doctor, or package-manager install behavior
  - You are maintaining packaged OpenClaw installs or bundled plugin manifests
title: "插件依赖解析"
sidebarTitle: "依赖"
---

OpenClaw 将插件依赖工作保留在安装/更新时。运行时加载
不会运行包管理器、修复依赖树或更改 OpenClaw
包目录。

## 职责划分

插件包拥有其依赖关系图：

- 运行时依赖位于插件包 `dependencies` 或
  `optionalDependencies` 中
- SDK/core 导入是 peer 或提供的 OpenClaw 导入
- 本地开发插件自带其已安装的依赖项
- npm 和 git 插件安装在 OpenClaw 拥有的包根目录中

OpenClaw 仅拥有插件生命周期：

- 发现插件源
- 在明确请求时安装或更新包
- 记录安装元数据
- 加载插件入口点
- 当依赖项缺失时，返回可操作的错误并失败

## 安装根目录

OpenClaw 使用每个源稳定的根目录：

- npm 包安装在 npm`~/.openclaw/npm` 下
- git 包克隆在 `~/.openclaw/git` 下
- 本地/路径/归档安装会被复制或引用，而不进行依赖修复

npm 安装在 npm 根目录中运行，使用：

```bash
cd ~/.openclaw/npm
npm install --omit=dev --omit=peer --legacy-peer-deps --ignore-scripts --no-audit --no-fund
```

`openclaw plugins install npm-pack:<path.tgz>`npmnpmOpenClawnpm 使用同一个受管理的 npm 根目录
来处理本地 npm-pack tarball。OpenClaw 读取 tarball 的 npm 元数据，将其作为复制的 `file:`npm 依赖添加到受管理的根目录中，运行正常的 npm 安装，
然后在信任插件之前验证已安装的 lockfile 元数据。
这旨在用于包验收和候选版本验证，其中本地打包产物
的行为应类似于它模拟的注册表产物。

npm 可能会将传递依赖提升到插件包旁边的 npm`~/.openclaw/npm/node_modules`OpenClawnpmnpmnpm。OpenClaw 在信任安装之前扫描受管理的 npm 根目录，并在卸载期间使用 npm 移除 npm 管理的包，因此提升的
运行时依赖保留在受管理的清理边界内。

已发布的 npm 插件包可以附带 npm`npm-shrinkwrap.json`npmOpenClawnpmnpmOpenClaw。npm 在安装期间使用该可发布的 lockfile，并且 OpenClaw 的受管理 npm 根目录通过正常的 npm 安装路径支持它。
OpenClaw 拥有的可发布插件包
必须包含从该插件包的已发布依赖关系图生成的包本地 shrinkwrap：

```bash
pnpm deps:shrinkwrap:generate
pnpm deps:shrinkwrap:check
```

生成器会剥离插件的 `devDependencies`，应用工作区覆盖策略，并为每个 `publishToNpm` 插件写入 `extensions/<id>/npm-shrinkwrap.json`。第三方插件包也可以附带 shrinkwrap 文件；虽然 OpenClaw 不要求社区插件必须包含该文件，但如果存在，npm 会予以遵守。

OpenClaw 拥有的 npm 插件包也可以通过显式的 `bundledDependencies` 进行发布。npm 发布路径会覆盖运行时依赖名称列表，从已发布的包清单中移除仅用于开发的工作区元数据，针对包本地的运行时依赖运行无脚本的 npm install，然后打包或发布包含这些依赖文件的插件压缩包。包含大量原生组件的包（包括 Codex 和 ACP 运行时）会通过 `openclaw.release.bundleRuntimeDependencies: false` 选择退出；这些包仍然会附带 shrinkwrap 文件，但 npm 会在安装期间解析运行时依赖，而不是将每个平台的二进制文件都嵌入到插件压缩包中。根 `openclaw` 包不会捆绑其完整的依赖树。

导入 `openclaw/plugin-sdk/*` 的插件会将 `openclaw` 声明为 peer dependency。OpenClaw 不允许 npm 将宿主包的单独注册表副本安装到受管根目录中，因为过时的宿主包可能会影响后续插件安装期间的 npm peer 解析。受管 npm 安装会跳过共享根目录的 npm peer 解析/具体化，而 OpenClaw 会在安装、更新或卸载后，为声明宿主 peer 的已安装包重新确立插件本地的 `node_modules/openclaw` 链接。

git 安装会克隆或刷新仓库，然后运行：

```bash
npm install --omit=dev --ignore-scripts --no-audit --no-fund
```

已安装的插件随后从该包目录加载，因此包本地和父级 `node_modules` 解析的工作方式与普通 Node 包相同。

## 本地插件

本地插件被视为由开发者控制的目录。OpenClaw 不会为它们运行 OpenClaw`npm install`、`pnpm install` 或依赖项修复。如果本地插件具有依赖项，请在加载该插件之前在该插件中安装这些依赖项。

第三方 TypeScript 本地插件可以使用紧急 Jiti 路径。打包的 JavaScript 插件和捆绑的内部插件通过原生 import/require 而不是 Jiti 加载。

## 启动和重新加载

Gateway 启动和配置重新加载永远不会安装插件依赖项。它们读取插件安装记录，计算入口点，然后加载它。

如果运行时缺少依赖项，插件将无法加载，并且错误应将操作员指向明确的修复方法：

```bash
openclaw plugins update <id>
openclaw plugins install <source>
openclaw doctor --fix
```

`doctor --fix`OpenClaw 可以清理旧的 OpenClaw 生成的依赖项状态，并在配置引用时恢复本地安装记录中缺少的可下载插件。Doctor 不会修复已安装本地插件的依赖项。

## 捆绑插件

轻量级和核心关键的捆绑插件作为 OpenClaw 的一部分提供。它们应该没有繁重的运行时依赖树，或者被移出到 ClawHub/npm 上的可下载包中。

有关随核心包提供、外部安装或保持仅源代码的插件的当前生成列表，请参阅 [Plugin inventory](/zh/plugins/plugin-inventory)。

捆绑插件清单不得请求依赖项暂存。大型或可选的插件功能应打包为普通插件，并通过与第三方插件相同的 npm/git/ClawHub 路径进行安装。

在源代码检出中，OpenClaw 将存储库视为 pnpm monorepo。在 OpenClaw`pnpm install` 之后，捆绑插件从 `extensions/<id>` 加载，因此包本地工作区依赖项可用，并且直接拾取编辑。源代码检出开发仅支持 pnpm；在存储库根目录使用普通的 `npm install` 不是准备捆绑插件依赖项的受支持方式。

| 安装形式                       | 捆绑插件位置                    | 依赖项所有者                                  |
| ------------------------------ | ------------------------------- | --------------------------------------------- |
| `npm install -g openclaw`      | 软件包内构建的运行时树          | OpenClaw 软件包以及显式插件安装/更新/修复流程 |
| Git检出加上 `pnpm install`     | `extensions/<id>` 工作区软件包  | pnpm 工作区，包括每个插件软件包自己的依赖项   |
| `openclaw plugins install ...` | 托管 npm/git/ClawHub 插件根目录 | 插件安装/更新流程                             |

## 旧版清理

旧版 OpenClaw 在启动或修复期间生成捆绑插件依赖根目录。当前的修复清理在使用 `--fix` 时会删除那些陈旧的目录和符号链接，包括旧的 `plugin-runtime-deps` 根目录、指向已修剪 `plugin-runtime-deps` 目标的全局 Node 前缀软件包符号链接、`.openclaw-runtime-deps*` 清单、生成的插件 `node_modules`、安装阶段目录以及软件包本地 pnpm 存储。打包后的 postinstall 还会在修剪旧版目标根目录之前删除这些全局符号链接，以免升级后残留悬挂的 ESM 软件包导入。

这些路径仅是旧版残留物。新安装不应创建它们。
