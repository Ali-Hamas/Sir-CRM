import { Controller, Get, Delete, Query, Param, UseGuards, Req } from '@nestjs/common';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('organizations/:orgId/search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  globalSearch(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Query('q') query: string,
    @Query('modules') modules?: string,
    @Query('limit') limit?: string,
  ) {
    const modulesFilter = modules ? modules.split(',').map((m) => m.trim().toLowerCase()) : undefined;
    const limitNum = limit ? parseInt(limit, 10) : 5;
    return this.searchService.globalSearch(orgId, req.user.id, query, modulesFilter, limitNum);
  }

  @Get('recent')
  getRecentSearches(@Req() req: any, @Param('orgId') orgId: string) {
    return this.searchService.getRecentSearches(orgId, req.user.id);
  }

  @Delete('recent')
  clearRecentSearches(@Req() req: any, @Param('orgId') orgId: string) {
    return this.searchService.clearRecentSearches(orgId, req.user.id);
  }
}
