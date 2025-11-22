/**
 * Commit Message Generator
 * 
 * Generates descriptive commit messages for uploaded files following
 * conventional commit format.
 */

import * as fs from 'fs';
import * as path from 'path';
import { CommitMessage, FileAnalysis } from '../types/models';

/**
 * Detects the file type and category based on extension and path
 */
export function detectFileType(filePath: string): Pick<FileAnalysis, 'type' | 'category' | 'language'> {
  const ext = path.extname(filePath).toLowerCase();
  const basename = path.basename(filePath).toLowerCase();
  const dirname = path.dirname(filePath).toLowerCase();

  // Documentation files
  if (['.md', '.txt', '.rst', '.adoc'].includes(ext) || basename.startsWith('readme')) {
    return { type: ext || 'text', category: 'documentation', language: undefined };
  }

  // Test files
  if (basename.includes('.test.') || basename.includes('.spec.') || dirname.includes('test') || dirname.includes('__tests__')) {
    const lang = getLanguageFromExtension(ext);
    return { type: ext, category: 'test', language: lang };
  }

  // Configuration files
  const configFiles = ['.json', '.yaml', '.yml', '.toml', '.ini', '.conf', '.config', '.xml'];
  const configNames = ['dockerfile', 'jenkinsfile', 'makefile', '.gitignore', '.dockerignore', 'package.json', 'tsconfig.json'];
  if (configFiles.includes(ext) || configNames.some(name => basename.includes(name))) {
    return { type: ext || 'config', category: 'config', language: undefined };
  }

  // Code files
  const codeExtensions = ['.ts', '.js', '.tsx', '.jsx', '.py', '.java', '.go', '.rs', '.c', '.cpp', '.h', '.hpp', '.cs', '.rb', '.php', '.swift', '.kt'];
  if (codeExtensions.includes(ext)) {
    return { type: ext, category: 'code', language: getLanguageFromExtension(ext) };
  }

  // Asset files
  const assetExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot'];
  if (assetExtensions.includes(ext)) {
    return { type: ext, category: 'asset', language: undefined };
  }

  return { type: ext || 'unknown', category: 'other', language: undefined };
}

/**
 * Maps file extension to programming language
 */
function getLanguageFromExtension(ext: string): string | undefined {
  const languageMap: Record<string, string> = {
    '.ts': 'TypeScript',
    '.tsx': 'TypeScript',
    '.js': 'JavaScript',
    '.jsx': 'JavaScript',
    '.py': 'Python',
    '.java': 'Java',
    '.go': 'Go',
    '.rs': 'Rust',
    '.c': 'C',
    '.cpp': 'C++',
    '.h': 'C/C++',
    '.hpp': 'C++',
    '.cs': 'C#',
    '.rb': 'Ruby',
    '.php': 'PHP',
    '.swift': 'Swift',
    '.kt': 'Kotlin',
  };
  return languageMap[ext];
}

/**
 * Analyzes file content to determine its purpose
 */
export function analyzeFileContent(filePath: string): FileAnalysis {
  const fileInfo = detectFileType(filePath);
  let content = '';
  
  try {
    // Read file content (limit to first 1000 bytes for analysis)
    const buffer = fs.readFileSync(filePath);
    const isBinary = buffer.some(byte => byte === 0 || (byte < 32 && byte !== 9 && byte !== 10 && byte !== 13));
    
    if (!isBinary) {
      content = buffer.toString('utf-8', 0, Math.min(1000, buffer.length));
    }
  } catch (error) {
    // If we can't read the file, we'll infer from the path
  }

  const purpose = generatePurposeDescription(filePath, fileInfo, content);

  return {
    path: filePath,
    type: fileInfo.type,
    category: fileInfo.category,
    language: fileInfo.language,
    purpose,
  };
}

/**
 * Generates a descriptive summary of the file's purpose
 */
