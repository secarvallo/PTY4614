/**
 * 🏗️ Dependency Injection Container
 * Lightweight IoC container for dependency management
 */

export interface Constructor<T = any> {
  new (...args: any[]): T;
}

export interface Factory<T = any> {
  (): T;
}

export type DependencyToken = string | symbol | Constructor;

export class Container {
  private static instance: Container;
  private dependencies = new Map<DependencyToken, any>();
  private factories = new Map<DependencyToken, Factory>();
  private singletons = new Map<DependencyToken, any>();

  static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container();
    }
    return Container.instance;
  }

  /**
   * Register a class constructor
   */
  register<T>(token: DependencyToken, constructor: Constructor<T>): void {
    this.dependencies.set(token, constructor);
  }

  /**
   * Register a factory function
   */
  registerFactory<T>(token: DependencyToken, factory: Factory<T>): void {
    this.factories.set(token, factory);
  }

  /**
   * Register a singleton instance
   */
  registerSingleton<T>(token: DependencyToken, instance: T): void {
    this.singletons.set(token, instance);
  }

  /**
   * Resolve a dependency
   */
  resolve<T>(token: DependencyToken): T {
    // Check singletons first
    if (this.singletons.has(token)) {
      return this.singletons.get(token);
    }

    // Check factories
    if (this.factories.has(token)) {
      const factory = this.factories.get(token)!;
      const instance = factory();
      return instance;
    }

    // Check constructors
    if (this.dependencies.has(token)) {
      const Constructor = this.dependencies.get(token);
      const instance = new Constructor();
      return instance;
    }

    throw new Error(`Dependency not found: ${token.toString()}`);
  }

  /**
   * Clear all registrations (useful for testing)
   */
  clear(): void {
    this.dependencies.clear();
    this.factories.clear();
    this.singletons.clear();
  }
}

// Global container instance
export const container = Container.getInstance();

// Helper decorators
export function Injectable(token?: DependencyToken) {
  return function <T extends Constructor>(constructor: T) {
    const injectionToken = token || constructor;
    container.register(injectionToken, constructor);
    return constructor;
  };
}

export function Inject(token: DependencyToken) {
  return function (target: any, propertyKey: string) {
    Object.defineProperty(target, propertyKey, {
      get() {
        return container.resolve(token);
      },
      enumerable: true,
      configurable: true
    });
  };
}