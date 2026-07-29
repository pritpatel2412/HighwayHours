import os
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Automatically creates or updates default superuser"

    def handle(self, *args, **options):
        User = get_user_model()
        email = os.environ.get("ADMIN_EMAIL", "pritptl2412@gmail.com")
        password = os.environ.get("ADMIN_PASSWORD", "Prit_p@tel2412")

        # Create/Update for email as username
        u1, created1 = User.objects.get_or_create(username=email, defaults={"email": email})
        u1.email = email
        u1.is_staff = True
        u1.is_superuser = True
        u1.set_password(password)
        u1.save()

        # Create/Update for short username
        short_username = email.split("@")[0]
        u2, created2 = User.objects.get_or_create(username=short_username, defaults={"email": email})
        u2.email = email
        u2.is_staff = True
        u2.is_superuser = True
        u2.set_password(password)
        u2.save()

        self.stdout.write(
            self.style.SUCCESS(f"Superuser '{email}' and '{short_username}' configured successfully!")
        )
