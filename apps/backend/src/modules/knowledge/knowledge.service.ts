import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';
import { NotificationsService } from '../notifications/notifications.service';
import { StorageService } from '../documents/storage.service';
import { WorkflowsExecutionService } from '../workflows/workflows-execution.service';
import { CreateKnowledgeCategoryDto } from './dtos/create-knowledge-category.dto';
import { UpdateKnowledgeCategoryDto } from './dtos/update-knowledge-category.dto';
import { CreateKnowledgeArticleDto } from './dtos/create-knowledge-article.dto';
import { UpdateKnowledgeArticleDto } from './dtos/update-knowledge-article.dto';
import { QueryKnowledgeArticleDto } from './dtos/query-knowledge-article.dto';

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

@Injectable()
export class KnowledgeService {
  constructor(
    private prisma: PrismaService,
    private activityService: ActivityService,
    private notificationsService: NotificationsService,
    private storageService: StorageService,
    private workflowsExecutionService: WorkflowsExecutionService,
  ) {}

  // ===================================
  // CATEGORIES
  // ===================================

  async createCategory(orgId: string, userId: string, data: CreateKnowledgeCategoryDto) {
    const slug = data.slug ? generateSlug(data.slug) : generateSlug(data.name);

    const existing = await (this.prisma as any).knowledgeCategory.findFirst({
      where: { organizationId: orgId, slug, isDeleted: false },
    });
    if (existing) {
      throw new ConflictException(`Category with slug "${slug}" already exists in this organization`);
    }

    const category = await (this.prisma as any).knowledgeCategory.create({
      data: {
        organizationId: orgId,
        name: data.name,
        slug,
        description: data.description,
        icon: data.icon || 'Folder',
        color: data.color || '#3b82f6',
      },
    });

    await this.activityService.logActivity({
      userId,
      organizationId: orgId,
      action: 'KNOWLEDGE_CATEGORY_CREATED',
      module: 'KNOWLEDGE',
      entityType: 'KNOWLEDGE_CATEGORY',
      entityId: category.id,
      metadata: { name: category.name, slug: category.slug },
    });

    return category;
  }

