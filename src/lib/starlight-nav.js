import docsConfig from "../../docs.json" with { type: "json" };
import fs from "node:fs";
import path from "node:path";

const DOCS_ROOT = path.join(process.cwd(), "src", "content", "docs");

const LOCALE_TO_DOCS_LANGUAGE = {
  en: "en",
  zh: "zh-Hans",
  es: "es",
  fr: "fr",
  "zh-Hant": "zh-Hant",
};

const DOCS_LANGUAGE_TO_STARLIGHT_LANG = {
  en: "en",
  "zh-Hans": "zh-CN",
  es: "es",
  fr: "fr",
  "zh-Hant": "zh-Hant",
};

const frontmatterLabelCache = new Map();

function getLanguageConfig(locale = "en") {
  const docsLanguage = LOCALE_TO_DOCS_LANGUAGE[locale] || "en";
  return (
    docsConfig.navigation.languages.find(
      (entry) => entry.language === docsLanguage,
    ) ||
    docsConfig.navigation.languages.find((entry) => entry.language === "en")
  );
}

function slugifyRouteSegment(segment) {
  return segment
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

function filePathToRoutePath(filePath, locale) {
  const localeRoot = path.join(DOCS_ROOT, locale);
  const relativePath = path.relative(localeRoot, filePath).replace(/\\/g, "/");
  const withoutExt = relativePath.replace(/\.(md|mdx)$/i, "");
  const segments = withoutExt
    .split("/")
    .filter(Boolean)
    .map((segment) => slugifyRouteSegment(segment));

  if (segments.at(-1) === "index") segments.pop();
  return segments.join("/") || "index";
}

function resolvePageRef(pageRef) {
  const parts = pageRef.split("/");
  const locale = parts[0];
  const pagePath = parts
    .slice(1)
    .join("/")
    .replace(/^\/+|\/+$/g, "");
  const normalized =
    pagePath === "index" ? "index" : pagePath.replace(/\/index$/, "");
  const localeRoot = path.join(DOCS_ROOT, locale);
  const candidates = [
    normalized,
    path.join(normalized, "index"),
    path.join(normalized, "README"),
  ];

  for (const candidate of candidates) {
    for (const ext of [".md", ".mdx"]) {
      const filePath = path.join(localeRoot, `${candidate}${ext}`);
      if (fs.existsSync(filePath)) {
        return {
          locale,
          filePath,
          routePath: filePathToRoutePath(filePath, locale),
        };
      }
    }
  }

  const fallbackRoutePath =
    normalized
      .split("/")
      .filter(Boolean)
      .map((segment) => slugifyRouteSegment(segment))
      .join("/") || "index";

  return { locale, filePath: null, routePath: fallbackRoutePath };
}

function getLabelFromFile(filePath, fallbackLabel) {
  if (!filePath) return fallbackLabel;
  if (frontmatterLabelCache.has(filePath))
    return frontmatterLabelCache.get(filePath);

  const text = fs.readFileSync(filePath, "utf8");
  const match = text.match(/^---\n([\s\S]*?)\n---/);
  let label = "";
  if (match) {
    for (const line of match[1].split("\n")) {
      const sidebarTitle = line.match(/^sidebarTitle:\s*(.+)$/);
      const title = line.match(/^title:\s*(.+)$/);
      const raw = sidebarTitle?.[1] || title?.[1];
      if (raw) {
        label = raw.replace(/^['"]|['"]$/g, "");
        break;
      }
    }
  }
  if (!label) label = fallbackLabel;
  frontmatterLabelCache.set(filePath, label);
  return label;
}

function buildTranslations(languages, getter) {
  return Object.fromEntries(
    languages
      .map((language, index) => {
        const value = getter(language, index);
        const starlightLang =
          DOCS_LANGUAGE_TO_STARLIGHT_LANG[language.language];
        if (!value || !starlightLang || starlightLang === "en") return null;
        return [starlightLang, value];
      })
      .filter(Boolean),
  );
}

function getPagesAtPath(
  language,
  tabIndex,
  groupIndex,
  nestedGroupIndexes = [],
) {
  let pages = language.tabs?.[tabIndex]?.groups?.[groupIndex]?.pages;
  for (const nestedGroupIndex of nestedGroupIndexes) {
    const node = pages?.[nestedGroupIndex];
    pages = typeof node === "string" ? undefined : node?.pages;
  }
  return pages;
}

function getLabelForPageRef(pageRef) {
  const { filePath, routePath } = resolvePageRef(pageRef);
  const fallbackLabel = routePath.split("/").pop() || routePath;
  return getLabelFromFile(filePath, fallbackLabel);
}

function toSidebarLinkItem(pageRef, translations = {}) {
  const { routePath } = resolvePageRef(pageRef);
  return {
    label: getLabelForPageRef(pageRef),
    translations,
    link: routePath === "index" ? "/" : `/${routePath}`,
  };
}

function transformPages(
  languages,
  englishTabIndex,
  englishGroupIndex,
  pages,
  nestedGroupIndexes = [],
) {
  return pages.map((pageOrGroup, pageIndex) => {
    const localizedItems = languages.map(
      (language) =>
        getPagesAtPath(
          language,
          englishTabIndex,
          englishGroupIndex,
          nestedGroupIndexes,
        )?.[pageIndex],
    );

    if (typeof pageOrGroup === "string") {
      const translations = buildTranslations(languages, (_language, index) => {
        const localizedRef = localizedItems[index];
        return typeof localizedRef === "string"
          ? getLabelForPageRef(localizedRef)
          : undefined;
      });
      return toSidebarLinkItem(pageOrGroup, translations);
    }

    return {
      label: pageOrGroup.group,
      translations: buildTranslations(languages, (_language, index) => {
        const localizedGroup = localizedItems[index];
        return typeof localizedGroup === "string"
          ? undefined
          : localizedGroup?.group;
      }),
      collapsed: false,
      items: transformPages(
        languages,
        englishTabIndex,
        englishGroupIndex,
        pageOrGroup.pages || [],
        nestedGroupIndexes.concat(pageIndex),
      ),
    };
  });
}

function findFirstPageRef(items = []) {
  for (const item of items) {
    if (typeof item === "string") return item;
    if (item?.pages) {
      const nested = findFirstPageRef(item.pages);
      if (nested) return nested;
    }
  }
  return null;
}

function flattenPageRefs(items = []) {
  const refs = [];
  for (const item of items) {
    if (typeof item === "string") refs.push(item);
    else if (item?.pages) refs.push(...flattenPageRefs(item.pages));
  }
  return refs;
}

function pageRefToHref(pageRef) {
  const { locale, routePath } = resolvePageRef(pageRef);
  return routePath === "index" ? `/${locale}` : `/${locale}/${routePath}`;
}

export function buildSidebarFromDocsJson() {
  const languages = docsConfig.navigation.languages;
  const english = languages.find((entry) => entry.language === "en");
  if (!english) return [];

  return english.tabs.map((tab, tabIndex) => ({
    label: tab.tab,
    translations: buildTranslations(
      languages,
      (language) => language.tabs?.[tabIndex]?.tab,
    ),
    collapsed: false,
    items: tab.groups.map((group, groupIndex) => ({
      label: group.group,
      translations: buildTranslations(
        languages,
        (language) => language.tabs?.[tabIndex]?.groups?.[groupIndex]?.group,
      ),
      collapsed: false,
      items: transformPages(languages, tabIndex, groupIndex, group.pages),
    })),
  }));
}

export function getHeaderTabs(locale = "en") {
  const languageConfig = getLanguageConfig(locale);
  if (!languageConfig) return [];
  return languageConfig.tabs.map((tab) => ({
    label: tab.tab,
    href: pageRefToHref(
      findFirstPageRef(tab.groups[0]?.pages) || `${locale}/index`,
    ),
    pages: tab.groups.flatMap((group) =>
      flattenPageRefs(group.pages).map(pageRefToHref),
    ),
  }));
}
