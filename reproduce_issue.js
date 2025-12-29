import { query } from '@anthropic-ai/claude-agent-sdk';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTest() {
    try {
        console.log('Starting SDK test...');

        const projectPath = path.join(process.cwd(), 'tests/codespeaks/projects/test-project');
        console.log('Project path:', projectPath);

        const L1_PROMPT = `You are the Lead Architect (L1 Agent).
Your goal is to understand the high-level structure of the project and identify which parts of the codebase are relevant to the user's question.
You have access to file exploration tools.
Do NOT read detailed code files yet. Focus on directories, file names, and configuration files (package.json, etc.).
Output a plan for the L2 Agent, specifying which features or modules they should investigate.`;

        const sdkOptions = {
            cwd: projectPath,
            model: 'sonnet',
            systemPrompt: {
                type: 'text',
                text: L1_PROMPT
            },
            allowedTools: ['Read', 'Glob', 'Grep', 'Bash'],
            permissionMode: 'bypassPermissions'
        };

        console.log('SDK Options:', JSON.stringify(sdkOptions, null, 2));

        const queryInstance = query({
            prompt: `Question: What does this project do?\nProject Path: ${projectPath}`,
            options: sdkOptions
        });

        console.log('Query instance created. Iterating results...');

        for await (const message of queryInstance) {
            console.log('Message received:', message.type);
            if (message.type === 'result') {
                console.log('Result content:', JSON.stringify(message.content, null, 2));
            } else if (message.type === 'error') {
                console.error('Error message:', message);
            }
        }

        console.log('Test completed successfully.');

    } catch (error) {
        console.error('Test failed with error:', error);
    }
}

runTest();
