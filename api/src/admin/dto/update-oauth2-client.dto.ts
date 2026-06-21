import { PartialType } from '@nestjs/swagger';
import { CreateOauth2ClientDto } from './create-oauth2-client.dto';

export class UpdateOauth2ClientDto extends PartialType(CreateOauth2ClientDto) {}
