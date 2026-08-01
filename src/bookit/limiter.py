from slowapi import Limiter
from slowapi.util import get_remote_address

# get_remote_address берет IP-адрес пользователя из запроса
limiter = Limiter(key_func=get_remote_address)
