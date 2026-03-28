import { fromHtml } from "hast-util-from-html";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import remarkSmartypants from "remark-smartypants";
import { unified } from "unified";
import type { Plugin } from "unified";
import type { Root as MdastRoot } from "mdast";
import type {
  Root,
  RootContent,
  Element,
  Text,
  Parent,
  Content,
  Properties,
} from "hast";

const REGISTERED_COMPONENTS = new Set([
  "card",
  "accordion",
  "steps",
  "step",
  "tabs",
  "tab",
  "note",
  "tip",
  "info",
  "warning",
  "check",
]);

const markdownFragmentProcessor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkSmartypants)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw);

function normalizeMarkdownSource(value: string) {
  const normalized = value.replace(/\r\n?/g, "\n");
  const lines = normalized.split("\n");
  while (lines.length && lines[0].trim() === "") lines.shift();
  while (lines.length && lines[lines.length - 1].trim() === "") lines.pop();
  const indents = lines
    .filter((line) => line.trim() !== "")
    .map((line) => line.match(/^\s*/)?.[0].length ?? 0);
  const commonIndent = indents.length ? Math.min(...indents) : 0;
  return lines.map((line) => line.slice(commonIndent)).join("\n");
}

function createElement(
  tagName: string,
  properties: Properties = {},
  children: Content[] = [],
): Element {
  return { type: "element", tagName, properties, children };
}

function createText(value: string): Text {
  return { type: "text", value };
}

function createClassedElement(
  tagName: string,
  className: string[],
  properties: Properties = {},
  children: Content[] = [],
) {
  return createElement(tagName, { ...properties, className }, children);
}

function renderMarkdownFragment(value: string): Content[] {
  const source = normalizeMarkdownSource(value);
  if (!source.trim()) return [];
  const tree = markdownFragmentProcessor.parse(source) as MdastRoot;
  const hast = markdownFragmentProcessor.runSync(tree) as Root;
  return hast.children as Content[];
}

function flushMarkdownBuffer(buffer: string, output: Content[]) {
  if (!buffer.trim()) return;
  output.push(...renderMarkdownFragment(buffer));
}

function transformChildren(parent: Parent): Content[] {
  const output: Content[] = [];
  let markdownBuffer = "";

  for (const child of parent.children as Content[]) {
    if (child.type === "text") {
      markdownBuffer += child.value;
      continue;
    }

    flushMarkdownBuffer(markdownBuffer, output);
    markdownBuffer = "";

    if (child.type === "element") {
      output.push(transformElement(child));
      continue;
    }

    output.push(child);
  }

  flushMarkdownBuffer(markdownBuffer, output);
  return output;
}

