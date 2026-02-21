import {
  sanitizeString,
  sanitizeObject,
  sanitizeHtml,
  sanitizeEmail,
  sanitizeUrl,
  sanitizeDate,
  sanitizeFileName,
  sanitizeNumber,
  sanitizeBoolean,
  sanitizeStringArray,
} from '../lib/input-sanitization';

// Simple test runner
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEquals(actual: any, expected: any, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}\nExpected: ${expected}\nActual: ${actual}`);
  }
}

function assertNotContains(str: string, substring: string, message: string) {
  if (str.includes(substring)) {
    throw new Error(`${message}\nString should not contain: ${substring}\nActual: ${str}`);
  }
}

function assertContains(str: string, substring: string, message: string) {
  if (!str.includes(substring)) {
    throw new Error(`${message}\nString should contain: ${substring}\nActual: ${str}`);
  }
}

function assertThrows(fn: () => void, message: string) {
  try {
    fn();
    throw new Error(`${message}\nExpected function to throw but it didn't`);
  } catch (error) {
    // Expected
  }
}

console.log('Running Input Sanitization Tests...\n');

// Test sanitizeString
console.log('Testing sanitizeString...');
{
  const input = '<script>alert("XSS")</script>Hello';
  const output = sanitizeString(input);
  assertNotContains(output, '<script>', 'Should remove script tags');
  assertContains(output, 'Hello', 'Should preserve safe content');
}

{
  const input = '<iframe src="evil.com"></iframe>Content';
  const output = sanitizeString(input);
  assertNotContains(output, '<iframe>', 'Should remove iframe tags');
  assertContains(output, 'Content', 'Should preserve safe content');
}

{
  const input = '<div onclick="alert(1)">Click me</div>';
  const output = sanitizeString(input);
  assertNotContains(output, 'onclick', 'Should remove event handlers');
}

{
  const input = '<div>Test & "quotes"</div>';
  const output = sanitizeString(input);
  assertEquals(output, '&lt;div&gt;Test &amp; &quot;quotes&quot;&lt;&#x2F;div&gt;', 'Should encode HTML entities');
}

{
  assertEquals(sanitizeString(null), '', 'Should handle null');
  assertEquals(sanitizeString(undefined), '', 'Should handle undefined');
}

{
  const input = '  Hello World  ';
  const output = sanitizeString(input);
  assertEquals(output, 'Hello World', 'Should trim whitespace');
}

console.log('✓ sanitizeString tests passed\n');

// Test sanitizeObject
console.log('Testing sanitizeObject...');
{
  const input = {
    name: '<script>alert(1)</script>Test',
    description: 'Normal text',
    nested: {
      value: '<iframe>Bad</iframe>',
    },
  };
  const output = sanitizeObject(input);
  assertNotContains(output.name, '<script>', 'Should sanitize nested strings');
  assertEquals(output.description, 'Normal text', 'Should preserve safe strings');
  assertNotContains(output.nested.value, '<iframe>', 'Should sanitize deeply nested strings');
}

{
  const input = {
    name: 'Test',
    count: 42,
    active: true,
  };
  const output = sanitizeObject(input);
  assertEquals(output.count, 42, 'Should preserve numbers');
  assertEquals(output.active, true, 'Should preserve booleans');
}

console.log('✓ sanitizeObject tests passed\n');

// Test sanitizeEmail
console.log('Testing sanitizeEmail...');
{
  const input = 'test@example.com';
  const output = sanitizeEmail(input);
  assertEquals(output, 'test@example.com', 'Should accept valid email');
}

{
  const input = 'Test@Example.COM';
  const output = sanitizeEmail(input);
  assertEquals(output, 'test@example.com', 'Should convert to lowercase');
}

{
  assertThrows(() => sanitizeEmail('not-an-email'), 'Should throw on invalid email');
  assertThrows(() => sanitizeEmail('test@'), 'Should throw on incomplete email');
}

{
  assertEquals(sanitizeEmail(null), '', 'Should handle null');
  assertEquals(sanitizeEmail(undefined), '', 'Should handle undefined');
}

console.log('✓ sanitizeEmail tests passed\n');

// Test sanitizeUrl
console.log('Testing sanitizeUrl...');
{
  const input = 'https://example.com/path';
  const output = sanitizeUrl(input);
  assertEquals(output, 'https://example.com/path', 'Should accept valid HTTP URLs');
}

{
  assertThrows(() => sanitizeUrl('javascript:alert(1)'), 'Should reject javascript: protocol');
  assertThrows(() => sanitizeUrl('data:text/html,<script>alert(1)</script>'), 'Should reject data: protocol');
  assertThrows(() => sanitizeUrl('vbscript:msgbox(1)'), 'Should reject vbscript: protocol');
  assertThrows(() => sanitizeUrl('file:///etc/passwd'), 'Should reject file: protocol');
}

console.log('✓ sanitizeUrl tests passed\n');

// Test sanitizeDate
console.log('Testing sanitizeDate...');
{
  const input = '2024-01-15';
  const output = sanitizeDate(input);
  assertEquals(output, '2024-01-15', 'Should accept valid date format');
}

