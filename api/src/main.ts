import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { WinstonLogger } from './common/logger';

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        logger: WinstonLogger,
    });

    // Enable CORS
    app.enableCors({
        origin: true,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id', 'X-User-Email', 'X-User-Rank', 'X-Frontend-Source'],
    });

    // Global validation pipe
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            transform: true,
            forbidNonWhitelisted: true,
        }),
    );

    const port = process.env.PORT || 8080;
    await app.listen(port);
    console.log(`Nova ID API is running on: http://0.0.0.0:${port}`);
}

bootstrap();
