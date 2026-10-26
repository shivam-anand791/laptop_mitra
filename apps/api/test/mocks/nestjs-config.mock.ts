export class ConfigService {
  get<T = any>(key: string, defaultValue?: T): T | undefined {
    return (process.env[key] as unknown as T) ?? defaultValue;
  }
}

export class ConfigModule {
  static forRoot() {
    return { module: ConfigModule };
  }
}
