/**
 * Version Updater Script
 * Run with: node update-version.js [patch|minor|major]
 * Default: patch (1.3.0 -> 1.3.1)
 * 
 * Examples:
 *   node update-version.js         -> 1.3.0 -> 1.3.1
 *   node update-version.js minor   -> 1.3.1 -> 1.4.0
 *   node update-version.js major   -> 1.4.0 -> 2.0.0
 */

const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'index.html');
const type = process.argv[2] || 'patch';

try {
    let html = fs.readFileSync(indexPath, 'utf8');

    // Find version pattern
    const versionRegex = /v(\d+)\.(\d+)\.(\d+)/;
    const match = html.match(versionRegex);

    if (!match) {
        console.error('❌ No se encontró versión en index.html');
        process.exit(1);
    }

    let [, major, minor, patch] = match.map(Number);
    const oldVersion = `${major}.${minor}.${patch}`;

    // Increment version based on type
    switch (type) {
        case 'major':
            major++;
            minor = 0;
            patch = 0;
            break;
        case 'minor':
            minor++;
            patch = 0;
            break;
        case 'patch':
        default:
            patch++;
            break;
    }

    const newVersion = `${major}.${minor}.${patch}`;

    // Replace in HTML
    html = html.replace(versionRegex, `v${newVersion}`);
    fs.writeFileSync(indexPath, html, 'utf8');

    console.log(`✅ Versión actualizada: v${oldVersion} → v${newVersion}`);
    console.log(`   Tipo: ${type}`);

} catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
}
