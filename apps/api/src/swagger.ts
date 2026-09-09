import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { AppConfig } from './config/configuration';

/**
 * Publishes the OpenAPI document at `/docs`.
 *
 * Enabled by `SWAGGER_ENABLED`, which production deployments turn off so the schema is not part
 * of the public attack surface.
 */
export function setupSwagger(app: INestApplication, config: AppConfig): void {
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Majawar X Network Platform API')
      .setDescription(
        [
          'REST API behind the Majawar X Network website, customer portal and admin console.',
          '',
          'Every response uses a fixed envelope: `{ success, data, message }` on success and',
          '`{ success: false, error: { code, message, details } }` on failure. Clients should',
          'branch on `error.code` rather than the message text.',
          '',
          'Authentication uses a short-lived bearer access token plus a rotating refresh token',
          'held in an HTTP-only cookie. Call `POST /auth/refresh` to renew.',
        ].join('\n'),
      )
      .setVersion('1.0.0')
      .addServer(`${config.http.url}/${config.http.globalPrefix}`, 'Current environment')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
        'bearer',
      )
      .addCookieAuth('sf_refresh', { type: 'apiKey', in: 'cookie' }, 'refresh')
      .addTag('Auth', 'Registration, sign-in, OTP and session management')
      .addTag('Coverage', 'Cities, areas and serviceability checks')
      .addTag('Catalog', 'Plans, products, add-ons and promotions')
      .addTag('Applications', 'New connection applications')
      .addTag('Subscriptions', 'Active services and change requests')
      .addTag('Billing', 'Invoices, payments and refunds')
      .addTag('Support', 'Tickets, FAQs and callback requests')
      .addTag('Content', 'CMS-driven pages, sections and settings')
      .addTag('Notifications', 'In-app notification feed')
      .addTag('Admin', 'Staff-only management endpoints')
      .addTag('Health', 'Liveness and readiness probes')
      .build(),
    { operationIdFactory: (_controller, method) => method },
  );

  SwaggerModule.setup('docs', app, document, {
    jsonDocumentUrl: 'docs/openapi.json',
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
      docExpansion: 'none',
    },
    customSiteTitle: 'Majawar X Network API'
  });
}
