# consumers.py
from channels.generic.websocket import AsyncWebsocketConsumer
import json
import logging
logger = logging.getLogger(__name__)
import prettyprinter
from prettyprinter import pformat
prettyprinter.set_default_config(depth=None, width=80, ribbon_width=80)

# map phone number to WebSocket connection for server to notify the target user
phone_to_session = {}

class SignalingConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        logger.debug(f'SignalingConsumer > connect')
        await self.accept()

    async def disconnect(self, close_code):
        logger.debug(f'SignalingConsumer > disconnect')
        await self.unregister_phone()
        await self.send_updated_user_list()
           
    async def unregister_phone(self):
        phone = None
        for key, value in phone_to_session.items():
            if value == self.channel_name:
                phone = key
                break
        if phone:
            logger.debug(f'unregister > phone: {phone}')
            del phone_to_session[phone]

    async def receive(self, text_data):
        data = json.loads(text_data)
        if data['type'] == 'candidate':
            logger.debug(f"SignalingConsumer > receive data: type={data.get('type')}, receiverPhone={data.get('receiverPhone')}")
        elif data['type'] == 'answer':
            logger.debug(f"SignalingConsumer > receive data: type={data.get('type')}, callerPhone={data.get('callerPhone')}, receiverPhone={data.get('receiverPhone')}")
        elif data['type'] == 'offer' or  data['type'] == 'call_request':
            logger.debug(f"SignalingConsumer > receive data: type={data.get('type')}, callerPhone={data.get('callerPhone')}, receiverPhone={data.get('receiverPhone')}")
        else:
            logger.debug(f'SignalingConsumer > receive data: {pformat(data)}')
        # logger.debug(f'receive > phone_to_session: {list(phone_to_session.keys())}')

        # register phone to WebSocket connection when user first loads the page
        if data['type'] == 'register' and data['user_phone'] != 0:
            await self.unregister_phone()
            phone_to_session[data['user_phone']] = self.channel_name
            logger.debug(f'register > phone_to_session: {pformat(phone_to_session)}')

            # send user list to all users
            await self.send_updated_user_list()


        # when user calls, check target number exists and send message to target user                
        elif data['type'] == 'call_request':
            # check if caller is still online
            if data['receiverPhone'] not in phone_to_session:
                await self.send(text_data=json.dumps({
                    'type': 'error',
                    'dataType': data['type'],
                    'message': 'User is not online'
                }))
                return
            
            if data['receiverPhone'] == data['callerPhone']:
                await self.send(text_data=json.dumps({
                    'type': 'error',
                    'message': 'Cannot call yourself'
                }))
                return
            
            target_channel = phone_to_session.get(data['receiverPhone'])
            if target_channel:
                await self.channel_layer.send(target_channel, {
                    "type": "call_request.message",
                    "message": data
                })

        elif data['type'] == 'accept':
            # check if caller is still online
            if data['receiverPhone'] not in phone_to_session:
                return
            
            target_channel = phone_to_session.get(data['callerPhone'])
            if target_channel:
                await self.channel_layer.send(target_channel, {
                    "type": "accept.message",
                    "message": data
                })

        elif data['type'] == 'decline':
            target_channel = phone_to_session.get(data['callerPhone'])
            if target_channel:
                await self.channel_layer.send(target_channel, {
                    "type": "decline.message",
                    "message": data
                })

        elif data['type'] == 'offer':
            # check if caller is still online
            if data['receiverPhone'] not in phone_to_session:
                await self.send(text_data=json.dumps({
                    'type': 'error',
                    'dataType': data['type'],
                    'message': 'User is not online'
                }))
                return
            
            if data['receiverPhone'] == data['callerPhone']:
                await self.send(text_data=json.dumps({
                    'type': 'error',
                    'message': 'Cannot call yourself'
                }))
                return
            
            target_channel = phone_to_session.get(data['receiverPhone'])
            if target_channel:
                await self.channel_layer.send(target_channel, {
                    "type": "offer.message" if data['type'] == 'offer' else "candidate.message",
                    "message": data
                })
        
        elif data['type'] == 'candidate':
            # check if caller is still online
            if data['receiverPhone'] not in phone_to_session:
                return
            
            target_channel = phone_to_session.get(data['receiverPhone'])
            if target_channel:
                await self.channel_layer.send(target_channel, {
                    "type": "offer.message" if data['type'] == 'offer' else "candidate.message",
                    "message": data
                })

        elif data['type'] == 'answer':
            target_channel = phone_to_session.get(data['callerPhone'])
            if target_channel:
                await self.channel_layer.send(target_channel, {
                    "type": "answer.message",
                    "message": data
                })


        elif data['type'] == 'hangup':
            target_channel = phone_to_session.get(data['remotePhone'])
            if target_channel:
                await self.channel_layer.send(target_channel, {
                    "type": "hangup.message",
                    "message": data
                })

        elif data['type'] == 'disconnection':
            target_channel = phone_to_session.get(data['remotePhone'])
            if target_channel:
                await self.channel_layer.send(target_channel, {
                    "type": "disconnection.message",
                    "message": data
                })

    async def send_updated_user_list(self):
        user_list = list(phone_to_session.keys())
        logger.debug(f'register > users: {user_list}')
        
        for session in phone_to_session.values():
            await self.channel_layer.send(session, {
                "type": "user_list.update",
                "user_list": user_list
            })

    async def call_request_message(self, event):
        await self.send(text_data=json.dumps(event["message"]))

    async def accept_message(self, event):
        await self.send(text_data=json.dumps(event["message"]))

    async def decline_message(self, event):
        await self.send(text_data=json.dumps(event["message"]))
        

    async def offer_message(self, event):
        await self.send(text_data=json.dumps(event["message"]))

    async def candidate_message(self, event):
        await self.send(text_data=json.dumps(event["message"]))

    async def answer_message(self, event):
        await self.send(text_data=json.dumps(event["message"]))


    async def hangup_message(self, event):
        await self.send(text_data=json.dumps(event["message"]))
        
    async def disconnection_message(self, event):
        await self.send(text_data=json.dumps(event["message"]))


    async def user_list_update(self, event):
        await self.send(text_data=json.dumps({'type': 'user_list', 'user_list': event['user_list']}))

