import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private userSockets = new Map<string, string[]>(); // userId -> socketIds
  private socketUsers = new Map<string, string>(); // socketId -> userId

  private extractUserId(client: Socket): string | null {
    const fromQuery = client.handshake.query?.userId as string;
    const fromAuth = client.handshake.auth?.userId as string;
    return fromAuth || fromQuery || null;
  }

  handleConnection(client: Socket) {
    const userId = this.extractUserId(client);
    if (userId) {
      this.socketUsers.set(client.id, userId);
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, []);
      }
      this.userSockets.get(userId)?.push(client.id);
      this.logger.log(`Socket connected for user ${userId} (socket ${client.id})`);
    }
  }

  handleDisconnect(client: Socket) {
    const userId = this.socketUsers.get(client.id) || this.extractUserId(client);
    if (userId && this.userSockets.has(userId)) {
      const sockets = this.userSockets.get(userId)?.filter((id) => id !== client.id);
      if (sockets && sockets.length > 0) {
        this.userSockets.set(userId, sockets);
      } else {
        this.userSockets.delete(userId);
      }
      this.socketUsers.delete(client.id);
      this.logger.log(`Socket disconnected for user ${userId} (socket ${client.id})`);
    }
  }

  @SubscribeMessage('authenticate')
  handleAuthenticate(client: Socket, payload: { userId: string }) {
    if (payload?.userId) {
      this.socketUsers.set(client.id, payload.userId);
      if (!this.userSockets.has(payload.userId)) {
        this.userSockets.set(payload.userId, []);
      }
      if (!this.userSockets.get(payload.userId)?.includes(client.id)) {
        this.userSockets.get(payload.userId)?.push(client.id);
      }
      client.emit('authenticated', { success: true });
    }
  }

  @SubscribeMessage('ping')
  handlePing(client: Socket) {
    client.emit('pong', { time: Date.now() });
  }

  emitToUser(userId: string, event: string, data: any) {
    const sockets = this.userSockets.get(userId);
    if (sockets && sockets.length > 0) {
      sockets.forEach((socketId) => {
        try {
          this.server.to(socketId).emit(event, data);
        } catch (err: any) {
          this.logger.warn(`Failed to emit to socket ${socketId}: ${err.message}`);
        }
      });
    }
  }

  broadcast(event: string, data: any) {
    if (this.server) {
      this.server.emit(event, data);
    }
  }
}

