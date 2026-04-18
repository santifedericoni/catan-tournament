import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import type { TournamentEvent } from '@catan/shared';

export type { TournamentEvent };

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
  namespace: '/events',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  handleConnection(client: Socket) {
    this.logger.debug(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join-tournament')
  handleJoinTournament(
    @ConnectedSocket() client: Socket,
    @MessageBody() tournamentId: string,
  ) {
    client.join(`tournament:${tournamentId}`);
    this.logger.debug(`Client ${client.id} joined tournament:${tournamentId}`);
    client.emit('joined', { tournamentId });
  }

  @SubscribeMessage('leave-tournament')
  handleLeaveTournament(
    @ConnectedSocket() client: Socket,
    @MessageBody() tournamentId: string,
  ) {
    client.leave(`tournament:${tournamentId}`);
  }

  @SubscribeMessage('table_dice_roll')
  handleTableDiceRoll(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { tournamentId: string; tableId: string; dice1: number; dice2: number },
  ) {
    // Broadcast to all in the tournament room (including sender)
    this.server
      .to(`tournament:${payload.tournamentId}`)
      .emit('table_dice_roll', payload);
  }

  @SubscribeMessage('table_timer_start')
  handleTableTimerStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { tournamentId: string; tableId: string; startedAt: number },
  ) {
    this.server
      .to(`tournament:${payload.tournamentId}`)
      .emit('table_timer_start', payload);
  }

  @SubscribeMessage('table_timer_reset')
  handleTableTimerReset(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { tournamentId: string; tableId: string },
  ) {
    this.server
      .to(`tournament:${payload.tournamentId}`)
      .emit('table_timer_reset', payload);
  }

  @SubscribeMessage('table_timer_config')
  handleTableTimerConfig(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { tournamentId: string; tableId: string; duration: number },
  ) {
    this.server
      .to(`tournament:${payload.tournamentId}`)
      .emit('table_timer_config', payload);
  }

  @SubscribeMessage('table_turn_state')
  handleTableTurnState(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { tournamentId: string; tableId: string; activeSeatNumber: number; rolledThisTurn: boolean },
  ) {
    this.server
      .to(`tournament:${payload.tournamentId}`)
      .emit('table_turn_state', payload);
  }

  /**
   * Emit a typed event to all clients subscribed to a tournament room.
   */
  emitToTournament(tournamentId: string, event: TournamentEvent, data: unknown) {
    this.server.to(`tournament:${tournamentId}`).emit(event, data);
  }

  emitLeaderboardUpdate(tournamentId: string, leaderboard: unknown) {
    this.emitToTournament(tournamentId, 'leaderboard_update', leaderboard);
  }

  emitRoundStarted(tournamentId: string, round: unknown) {
    this.emitToTournament(tournamentId, 'round_started', round);
  }

  emitRoundClosed(tournamentId: string, round: unknown) {
    this.emitToTournament(tournamentId, 'round_closed', round);
  }

  emitResultSubmitted(tournamentId: string, tableId: string, results: unknown) {
    this.emitToTournament(tournamentId, 'result_submitted', { tableId, results });
  }

  emitResultCorrected(tournamentId: string, tableId: string, results: unknown) {
    this.emitToTournament(tournamentId, 'result_corrected', { tableId, results });
  }

  emitStageAdvanced(tournamentId: string, stage: unknown) {
    this.emitToTournament(tournamentId, 'stage_advanced', stage);
  }

  emitResultConfirmed(tournamentId: string, tableId: string, results: unknown) {
    this.emitToTournament(tournamentId, 'result_confirmed', { tableId, results });
  }

  emitResultDisputed(tournamentId: string, tableId: string, data: unknown) {
    this.emitToTournament(tournamentId, 'result_disputed', { tableId, ...data as object });
  }

  emitResultOfficial(tournamentId: string, tableId: string, results: unknown) {
    this.emitToTournament(tournamentId, 'result_official', { tableId, results });
  }

  emitDisputeOpened(tournamentId: string, dispute: unknown) {
    this.emitToTournament(tournamentId, 'dispute_opened', dispute);
  }

  emitDisputeResolved(tournamentId: string, dispute: unknown) {
    this.emitToTournament(tournamentId, 'dispute_resolved', dispute);
  }
}
