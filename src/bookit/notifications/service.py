import logging

from fastapi import BackgroundTasks
from fastapi_mail import FastMail, MessageSchema, MessageType
from pydantic import EmailStr

logger = logging.getLogger(__name__)


class EmailService:
    def __init__(self, mail_client: FastMail):
        self.mail_client = mail_client

    async def _safe_send(
        self,
        message: MessageSchema,
        template_name: str,
    ) -> None:
        try:
            await self.mail_client.send_message(
                message,
                template_name=template_name,
            )
        except Exception:
            logger.exception(
                "Failed to send email to %s",
                message.recipients,
            )

    def _send(
        self,
        background_tasks: BackgroundTasks,
        message: MessageSchema,
        template_name: str,
    ) -> None:
        background_tasks.add_task(
            self._safe_send,
            message,
            template_name,
        )

    def send_verification_email(
        self, mail_to: EmailStr, token: str, base_url: str, bg_tasks: BackgroundTasks
    ):

        message = MessageSchema(
            subject="confirmation of registration in BookIt",
            recipients=[mail_to],
            template_body={"token": token, "base_url": base_url},
            subtype=MessageType.html,
        )

        self._send(bg_tasks, message, template_name="verify_email.html")

    def send_new_device_email(
        self,
        mail_to: EmailStr,
        code: str,
        ip: str | None,
        ua: str | None,
        bg_tasks: BackgroundTasks,
    ):
        message = MessageSchema(
            subject="BookIt: Login from a new device",
            recipients=[mail_to],
            template_body={"code": code, "ip": ip, "ua": ua},
            subtype=MessageType.html,
        )
        self._send(bg_tasks, message, template_name="new_device.html")

    def send_password_reset_email(
        self,
        mail_to: EmailStr,
        token: str,
        base_url: str,
        bg_tasks: BackgroundTasks,
    ):
        message = MessageSchema(
            subject="BookIt: Password Reset Request",
            recipients=[mail_to],
            template_body={"token": token, "base_url": base_url},
            subtype=MessageType.html,
        )
        self._send(bg_tasks, message, template_name="reset_password.html")

    def send_security_alert_email(self, mail_to: EmailStr, bg_tasks: BackgroundTasks):
        message = MessageSchema(
            subject="Security Alert: Multiple Failed Login Attempts",
            recipients=[mail_to],
            template_body={},
            subtype=MessageType.html,
        )
        self._send(bg_tasks, message, template_name="security_alert.html")
