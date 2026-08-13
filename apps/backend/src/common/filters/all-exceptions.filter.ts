import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : exception?.message || 'Internal server error';

    this.logger.error(
      `[${request.method}] ${request.url} - Status ${status} - ${JSON.stringify(message)}`,
      exception?.stack,
    );

    if (response.headersSent) {
      return;
    }

    let errorMessage: string;
    if (typeof message === 'string') {
      errorMessage = message;
    } else if (message && typeof message === 'object') {
      if (Array.isArray((message as any).message)) {
        errorMessage = (message as any).message.join(', ');
      } else if (typeof (message as any).message === 'string') {
        errorMessage = (message as any).message;
      } else {
        errorMessage = JSON.stringify(message);
      }
    } else {
      errorMessage = 'Internal server error';
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: errorMessage,
    });
  }
}
