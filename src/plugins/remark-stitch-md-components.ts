import type { Root, Parent, Content } from "mdast";
import type { Plugin } from "unified";

const STITCHABLE_COMPONENTS = new Set([
  "columns",
  "cardgroup",
  "card",
  "accordiongroup",
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
  "frame",
  "codegroup",
]);

function getComponentDepthDelta(value: string) {
  let delta = 0;
  const tagPattern = /<\/?([A-Za-z][\w:-]*)\b[^>]*>/g;

  for (const match of value.matchAll(tagPattern)) {
    const [fullMatch, rawTagName] = match;
    const tagName = rawTagName.toLowerCase();
    if (!STITCHABLE_COMPONENTS.has(tagName)) continue;
    if (fullMatch.startsWith("</")) {
      delta -= 1;
      continue;
    }
    if (fullMatch.endsWith("/>")) continue;
    delta += 1;
  }

  return delta;
}

function serializeNode(node: Content, source: string) {
  const startOffset = node.position?.start?.offset;
  const endOffset = node.position?.end?.offset;
  if (typeof startOffset === "number" && typeof endOffset === "number") {
    return source.slice(startOffset, endOffset).trimEnd();
  }
  if (node.type === "html") return node.value.trimEnd();
  return "";
}

function stitchChildren(parent: Parent, source: string) {
  const stitched: Content[] = [];

  for (let index = 0; index < parent.children.length; index += 1) {
    const child = parent.children[index];

    if (child.type === "html") {
      let depth = getComponentDepthDelta(child.value);

      if (depth > 0) {
        let combined = child.value.trimEnd();
        let cursor = index + 1;

        while (cursor < parent.children.length && depth > 0) {
          const next = parent.children[cursor];
          const serialized = serializeNode(next, source);
          if (serialized) combined += `\n\n${serialized}`;
          if (next.type === "html") {
            depth += getComponentDepthDelta(next.value);
          }
          cursor += 1;
        }

        stitched.push({ type: "html", value: combined });
        index = cursor - 1;
        continue;
      }
    }

    if ("children" in child && Array.isArray(child.children)) {
      stitchChildren(child as Parent, source);
    }

    stitched.push(child);
  }

  parent.children = stitched;
}

const remarkStitchMdComponents: Plugin<[], Root> = function () {
  return (tree, file) => {
    stitchChildren(tree, String(file));
  };
};

export default remarkStitchMdComponents;
