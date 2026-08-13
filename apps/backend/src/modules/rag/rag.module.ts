import { Module } from '@nestjs/common';
import { RAGController } from './rag.controller';
import { IndexerService } from './indexer.service';
import { ChunkingService } from './chunking.service';
import { EmbeddingService } from './embedding.service';
import { RetrieverService } from './retriever.service';
import { RankingService } from './ranking.service';
import { ContextBuilderService } from './context-builder.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { ActivityModule } from '../activity/activity.module';

@Module({
  imports: [NotificationsModule, ActivityModule],
  controllers: [RAGController],
  providers: [
    IndexerService,
    ChunkingService,
    EmbeddingService,
    RetrieverService,
    RankingService,
    ContextBuilderService,
  ],
  exports: [
    IndexerService,
    ChunkingService,
    EmbeddingService,
    RetrieverService,
    RankingService,
    ContextBuilderService,
  ],
})
export class RAGModule {}
