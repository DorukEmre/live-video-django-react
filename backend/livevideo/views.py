import random
import uuid
from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie
import logging
logger = logging.getLogger(__name__)


@ensure_csrf_cookie
def set_csrf_cookie(request):
    return JsonResponse({'message': 'CSRF cookie set'})

user_map = {}

def generate_phone_number():
    while True:
        phone_number = random.randint(10000, 99999)
        if phone_number not in user_map:
            return phone_number

def get_user_details(request):
    logger.debug('get_user_id')
    if not request.session.get('user_id'):
        request.session['user_id'] = str(uuid.uuid4())
        user_phone = generate_phone_number()
        user_map[user_phone] = request.session['user_id']
        request.session['user_phone'] = user_phone
    # session_id = request.session.session_key # Django's session framework
    # logger.debug(f'session_id: {session_id}')
    logger.debug(f'get_user_id > request.session: {dict(request.session)}')
    return JsonResponse({'user_id': request.session['user_id'], 'user_phone': request.session['user_phone']})

def make_call(request):
    logger.debug('make_call')
    logger.debug(f'make_call > request.session: {dict(request.session)}')
    logger.debug(f'make_call > user_map: {user_map}')
    if request.method != 'POST':
        return JsonResponse({'error': 'POST method required'})
    from_id = request.POST.get('fromId')
    to_phone = request.POST.get('toPhone')

    if not from_id or not from_id == request.session['user_id']:
        return JsonResponse({'status': 'error', 'message': 'Invalid fromId'})
    logger.debug(f'to_phone: {to_phone}')
    return JsonResponse({'status': 'success', 'message': 'hello', 'to_phone': to_phone})
