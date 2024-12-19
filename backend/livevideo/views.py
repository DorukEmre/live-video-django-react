import random
import uuid
from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie
import logging
logger = logging.getLogger(__name__)

# map phone number to user_id
user_map = {}


@ensure_csrf_cookie
def set_csrf_cookie(request):
    return JsonResponse({'message': 'CSRF cookie set'})


def generate_phone_number():
    while True:
        # phone_number = random.randint(10000, 99999)
        phone_number = random.randint(1, 9)
        if phone_number not in user_map:
            return phone_number


def get_user_details(request):
    logger.debug('get_user_id')

    # Assign new number if no session, user_phone is not in user_map, or user_phone is in user_map but user_id is different
    if not request.session.get('user_id') or request.session.get('user_phone') not in user_map or user_map[request.session.get('user_phone')] != request.session.get('user_id'):
        request.session['user_id'] = str(uuid.uuid4())
        user_phone = generate_phone_number()
        user_map[user_phone] = request.session['user_id']
        request.session['user_phone'] = user_phone
        
    logger.debug(f'get_user_id > request.session: {dict(request.session)}')
    return JsonResponse({
            'user_id': request.session['user_id'],
            'user_phone': request.session['user_phone']
        })
