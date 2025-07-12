// Test Category Detection Enhancement
import { getCategoryFromSeriesName } from '../src/lib/iracing-data-transform';

console.log('🏁 Testing Enhanced Category Detection');
console.log('=' .repeat(50));

const testCases = [
  // Oval series that should be detected
  { series: 'NASCAR Cup Series', expected: 'Oval' },
  { series: 'NASCAR Xfinity Series', expected: 'Oval' },
  { series: 'IndyCar Series', expected: 'Oval' },
  { series: 'ARCA Menards Series', expected: 'Oval' },
  { series: 'Short Track Racing', expected: 'Oval' },
  { series: 'Superspeedway Series', expected: 'Oval' },
  { series: 'Winston Cup Series', expected: 'Oval' },
  { series: 'Sprint Cup Series', expected: 'Oval' },
  { series: 'Monster Energy NASCAR', expected: 'Oval' },
  
  // Dirt Oval series
  { series: 'World of Outlaws Sprint Car Series', expected: 'Dirt Oval' },
  { series: 'Lucas Oil Late Model Dirt Series', expected: 'Dirt Oval' },
  { series: 'Sprint Car Series', expected: 'Dirt Oval' },
  { series: 'Super Late Model Series', expected: 'Dirt Oval' },
  { series: 'Modified Series', expected: 'Dirt Oval' },
  { series: 'Street Stock Series', expected: 'Dirt Oval' },
  
  // Formula series
  { series: 'Formula Vee', expected: 'Formula Car' },
  { series: 'Skip Barber Formula 2000', expected: 'Formula Car' },
  { series: 'Formula Renault 2.0', expected: 'Formula Car' },
  
  // Sports Car series (should not match other categories)
  { series: 'Porsche Cup Series', expected: 'Sports Car' },
  { series: 'IMSA GT3 Challenge', expected: 'Sports Car' },
  { series: 'GT3 Championship', expected: 'Sports Car' },
  { series: 'BMW M4 GT3', expected: 'Sports Car' },
];

let passed = 0;
let failed = 0;

testCases.forEach(({ series, expected }) => {
  const result = getCategoryFromSeriesName(series);
  const success = result === expected;
  
  if (success) {
    console.log(`✅ "${series}" → "${result}"`);
    passed++;
  } else {
    console.log(`❌ "${series}" → "${result}" (expected "${expected}")`);
    failed++;
  }
});

console.log('\n📊 Test Results:');
console.log('=' .repeat(30));
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);

if (failed === 0) {
  console.log('\n🎉 All category detection tests passed!');
  console.log('The enhanced category detection should now properly categorize:');
  console.log('• NASCAR and IndyCar series as Oval');
  console.log('• Sprint car and late model series as Dirt Oval'); 
  console.log('• Formula series as Formula Car');
  console.log('• Other series as Sports Car by default');
} else {
  console.log('\n⚠️  Some tests failed - category detection may need adjustment');
}
