# consumers.py
from channels.generic.websocket import AsyncWebsocketConsumer
import json
import logging
logger = logging.getLogger(__name__)

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
        if data['type'] == 'register':
            phone_to_session[data['user_phone']] = self.channel_name
        elif data['type'] == 'call':
            target_channel = phone_to_session.get(data['toPhone'])
            if target_channel:
                await self.channel_layer.send(target_channel, {
                    "type": "call.message",
                    "message": data
                })
        elif data['type'] == 'answer':
            target_channel = phone_to_session.get(data['toPhone'])
            if target_channel:
                await self.channel_layer.send(target_channel, {
                    "type": "answer.message",
                    "message": data
                })

    async def call_message(self, event):
        await self.send(text_data=json.dumps(event["message"]))

    async def answer_message(self, event):
        await self.send(text_data=json.dumps(event["message"]))
