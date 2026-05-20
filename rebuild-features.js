const fs = require('fs');
const path = require('path');

const staffPath = path.join(__dirname, 'frontend', 'app', 'dashboard', 'staff');
const doctorPath = path.join(__dirname, 'frontend', 'app', 'dashboard', 'doctor');

function safeCopy(src, dest) {
  if (fs.existsSync(src)) {
    if (fs.existsSync(dest)) {
      console.log(`Destination ${dest} already exists. Overwriting...`);
      fs.rmSync(dest, { recursive: true, force: true });
    }
    fs.cpSync(src, dest, { recursive: true });
    console.log(`Successfully copied ${path.basename(src)} to ${dest}`);
  } else {
    console.log(`Source ${src} does not exist, skipping.`);
  }
}

// Ensure both roles have all required shared modules by copying them securely
const sharedModules = ['announcement', 'reports', 'inventory', 'certificates', 'notifications', 'scanner', 'students'];

sharedModules.forEach(mod => {
  const inDoctor = path.join(doctorPath, mod);
  const inStaff = path.join(staffPath, mod);

  if (fs.existsSync(inDoctor) && !fs.existsSync(inStaff)) {
    safeCopy(inDoctor, inStaff);
  } else if (fs.existsSync(inStaff) && !fs.existsSync(inDoctor)) {
    safeCopy(inStaff, inDoctor);
  } else if (fs.existsSync(inDoctor) && fs.existsSync(inStaff)) {
    console.log(`${mod} already exists in both, leaving intact.`);
  }
});

// Move specific exclusive features
function safeMove(src, dest) {
  if (fs.existsSync(src)) {
    if (fs.existsSync(dest)) {
      fs.rmSync(dest, { recursive: true, force: true });
    }
    fs.renameSync(src, dest);
    console.log(`Successfully moved ${path.basename(src)}`);
  }
}

safeMove(path.join(doctorPath, 'record'), path.join(staffPath, 'record'));
safeMove(path.join(staffPath, 'patients'), path.join(doctorPath, 'patients'));
safeMove(path.join(staffPath, 'records'), path.join(doctorPath, 'records'));

// Fix staff layout navigation groups
const staffLayoutPath = path.join(staffPath, 'layout.tsx');
if (fs.existsSync(staffLayoutPath)) {
  let content = fs.readFileSync(staffLayoutPath, 'utf8');
  content = content.replace(/DOCTOR_NAV_GROUPS/g, 'STAFF_NAV_GROUPS');
  content = content.replace(/doctorNavigation/g, 'staffNavigation');
  fs.writeFileSync(staffLayoutPath, content);
}

// Recursive replace links
function replaceLinks(dir, search, replace) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      replaceLinks(fullPath, search, replace);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes(search)) {
        content = content.replace(new RegExp(search, 'g'), replace);
        fs.writeFileSync(fullPath, content);
      }
    }
  }
}

replaceLinks(staffPath, '/dashboard/doctor', '/dashboard/staff');
replaceLinks(doctorPath, '/dashboard/staff', '/dashboard/doctor');

console.log('\nFeature duplication & link fix complete!');
