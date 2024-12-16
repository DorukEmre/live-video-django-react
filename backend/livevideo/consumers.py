# consumers.py
from channels.generic.websocket import AsyncWebsocketConsumer
import json
import logging
logger = logging.getLogger(__name__)

# map phone number to WebSocket connection for server to notify the target user
phone_to_session = {}

class SignalingConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        logger.debug(f'SignalingConsumer > connect')
        await self.accept()

    async def disconnect(self, close_code):
        logger.debug(f'SignalingConsumer > disconnect')
        for phone, session in phone_to_session.items():
            if session == self.channel_name:
                del phone_to_session[phone]
                break

    async def receive(self, text_data):
        data = json.loads(text_data)
        logger.debug(f'SignalingConsumer > data: {data}')
        logger.debug(f'receive > phone_to_session: {phone_to_session}')

        # register phone to WebSocket connection when user first loads the page
        if data['type'] == 'register' and data['user_phone'] != 0:
            for phone, session in phone_to_session.items():
                if session == self.channel_name:
                    del phone_to_session[phone]
            phone_to_session[data['user_phone']] = self.channel_name
            logger.debug(f'register > phone_to_session: {phone_to_session}')

        # when user calls, check target number exists and send message to target user
        elif data['type'] == 'call':
            logger.debug(f'call > phone_to_session: {phone_to_session}')
            if data['receiver'] not in phone_to_session:
                await self.send(text_data=json.dumps({
                    'type': 'error',
                    'message': 'User is not online'
                }))
                return
            if data['receiver'] == data['caller']:
                await self.send(text_data=json.dumps({
                    'type': 'error',
                    'message': 'Cannot call yourself'
                }))
                return

            target_channel = phone_to_session.get(data['receiver'])
            logger.debug(f'target_channel: {target_channel}')
            if target_channel:
                await self.channel_layer.send(target_channel, {
                    "type": "call.message",
                    "message": data
                })

        elif data['type'] == 'answer':
            target_channel = phone_to_session.get(data['caller'])
            if target_channel:
                await self.channel_layer.send(target_channel, {
                    "type": "answer.message",
                    "message": data
                })
        
        elif data['type'] == 'decline':
            target_channel = phone_to_session.get(data['caller'])
            if target_channel:
                await self.channel_layer.send(target_channel, {
                    "type": "decline.message",
                    "message": data
                })

    async def call_message(self, event):
        await self.send(text_data=json.dumps(event["message"]))

    async def answer_message(self, event):
        await self.send(text_data=json.dumps(event["message"]))

    async def decline_message(self, event):
        await self.send(text_data=json.dumps(event["message"]))
