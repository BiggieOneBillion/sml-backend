import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import * as compression from 'compression';
import * as cookieParser from 'cookie-parser';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AppConfigService } from './config/app-config.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));
  app.flushLogs();

  const config = app.get(AppConfigService);

  // ── Security ───────────────────────────────────────────────────────────
  app.use(helmet({ contentSecurityPolicy: config.isProduction }));
  app.use(compression());
  app.use(cookieParser(config.security.cookieSecret));

  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', 1);

  // ── CORS ───────────────────────────────────────────────────────────────
  app.enableCors({
    origin: config.isProduction ? [config.frontendUrl] : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    exposedHeaders: ['X-Request-ID'],
  });

  // ── Global prefix ──────────────────────────────────────────────────────
  app.setGlobalPrefix(`api/${config.apiVersion}`, {
    exclude: ['/health', '/ready'],
  });

  // ── Swagger (dev/staging only) ─────────────────────────────────────────
  if (!config.isProduction) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle(config.appName)
      .setDescription('SML Stock Market API — Where Ideas Meet Investors')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('Authentication')
      .addTag('Users')
      .addTag('Ideas')
      .addTag('Investments')
      .addTag('Feed')
      .addTag('Admin')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });

    console.info(`📖 Swagger: http://localhost:${config.port}/api/docs`);
  }

  // ── Health endpoints ───────────────────────────────────────────────────
  expressApp.get('/health', (_req: unknown, res: any) =>
    res.json({ status: 'ok', timestamp: new Date().toISOString() }),
  );
  expressApp.get('/ready', (_req: unknown, res: any) =>
    res.json({ status: 'ready', timestamp: new Date().toISOString() }),
  );

  app.enableShutdownHooks();

  await app.listen(config.port);
  console.info(
    `🚀 ${config.appName} → http://localhost:${config.port}/api/${config.apiVersion}`,
  );
}

bootstrap().catch((err) => {
  console.error('Bootstrap failed:', err);
  process.exit(1);
});
