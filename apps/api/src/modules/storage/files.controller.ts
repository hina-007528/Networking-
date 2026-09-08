import {
  Controller,
  Get,
  Header,
  Param,
  Post,
  Query,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { MediaAssetDto } from '@stormfiber/types';
import { idParamSchema, uploadMetaSchema } from '@stormfiber/validation';
import { CurrentUser, Public } from '../../common/decorators/auth.decorators';
import { SkipEnvelope } from '../../common/decorators/response.decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { FilesService, type UploadedFile as Uploaded } from './files.service';

@ApiTags('Files')
@Controller('files')
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Post()
  @ApiBearerAuth()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { files: 1 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
        altText: { type: 'string' },
      },
    },
  })
  @ApiOperation({ summary: 'Upload an image or PDF. The original filename is never used as a path.' })
  upload(
    @UploadedFile() file: Uploaded,
    @CurrentUser('id') userId: string,
    @Query(new ZodValidationPipe(uploadMetaSchema)) query: { altText?: string },
  ): Promise<MediaAssetDto> {
    return this.files.upload(file, userId, query.altText);
  }

  @Get(':id')
  @Public()
  @SkipEnvelope()
  @Header('Cache-Control', 'private, max-age=86400')
  @ApiOperation({ summary: 'Stream a previously uploaded file' })
  async download(
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: string },
  ): Promise<StreamableFile> {
    const file = await this.files.stream(params.id);
    return new StreamableFile(file.body, {
      type: file.mimeType,
      disposition: `inline; filename="${file.fileName}"`,
    });
  }
}