export function generateDescription(analysis: FileAnalysis): string {
  const filename = path.basename(analysis.path);
  const dirname = path.dirname(analysis.path);
  
  let description = '';

  switch (analysis.category) {
    case 'documentation':
      description = `${filename} documentation`;
      if (filename.toLowerCase().includes('readme')) {
        description = 'README documentation';
      }
      break;
    
    case 'test':
      description = `${analysis.language || 'test'} tests for ${getTestSubject(filename)}`;
      break;
    
    case 'config':
      description = `${getConfigType(filename)} configuration`;
      break;
    
    case 'code':
      description = `${analysis.language || 'code'} ${getCodePurpose(filename, dirname)}`;
      break;
    
    case 'asset':
      description = `${getAssetType(analysis.type)} asset`;
      break;
    
    default:
      description = filename;
  }

  return description;
}

/**
 * Generates purpose description based on file analysis
 */
function generatePurposeDescription(filePath: string, fileInfo: Pick<FileAnalysis, 'type' | 'category' | 'language'>, content: string): string {
  const filename = path.basename(filePath);
  const dirname = path.dirname(filePath);

  // Check content for specific patterns
  if (content) {
    if (content.includes('export') && content.includes('function')) {
      return 'Exports utility functions';
    }
    if (content.includes('interface') || content.includes('type ')) {
      return 'Defines TypeScript types and interfaces';
    }
    if (content.includes('class ')) {
      return `Implements ${fileInfo.language || 'code'} classes`;
    }
    if (content.includes('describe(') || content.includes('test(') || content.includes('it(')) {
      return 'Contains test cases';
    }
    if (content.includes('import') && content.includes('export')) {
      return 'Module with imports and exports';
    }
  }

  // Infer from filename and path
  if (fileInfo.category === 'documentation') {
    if (filename.toLowerCase().includes('readme')) {
      return 'Project documentation and setup instructions';
    }
    return 'Documentation file';
  }

  if (fileInfo.category === 'test') {
    return `Test suite for ${getTestSubject(filename)}`;
  }

  if (fileInfo.category === 'config') {
    return `Configuration for ${getConfigType(filename)}`;
  }

  if (fileInfo.category === 'code') {
    if (dirname.includes('cli')) {
      return 'Command-line interface implementation';
    }
    if (dirname.includes('util') || dirname.includes('helper')) {
      return 'Utility functions';
    }
    if (filename.includes('index')) {
      return 'Module entry point';
    }
    return `${fileInfo.language || 'Code'} implementation`;
  }

  return `${filename} file`;
}

/**
 * Extracts test subject from test filename
 */
function getTestSubject(filename: string): string {
  return filename
    .replace(/\.test\.(ts|js|tsx|jsx|py)$/, '')
    .replace(/\.spec\.(ts|js|tsx|jsx|py)$/, '')
    .replace(/\.(ts|js|tsx|jsx|py)$/, '');
}

/**
 * Determines configuration type from filename
 */
function getConfigType(filename: string): string {
  if (filename.includes('package.json')) return 'npm package';
  if (filename.includes('tsconfig')) return 'TypeScript';
  if (filename.includes('jest')) return 'Jest testing';
  if (filename.includes('docker')) return 'Docker';
  if (filename.includes('jenkins')) return 'Jenkins CI/CD';
  if (filename.includes('.github')) return 'GitHub';
  if (filename.includes('eslint')) return 'ESLint';
  return 'project';
}

/**
 * Determines code purpose from filename and directory
 */
function getCodePurpose(filename: string, dirname: string): string {
  if (filename.includes('index')) return 'module';
  if (dirname.includes('cli')) return 'CLI command';
  if (dirname.includes('util')) return 'utilities';
  if (dirname.includes('type')) return 'type definitions';
  return 'implementation';
}

/**
 * Determines asset type from extension
 */
function getAssetType(ext: string): string {
  if (['.png', '.jpg', '.jpeg', '.gif'].includes(ext)) return 'image';
  if (ext === '.svg') return 'vector graphic';
  if (['.woff', '.woff2', '.ttf', '.eot'].includes(ext)) return 'font';
  return 'binary';
}

/**
 * Formats a commit message using conventional commit standard
 */
export function formatConventionalCommit(message: CommitMessage): string {
  let formatted = message.type;
  
  if (message.scope) {
    formatted += `(${message.scope})`;
  }
  
  formatted += `: ${message.subject}`;
  
  if (message.body) {
    formatted += `\n\n${message.body}`;
  }
  
  if (message.footer) {
    formatted += `\n\n${message.footer}`;
  }
  
  return formatted;
}

