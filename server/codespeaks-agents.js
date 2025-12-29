import { query } from '@anthropic-ai/claude-agent-sdk';
import fs from 'fs/promises';
import path from 'path';
import { userDb } from './database/db.js';

// L1 Agent: Architect
// Focus: High-level structure, file organization, technology stack
const L1_PROMPT = `You are the Lead Architect (L1 Agent).
Your goal is to understand the high-level structure of the project and identify which parts of the codebase are relevant to the user's question.
You have access to file exploration tools.
Do NOT read detailed code files yet. Focus on directories, file names, and configuration files (package.json, etc.).
Output a plan for the L2 Agent, specifying which features or modules they should investigate.`;

// L2 Agent: Tech Lead
// Focus: Feature implementation, component relationships, specific files
const L2_PROMPT = `You are the Tech Lead (L2 Agent).
Your goal is to understand the implementation details of specific features identified by the Architect.
You can read file contents, but try to stick to interface definitions and main logic flows.
If you need deep analysis of complex algorithms or specific functions, delegate to the L3 Agent.
Otherwise, synthesize the information and report back.`;

// L3 Agent: Developer
// Focus: Detailed code analysis, line-by-line understanding, debugging
const L3_PROMPT = `You are the Senior Developer (L3 Agent).
Your goal is to analyze specific code snippets or functions in extreme detail.
Explain how the code works, identify potential issues, and answer specific technical questions.`;

class CodeSpeaksOrchestrator {
  constructor(userId, projectPath, question) {
    this.userId = userId;
    this.projectPath = projectPath;
    this.question = question;
    this.statusCallback = null;
  }

  setStatusCallback(callback) {
    this.statusCallback = callback;
  }

  async log(level, message) {
    if (this.statusCallback) {
      this.statusCallback({ type: 'status', level, message, timestamp: new Date().toISOString() });
    }
  }

  async emitAgentResult(level, content) {
    if (this.statusCallback) {
      this.statusCallback({ type: 'agent_result', level, content, timestamp: new Date().toISOString() });
    }
  }

  async run() {
    try {
      // 1. Get Configuration
      const config = userDb.getCodeSpeaksConfig(this.userId);
      if (!config || !config.codespeaks_knowledge_folder) {
        throw new Error('Knowledge folder not configured');
      }
      const knowledgePath = config.codespeaks_knowledge_folder;

      // 2. L1 Analysis (Architect)
      await this.log('L1', 'Architect is analyzing project structure...');
      const l1Result = await this.runAgent('L1', L1_PROMPT, `Question: ${this.question}\nProject Path: ${this.projectPath}`);
      await this.emitAgentResult('L1', l1Result);
      await this.log('L1', 'Architect analysis complete.');

      // 3. L2 Analysis (Tech Lead)
      await this.log('L2', 'Tech Lead is investigating specific features...');
      const l2Result = await this.runAgent('L2', L2_PROMPT, `Architect's Plan: ${l1Result}\nProject Path: ${this.projectPath}`);
      await this.emitAgentResult('L2', l2Result);
      await this.log('L2', 'Tech Lead investigation complete.');

      // 4. L3 Analysis (Developer)
      await this.log('L3', 'Developer is analyzing code details...');
      const l3Result = await this.runAgent('L3', L3_PROMPT, `Tech Lead's Findings: ${l2Result}\nProject Path: ${this.projectPath}`);
      await this.emitAgentResult('L3', l3Result);
      await this.log('L3', 'Developer analysis complete.');

      // 5. Synthesize Report
      const report = this.generateReport(l1Result, l2Result, l3Result);

      // 6. Save to Knowledge Store
      await this.saveKnowledge(knowledgePath, report);

      return report;

    } catch (error) {
      console.error('Orchestration error:', error);
      throw error;
    }
  }

  async runAgent(level, systemPrompt, input) {
    try {
      // Configure SDK options
      const sdkOptions = {
        cwd: this.projectPath,
        model: 'sonnet', // Use Sonnet for agents
        systemPrompt: {
          type: 'text',
          text: systemPrompt
        },
        // Enable file system tools
        allowedTools: ['Read', 'Glob', 'Grep', 'Bash'],
        permissionMode: 'bypassPermissions', // Bypass permissions for automated agents
        settingSources: ['user'], // Explicitly set setting sources to avoid argument parsing issues
        stderr: (data) => {
          console.log(`[Claude Process Stderr]: ${data}`);
        }
      };

      console.log(`[CodeSpeaks] Running agent ${level} with options:`, JSON.stringify({
        cwd: sdkOptions.cwd,
        model: sdkOptions.model,
        permissionMode: sdkOptions.permissionMode
      }, null, 2));

      // Create query instance
      const queryInstance = query({
        prompt: input,
        options: sdkOptions
      });

      let fullResponse = '';

      // Process streaming messages
      for await (const message of queryInstance) {
        if (message.type === 'result' && message.content) {
            // Extract text content from result
            const textContent = message.content
                .filter(block => block.type === 'text')
                .map(block => block.text)
                .join('\n');
            fullResponse += textContent;
        }
      }

      return fullResponse || `[${level} Agent produced no output]`;

    } catch (error) {
      console.error(`Error running ${level} agent:`, error);
      return `[Error running ${level} agent: ${error.message}]`;
    }
  }

  generateReport(l1, l2, l3) {
    return `# CodeSpeaks Report: ${this.question}

## Architect's Overview (L1)
${l1}

## Tech Lead's Deep Dive (L2)
${l2}

## Developer's Code Analysis (L3)
${l3}

---
*Generated by CodeSpeaks Multi-Agent System*
`;
  }

  async saveKnowledge(knowledgeBaseDir, report) {
    const projectName = path.basename(this.projectPath);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeTitle = this.question.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
    const filename = `${timestamp}-${safeTitle}.md`;

    const projectKnowledgeDir = path.join(knowledgeBaseDir, projectName);

    try {
      await fs.mkdir(projectKnowledgeDir, { recursive: true });
      await fs.writeFile(path.join(projectKnowledgeDir, filename), report);
      await this.log('System', `Report saved to ${path.join(projectKnowledgeDir, filename)}`);
    } catch (error) {
      console.error('Failed to save knowledge:', error);
      // Don't fail the whole request if saving fails
    }
  }
}

export default CodeSpeaksOrchestrator;
