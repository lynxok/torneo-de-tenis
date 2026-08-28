const fs = require('fs');
const path = require('path');

const pkgPath = path.join(__dirname, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

const versionData = {
    version: pkg.version,
    updatedAt: new Date().toISOString()
};

// 1. Write version.json to public, dist and root
const publicVersionPath = path.join(__dirname, 'public', 'version.json');
const distVersionPath = path.join(__dirname, 'dist', 'version.json');
const rootVersionPath = path.join(__dirname, '..', 'version.json');

fs.writeFileSync(publicVersionPath, JSON.stringify(versionData, null, 2));
if (fs.existsSync(path.join(__dirname, 'dist'))) {
    fs.writeFileSync(distVersionPath, JSON.stringify(versionData, null, 2));
}
fs.writeFileSync(rootVersionPath, JSON.stringify(versionData, null, 2));

const distDir = path.join(__dirname, 'dist');
const rootDir = path.join(__dirname, '..');
const rootAssets = path.join(rootDir, 'assets');

if (fs.existsSync(rootAssets)) {
    fs.rmSync(rootAssets, { recursive: true, force: true });
}

function copyDirRecursive(src, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            copyDirRecursive(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

copyDirRecursive(distDir, rootDir);
fs.writeFileSync(rootVersionPath, JSON.stringify(versionData, null, 2));
console.log(`✨ [Auto-Sync] Bundles y version.json (v${pkg.version}) sincronizados a la raíz del repositorio para Hostinger.`);

