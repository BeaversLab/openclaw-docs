import fs from "fs/promises";
import path from "path";
import { execSync } from "child_process";

const CONFIG_PATHS = {
  i18n: "i18n-config.json",
  docs: "docs.json",
  redirect: "redirect.js",
  i18nTools: ".i18n/config.yaml",
  package: "package.json",
  footerBase: "components/footer",
};

/**
 * Load master config
 */
async function loadConfig() {
  return JSON.parse(await fs.readFile(CONFIG_PATHS.i18n, "utf8"));
}

/**
 * Save master config
 */
async function saveConfig(config) {
  await fs.writeFile(CONFIG_PATHS.i18n, JSON.stringify(config, null, 2));
}

/**
 * Sync redirect.js and docs.json based on ENABLED languages in i18n-config.json
 */
async function syncPublished() {
  console.log(`\n🔄 Syncing published state (docs.json & redirect.js)...`);
  const config = await loadConfig();
  const enabledLangs = Object.keys(config.languages).filter(k => config.languages[k].enabled);
  
  // 1. Sync docs.json navigation
  console.log(`  - Updating ${CONFIG_PATHS.docs} navigation...`);
  const docs = JSON.parse(await fs.readFile(CONFIG_PATHS.docs, "utf8"));
  
  // We need to keep en and then mirror others that are enabled
  const enNav = docs.navigation.languages.find(l => l.language === "en");
  
  docs.navigation.languages = enabledLangs.map(langKey => {
    const langMeta = config.languages[langKey];
    if (langKey === 'en') return enNav;
    
    // Create mirrored config from EN
    const mirrored = JSON.parse(JSON.stringify(enNav).replace(/en\//g, `${langKey}/`));
    mirrored.language = langMeta.mintlifyCode || langKey;
    return mirrored;
  });
  
  await fs.writeFile(CONFIG_PATHS.docs, JSON.stringify(docs, null, 2));

  // 2. Sync redirect.js
  console.log(`  - Updating ${CONFIG_PATHS.redirect} redirect logic...`);
  let redirect = await fs.readFile(CONFIG_PATHS.redirect, "utf8");
  
  // Update Regex: var localeMatch = path.match(/^\/(en|zh|fr)(\/.*)?$/);
  const regexLineStart = "var localeMatch = path.match(/^\\/(";
  const regexLineEnd = ")(\\/.*)?$/);";
  const lineStartIdx = redirect.indexOf(regexLineStart);
  const lineEndIdx = redirect.indexOf(regexLineEnd, lineStartIdx);
  
  if (lineStartIdx !== -1 && lineEndIdx !== -1) {
    redirect = redirect.slice(0, lineStartIdx + regexLineStart.length) + 
               enabledLangs.join('|') + 
               redirect.slice(lineEndIdx);
  }

  // Update detectPreferredLocale (saved checks)
  const savedMarkerStart = "try {\n      saved = localStorage.getItem('preferredLang');\n    } catch (e) {}\n";
  const savedMarkerEnd = "\n    var langs = navigator.languages || [navigator.language || ''];";
  const sStart = redirect.indexOf(savedMarkerStart) + savedMarkerStart.length;
  const sEnd = redirect.indexOf(savedMarkerEnd);
  if (sStart !== -1 && sEnd !== -1) {
    const checks = enabledLangs.map(l => `\n    if (saved === '${l}') return '${l}';`).join('');
    redirect = redirect.slice(0, sStart) + checks + redirect.slice(sEnd);
  }

  // Update detectPreferredLocale (loop checks)
  const loopMarkerStart = "for (var i = 0; i < langs.length; i++) {\n      var l = (langs[i] || '').toLowerCase();";
  const loopMarkerEnd = "\n    }\n    return 'en';";
  const lStart = redirect.indexOf(loopMarkerStart) + loopMarkerStart.length;
  const lEnd = redirect.indexOf(loopMarkerEnd);
  if (lStart !== -1 && lEnd !== -1) {
    const checks = enabledLangs.map(l => `\n      if (l.startsWith('${l}')) return '${l}';`).join('');
    redirect = redirect.slice(0, lStart) + checks + redirect.slice(lEnd);
  }

  await fs.writeFile(CONFIG_PATHS.redirect, redirect);
  console.log(`✅ Sync complete. Enabled: ${enabledLangs.join(', ')}`);
}

async function addLanguage(lang, label = null) {
  console.log(`\n🚀 Preparing to add language: ${lang}...`);
  const config = await loadConfig();

  if (config.languages[lang]) {
    console.error(`❌ Error: Language '${lang}' already exists in config.`);
    process.exit(1);
  }

  // 1. Update i18n-config.json (initially disabled)
  config.languages[lang] = {
    label: label || lang.toUpperCase(),
    mintlifyCode: lang,
    enabled: false,
    description: `Added via script on ${new Date().toLocaleDateString()}`
  };
  await saveConfig(config);

  // 2. Clone directory
  const targetDir = path.join(process.cwd(), lang);
  if (!await fs.access(targetDir).then(() => true).catch(() => false)) {
    console.log(`  - Creating directory: ${lang}/ (cloning from en/)`);
    execSync(`cp -R en ${targetDir}`);
  }

  // 3. Update .i18n/config.yaml
  console.log(`  - Updating ${CONFIG_PATHS.i18nTools}...`);
  let i18nTools = await fs.readFile(CONFIG_PATHS.i18nTools, "utf8");
  if (!i18nTools.includes(`dir: /${lang}`)) {
    i18nTools += `    - dir: /${lang}\n      prefix: ${lang}/\n`;
    await fs.writeFile(CONFIG_PATHS.i18nTools, i18nTools);
  }

  // 4. Create footer
  const footerPath = `${CONFIG_PATHS.footerBase}/${lang}.mdx`;
  if (!await fs.access(footerPath).then(() => true).catch(() => false)) {
    console.log(`  - Creating footer: ${footerPath}`);
    await fs.copyFile(`${CONFIG_PATHS.footerBase}/en.mdx`, footerPath);
  }

  // 5. Update package.json
  const pkg = JSON.parse(await fs.readFile(CONFIG_PATHS.package, "utf8"));
  pkg.scripts[`format:${lang}`] = `prettier --write \"${lang}/**/*.md\"`;
  await fs.writeFile(CONFIG_PATHS.package, JSON.stringify(pkg, null, 2));

  console.log(`\n✅ Language directory '${lang}' ready for development!`);
  console.log(`⚠️  Note: It is currently DISABLED in the UI. Translate the files, then run:`);
  console.log(`   npm run lang:enable ${lang}`);
}

async function enableLanguage(lang) {
  const config = await loadConfig();
  if (!config.languages[lang]) {
    console.error(`❌ Error: Language '${lang}' not found in config.`);
    process.exit(1);
  }
  
  config.languages[lang].enabled = true;
  await saveConfig(config);
  await syncPublished();
  console.log(`\n🚀 Language '${lang}' is now LIVE!`);
}

async function removeLanguage(lang) {
  if (['en', 'zh', 'fr'].includes(lang)) {
    console.error(`❌ Protection: Cannot remove core languages.`);
    process.exit(1);
  }

  console.log(`\n🗑️  Removing language: ${lang}...`);
  const config = await loadConfig();
  delete config.languages[lang];
  await saveConfig(config);

  await fs.rm(path.join(process.cwd(), lang), { recursive: true, force: true });
  await syncPublished();
  
  // Cleanup tools and package.json
  let i18nTools = await fs.readFile(CONFIG_PATHS.i18nTools, "utf8");
  i18nTools = i18nTools.split('\n').filter(l => !l.includes(`/${lang}`) && !l.includes(`${lang}/`)).join('\n');
  await fs.writeFile(CONFIG_PATHS.i18nTools, i18nTools);

  const pkg = JSON.parse(await fs.readFile(CONFIG_PATHS.package, "utf8"));
  delete pkg.scripts[`format:${lang}`];
  await fs.writeFile(CONFIG_PATHS.package, JSON.stringify(pkg, null, 2));

  console.log(`\n✅ Removed successfully.`);
}

const [action, lang, label] = process.argv.slice(2);

switch (action) {
  case "add": await addLanguage(lang, label); break;
  case "enable": await enableLanguage(lang); break;
  case "remove": await removeLanguage(lang); break;
  case "sync": await syncPublished(); break;
  default:
    console.log("Usage:");
    console.log("  npm run lang:add <lang> [label]   - Create directory (enabled: false)");
    console.log("  npm run lang:enable <lang>        - Publish to UI and redirect.js");
    console.log("  npm run lang:remove <lang>        - Delete everything");
    console.log("  npm run lang:sync                 - Manual sync docs.json/redirect.js");
}
