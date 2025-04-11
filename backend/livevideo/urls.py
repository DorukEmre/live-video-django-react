from django.contrib import admin
from django.urls import path, re_path
from django.views.generic import TemplateView
from django.conf import settings
from django.conf.urls.static import static
from . import views
import logging
logger = logging.getLogger(__name__)

urlpatterns = [
    path('admin/', admin.site.urls),
    # path('api/set-csrf-cookie/', views.set_csrf_cookie, name='set_csrf_cookie'),

    path('api/get-user-details/', views.get_user_details, name='get_user_details'),
    
]

# if settings.DEBUG:
#     urlpatterns += [
#         path('', views.set_csrf_cookie),
#     ]

# Serve react files in prod
if not settings.DEBUG:
    # urlpatterns += [
    #     path('', TemplateView.as_view(template_name="index.html")),
    #     re_path(r'^.*', TemplateView.as_view(template_name='index.html'))
    # ] + static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += [
        path('', TemplateView.as_view(template_name="index.html")),
    ]

# https://docs.djangoproject.com/en/5.1/howto/static-files/#serving-static-files-during-development