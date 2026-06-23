import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';
import { RoomStatus, CleaningStatus } from '@prisma/client';

@Injectable()
@WebSocketGateway({ namespace: '/ws', cors: { origin: '*' } })
export class RoomStatusGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token as string | undefined;
      if (!token) {
        client.disconnect();
        return;
      }
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      }) as { branchId: string | null };

      const branchId = payload.branchId;
      if (branchId) {
        void client.join(`branch:${branchId}`);
      }
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(_client: Socket) {
    // no-op — socket.io handles room cleanup automatically
  }

  emitRoomStatusUpdate(
    roomId: string,
    status: RoomStatus,
    cleaningStatus: CleaningStatus,
    branchId: string,
  ) {
    this.server
      .to(`branch:${branchId}`)
      .emit('room:status:updated', { roomId, status, cleaningStatus });
  }

  emitReservationCreated(reservation: Record<string, unknown>, branchId: string) {
    this.server.to(`branch:${branchId}`).emit('reservation:created', reservation);
  }
}
