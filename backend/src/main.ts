import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.use(cookieParser());

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
  const isDev = process.env.NODE_ENV !== 'production';
  app.enableCors({
    origin: isDev
      ? [frontendUrl, 'http://127.0.0.1:3000', 'http://localhost:3000']
      : [frontendUrl],
    credentials: true,
  });

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`Backend running on http://localhost:${port}/api`);
}

bootstrap().catch(console.error);