/**
 * Validates commit message quality
 */
export function validateMessageQuality(message: CommitMessage): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Subject must be present and not empty
  if (!message.subject || message.subject.trim().length === 0) {
    errors.push('Subject is required');
  }

  // Subject should be at least 10 characters
  if (message.subject && message.subject.length < 10) {
    errors.push('Subject should be at least 10 characters');
  }

  // Subject should not end with a period
  if (message.subject && message.subject.endsWith('.')) {
    errors.push('Subject should not end with a period');
  }

  // Subject should start with lowercase (after type prefix)
  if (message.subject && message.subject[0] === message.subject[0].toUpperCase()) {
    errors.push('Subject should start with lowercase letter');
  }

  // Type must be valid
  const validTypes = ['feat', 'fix', 'docs', 'chore', 'test', 'refactor', 'style', 'ci'];
  if (!validTypes.includes(message.type)) {
    errors.push(`Type must be one of: ${validTypes.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Determines appropriate commit type based on file analysis
 */
function determineCommitType(analyses: FileAnalysis[]): CommitMessage['type'] {
  const categories = analyses.map(a => a.category);
  
  // If all files are documentation
  if (categories.every(c => c === 'documentation')) {
    return 'docs';
  }
  
  // If all files are tests
  if (categories.every(c => c === 'test')) {
    return 'test';
  }
  
  // If all files are config
  if (categories.every(c => c === 'config')) {
    return 'chore';
  }
  
  // If there's code, it's likely a feature or fix
  if (categories.some(c => c === 'code')) {
    return 'feat';
  }
  
  // Default to chore
  return 'chore';
}

/**
 * Generates a commit message for one or more files
 */
export function generateCommitMessage(filePaths: string[], type?: CommitMessage['type']): CommitMessage {
  const analyses = filePaths.map(analyzeFileContent);
  
  // Determine commit type
  const commitType = type || determineCommitType(analyses);
  
  // Generate subject
  let subject: string;
  if (analyses.length === 1) {
    const analysis = analyses[0];
    const filename = path.basename(analysis.path);
    subject = `add ${generateDescription(analysis)}`;
  } else {
    // Multiple files
    const categories = [...new Set(analyses.map(a => a.category))];
    if (categories.length === 1) {
      subject = `add ${categories[0]} files`;
    } else {
      subject = `add ${analyses.length} files`;
    }
  }
  
  // Generate body with file details
  let body: string | undefined;
  if (analyses.length > 1) {
    body = 'Files added:\n' + analyses.map(a => {
      const filename = path.basename(a.path);
      return `- ${filename}: ${a.purpose}`;
    }).join('\n');
  } else {
    body = analyses[0].purpose;
  }
  
  const message: CommitMessage = {
    type: commitType,
    subject,
    body,
    files: filePaths,
  };
  
  // Validate and adjust if needed
  const validation = validateMessageQuality(message);
  if (!validation.valid) {
    // Try to fix common issues
    if (message.subject.endsWith('.')) {
      message.subject = message.subject.slice(0, -1);
    }
    if (message.subject[0] === message.subject[0].toUpperCase()) {
      message.subject = message.subject[0].toLowerCase() + message.subject.slice(1);
    }
    // Ensure minimum length
    if (message.subject.length < 10) {
      message.subject = `add ${path.basename(filePaths[0])} file`;
    }
  }
  
  return message;
}

/**
 * Creates a git commit with the generated message
 */
export function createCommitWithMessage(message: CommitMessage): { success: boolean; error?: string } {
  const { execSync } = require('child_process');
  
  try {
    // Stage the files
    for (const file of message.files) {
      execSync(`git add "${file}"`, { stdio: 'pipe' });
    }
    
    // Create the commit
    const commitMessage = formatConventionalCommit(message);
    execSync(`git commit -m "${commitMessage.replace(/"/g, '\\"')}"`, { stdio: 'pipe' });
    
    return { success: true };
  } catch (error: any) {
    return { 
      success: false, 
      error: error.message || 'Failed to create commit'
    };
  }
}
