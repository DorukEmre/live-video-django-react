import os
import django
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
# from channels.auth import AuthMiddlewareStack
# from channels.security.websocket import AllowedHostsOriginValidator

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'livevideo.settings')
django.setup()
from . import websocket_routing



django_asgi_app = get_asgi_application()


application = ProtocolTypeRouter({
    "http": django_asgi_app,
    'websocket': URLRouter(
        websocket_routing.websocket_urlpatterns
    ),
    # "websocket": AllowedHostsOriginValidator(
    #     AuthMiddlewareStack(
    #         URLRouter(
    #             websocket_routing.websocket_urlpatterns
    #         )
    #     )
    # ),
})
