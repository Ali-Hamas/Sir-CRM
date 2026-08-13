// Core module for application wide configurations (e.g., config service, database connection)
import { Global, Module } from '@nestjs/common';

@Global()
@Module({
  imports: [],
  providers: [],
  exports: [],
})
export class CoreModule {}
