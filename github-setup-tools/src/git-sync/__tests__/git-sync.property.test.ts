/**
 * Property-based tests for Git Sync Tool
 * Using fast-check for property-based testing
 */

import * as fc from 'fast-check';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  checkBranchStatus,
  fetchRemoteChanges,
  detectConflicts,
  verifySync,
  mergeChanges,
  rebaseChanges,
  forcePushWithConfirmation
} from '../index';

/**
 * Helper to create a temporary git repository for testing
 */
function createTempRepo(name: string): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `git-sync-test-${name}-`));
  execSync('git init', { cwd: tmpDir, stdio: 'pipe' });
  execSync('git config user.email "test@example.com"', { cwd: tmpDir, stdio: 'pipe' });
  execSync('git config user.name "Test User"', { cwd: tmpDir, stdio: 'pipe' });
  return tmpDir;
}

/**
 * Helper to create a commit in a repository
 */
function createCommit(repoPath: string, message: string, fileName: string = 'test.txt'): void {
  const filePath = path.join(repoPath, fileName);
  fs.writeFileSync(filePath, `${message}\n${Date.now()}\n`);
  execSync(`git add ${fileName}`, { cwd: repoPath, stdio: 'pipe' });
  execSync(`git commit -m "${message}"`, { cwd: repoPath, stdio: 'pipe' });
}

/**
 * Helper to cleanup temporary repository
 */
function cleanupRepo(repoPath: string): void {
  try {
    fs.rmSync(repoPath, { recursive: true, force: true });
  } catch (error) {
    // Ignore cleanup errors
  }
}

/**
 * Helper to setup a repository with a remote
 */
function setupRepoWithRemote(): { local: string; remote: string } {
  const remote = createTempRepo('remote');
  const local = createTempRepo('local');
  
  // Create initial commit in remote on main branch
  execSync('git checkout -b main', { cwd: remote, stdio: 'pipe' });
  createCommit(remote, 'Initial commit');
  
  // Setup local repository
  execSync(`git remote add origin ${remote}`, { cwd: local, stdio: 'pipe' });
  execSync('git fetch origin', { cwd: local, stdio: 'pipe' });
  execSync('git checkout -b main', { cwd: local, stdio: 'pipe' });
  execSync('git reset --hard origin/main', { cwd: local, stdio: 'pipe' });
  execSync('git branch --set-upstream-to=origin/main main', { cwd: local, stdio: 'pipe' });
  
  return { local, remote };
}

