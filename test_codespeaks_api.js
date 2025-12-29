import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TOKEN = process.argv[2];
const BASE_URL = 'http://localhost:3001/api/codespeaks';

if (!TOKEN) {
    console.error('Please provide a token as an argument');
    process.exit(1);
}

async function runTests() {
    try {
        console.log('1. Testing /projects endpoint...');
        const projectsRes = await fetch(`${BASE_URL}/projects`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        const projectsData = await projectsRes.json();
        console.log('Projects Response:', JSON.stringify(projectsData, null, 2));

        if (!projectsData.success || projectsData.projects.length === 0) {
            throw new Error('Failed to list projects');
        }

        const testProject = projectsData.projects.find(p => p.name === 'test-project');
        if (!testProject) {
            throw new Error('Test project not found');
        }
        console.log('Found test project:', testProject.path);

        console.log('\n2. Testing /ask endpoint (streaming)...');
        const askRes = await fetch(`${BASE_URL}/ask`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                projectPath: testProject.path,
                question: 'What does this project do?'
            })
        });

        if (!askRes.ok) {
            throw new Error(`Ask request failed: ${askRes.status} ${askRes.statusText}`);
        }

        // Handle streaming response
        const reader = askRes.body;
        reader.on('data', (chunk) => {
            const text = chunk.toString();
            console.log('Stream chunk:', text);
        });

        // Wait for stream to finish (simple delay for this test script)
        await new Promise(resolve => setTimeout(resolve, 15000));

        console.log('\n3. Testing /knowledge endpoint...');
        const knowledgeRes = await fetch(`${BASE_URL}/knowledge?projectName=test-project`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        const knowledgeData = await knowledgeRes.json();
        console.log('Knowledge Response:', JSON.stringify(knowledgeData, null, 2));

        if (!knowledgeData.success) {
             throw new Error('Failed to get knowledge');
        }

        if (knowledgeData.reports.length > 0) {
            console.log('SUCCESS: Report found in knowledge base!');
        } else {
            console.log('WARNING: No reports found yet (might still be generating or saving failed)');
        }

    } catch (error) {
        console.error('Test failed:', error);
    }
}

runTests();
