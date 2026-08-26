const fs = require('fs');
const path = require('path');

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
console.log('✨ [Auto-Sync] Bundles sincronizados a la raíz del repositorio para Hostinger.');
