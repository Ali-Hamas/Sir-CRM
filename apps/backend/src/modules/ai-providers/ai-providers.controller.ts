import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AIProvidersService } from './services/ai-providers.service';
import { CreateAIProviderDto, UpdateAIProviderDto } from './dto/create-provider.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../../common/roles';

@UseGuards(JwtAuthGuard)
@Controller('organizations/:orgId/ai')
export class AIProvidersController {
  constructor(private readonly aiProvidersService: AIProvidersService) {}

  @Post('providers')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  create(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Body() dto: CreateAIProviderDto,
  ) {
    return this.aiProvidersService.create(req.user.id, orgId, dto);
  }

  @Get('providers')
  findAll(@Param('orgId') orgId: string) {
    return this.aiProvidersService.findAll(orgId);
  }

  @Get('models')
  getAllModels(@Param('orgId') orgId: string) {
    return this.aiProvidersService.getAllModels(orgId);
  }

  @Get('providers/:id')
  findOne(@Param('id') id: string, @Param('orgId') orgId: string) {
    return this.aiProvidersService.findOne(id, orgId);
  }

  @Patch('providers/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Param('orgId') orgId: string,
    @Body() dto: UpdateAIProviderDto,
  ) {
    return this.aiProvidersService.update(id, req.user.id, orgId, dto);
  }

  @Delete('providers/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  remove(
    @Req() req: any,
    @Param('id') id: string,
    @Param('orgId') orgId: string,
  ) {
    return this.aiProvidersService.remove(id, req.user.id, orgId);
  }

  @Post('providers/:id/test')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  testConnection(
    @Param('id') id: string,
    @Param('orgId') orgId: string,
  ) {
    return this.aiProvidersService.testConnection(id, orgId);
  }
}
