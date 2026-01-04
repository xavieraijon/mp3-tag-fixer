import { Global, Module } from '@nestjs/common';
import { StringUtilsService } from './string-utils/string-utils.service';

/**
 * Shared module containing common utilities used across the application.
 * Marked as @Global so it doesn't need to be imported in every module.
 *
 * Exports:
 * - StringUtilsService: Injectable string manipulation utilities
 *
 * Static exports (use direct imports):
 * - StringUtils: Static class for pure functions
 * - FilenameParser: Static class for filename parsing
 * - SearchStrategy: Interface for search strategies
 */
@Global()
@Module({
  providers: [StringUtilsService],
  exports: [StringUtilsService],
})
export class SharedModule {}
