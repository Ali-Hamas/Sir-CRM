import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { PromptsService } from './prompts.service';
import { CreatePromptDto, UpdatePromptDto, PreviewPromptDto, CreateCategoryDto } from './dto/create-prompt.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../../common/roles';

@UseGuards(JwtAuthGuard)
@Controller('organizations/:orgId/prompts')
export class PromptsController {
  constructor(private readonly promptsService: PromptsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  create(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Body() dto: CreatePromptDto,
  ) {
    return this.promptsService.create(req.user.id, orgId, dto);
  }

  @Get()
  findAll(
    @Param('orgId') orgId: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.promptsService.findAll(orgId, { search, status, categoryId });
  }

  @Post('preview')
  preview(@Body() dto: PreviewPromptDto) {
    return this.promptsService.preview(dto);
  }

  @Get('categories')
  getCategories(@Param('orgId') orgId: string) {
    return this.promptsService.getCategories(orgId);
  }

  @Post('categories')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  createCategory(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Body() dto: CreateCategoryDto,
  ) {
    return this.promptsService.createCategory(req.user.id, orgId, dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Param('orgId') orgId: string) {
    return this.promptsService.findOne(id, orgId);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Param('orgId') orgId: string,
    @Body() dto: UpdatePromptDto,
  ) {
    return this.promptsService.update(id, req.user.id, orgId, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  remove(
    @Req() req: any,
    @Param('id') id: string,
    @Param('orgId') orgId: string,
  ) {
    return this.promptsService.remove(id, req.user.id, orgId);
  }

  @Get(':id/versions')
  getVersions(@Param('id') id: string, @Param('orgId') orgId: string) {
    return this.promptsService.getVersions(id, orgId);
  }

  @Post(':id/restore/:versionId')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  restoreVersion(
    @Req() req: any,
    @Param('id') id: string,
    @Param('versionId') versionId: string,
    @Param('orgId') orgId: string,
  ) {
    return this.promptsService.restoreVersion(id, versionId, req.user.id, orgId);
  }

  @Post(':id/duplicate')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  duplicate(
    @Req() req: any,
    @Param('id') id: string,
    @Param('orgId') orgId: string,
  ) {
    return this.promptsService.duplicate(id, req.user.id, orgId);
  }
}