  async findCategories(orgId: string) {
    return (this.prisma as any).knowledgeCategory.findMany({
      where: { organizationId: orgId, isDeleted: false },
      include: {
        _count: {
          select: { articles: { where: { isDeleted: false } } },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async updateCategory(orgId: string, id: string, userId: string, data: UpdateKnowledgeCategoryDto) {
    const category = await (this.prisma as any).knowledgeCategory.findFirst({
      where: { id, organizationId: orgId, isDeleted: false },
    });
    if (!category) {
      throw new NotFoundException('Knowledge category not found');
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.slug !== undefined) updateData.slug = generateSlug(data.slug);
    else if (data.name !== undefined) updateData.slug = generateSlug(data.name);
    if (data.description !== undefined) updateData.description = data.description;
    if (data.icon !== undefined) updateData.icon = data.icon;
    if (data.color !== undefined) updateData.color = data.color;

    const updated = await (this.prisma as any).knowledgeCategory.update({
      where: { id },
      data: updateData,
    });

    await this.activityService.logActivity({
      userId,
      organizationId: orgId,
      action: 'KNOWLEDGE_CATEGORY_UPDATED',
      module: 'KNOWLEDGE',
      entityType: 'KNOWLEDGE_CATEGORY',
      entityId: updated.id,
      metadata: { name: updated.name },
    });

    return updated;
  }

  async deleteCategory(orgId: string, id: string, userId: string) {
    const category = await (this.prisma as any).knowledgeCategory.findFirst({
      where: { id, organizationId: orgId, isDeleted: false },
    });
    if (!category) {
      throw new NotFoundException('Knowledge category not found');
    }

    const deleted = await (this.prisma as any).knowledgeCategory.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    await this.activityService.logActivity({
      userId,
      organizationId: orgId,
      action: 'KNOWLEDGE_CATEGORY_DELETED',
      module: 'KNOWLEDGE',
      entityType: 'KNOWLEDGE_CATEGORY',
      entityId: deleted.id,
    });

    return deleted;
  }

  // ===================================
  // ARTICLES
  // ===================================

  async createArticle(orgId: string, authorId: string, data: CreateKnowledgeArticleDto) {
    let slug = data.slug ? generateSlug(data.slug) : generateSlug(data.title);
    if (!slug) slug = `article-${Date.now()}`;

    const existing = await (this.prisma as any).knowledgeArticle.findFirst({
      where: { organizationId: orgId, slug, isDeleted: false },
    });
    if (existing) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    const article = await (this.prisma as any).knowledgeArticle.create({
      data: {
        organizationId: orgId,
        authorId,
        title: data.title,
        slug,
        summary: data.summary,
        content: data.content,
        status: data.status || 'DRAFT',
        visibility: data.visibility || 'ORGANIZATION',
        categoryId: data.categoryId || null,
        featuredImageUrl: data.featuredImageUrl || null,
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, profilePictureUrl: true, email: true } },
        category: { select: { id: true, name: true, slug: true, icon: true, color: true } },
      },
    });

    // Create Initial Revision #1
    await (this.prisma as any).knowledgeRevision.create({
      data: {
        articleId: article.id,
        revisionNum: 1,
        title: article.title,
        content: article.content,
        summary: article.summary,
        changeSummary: 'Initial article creation',
        updatedById: authorId,
      },
    });

    await this.activityService.logActivity({
      userId: authorId,
      organizationId: orgId,
      action: 'KNOWLEDGE_ARTICLE_CREATED',
      module: 'KNOWLEDGE',
      entityType: 'KNOWLEDGE_ARTICLE',
      entityId: article.id,
      metadata: { title: article.title, status: article.status },
    });

    if (article.status === 'PUBLISHED') {
      this.workflowsExecutionService.handleTrigger({
        type: 'KNOWLEDGE_ARTICLE_PUBLISHED',
        organizationId: orgId,
        userId: authorId,
        entityType: 'KNOWLEDGE_ARTICLE',
        entityId: article.id,
        entityData: article,
      }).catch(() => null);
    }

    return article;
  }

  async findArticles(orgId: string, query: QueryKnowledgeArticleDto, currentUserId?: string) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: any = { organizationId: orgId, isDeleted: false };

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.visibility) {
      where.visibility = query.visibility;
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search } },
        { summary: { contains: query.search } },
        { content: { contains: query.search } },
      ];
    }

    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';

    const [items, total] = await Promise.all([
      (this.prisma as any).knowledgeArticle.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          author: { select: { id: true, firstName: true, lastName: true, profilePictureUrl: true, email: true } },
          category: { select: { id: true, name: true, slug: true, icon: true, color: true } },
          favorites: currentUserId ? { where: { userId: currentUserId } } : false,
        },
      }),
      (this.prisma as any).knowledgeArticle.count({ where }),
    ]);

    const formattedItems = items.map((art: any) => ({
      ...art,
      isFavorite: currentUserId && Array.isArray(art.favorites) ? art.favorites.length > 0 : false,
    }));

    return {
      items: formattedItems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findArticleByIdOrSlug(orgId: string, idOrSlug: string, currentUserId?: string) {
    const article = await (this.prisma as any).knowledgeArticle.findFirst({
      where: {
        organizationId: orgId,
        isDeleted: false,
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, profilePictureUrl: true, email: true } },
        category: { select: { id: true, name: true, slug: true, icon: true, color: true } },
        favorites: currentUserId ? { where: { userId: currentUserId } } : false,
      },
    });

    if (!article) {
      throw new NotFoundException('Knowledge article not found');
    }

    return {
      ...article,
      isFavorite: currentUserId && Array.isArray(article.favorites) ? article.favorites.length > 0 : false,
    };
  }

  async updateArticle(orgId: string, id: string, userId: string, data: UpdateKnowledgeArticleDto) {
    const article = await (this.prisma as any).knowledgeArticle.findFirst({
      where: { id, organizationId: orgId, isDeleted: false },
    });

    if (!article) {
      throw new NotFoundException('Knowledge article not found');
    }

    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.slug !== undefined) updateData.slug = generateSlug(data.slug);
    if (data.summary !== undefined) updateData.summary = data.summary;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.visibility !== undefined) updateData.visibility = data.visibility;
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId || null;
    if (data.featuredImageUrl !== undefined) updateData.featuredImageUrl = data.featuredImageUrl || null;

    const updated = await (this.prisma as any).knowledgeArticle.update({
      where: { id },
      data: updateData,
      include: {
        author: { select: { id: true, firstName: true, lastName: true, profilePictureUrl: true, email: true } },
        category: { select: { id: true, name: true, slug: true, icon: true, color: true } },
      },
    });

    // Create automatic revision snapshot
    const latestRevision = await (this.prisma as any).knowledgeRevision.findFirst({
      where: { articleId: id },
      orderBy: { revisionNum: 'desc' },
    });
    const nextRevNum = (latestRevision?.revisionNum || 0) + 1;

    await (this.prisma as any).knowledgeRevision.create({
      data: {
        articleId: id,
        revisionNum: nextRevNum,
        title: updated.title,
        content: updated.content,
        summary: updated.summary,
        changeSummary: `Updated article (Revision #${nextRevNum})`,
        updatedById: userId,
      },
    });

    await this.activityService.logActivity({
      userId,
      organizationId: orgId,
      action: 'KNOWLEDGE_ARTICLE_UPDATED',
      module: 'KNOWLEDGE',
      entityType: 'KNOWLEDGE_ARTICLE',
      entityId: updated.id,
      metadata: { title: updated.title, revisionNum: nextRevNum },
    });

    return updated;
  }

  async deleteArticle(orgId: string, id: string, userId: string) {
    const article = await (this.prisma as any).knowledgeArticle.findFirst({
      where: { id, organizationId: orgId, isDeleted: false },
    });

    if (!article) {
      throw new NotFoundException('Knowledge article not found');
    }

    const deleted = await (this.prisma as any).knowledgeArticle.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    await this.activityService.logActivity({
      userId,
      organizationId: orgId,
      action: 'KNOWLEDGE_ARTICLE_DELETED',
      module: 'KNOWLEDGE',
      entityType: 'KNOWLEDGE_ARTICLE',
      entityId: deleted.id,
    });

    return deleted;
  }

  async getDashboardStats(orgId: string) {
    const [totalArticles, publishedArticles, draftArticles, totalCategories] = await Promise.all([
      (this.prisma as any).knowledgeArticle.count({
        where: { organizationId: orgId, isDeleted: false },
      }),
      (this.prisma as any).knowledgeArticle.count({
        where: { organizationId: orgId, status: 'PUBLISHED', isDeleted: false },
      }),
      (this.prisma as any).knowledgeArticle.count({
        where: { organizationId: orgId, status: 'DRAFT', isDeleted: false },
      }),
      (this.prisma as any).knowledgeCategory.count({
        where: { organizationId: orgId, isDeleted: false },
      }),
    ]);

    return {
      totalArticles,
      publishedArticles,
      draftArticles,
      totalCategories,
    };
  }

  // ===================================
  // REVISIONS
  // ===================================

  async getRevisions(orgId: string, articleId: string) {
    const article = await (this.prisma as any).knowledgeArticle.findFirst({
      where: { id: articleId, organizationId: orgId, isDeleted: false },
    });
    if (!article) throw new NotFoundException('Article not found');

    return (this.prisma as any).knowledgeRevision.findMany({
      where: { articleId },
      orderBy: { revisionNum: 'desc' },
      include: {
        updatedBy: { select: { id: true, firstName: true, lastName: true, profilePictureUrl: true, email: true } },
      },
    });
  }

  async restoreRevision(orgId: string, articleId: string, revisionId: string, userId: string) {
    const article = await (this.prisma as any).knowledgeArticle.findFirst({
      where: { id: articleId, organizationId: orgId, isDeleted: false },
    });
    if (!article) throw new NotFoundException('Article not found');

    const revision = await (this.prisma as any).knowledgeRevision.findFirst({
      where: { id: revisionId, articleId },
    });
    if (!revision) throw new NotFoundException('Revision not found');

    // Update article with revision snapshot
    const updated = await (this.prisma as any).knowledgeArticle.update({
      where: { id: articleId },
      data: {
        title: revision.title,
        content: revision.content,
        summary: revision.summary,
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, profilePictureUrl: true, email: true } },
        category: { select: { id: true, name: true, slug: true, icon: true, color: true } },
      },
    });

    const latestRevision = await (this.prisma as any).knowledgeRevision.findFirst({
      where: { articleId },
      orderBy: { revisionNum: 'desc' },
    });
    const nextRevNum = (latestRevision?.revisionNum || 0) + 1;

    // Log revision for restoration
    await (this.prisma as any).knowledgeRevision.create({
      data: {
        articleId,
        revisionNum: nextRevNum,
        title: revision.title,
        content: revision.content,
        summary: revision.summary,
        changeSummary: `Restored from Revision #${revision.revisionNum}`,
        updatedById: userId,
      },
    });

    await this.activityService.logActivity({
      userId,
      organizationId: orgId,
      action: 'KNOWLEDGE_ARTICLE_RESTORED',
      module: 'KNOWLEDGE',
      entityType: 'KNOWLEDGE_ARTICLE',
      entityId: articleId,
      metadata: { restoredRevisionNum: revision.revisionNum, newRevisionNum: nextRevNum },
    });

    return updated;
  }

  // ===================================
  // COMMENTS
  // ===================================

  async addComment(orgId: string, articleId: string, authorId: string, content: string) {
    const article = await (this.prisma as any).knowledgeArticle.findFirst({
      where: { id: articleId, organizationId: orgId, isDeleted: false },
    });
    if (!article) throw new NotFoundException('Article not found');

    const comment = await (this.prisma as any).knowledgeComment.create({
      data: {
        articleId,
        authorId,
        content,
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, profilePictureUrl: true, email: true } },
      },
    });

    await this.activityService.logActivity({
      userId: authorId,
      organizationId: orgId,
      action: 'KNOWLEDGE_COMMENT_ADDED',
      module: 'KNOWLEDGE',
      entityType: 'KNOWLEDGE_COMMENT',
      entityId: comment.id,
      metadata: { articleId, articleTitle: article.title },
    });

    if (article.authorId !== authorId) {
      await this.notificationsService.createNotification({
        userId: article.authorId,
        organizationId: orgId,
        category: 'KNOWLEDGE',
        title: 'New Comment on your Article',
        message: `Someone commented on "${article.title}"`,
        linkUrl: `/knowledge/articles/${articleId}`,
      }).catch(() => null);
    }

    return comment;
  }

  async getComments(orgId: string, articleId: string) {
    return (this.prisma as any).knowledgeComment.findMany({
      where: { articleId, isDeleted: false },
      orderBy: { createdAt: 'asc' },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, profilePictureUrl: true, email: true } },
      },
    });
  }

  async updateComment(orgId: string, commentId: string, userId: string, content: string) {
    const comment = await (this.prisma as any).knowledgeComment.findFirst({
      where: { id: commentId, isDeleted: false },
    });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.authorId !== userId) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    return (this.prisma as any).knowledgeComment.update({
      where: { id: commentId },
      data: { content },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, profilePictureUrl: true, email: true } },
      },
    });
  }

  async deleteComment(orgId: string, commentId: string, userId: string) {
    const comment = await (this.prisma as any).knowledgeComment.findFirst({
      where: { id: commentId, isDeleted: false },
    });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    return (this.prisma as any).knowledgeComment.update({
      where: { id: commentId },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  }

  // ===================================
  // FAVORITES
  // ===================================

  async favoriteArticle(orgId: string, articleId: string, userId: string) {
    const article = await (this.prisma as any).knowledgeArticle.findFirst({
      where: { id: articleId, organizationId: orgId, isDeleted: false },
    });
    if (!article) throw new NotFoundException('Article not found');

    const existing = await (this.prisma as any).knowledgeFavorite.findFirst({
      where: { articleId, userId },
    });
    if (existing) return existing;

    return (this.prisma as any).knowledgeFavorite.create({
      data: { articleId, userId },
    });
  }

  async unfavoriteArticle(orgId: string, articleId: string, userId: string) {
    const existing = await (this.prisma as any).knowledgeFavorite.findFirst({
      where: { articleId, userId },
    });
    if (!existing) return { success: true };

    await (this.prisma as any).knowledgeFavorite.delete({
      where: { id: existing.id },
    });
    return { success: true };
  }

  async getUserFavorites(orgId: string, userId: string) {
    const favorites = await (this.prisma as any).knowledgeFavorite.findMany({
      where: { userId },
      include: {
        article: {
          include: {
            author: { select: { id: true, firstName: true, lastName: true, profilePictureUrl: true } },
            category: { select: { id: true, name: true, slug: true, color: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return favorites
      .map((f: any) => f.article)
      .filter((art: any) => art && art.organizationId === orgId && !art.isDeleted);
  }

  // ===================================
  // ATTACHMENTS
  // ===================================

  async addAttachment(orgId: string, articleId: string, userId: string, file: any) {
    const article = await (this.prisma as any).knowledgeArticle.findFirst({
      where: { id: articleId, organizationId: orgId, isDeleted: false },
    });
    if (!article) throw new NotFoundException('Article not found');

    const uploaded = await this.storageService.uploadFile(file);

    const attachment = await (this.prisma as any).knowledgeAttachment.create({
      data: {
        articleId,
        uploadedById: userId,
        name: file.originalname,
        originalName: file.originalname,
        mimeType: uploaded.mimeType,
        size: uploaded.size,
        storagePath: uploaded.key,
      },
      include: {
        uploadedBy: { select: { id: true, firstName: true, lastName: true, profilePictureUrl: true } },
      },
    });

    await this.activityService.logActivity({
      userId,
      organizationId: orgId,
      action: 'KNOWLEDGE_ATTACHMENT_UPLOADED',
      module: 'KNOWLEDGE',
      entityType: 'KNOWLEDGE_ATTACHMENT',
      entityId: attachment.id,
      metadata: { name: attachment.name, size: attachment.size },
    });

    return attachment;
  }

  async getAttachments(orgId: string, articleId: string) {
    return (this.prisma as any).knowledgeAttachment.findMany({
      where: { articleId, isDeleted: false },
      orderBy: { createdAt: 'desc' },
      include: {
        uploadedBy: { select: { id: true, firstName: true, lastName: true, profilePictureUrl: true } },
      },
    });
  }

  async deleteAttachment(orgId: string, attachmentId: string, userId: string) {
    const attachment = await (this.prisma as any).knowledgeAttachment.findFirst({
      where: { id: attachmentId, isDeleted: false },
    });
    if (!attachment) throw new NotFoundException('Attachment not found');

    const deleted = await (this.prisma as any).knowledgeAttachment.update({
      where: { id: attachmentId },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    await this.storageService.deleteFile(attachment.storagePath).catch(() => null);

    await this.activityService.logActivity({
      userId,
      organizationId: orgId,
      action: 'KNOWLEDGE_ATTACHMENT_DELETED',
      module: 'KNOWLEDGE',
      entityType: 'KNOWLEDGE_ATTACHMENT',
      entityId: deleted.id,
    });

    return deleted;
  }
}
