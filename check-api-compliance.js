#!/usr/bin/env node

/**
 * Pre-commit check to ensure OpenAI Responses API compliance
 * Prevents chat.completions usage as per migration requirements
 */

import { execSync } from 'child_process';
import { exit } from 'process';

console.log('🔍 Checking OpenAI API compliance...');

try {
  // Check for any chat.completions usage in the codebase
  const result = execSync('grep -r "chat\\.completions" --include="*.ts" --include="*.js" server/ client/ shared/ || true', { 
    encoding: 'utf8' 
  });
  
  // Filter out comments and documentation
  const violations = result
    .split('\n')
    .filter(line => line.trim())
    .filter(line => !line.includes('//'))
    .filter(line => !line.includes('*'))
    .filter(line => !line.includes('Reference:'))
    .filter(line => !line.includes('instead of chat.completions'));
  
  if (violations.length > 0) {
    console.error('❌ COMPLIANCE FAILURE: Found chat.completions usage!');
    console.error('');
    console.error('The following lines violate the Responses API requirement:');
    violations.forEach(violation => {
      console.error(`  ${violation}`);
    });
    console.error('');
    console.error('All OpenAI calls must use responses.create or responses.stream exclusively.');
    console.error('Reference: https://platform.openai.com/docs/api-reference/responses');
    exit(1);
  }
  
  console.log('✅ API compliance check passed - no chat.completions usage found');
  
  // Additional check: ensure we're using responses.create/stream
  const responsesUsage = execSync('grep -r "responses\\." --include="*.ts" --include="*.js" server/ || true', { 
    encoding: 'utf8' 
  });
  
  if (responsesUsage.trim()) {
    console.log('✅ Found proper Responses API usage');
  } else {
    console.warn('⚠️  Warning: No responses.create or responses.stream usage found');
  }
  
} catch (error) {
  console.error('❌ Error during compliance check:', error.message);
  exit(1);
}