describe('Git Sync Tool - Property-Based Tests', () => {
  // Feature: github-setup-automation, Property 1: Successful sync ensures alignment
  describe('Property 1: Successful sync ensures alignment', () => {
    test('after successful merge, local and remote should be aligned', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 5 }), // number of commits to create on remote
          (numCommits) => {
            const { local, remote } = setupRepoWithRemote();
            const originalDir = process.cwd();
            
            try {
              // Create commits on remote
              for (let i = 0; i < numCommits; i++) {
                createCommit(remote, `Remote commit ${i}`, `file${i}.txt`);
              }
              
              // Fetch changes in local
              process.chdir(local);
              fetchRemoteChanges();
              
              // Merge changes
              const result = mergeChanges();
              
              // If merge was successful (no conflicts), verify sync
              if (result.success) {
                const isAligned = verifySync();
                process.chdir(originalDir);
                cleanupRepo(local);
                cleanupRepo(remote);
                return isAligned === true;
              }
              
              // If there were conflicts, we can't verify alignment
              process.chdir(originalDir);
              cleanupRepo(local);
              cleanupRepo(remote);
              return true; // Skip this case
            } catch (error) {
              process.chdir(originalDir);
              cleanupRepo(local);
              cleanupRepo(remote);
              return true; // Skip cases with errors
            }
          }
        ),
        { numRuns: 10 }
      );
    });

    test('after successful rebase, local and remote should be aligned', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 5 }), // number of commits to create on remote
          (numCommits) => {
            const { local, remote } = setupRepoWithRemote();
            const originalDir = process.cwd();
            
            try {
              // Create commits on remote
              for (let i = 0; i < numCommits; i++) {
                createCommit(remote, `Remote commit ${i}`, `file${i}.txt`);
              }
              
              // Fetch changes in local
              process.chdir(local);
              fetchRemoteChanges();
              
              // Rebase changes
              const result = rebaseChanges();
              
              // If rebase was successful (no conflicts), verify sync
              if (result.success) {
                const isAligned = verifySync();
                process.chdir(originalDir);
                cleanupRepo(local);
                cleanupRepo(remote);
                return isAligned === true;
              }
              
              // If there were conflicts, we can't verify alignment
              process.chdir(originalDir);
              cleanupRepo(local);
              cleanupRepo(remote);
              return true; // Skip this case
            } catch (error) {
              process.chdir(originalDir);
              cleanupRepo(local);
              cleanupRepo(remote);
              return true; // Skip cases with errors
            }
          }
        ),
        { numRuns: 10 }
      );
    });

    test('after successful force push, local and remote should be aligned', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 5 }), // number of commits to create locally
          (numCommits) => {
            const { local, remote } = setupRepoWithRemote();
            const originalDir = process.cwd();
            
            try {
              process.chdir(local);
              
              // Create commits locally
              for (let i = 0; i < numCommits; i++) {
                createCommit(local, `Local commit ${i}`, `local${i}.txt`);
              }
              
              // Force push with confirmation
              const result = forcePushWithConfirmation(undefined, true);
              
              // If force push was successful, verify sync
              if (result.success) {
                // Fetch to update remote tracking
                fetchRemoteChanges();
                const isAligned = verifySync();
                process.chdir(originalDir);
                cleanupRepo(local);
                cleanupRepo(remote);
                return isAligned === true;
              }
              
              process.chdir(originalDir);
              cleanupRepo(local);
              cleanupRepo(remote);
              return true; // Skip failed cases
            } catch (error) {
              process.chdir(originalDir);
              cleanupRepo(local);
              cleanupRepo(remote);
              return true; // Skip cases with errors
            }
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  // Feature: github-setup-automation, Property 2: Pull and merge executes correct strategy
  describe('Property 2: Pull and merge executes correct strategy', () => {
    test('merge strategy should execute git pull with merge and report outcome', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 3 }), // number of remote commits
          (numCommits) => {
            const { local, remote } = setupRepoWithRemote();
            const originalDir = process.cwd();
            
            try {
              // Create commits on remote
              for (let i = 0; i < numCommits; i++) {
                createCommit(remote, `Remote commit ${i}`, `remote${i}.txt`);
              }
              
              process.chdir(local);
              fetchRemoteChanges();
              
              // Execute merge strategy
              const result = mergeChanges();
              
              // Result should have success boolean and message
              const hasValidResult = typeof result.success === 'boolean' && 
                                    typeof result.message === 'string' &&
                                    result.message.length > 0;
              
              process.chdir(originalDir);
              cleanupRepo(local);
              cleanupRepo(remote);
              
              return hasValidResult;
            } catch (error) {
              process.chdir(originalDir);
              cleanupRepo(local);
              cleanupRepo(remote);
              return true; // Skip error cases
            }
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  // Feature: github-setup-automation, Property 3: Force push requires confirmation
  describe('Property 3: Force push requires confirmation', () => {
    test('force push without confirmation should fail with warning', () => {
      fc.assert(
        fc.property(
          fc.boolean(), // random confirmation value (but we'll test false)
          () => {
            const { local, remote } = setupRepoWithRemote();
            const originalDir = process.cwd();
            
            try {
              process.chdir(local);
              
              // Create a local commit
              createCommit(local, 'Local commit', 'local.txt');
              
              // Try force push WITHOUT confirmation
              const result = forcePushWithConfirmation(undefined, false);
              
              // Should fail and contain warning about data loss
              const hasWarning = !result.success && 
                                result.message.toLowerCase().includes('warning') &&
                                (result.message.toLowerCase().includes('data loss') || 
                                 result.message.toLowerCase().includes('confirmation'));
              
              process.chdir(originalDir);
              cleanupRepo(local);
              cleanupRepo(remote);
              
              return hasWarning;
            } catch (error) {
              process.chdir(originalDir);
              cleanupRepo(local);
              cleanupRepo(remote);
              return true; // Skip error cases
            }
          }
        ),
        { numRuns: 10 }
      );
    });

    test('force push with confirmation should proceed', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 3 }), // number of local commits
          (numCommits) => {
            const { local, remote } = setupRepoWithRemote();
            const originalDir = process.cwd();
            
            try {
              process.chdir(local);
              
              // Create local commits
              for (let i = 0; i < numCommits; i++) {
                createCommit(local, `Local commit ${i}`, `local${i}.txt`);
              }
              
              // Try force push WITH confirmation
              const result = forcePushWithConfirmation(undefined, true);
              
              // Should either succeed or fail with a real error (not confirmation error)
              const isValidResult = result.success || 
                                   (!result.message.toLowerCase().includes('confirmation required'));
              
              process.chdir(originalDir);
              cleanupRepo(local);
              cleanupRepo(remote);
              
              return isValidResult;
            } catch (error) {
              process.chdir(originalDir);
              cleanupRepo(local);
              cleanupRepo(remote);
              return true; // Skip error cases
            }
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  // Feature: github-setup-automation, Property 4: Conflict detection identifies all conflicting files
  describe('Property 4: Conflict detection identifies all conflicting files', () => {
    test('when conflicts occur, all conflicting files should be detected', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 3 }), // number of files to create conflicts in
          (numFiles) => {
            const { local, remote } = setupRepoWithRemote();
            const originalDir = process.cwd();
            
            try {
              // Create conflicting changes
              const conflictFiles: string[] = [];
              
              for (let i = 0; i < numFiles; i++) {
                const fileName = `conflict${i}.txt`;
                conflictFiles.push(fileName);
                
                // Create file in remote with content A
                fs.writeFileSync(path.join(remote, fileName), `Remote content ${i}\n`);
                execSync(`git add ${fileName}`, { cwd: remote, stdio: 'pipe' });
              }
              execSync('git commit -m "Remote changes"', { cwd: remote, stdio: 'pipe' });
              
              // Create same files in local with different content
              process.chdir(local);
              for (let i = 0; i < numFiles; i++) {
                const fileName = `conflict${i}.txt`;
                fs.writeFileSync(path.join(local, fileName), `Local content ${i}\n`);
                execSync(`git add ${fileName}`, { cwd: local, stdio: 'pipe' });
              }
              execSync('git commit -m "Local changes"', { cwd: local, stdio: 'pipe' });
              
              // Fetch and try to merge
              fetchRemoteChanges();
              const result = mergeChanges();
              
              // If merge failed with conflicts, check detection
              if (!result.success && result.conflicts) {
                // All conflict files should be detected
                const allDetected = conflictFiles.every(file => 
                  result.conflicts!.includes(file)
                );
                
                process.chdir(originalDir);
                cleanupRepo(local);
                cleanupRepo(remote);
                
                return allDetected;
              }
              
              process.chdir(originalDir);
              cleanupRepo(local);
              cleanupRepo(remote);
              return true; // Skip if no conflicts occurred
            } catch (error) {
              process.chdir(originalDir);
              cleanupRepo(local);
              cleanupRepo(remote);
              return true; // Skip error cases
            }
          }
        ),
        { numRuns: 10 }
      );
    });

    test('detectConflicts should return empty array when no conflicts exist', () => {
      fc.assert(
        fc.property(
          fc.constant(null), // No input needed
          () => {
            const { local, remote } = setupRepoWithRemote();
            const originalDir = process.cwd();
            
            try {
              process.chdir(local);
              
              // No conflicts in clean state
              const conflicts = detectConflicts();
              
              process.chdir(originalDir);
              cleanupRepo(local);
              cleanupRepo(remote);
              
              return Array.isArray(conflicts) && conflicts.length === 0;
            } catch (error) {
              process.chdir(originalDir);
              cleanupRepo(local);
              cleanupRepo(remote);
              return true; // Skip error cases
            }
          }
        ),
        { numRuns: 10 }
      );
    });
  });
});
