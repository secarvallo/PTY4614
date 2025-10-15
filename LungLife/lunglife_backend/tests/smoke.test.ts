/**
 * Simple smoke test to verify Jest configuration
 * This test verifies the basic testing setup is working
 */

describe('Jest Configuration', () => {
  it('should be configured correctly', () => {
    expect(true).toBe(true);
  });

  it('should handle basic calculations', () => {
    const result = 2 + 2;
    expect(result).toBe(4);
  });

  it('should handle async operations', async () => {
    const promise = Promise.resolve('test');
    const result = await promise;
    expect(result).toBe('test');
  });
});