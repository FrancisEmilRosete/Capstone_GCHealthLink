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

const missingAppFiles = [];
const missingComponentsFiles = [];

if (fs.existsSync(path.join(oldFrontend, 'app'))) {
    walkDir(path.join(oldFrontend, 'app'), function(filePath) {
        const relativePath = path.relative(path.join(oldFrontend, 'app'), filePath);
        const newPath = path.join(newFrontend, 'app', relativePath);
        if (!fs.existsSync(newPath)) {
            missingAppFiles.push(relativePath);
        }
    });
}

if (fs.existsSync(path.join(oldFrontend, 'components'))) {
    walkDir(path.join(oldFrontend, 'components'), function(filePath) {
        const relativePath = path.relative(path.join(oldFrontend, 'components'), filePath);
        const newPath = path.join(newFrontend, 'components', relativePath);
        if (!fs.existsSync(newPath)) {
            missingComponentsFiles.push(relativePath);
        }
    });
}

const missingConstantsFiles = [];
const missingLibFiles = [];
const missingTypesFiles = [];

['constants', 'lib', 'types'].forEach(dir => {
    if (fs.existsSync(path.join(oldFrontend, dir))) {
        walkDir(path.join(oldFrontend, dir), function(filePath) {
            const relativePath = path.relative(path.join(oldFrontend, dir), filePath);
            const newPath = path.join(newFrontend, dir, relativePath);
            if (!fs.existsSync(newPath)) {
                if (dir === 'constants') missingConstantsFiles.push(relativePath);
                if (dir === 'lib') missingLibFiles.push(relativePath);
                if (dir === 'types') missingTypesFiles.push(relativePath);
            }
        });
    }
});


let report = 'Missing Files from Frontend -> New System/Frontend-NextJS/src\n\n';
report += 'App:\n' + missingAppFiles.map(f => 'app/' + f).join('\n') + '\n\n';
report += 'Components:\n' + missingComponentsFiles.map(f => 'components/' + f).join('\n') + '\n\n';
report += 'Constants:\n' + missingConstantsFiles.map(f => 'constants/' + f).join('\n') + '\n\n';
report += 'Lib:\n' + missingLibFiles.map(f => 'lib/' + f).join('\n') + '\n\n';
report += 'Types:\n' + missingTypesFiles.map(f => 'types/' + f).join('\n') + '\n\n';

fs.writeFileSync('migration_analysis.txt', report);
console.log('Migration analysis written to migration_analysis.txt');
