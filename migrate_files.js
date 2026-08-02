const fs = require('fs');
const path = require('path');

const oldFrontend = path.join(__dirname, 'frontend');
const newFrontend = path.join(__dirname, 'new-system', 'frontend-nextjs', 'src');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

function safeCopy(src, dest) {
    const destDir = path.dirname(dest);
    if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
    }
    fs.copyFileSync(src, dest);
    console.log(`Copied ${src} to ${dest}`);
}

const dirsToMigrate = ['app', 'components', 'constants', 'lib', 'types'];

dirsToMigrate.forEach(dir => {
    const srcDir = path.join(oldFrontend, dir);
    if (fs.existsSync(srcDir)) {
        walkDir(srcDir, function(filePath) {
            const relativePath = path.relative(srcDir, filePath);
            const newPath = path.join(newFrontend, dir, relativePath);
            if (!fs.existsSync(newPath)) {
                safeCopy(filePath, newPath);
            }
        });
    }
});

console.log('Migration complete!');
