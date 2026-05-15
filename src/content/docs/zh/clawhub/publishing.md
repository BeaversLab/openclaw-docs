---
summary: "ClawHubClawHub 发布机制如何适用于 Skills、插件、所有者、作用域、发布版本和审核。"
read_when:
  - Publishing a skill or plugin
  - Debugging owner or package scope errors
  - Adding publish UI, CLI, or backend behavior
---

# 在 ClawHub 上发布

ClawHub 发布是基于所有者的：每次发布都针对一个发布者，服务器决定已登录的用户是否允许在该处发布。

## 所有者

所有者是一个 ClawHub 发布者句柄，例如 ClawHub`@alice` 或 `@openclaw`。
个人所有者是针对用户创建的。组织所有者可以拥有多个成员。

当您发布时，您可以使用您的个人所有者或选择您拥有发布者访问权限的组织所有者。

## Skills

Skills 是从 Skill 文件夹发布的。公共页面为：

```text
https://clawhub.ai/<owner>/<slug>
```

示例：

```text
https://clawhub.ai/alice/review-helper
```

发布请求包括选定的所有者、slug、版本、变更日志和
文件。在创建发布之前，服务器验证操作者是否可以以该所有者身份发布。

## 插件

插件使用 npm 风格的包名称。作用域包名称在名称的第一部分包含所有者：

```text
@owner/package-name
```

作用域必须与选定的发布所有者匹配。如果您的包名为
`@openclaw/dronzer`，则只能作为 `@openclaw` 发布。如果您作为
`@vintageayu` 发布，请将包重命名为 `@vintageayu/dronzer`。

这可以防止包声明发布者不控制的组织命名空间。

## 发布流程

1. UI、CLI 或 GitHub 工作流会收集包元数据和文件。
2. 发布请求会连同选定的所有者一起发送到 ClawHub。
3. 服务器会验证所有者权限、包作用域、包名称、版本、
   文件限制和源元数据。
4. ClawHub 存储该发布版本并开始自动安全检查。
5. 新的发布版本在审核
   和验证完成之前，将对正常的安装/下载界面隐藏。

如果验证失败，则不会创建发布版本。

## 常见问题

### 包作用域必须与选定的所有者匹配

如果包作用域与选定的所有者不匹配，ClawHub 将拒绝该
发布：

```text
Package scope "@openclaw" must match selected owner "@vintageayu".
Publish as "@openclaw" or rename this package to "@vintageayu/dronzer".
```

要解决此问题，请选择包作用域指定的所有者，或者重命名包，使作用域与您可以发布的所有者匹配。

如果包名称已经具有正确的作用域，但包归错误的所有者所有，请改为转移所有权：

```sh
clawhub package transfer @opik/opik-openclaw --to opik
```

仅当您对当前包所有者和目标发布者都具有管理员访问权限时，才使用包转移。它不允许您发布到您无法管理的作用域。

这可以保护组织命名空间。名为 `@openclaw/dronzer` 的包声明了 `@openclaw` 命名空间，因此只有具有访问 `@openclaw` 所有者权限的发布者才能发布它。
