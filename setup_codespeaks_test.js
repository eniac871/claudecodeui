import { userDb, initializeDatabase } from './server/database/db.js';
import { generateToken } from './server/middleware/auth.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function setup() {
    try {
        // Initialize DB (creates tables if needed)
        await initializeDatabase();

        const username = 'codespeaks_tester';
        let user = userDb.getUserByUsername(username);

        if (!user) {
            console.log(`Creating user ${username}...`);
            // Password hash doesn't matter for token generation, just needs to be there
            const result = userDb.createUser(username, 'dummy_hash');
            user = userDb.getUserById(result.id);
        } else {
            console.log(`User ${username} already exists.`);
        }

        // Setup paths
        const projectFolder = path.resolve(__dirname, 'tests/codespeaks/projects');
        const knowledgeFolder = path.resolve(__dirname, 'tests/codespeaks/knowledge');

        console.log(`Configuring CodeSpeaks for user ${user.id}...`);
        console.log(`Projects: ${projectFolder}`);
        console.log(`Knowledge: ${knowledgeFolder}`);

        userDb.updateCodeSpeaksConfig(user.id, projectFolder, knowledgeFolder);

        // Generate Token
        const token = generateToken(user);
        console.log('---TOKEN_START---');
        console.log(token);
        console.log('---TOKEN_END---');

    } catch (error) {
        console.error('Setup failed:', error);
        process.exit(1);
    }
}

setup();
