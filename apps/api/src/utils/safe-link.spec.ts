import { isSafeLink } from './safe-link';

describe('isSafeLink', () => {
  it.each([
    '/relationships/3f0c2a1e-0000-4000-8000-000000000001',
    '/profile',
    '/search?sport=tennis&level=2#results',
    '/',
  ])('accepts the in-app path %s', (link) => {
    expect(isSafeLink(link)).toBe(true);
  });

  it.each([
    '',
    'relationships/1',
    '//evil.example',
    'https://evil.example',
    'http://evil.example/path',
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    '/\\evil.example',
    '/path with space',
    '/path"onmouseover="alert(1)',
    '/<script>',
  ])('rejects %j', (link) => {
    expect(isSafeLink(link)).toBe(false);
  });

  it('rejects absurdly long links', () => {
    expect(isSafeLink(`/${'a'.repeat(3000)}`)).toBe(false);
  });
});
