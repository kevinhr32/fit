release: python manage.py migrate && python manage.py collectstatic --noinput
web: gunicorn gymnisfit_core.wsgi --log-file -
