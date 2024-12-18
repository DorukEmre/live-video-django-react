from django.urls import path
from .consumers import SignalingConsumer

websocket_urlpatterns = [
    path('ws/signaling/', SignalingConsumer.as_asgi()),

]
