import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IndexerService } from './indexer.service';
import { RetrieverService } from './retriever.service';
import { ContextBuilderService } from './context-builder.service';
import { IndexRAGDto } from './dto/index-rag.dto';
import { SearchRAGDto } from './dto/search-rag.dto';
import { BuildContextDto } from './dto/build-context.dto';
import { UpdateRAGSettingsDto } from './dto/update-rag-settings.dto';

@UseGuards(JwtAuthGuard)
@Controller('organizations/:orgId/rag')
export class RAGController {
  constructor(
    private readonly indexerService: IndexerService,
    private readonly retrieverService: RetrieverService,
    private readonly contextBuilderService: ContextBuilderService,
  ) {}

  @Get('stats')
  getStats(@Param('orgId') orgId: string) {
    return this.indexerService.getIndexStats(orgId);
  }

  @Post('index')
  triggerIndexing(
    @Param('orgId') orgId: string,
    @Body() dto: IndexRAGDto,
  ) {
    return this.indexerService.triggerIndexingPass(orgId, dto.sourceTypes);
  }

  @Post('search')
  search(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Body() dto: SearchRAGDto,
  ) {
    return this.retrieverService.search(
      orgId,
      req.user.id,
      dto.query,
      dto.searchType,
      dto.sourceFilters,
      dto.topK,
    );
  }

  @Post('context')
  buildContext(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Body() dto: BuildContextDto,
  ) {
    return this.contextBuilderService.buildContextPayload(
      orgId,
      req.user.id,
      dto.query,
      dto.sources,
      dto.maxTokenLimit,
    );
  }

  @Patch('settings')
  updateSettings(
    @Param('orgId') orgId: string,
    @Body() dto: UpdateRAGSettingsDto,
  ) {
    return this.indexerService.updateSettings(orgId, dto);
  }
}