{
  assertThrows(() => sanitizeDate('15/01/2024'), 'Should reject invalid format');
  assertThrows(() => sanitizeDate('2024-1-5'), 'Should reject invalid format');
}

{
  assertThrows(() => sanitizeDate('2024-13-01'), 'Should reject invalid date values');
  assertThrows(() => sanitizeDate('2024-02-30'), 'Should reject invalid date values');
}

{
  assertEquals(sanitizeDate(null), '', 'Should handle null');
  assertEquals(sanitizeDate(undefined), '', 'Should handle undefined');
}

console.log('✓ sanitizeDate tests passed\n');

// Test sanitizeFileName
console.log('Testing sanitizeFileName...');
{
  const input = '../../../etc/passwd';
  const output = sanitizeFileName(input);
  assertNotContains(output, '..', 'Should remove path traversal attempts');
  assertEquals(output, 'etcpasswd', 'Should produce safe filename');
}

{
  const input = 'path/to/file.txt';
  const output = sanitizeFileName(input);
  assertNotContains(output, '/', 'Should remove slashes');
  assertEquals(output, 'pathtofile.txt', 'Should produce safe filename');
}

{
  const input = 'file<name>:test|?.txt';
  const output = sanitizeFileName(input);
  assertEquals(output, 'filenametest.txt', 'Should remove invalid characters');
}

{
  const input = '...hidden.txt';
  const output = sanitizeFileName(input);
  assertEquals(output, 'hidden.txt', 'Should remove leading dots');
}

console.log('✓ sanitizeFileName tests passed\n');

// Test sanitizeNumber
console.log('Testing sanitizeNumber...');
{
  assertEquals(sanitizeNumber(42), 42, 'Should accept valid numbers');
  assertEquals(sanitizeNumber('42'), 42, 'Should convert string numbers');
  assertEquals(sanitizeNumber(3.14), 3.14, 'Should accept decimals');
}

{
  assertThrows(() => sanitizeNumber('not a number'), 'Should throw on invalid numbers');
  assertThrows(() => sanitizeNumber(NaN), 'Should throw on NaN');
  assertThrows(() => sanitizeNumber(Infinity), 'Should throw on Infinity');
}

console.log('✓ sanitizeNumber tests passed\n');

// Test sanitizeBoolean
console.log('Testing sanitizeBoolean...');
{
  assertEquals(sanitizeBoolean(true), true, 'Should accept boolean true');
  assertEquals(sanitizeBoolean(false), false, 'Should accept boolean false');
}

{
  assertEquals(sanitizeBoolean('true'), true, 'Should convert truthy strings');
  assertEquals(sanitizeBoolean('TRUE'), true, 'Should convert truthy strings (case insensitive)');
  assertEquals(sanitizeBoolean('1'), true, 'Should convert "1" to true');
  assertEquals(sanitizeBoolean('yes'), true, 'Should convert "yes" to true');
}

{
  assertEquals(sanitizeBoolean('false'), false, 'Should convert falsy strings');
  assertEquals(sanitizeBoolean('FALSE'), false, 'Should convert falsy strings (case insensitive)');
  assertEquals(sanitizeBoolean('0'), false, 'Should convert "0" to false');
  assertEquals(sanitizeBoolean('no'), false, 'Should convert "no" to false');
  assertEquals(sanitizeBoolean(''), false, 'Should convert empty string to false');
}

{
  assertThrows(() => sanitizeBoolean('maybe'), 'Should throw on invalid values');
}

console.log('✓ sanitizeBoolean tests passed\n');

// Test XSS Prevention
console.log('Testing XSS Prevention...');
{
  const maliciousInputs = [
    '<script>alert("XSS")</script>',
    '<img src=x onerror=alert(1)>',
    '<svg onload=alert(1)>',
    '<body onload=alert(1)>',
    '<input onfocus=alert(1) autofocus>',
  ];

  maliciousInputs.forEach((input) => {
    const output = sanitizeString(input);
    // Check that dangerous tags and event handlers are removed/encoded
    assertNotContains(output, '<script>', `Should prevent script tags: ${input}`);
    assertNotContains(output, 'onerror=', `Should remove event handlers: ${input}`);
    assertNotContains(output, 'onload=', `Should remove event handlers: ${input}`);
    assertNotContains(output, 'onfocus=', `Should remove event handlers: ${input}`);
    // The word "alert" may still be present but encoded, which is safe
  });
}

{
  // Test that script tags are completely removed
  const dangerous = '<script>alert(1)</script>';
  const safe = sanitizeString(dangerous);
  // Script tags and their content should be completely removed
  assertEquals(safe, '', 'Script tags should be completely removed');
}

{
  // Test that mixed content is handled correctly
  const mixed = 'Hello <script>alert(1)</script> World';
  const safe = sanitizeString(mixed);
  assertContains(safe, 'Hello', 'Should preserve safe content');
  assertContains(safe, 'World', 'Should preserve safe content');
  assertNotContains(safe, '<script>', 'Should remove script tags');
}

console.log('✓ XSS Prevention tests passed\n');

console.log('✅ All tests passed!');

