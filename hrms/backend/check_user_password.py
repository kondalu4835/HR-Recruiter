from auth_utils import verify_password
from database import SessionLocal
from models import User

session = SessionLocal()
try:
    user = session.query(User).filter(User.email == 'admin@hrms.com').first()
    print('user', user.email if user else None, user.role if user else None)
    print('hashed', user.hashed_password if user else None)
    if user:
        print('verify', verify_password('admin123', user.hashed_password))
finally:
    session.close()
