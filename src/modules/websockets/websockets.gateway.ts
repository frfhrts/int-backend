import { Logger } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { UsersService } from '../users/users.service';
import { Server } from 'socket.io';
import { Channels } from 'src/utils/enums/channels.enum';
import { OnEvent } from '@nestjs/event-emitter';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class WebsocketsGateway {
  private readonly logger = new Logger(WebsocketsGateway.name);
  constructor(private readonly usersService: UsersService) {}

  @WebSocketServer()
  server: Server;

  async handleConnection(client: any) {
    this.logger.log('Client connected');
    console.log('Client Data: ', client.handshake.query);
    console.log('Client Data: ', client.handshake.headers);
    let user = await this.usersService
      .getUserById(client.handshake.query.userId)
      .catch((error) => {
        return null;
      });
    if (!user) {
      const newUser = await this.usersService.createNewUser();
      user = newUser;
    }
    // 🎯 JOIN USER TO THEIR PERSONAL ROOM
    const userRoom = `user_${user.user_id}`;
    client.join(userRoom);
    this.logger.log(`User ${user.user_id} joined room: ${userRoom}`);

    // Store user_id in socket data for easy access
    client.data.userId = user.user_id;

    client.emit(Channels.USER_DATA, user);
  }

  handleDisconnect(client: any) {
    this.logger.log('Client disconnected');
  }

  @OnEvent(Channels.BALANCE_UPDATE)
  handleBalanceUpdate(payload: { userId: string; balance: number }) {
    console.log('Balance Update: ', payload);
    this.server
      .to(`user_${payload.userId}`)
      .emit(Channels.BALANCE_UPDATE, { balance: payload.balance });
  }
}
