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
    // Only copy if it doesn't already exist in the new system! We don't want to overwrite new logic.
    if (!fs.existsSync(dest)) {
      fs.copyFileSync(src, dest);
      console.log(`Copied ${src} to ${dest}`);
    } else {
      console.log(`Skipping existing ${dest}`);
    }
}

// We only need to recopy the `app/` folder mapping since we deleted the bad copy.
const srcDir = path.join(oldFrontend, 'app');
if (fs.existsSync(srcDir)) {
    walkDir(srcDir, function(filePath) {
        const relativePath = path.relative(srcDir, filePath);
        let targetPath = relativePath;
        
        // Map old 'dashboard' to new '(protected)/dashboard'
        if (targetPath.startsWith('dashboard')) {
            targetPath = path.join('(protected)', targetPath);
        }
        
        const newPath = path.join(newFrontend, 'app', targetPath);
        
        // We have to handle slug collisions manually.
        // E.g. [studentId] vs [id]
        // If we copy [studentId] but [id] already exists, we should rename the folder or skip.
        // It's safer to skip if the parent directory already has a dynamic route.
        // For simplicity here, we'll let it copy, but we'll manually fix the slug collisions.
        
        safeCopy(filePath, newPath);
    });
}

console.log('App directory re-migration complete!');
