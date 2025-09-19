import { TestBed } from '@angular/core/testing';
import { LoggerService, LogLevel, ConsoleLoggerOutput } from './logger.service';

describe('LoggerService', () => {
  let service: LoggerService;
  let consoleOutput: ConsoleLoggerOutput;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        LoggerService,
        ConsoleLoggerOutput
      ]
    });

    service = TestBed.inject(LoggerService);
    consoleOutput = TestBed.inject(ConsoleLoggerOutput);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should set minimum log level', () => {
    service.setMinLevel(LogLevel.ERROR);
    // Test that debug messages are filtered out
    spyOn(consoleOutput, 'write');
    service.debug('Debug message');
    expect(consoleOutput.write).not.toHaveBeenCalled();
  });

  it('should set context', () => {
    const testContext = 'TestContext';
    service.setContext(testContext);

    spyOn(consoleOutput, 'write');
    service.info('Test message');

    expect(consoleOutput.write).toHaveBeenCalled();
    const callArgs = (consoleOutput.write as jasmine.Spy).calls.argsFor(0)[0];
    expect(callArgs.context).toBe(testContext);
  });

  it('should create child logger with context', () => {
    const childContext = 'ChildContext';
    const childLogger = service.createChild(childContext);

    expect(childLogger).toBeTruthy();
    expect(childLogger).not.toBe(service);
  });

  it('should log debug messages', () => {
    spyOn(consoleOutput, 'write');
    service.debug('Debug message', { key: 'value' });

    expect(consoleOutput.write).toHaveBeenCalled();
    const callArgs = (consoleOutput.write as jasmine.Spy).calls.argsFor(0)[0];
    expect(callArgs.level).toBe(LogLevel.DEBUG);
    expect(callArgs.message).toBe('Debug message');
    expect(callArgs.data).toEqual({ key: 'value' });
  });

  it('should log info messages', () => {
    spyOn(consoleOutput, 'write');
    service.info('Info message');

    expect(consoleOutput.write).toHaveBeenCalled();
    const callArgs = (consoleOutput.write as jasmine.Spy).calls.argsFor(0)[0];
    expect(callArgs.level).toBe(LogLevel.INFO);
  });

  it('should log warning messages', () => {
    spyOn(consoleOutput, 'write');
    service.warn('Warning message');

    expect(consoleOutput.write).toHaveBeenCalled();
    const callArgs = (consoleOutput.write as jasmine.Spy).calls.argsFor(0)[0];
    expect(callArgs.level).toBe(LogLevel.WARN);
  });

  it('should log error messages', () => {
    spyOn(consoleOutput, 'write');
    const testError = new Error('Test error');
    service.error('Error message', testError);

    expect(consoleOutput.write).toHaveBeenCalled();
    const callArgs = (consoleOutput.write as jasmine.Spy).calls.argsFor(0)[0];
    expect(callArgs.level).toBe(LogLevel.ERROR);
  });

  it('should log fatal messages', () => {
    spyOn(consoleOutput, 'write');
    service.fatal('Fatal message');

    expect(consoleOutput.write).toHaveBeenCalled();
    const callArgs = (consoleOutput.write as jasmine.Spy).calls.argsFor(0)[0];
    expect(callArgs.level).toBe(LogLevel.FATAL);
  });

  it('should log timing information', () => {
    spyOn(consoleOutput, 'write');
    service.timing('TestOperation', 150);

    expect(consoleOutput.write).toHaveBeenCalled();
    const callArgs = (consoleOutput.write as jasmine.Spy).calls.argsFor(0)[0];
    expect(callArgs.message).toContain('TestOperation');
    expect(callArgs.message).toContain('150ms');
  });

  it('should log user actions', () => {
    spyOn(consoleOutput, 'write');
    service.userAction('ButtonClick', { buttonId: 'submit' });

    expect(consoleOutput.write).toHaveBeenCalled();
    const callArgs = (consoleOutput.write as jasmine.Spy).calls.argsFor(0)[0];
    expect(callArgs.message).toContain('User Action: ButtonClick');
  });

  it('should log API requests', () => {
    spyOn(consoleOutput, 'write');
    service.apiRequest('GET', '/api/users', 200);

    expect(consoleOutput.write).toHaveBeenCalled();
    const callArgs = (consoleOutput.write as jasmine.Spy).calls.argsFor(0)[0];
    expect(callArgs.message).toContain('GET');
    expect(callArgs.message).toContain('/api/users');
    expect(callArgs.message).toContain('200ms');
  });

  it('should log authentication events', () => {
    spyOn(consoleOutput, 'write');
    service.authEvent('LoginSuccess', { userId: '123' });

    expect(consoleOutput.write).toHaveBeenCalled();
    const callArgs = (consoleOutput.write as jasmine.Spy).calls.argsFor(0)[0];
    expect(callArgs.message).toContain('Auth: LoginSuccess');
  });

  it('should add and remove logger outputs', () => {
    const mockOutput = jasmine.createSpyObj('LoggerOutput', ['write']);

    service.addOutput(mockOutput);
    service.info('Test message');
    expect(mockOutput.write).toHaveBeenCalled();

    service.removeOutput(mockOutput);
    mockOutput.write.calls.reset();
    service.info('Test message 2');
    expect(mockOutput.write).not.toHaveBeenCalled();
  });

  it('should handle logger output errors gracefully', () => {
    const errorOutput = {
      write: () => {
        throw new Error('Output error');
      }
    };

    service.addOutput(errorOutput);

    // Should not throw error
    expect(() => {
      service.info('Test message');
    }).not.toThrow();
  });
});