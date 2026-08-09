
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import readline from 'node:readline/promises';
import process, { stdin, stdout } from 'node:process';
import User from './models/User.js';

dotenv.config();

const promptForPassword = async () => {
    if (!stdin.isTTY || typeof stdin.setRawMode !== 'function') {
        throw new Error('ADMIN_PASSWORD is required when running without an interactive terminal.');
    }

    return new Promise((resolve, reject) => {
        let password = '';
        const wasRaw = stdin.isRaw;

        stdout.write('Admin password: ');
        stdin.setRawMode(true);
        stdin.resume();
        stdin.setEncoding('utf8');

        const cleanup = () => {
            stdin.removeListener('data', onData);
            stdin.setRawMode(wasRaw || false);
            stdin.pause();
        };

        const onData = (chunk) => {
            const key = chunk.toString();
            if (key === '\u0003') {
                cleanup();
                stdout.write('\n');
                reject(new Error('Admin provisioning cancelled.'));
            } else if (key === '\r' || key === '\n') {
                cleanup();
                stdout.write('\n');
                resolve(password);
            } else if (key === '\u007f' || key === '\b') {
                password = password.slice(0, -1);
            } else {
                password += key;
            }
        };

        stdin.on('data', onData);
    });
};

const getProvisioningDetails = async () => {
    let email = process.env.ADMIN_EMAIL?.trim();
    let username = process.env.ADMIN_USERNAME?.trim();
    let password = process.env.ADMIN_PASSWORD;

    if (!stdin.isTTY && (!email || !username || !password)) {
        throw new Error('ADMIN_EMAIL, ADMIN_USERNAME, and ADMIN_PASSWORD are required for non-interactive provisioning.');
    }

    if (stdin.isTTY && (!email || !username || !password)) {
        const terminal = readline.createInterface({ input: stdin, output: stdout });
        try {
            if (!email) email = (await terminal.question('Admin email: ')).trim();
            if (!username) username = (await terminal.question('Admin username: ')).trim();
        } finally {
            terminal.close();
        }

        if (!password) password = await promptForPassword();
    }

    if (!email || !username || !password) {
        throw new Error('Admin email, username, and password are required.');
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
        throw new Error('ADMIN_EMAIL must be a valid email address.');
    }

    if (password.length < 12) {
        throw new Error('Admin password must be at least 12 characters long.');
    }

    return { email: email.toLowerCase(), username, password };
};

const createAdmin = async () => {
    try {
        const { email, username, password } = await getProvisioningDetails();

        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI is required for admin provisioning.');
        }

        console.log('Connecting to DB for admin provisioning...');
        await mongoose.connect(process.env.MONGODB_URI);

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            if (existingUser.role === 'admin') {
                console.log(`Admin account already exists for ${email}. No changes made.`);
                return;
            }

            throw new Error(`An existing non-admin account uses ${email}. No changes made.`);
        } else {
            const admin = await User.create({
                username,
                email,
                password,
                role: 'admin',
                verified: true,
                isEmailVerified: true
            });
            console.log(`Admin account created for ${admin.email}.`);
        }

    } catch (err) {
        console.error(`Admin provisioning failed: ${err.message}`);
        process.exitCode = 1;
    } finally {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
    }
};

createAdmin();
