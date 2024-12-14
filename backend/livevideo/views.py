import json
import random
import uuid
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_exempt
import logging
logger = logging.getLogger(__name__)


@ensure_csrf_cookie
def set_csrf_cookie(request):
    return JsonResponse({'message': 'CSRF cookie set'})

# @ensure_csrf_cookie
# def set_csrf_cookie(request):
#     logger.debug('set_csrf_cookie')
#     return JsonResponse({'message': 'hello'})
#     csrf_token = get_token(request)
#     # return JsonResponse({'csrf_token': csrf_token})
#     response = JsonResponse({'message': 'CSRF cookie set', 'csrf_token': csrf_token})
#     response.set_cookie('csrftoken', csrf_token, httponly=False, secure=False, samesite='None')
#     logger.debug(f'csrf_token: {csrf_token}')
#     logger.debug(f'cookie: {response.cookies}')
#     return response
    
phone_number_map = {}

def generate_phone_number():
    while True:
        phone_number = random.randint(10000, 99999)
        if phone_number not in phone_number_map:
            return phone_number

def get_phone_number(request):
    phone_number = generate_phone_number()
    session_id = request.session.session_key  # Use Django's session framework
    phone_number_map[phone_number] = session_id
    request.session['phone_number'] = phone_number
    return JsonResponse({'phone_number': phone_number})


def get_random_number(request):
    random_number = random.randint(1, 100)
    return JsonResponse({'random_number': random_number})


def get_user_id(request):
    logger.debug('get_user_id')
    if not request.session.get('user_id'):
        request.session['user_id'] = str(uuid.uuid4())
    logger.debug(f'user_id: {request.session["user_id"]}')
    return JsonResponse({'user_id': request.session['user_id']})

def make_call(request):
    logger.debug('make_call')
    if request.method != 'POST':
        return JsonResponse({'error': 'POST method required'})

    phone_number = request.POST.get('phoneNumber')
    logger.debug(f'phone_number: {phone_number}')
    return JsonResponse({'message': 'hello', 'phone_number': phone_number})
