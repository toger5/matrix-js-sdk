/*
Copyright 2021 Šimon Brandner <simon.bra.ag@gmail.com>

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import { MatrixEvent } from '../models/event';
import { MatrixClient } from '../client';
import { CALL_EVENT, GroupCall, GroupCallIntent, GroupCallType, IGroupCallDataChannelOptions } from "./groupCall";
import { RoomState } from "../models/room-state";
import { logger } from '../logger';

export class GroupCallEventHandler {
    public groupCalls = new Map<string, GroupCall>(); // roomId -> GroupCall

    constructor(private client: MatrixClient) { }

    public start(): void {
        this.client.on("RoomState.events", this.onRoomStateChanged);
    }

    public stop(): void {
        this.client.removeListener("RoomState.events", this.onRoomStateChanged);
    }

    public getGroupCallById(groupCallId: string): GroupCall {
        return [...this.groupCalls.values()].find((groupCall) => groupCall.groupCallId === groupCallId);
    }

    public createGroupCallFromRoomStateEvent(event: MatrixEvent) {
        const roomId = event.getRoomId();
        const content = event.getContent();

        const room = this.client.getRoom(event.getRoomId());

        if (!room) {
            logger.error(`Couldn't find room ${roomId} for GroupCall`);
            return;
        }

        const groupCallId = event.getStateKey();

        const callType = content["m.type"];

        if (!Object.values(GroupCallType).includes(callType)) {
            logger.error(`Received invalid group call type ${callType} for room ${roomId}.`);
            return;
        }

        const callIntent = content["m.intent"];

        if (!Object.values(GroupCallIntent).includes(callIntent)) {
            logger.error(`Received invalid group call intent ${callType} for room ${roomId}.`);
            return;
        }

        let dataChannelOptions: IGroupCallDataChannelOptions | undefined;

        if (content?.dataChannelsEnabled && content?.dataChannelOptions) {
            // Pull out just the dataChannelOptions we want to support.
            const { ordered, maxPacketLifeTime, maxRetransmits, protocol } = content.dataChannelOptions;
            dataChannelOptions = { ordered, maxPacketLifeTime, maxRetransmits, protocol };
        }

        const groupCall = new GroupCall(
            this.client,
            room,
            callType,
            callIntent,
            content?.dataChannelsEnabled,
            dataChannelOptions,
        );
        groupCall.groupCallId = groupCallId;

        return groupCall;
    }

    private onRoomStateChanged = (event: MatrixEvent, state: RoomState): void => {
        if (event.getType() !== CALL_EVENT) {
            return;
        }

        const groupCallId = event.getStateKey();
        const content = event.getContent();

        const currentGroupCall = this.groupCalls.get(state.roomId);

        if (!currentGroupCall && !content["m.terminated"]) {
            const groupCall = this.createGroupCallFromRoomStateEvent(event);
            this.groupCalls.set(state.roomId, groupCall);
            this.client.emit("GroupCall.incoming", groupCall);
        } else if (currentGroupCall && currentGroupCall.groupCallId === groupCallId) {
            if (content["m.terminated"]) {
                currentGroupCall.terminate(false);
            } else if (content["m.type"] !== currentGroupCall.type) {
                // TODO: Handle the callType changing when the room state changes
                logger.warn(`The group call type changed for room: ${
                    state.roomId}. Changing the group call type is currently unsupported.`);
            }
        } else if (currentGroupCall && currentGroupCall.groupCallId !== groupCallId) {
            // TODO: Handle new group calls and multiple group calls
            logger.warn(`Multiple group calls detected for room: ${
                state.roomId}. Multiple group calls are currently unsupported.`);
        }
    };
}