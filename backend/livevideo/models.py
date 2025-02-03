from django.db import models


class ConnectionLog(models.Model):
    """
    Model to log connection details for live video sessions.
    - timestamp (DateTimeField): Date and time when the connection was logged.
    - *_candidate_type (CharField): The type of the local and remote candidate (e.g., host, srflx, prflx, relay).
    - *_protocol (CharField): The protocol used by the local and remote candidate (e.g., UDP, TCP).
    """
    timestamp = models.DateTimeField()
    local_candidate_type = models.CharField(max_length=10)
    local_protocol = models.CharField(max_length=10)
    remote_candidate_type = models.CharField(max_length=10)
    remote_protocol = models.CharField(max_length=10)
