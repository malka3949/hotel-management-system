import { IsUUID } from 'class-validator';

export class AssignHousekeepingTaskDto {
  @IsUUID()
  assignedTo!: string;
}
