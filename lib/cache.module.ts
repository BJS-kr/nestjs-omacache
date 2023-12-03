import { Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { CacheService } from './cache.service';

@Module({
  imports: [DiscoveryModule],
  providers: [CacheService],
})
export class CacheModule {}
