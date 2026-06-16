import smtplib
import logging
import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from app.core.config import settings

logger = logging.getLogger("app.mail")

def send_email(*, to_email: str, subject: str, text_content: str, html_content: str = None) -> bool:
    """Envía un email usando SMTP según la configuración de Settings.
    Si no está configurado el host, puerto o credenciales, se loguea en consola.
    """
    if not settings.EMAIL_HOST or not settings.EMAIL_HOST_USER or not settings.EMAIL_HOST_PASSWORD:
        logger.warning(
            f"SMTP no está completamente configurado. Se omite el envío real.\n"
            f"Simulación de envío a: {to_email}\n"
            f"Asunto: {subject}\n"
            f"Cuerpo texto:\n{text_content}"
        )
        return True

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.DEFAULT_FROM_EMAIL or settings.EMAIL_HOST_USER
    msg["To"] = to_email
    if settings.DEFAULT_REPLY_TO:
        msg["Reply-To"] = settings.DEFAULT_REPLY_TO

    msg.attach(MIMEText(text_content, "plain", "utf-8"))
    if html_content:
        msg.attach(MIMEText(html_content, "html", "utf-8"))

    try:
        # Usar puerto 465 con SSL directo, o STARTTLS en otros puertos
        if settings.EMAIL_PORT == 465 or settings.EMAIL_USE_SSL:
            server = smtplib.SMTP_SSL(settings.EMAIL_HOST, settings.EMAIL_PORT, timeout=10)
        else:
            server = smtplib.SMTP(settings.EMAIL_HOST, settings.EMAIL_PORT, timeout=10)
            if settings.EMAIL_USE_TLS:
                server.starttls()

        server.login(settings.EMAIL_HOST_USER, settings.EMAIL_HOST_PASSWORD)
        server.sendmail(msg["From"], [to_email], msg.as_string())
        server.quit()
        logger.info(f"Email enviado exitosamente a {to_email}")
        return True
    except Exception as e:
        logger.error(f"Error enviando email a {to_email}: {e}", exc_info=True)
        return False

def send_password_reset_email(to_email: str, name: str, reset_url: str, expires_hours: int = 2) -> bool:
    """Renders and sends a branded password reset email using FaberLoom's premium dark mode theme."""
    subject = "[FaberLoom] Restablecer contraseña"
    
    text_content = (
        f"Hola, {name or to_email}:\n\n"
        f"Recibimos una solicitud para restablecer tu contraseña en FaberLoom.\n"
        f"Haz clic en el siguiente enlace o cópialo en tu navegador para continuar:\n"
        f"{reset_url}\n\n"
        f"Este enlace expirará en {expires_hours} horas.\n"
        f"Si no solicitaste este cambio, puedes ignorar este correo.\n\n"
        f"El equipo de FaberLoom"
    )
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Restablecer contraseña</title>
        <style>
            body {{
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                background-color: #1e1b18;
                color: #f5f2eb;
                margin: 0;
                padding: 0;
            }}
            .container {{
                max-width: 600px;
                margin: 40px auto;
                background-color: #2b2521;
                border: 1px solid #3e3731;
                border-radius: 8px;
                padding: 40px 30px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            }}
            .logo {{
                font-size: 24px;
                font-weight: bold;
                color: #f5f2eb;
                margin-bottom: 24px;
                text-align: center;
                letter-spacing: 0.5px;
            }}
            .logo-asterisk {{
                color: #d18e73;
            }}
            .content {{
                font-size: 15px;
                line-height: 1.6;
                color: #d8d3c9;
                margin-bottom: 30px;
            }}
            .btn-container {{
                text-align: center;
                margin: 30px 0;
            }}
            .btn {{
                background-color: #d18e73;
                color: #1e1b18 !important;
                text-decoration: none;
                padding: 12px 24px;
                border-radius: 4px;
                font-size: 14px;
                font-weight: 600;
                display: inline-block;
                letter-spacing: 0.3px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            }}
            .footer {{
                font-size: 12px;
                color: #7c756e;
                text-align: center;
                border-top: 1px solid #3e3731;
                padding-top: 20px;
                margin-top: 30px;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="logo">
                Faber<span class="logo-asterisk">*</span>loom
            </div>
            <div class="content">
                <p>Hola, <strong>{name or to_email}</strong>:</p>
                <p>Recibimos una solicitud para restablecer tu contraseña en FaberLoom. Haz clic en el botón de abajo para configurar tu nueva contraseña:</p>
            </div>
            <div class="btn-container">
                <a href="{reset_url}" class="btn">Restablecer Contraseña</a>
            </div>
            <div class="content">
                <p>Este enlace es válido por <strong>{expires_hours} horas</strong> y solo puede ser utilizado una vez.</p>
                <p>Si no solicitaste este cambio, puedes ignorar este correo de forma segura.</p>
            </div>
            <div class="footer">
                <p>Acceso provisto por tu administrador · sesión segura</p>
                <p>&copy; {datetime.date.today().year} FaberLoom. Todos los derechos reservados.</p>
            </div>
        </div>
    </body>
    </html>
    """
    return send_email(to_email=to_email, subject=subject, text_content=text_content, html_content=html_content)