function transformElement(node: Element): Content {
  const tag = node.tagName.toLowerCase();

  if (tag === "card") {
    const href =
      typeof node.properties.href === "string"
        ? node.properties.href
        : undefined;
    const title =
      typeof node.properties.title === "string" ? node.properties.title : "";
    const icon =
      typeof node.properties.icon === "string" ? node.properties.icon : "";
    const wrapper = createClassedElement(
      href ? "a" : "article",
      ["cf-card"],
      href ? { href } : {},
      [],
    );
    if (icon) wrapper.properties["data-icon"] = icon;
    wrapper.children.push(
      createClassedElement("div", ["cf-card__title"], {}, [createText(title)]),
      createClassedElement(
        "div",
        ["cf-card__body"],
        {},
        transformChildren(node),
      ),
    );
    return wrapper;
  }

  if (tag === "accordion") {
    return createClassedElement("details", ["cf-accordion"], {}, [
      createClassedElement("summary", ["cf-accordion__summary"], {}, [
        createText(
          typeof node.properties.title === "string"
            ? node.properties.title
            : "Details",
        ),
      ]),
      createClassedElement(
        "div",
        ["cf-accordion__body"],
        {},
        transformChildren(node),
      ),
    ]);
  }

  if (tag === "steps") {
    return createClassedElement(
      "ol",
      ["cf-steps"],
      {},
      (node.children as Content[])
        .filter(
          (child): child is Element =>
            child.type === "element" && child.tagName.toLowerCase() === "step",
        )
        .map(transformElement),
    );
  }

  if (tag === "step") {
    const children = transformChildren(node);
    const content = createClassedElement(
      "div",
      ["cf-step__content"],
      {},
      children,
    );
    const items: Content[] = [];
    if (typeof node.properties.title === "string" && node.properties.title) {
      items.push(
        createClassedElement("p", ["cf-step__title"], {}, [
          createText(node.properties.title),
        ]),
      );
    }
    items.push(content);
    return createClassedElement("li", ["cf-step"], {}, items);
  }

  if (tag === "tabs") {
    const tabs = (node.children as Content[]).filter(
      (child): child is Element =>
        child.type === "element" && child.tagName.toLowerCase() === "tab",
    );
    const shell = createClassedElement(
      "div",
      ["cf-tabs"],
      { "data-cf-tabs": "" },
      [],
    );
    const tabListWrap = createClassedElement(
      "div",
      ["cf-tabs__list-wrap", "not-content"],
      {},
      [],
    );
    const tabList = createClassedElement(
      "div",
      ["cf-tabs__list"],
      { role: "tablist" },
      [],
    );
    const panels: Content[] = [];
    tabs.forEach((tab, index) => {
      const label =
        (typeof tab.properties.title === "string" && tab.properties.title) ||
        (typeof tab.properties.label === "string" && tab.properties.label) ||
        `Tab ${index + 1}`;
      tabList.children.push(
        createClassedElement(
          "button",
          ["cf-tabs__tab"],
          {
            type: "button",
            role: "tab",
            "aria-selected": index === 0 ? "true" : "false",
            tabindex: index === 0 ? "0" : "-1",
          },
          [createText(label)],
        ),
      );
      panels.push(
        createClassedElement(
          "div",
          ["cf-tabs__panel"],
          { role: "tabpanel", ...(index === 0 ? {} : { hidden: true }) },
          transformChildren(tab),
        ),
      );
    });
    tabListWrap.children.push(tabList);
    shell.children.push(tabListWrap, ...panels);
    return shell;
  }

  if (["note", "tip", "info", "warning", "check"].includes(tag)) {
    const title =
      (typeof node.properties.title === "string" && node.properties.title) ||
      `${tag.charAt(0).toUpperCase()}${tag.slice(1)}`;
    return createClassedElement(
      "aside",
      ["cf-aside", `cf-aside--${tag}`],
      { "aria-label": title },
      [
        createClassedElement("p", ["cf-aside__title"], {}, [createText(title)]),
        createClassedElement(
          "div",
          ["cf-aside__content"],
          {},
          transformChildren(node),
        ),
      ],
    );
  }

  const clone = createElement(node.tagName, { ...node.properties }, []);
  clone.children = transformChildren(node);
  return clone;
}

function transformRawFragment(value: string): Content[] | null {
  if (
    !/[<](steps|step|tabs|tab|card|accordion|note|tip|info|warning|check)\b/i.test(
      value,
    )
  ) {
    return null;
  }
  const parsed = fromHtml(value, { fragment: true }) as Root;
  return transformChildren(parsed as Parent);
}

function transformParent(parent: Parent) {
  const children = [...(parent.children as Content[])];
  const nextChildren: Content[] = [];

  for (const child of children) {
    if (child.type === "raw") {
      const transformed = transformRawFragment(child.value);
      if (transformed) {
        nextChildren.push(...transformed);
        continue;
      }
      nextChildren.push(child);
      continue;
    }

    if (child.type === "element") {
      transformParent(child);
    }

    nextChildren.push(child);
  }

  parent.children = nextChildren as Parent["children"];
}

const rehypeRecursiveMdComponents: Plugin<[], Root> = function () {
  return (tree) => {
    transformParent(tree as unknown as Parent);
  };
};

export default rehypeRecursiveMdComponents;
