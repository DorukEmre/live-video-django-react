import json
from django.http import JsonResponse
import random

def get_randomNumber(request):
    random_number = random.randint(1, 100)
    return JsonResponse({'random_number': random_number})