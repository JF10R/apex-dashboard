// Debug script to test RecentProfiles component imports
const fs = require('fs');
const path = require('path');

// Check if the component file exists
const componentPath = path.join(__dirname, 'src', 'components', 'recent-profiles.tsx');
console.log('Component file exists:', fs.existsSync(componentPath));

// Check UI component files
const buttonPath = path.join(__dirname, 'src', 'components', 'ui', 'button.tsx');
const cardPath = path.join(__dirname, 'src', 'components', 'ui', 'card.tsx');
console.log('Button component exists:', fs.existsSync(buttonPath));
console.log('Card component exists:', fs.existsSync(cardPath));

// Check hook file
const hookPath = path.join(__dirname, 'src', 'hooks', 'use-recent-profiles.ts');
console.log('Hook file exists:', fs.existsSync(hookPath));

// Check utils file
const utilsPath = path.join(__dirname, 'src', 'lib', 'utils.ts');
console.log('Utils file exists:', fs.existsSync(utilsPath));

// Try to import the component (this will fail if there are import issues)
try {
  const RecentProfiles = require('./src/components/recent-profiles.tsx');
  console.log('Component imported successfully:', typeof RecentProfiles);
} catch (error) {
  console.log('Component import failed:', error.message);
}
