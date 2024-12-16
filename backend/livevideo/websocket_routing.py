from django.urls import path
from .consumers import SignalingConsumer

websocket_urlpatterns = [
    path('ws/call/', SignalingConsumer.as_asgi()),

]
