const fs = require('fs');

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
const versions = JSON.parse(fs.readFileSync('versions.json', 'utf8'));
const readme = fs.readFileSync('README.md', 'utf8');

const issues = [];

if (pkg.version !== manifest.version) {
  issues.push('package.json version != manifest.json version');
}

if (!versions[manifest.version]) {
  issues.push('versions.json missing manifest version');
}

if (versions[manifest.version] !== manifest.minAppVersion) {
  issues.push('versions.json minAppVersion mismatch');
}

if (pkg.name !== manifest.id) {
  issues.push('package.json name != manifest id');
}

if (pkg.description !== manifest.description) {
  issues.push('package.json description != manifest description');
}

if (!readme.includes(`<Vault>/.obsidian/plugins/${manifest.id}/`)) {
  issues.push('README install path missing manifest id');
}

if (!readme.includes('`1.0.0`') && !readme.includes(`version ${manifest.version}`)) {
  issues.push('README missing current version reference');
}

if (!readme.includes('Do **not** prefix the tag with `v`.')) {
  issues.push('README missing release tag rule');
}

if (issues.length > 0) {
  console.error(issues.join('\n'));
  process.exit(1);
}

console.log(`submission-facing metadata/docs are internally consistent for version ${manifest.version}`);
