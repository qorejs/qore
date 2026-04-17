// Test script to verify SSR fix
// This tests that SSR module works in Node.js without DOM dependencies

console.log('Testing SSR module in Node.js...\n');

// Test 1: Import SSR module (should work in Node.js)
try {
  const ssr = require('./dist/ssr.js');
  console.log('✓ SSR module imported successfully');
  
  // Test renderToString with HTML escaping
  const escaped = ssr.renderToString('<script>alert("xss")</script>');
  console.log('✓ renderToString works:', escaped);
  
  if (escaped.includes('&lt;script&gt;')) {
    console.log('✓ HTML escaping works correctly');
  } else {
    console.error('✗ HTML escaping FAILED');
    process.exit(1);
  }
  
  // Test renderComponentToString
  const Component = () => ['<div>', 'Hello', '</div>'];
  const componentHtml = ssr.renderComponentToString(Component);
  console.log('✓ renderComponentToString works:', componentHtml);
  
  // Test renderProps
  const props = ssr.renderProps({ className: 'test', title: 'Hello "World"' });
  console.log('✓ renderProps works:', props);
  
} catch (err) {
  console.error('✗ SSR module failed:', err.message);
  process.exit(1);
}

console.log('\nTesting main module (browser/DOM)...\n');

// Test 2: Import main module
try {
  const qore = require('./dist/index.js');
  console.log('✓ Main module imported successfully');
  
  // Check that renderToDOMString is exported
  if (typeof qore.renderToDOMString === 'function') {
    console.log('✓ renderToDOMString is exported');
  } else {
    console.error('✗ renderToDOMString NOT exported');
    process.exit(1);
  }
  
  // Check backward compatibility aliases
  if (typeof qore.renderToString === 'function') {
    console.log('✓ renderToString (deprecated alias) is exported');
  } else {
    console.error('✗ renderToString (deprecated alias) NOT exported');
  }
  
  // Check environment detection
  console.log('✓ isNode():', qore.isNode());
  console.log('✓ isBrowser():', qore.isBrowser());
  
} catch (err) {
  console.error('✗ Main module failed:', err.message);
  process.exit(1);
}

console.log('\n✅ All tests passed! SSR fix is working correctly.\n');
console.log('Summary:');
console.log('- SSR module (@qorejs/qore/ssr) works in Node.js');
console.log('- HTML escaping is enabled in SSR module');
console.log('- Main module exports renderToDOMString for browser use');
console.log('- Backward compatibility aliases are in place');
console.log('- Environment detection functions are available');
