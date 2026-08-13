import { Injectable, NotFoundException } from '@nestjs/common';
import { KnowledgeService } from '../../knowledge/knowledge.service';

@Injectable()
export class KnowledgeExecutionService {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  async executeKnowledgeTool(toolKey: string, orgId: string, userId: string, params: Record<string, any>) {
    switch (toolKey) {
      case 'knowledge_search_articles': {
        const articles = await this.knowledgeService.findArticles(orgId, {
          search: params.query,
          categoryId: params.categoryId,
        });
        return {
          totalFound: (articles as any)?.items?.length || (articles as any)?.length || 0,
          articles: (articles as any)?.items || articles || [],
          summary: `Searched knowledge base for "${params.query}" and found ${((articles as any)?.items || articles || []).length} results`,
        };
      }

      case 'knowledge_create_article': {
        const article = await this.knowledgeService.createArticle(orgId, userId, {
          title: params.title,
          content: params.content,
          categoryId: params.categoryId,
          summary: params.summary,
          status: params.status || 'PUBLISHED',
        });
        return {
          articleId: article.id,
          title: article.title,
          slug: article.slug,
          summary: `Published article "${article.title}" in knowledge base (ID: ${article.id})`,
        };
      }

      default:
        throw new NotFoundException(`Knowledge tool handler '${toolKey}' not found`);
    }
  }
}
