import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolvePublicRegistrationRole } from './controllers/authController.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const readProjectFile = (relativePath) => readFile(path.join(__dirname, '..', relativePath), 'utf8');

const authController = await readFile(path.join(__dirname, 'controllers', 'authController.js'), 'utf8');
const home = await readProjectFile('src/pages/Home.jsx');
const register = await readProjectFile('src/pages/Register.jsx');
const provisioning = await readFile(path.join(__dirname, 'create_admin.js'), 'utf8');

assert.match(authController, /PUBLIC_REGISTRATION_ROLES = Object\.freeze\(\['student', 'freelancer'\]\)/);
assert.match(authController, /if \(role === undefined\)[\s\S]*role: 'student'/);
assert.match(authController, /!PUBLIC_REGISTRATION_ROLES\.includes\(role\)/);
assert.match(authController, /role: publicRole\.role/);

assert.deepEqual(resolvePublicRegistrationRole(undefined), { valid: true, role: 'student' });
assert.deepEqual(resolvePublicRegistrationRole('student'), { valid: true, role: 'student' });
assert.deepEqual(resolvePublicRegistrationRole('freelancer'), { valid: true, role: 'freelancer' });
assert.deepEqual(resolvePublicRegistrationRole('admin'), { valid: false });
assert.deepEqual(resolvePublicRegistrationRole('unknown'), { valid: false });

assert.match(home, /const handleAdminAccess[\s\S]*navigate\('\/login'\)/);
assert.match(home, /onClick=\{handleAdminAccess\}/);
assert.match(register, /publicRoles\.includes\(routeRole\) \? routeRole : 'student'/);
assert.match(register, /registerData\.role = publicRoles\.includes\(registerData\.role\) \? registerData\.role : 'student'/);

assert.match(provisioning, /process\.env\.ADMIN_EMAIL/);
assert.match(provisioning, /process\.env\.ADMIN_USERNAME/);
assert.match(provisioning, /process\.env\.ADMIN_PASSWORD/);
assert.match(provisioning, /existingUser\.role === 'admin'/);
assert.doesNotMatch(provisioning, /admin123/);
assert.doesNotMatch(provisioning, /Password:\s*admin/i);

console.log('P0-1 static verification passed.');
