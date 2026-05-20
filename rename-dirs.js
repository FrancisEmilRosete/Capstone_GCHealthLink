const fs = require('fs');
const path = require('path');

const basePath = path.join(__dirname, 'frontend', 'app', 'dashboard');

const staffPath = path.join(basePath, 'staff');
const doctorPath = path.join(basePath, 'doctor');
const tempPath = path.join(basePath, 'temp_doctor');

try {
  fs.renameSync(staffPath, tempPath);
  console.log('Renamed staff to temp_doctor');
  fs.renameSync(doctorPath, staffPath);
  console.log('Renamed doctor to staff');
  fs.renameSync(tempPath, doctorPath);
  console.log('Renamed temp_doctor to doctor');
} catch (err) {
  console.error('Error renaming directories:', err);
}
