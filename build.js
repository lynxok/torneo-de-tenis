const fs = require('fs');
const path = require('path');

const DIST_DIR = path.join(__dirname, 'dist');
const FILES_TO_COPY = [
    'index.html',
    'style.css',
    'app.js',
    'auth.js',
    'supabase.js',
    'tournament.js',
    'pelota sin fondo.png',
    'Smash.png',
    'Principal_blanco_fondotransparente.png'
];

console.log('🚧 Starting build process...');

// 1. Clean/Create dist folder
if (fs.existsSync(DIST_DIR)) {
    fs.rmSync(DIST_DIR, { recursive: true, force: true });
}
fs.mkdirSync(DIST_DIR);
console.log('✅ Created dist/ folder');

// 2. Copy files
FILES_TO_COPY.forEach(file => {
    const src = path.join(__dirname, file);
    const dest = path.join(DIST_DIR, file);

    if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
        console.log(`__ Copied: ${file}`);
    } else {
        console.error(`__ ⚠️ Missing file: ${file}`);
    }
});

console.log('\n✨ Build complete! Upload the contents of the "dist" folder to Hostinger.');
