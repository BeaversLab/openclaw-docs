const fs = require('fs');
const yaml = require('/Users/marco/Documents/git/github.com/BeaversLab/crawfish-docs/.claude/skills/markdown-i18n/node_modules/js-yaml');

const plan = yaml.load(fs.readFileSync('.i18n/translation-plan.yaml', 'utf8'));

// Filter out zh-CN files (in .gitignore) and already translated files
plan.files = plan.files.filter(f => {
  if (!f.source) return false;
  // Skip zh-CN files
  if (f.source.includes('zh-CN')) return false;
  // Only include files that actually need translation
  // Keep modified files (status: needs_update)
  return f.status === 'needs_update' || f.status === 'pending';
});

plan.summary.total = plan.files.length;
plan.summary.remaining = plan.files.length;
plan.summary.completed = 0;

fs.writeFileSync('.i18n/translation-plan.yaml', yaml.dump(plan));
console.log('✓ Clean plan created');
console.log('Total files:', plan.summary.total);
console.log('Modified (need sync):', plan.files.filter(f => f.status === 'needs_update').length);
console.log('New (need translation):', plan.files.filter(f => f.status === 'pending').length);
