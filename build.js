const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🎾 [Smash Deploy] Compilando React 19 en smash-tennis-manager...');
const appDir = path.join(__dirname, 'smash-tennis-manager');
const distDir = path.join(appDir, 'dist');
const rootDir = __dirname;

// 1. Build smash-tennis-manager
execSync('npm run build', { cwd: appDir, stdio: 'inherit' });

console.log('\n📂 [Smash Deploy] Sincronizando bundles de producción a la raíz del repositorio...');

// 2. Remove old root assets folder
const rootAssets = path.join(rootDir, 'assets');
if (fs.existsSync(rootAssets)) {
    fs.rmSync(rootAssets, { recursive: true, force: true });
}

// 3. Copy dist contents to root
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
            console.log(`  ✓ Copiado: ${entry.name}`);
        }
    }
}

copyDirRecursive(distDir, rootDir);

console.log('\n✨ [Smash Deploy] ¡Sincronización completa! La versión moderna de React 19 está lista en la raíz.');
