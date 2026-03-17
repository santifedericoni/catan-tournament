import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #8B4513;">🏰 Catan Tournament</h1>
        <h2>Restablecer contraseña</h2>
        <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
        <p>Hacé click en el botón de abajo para elegir una nueva contraseña:</p>
        <a href="${resetUrl}"
           style="display:inline-block;padding:12px 24px;background-color:#1976d2;
                  color:#fff;text-decoration:none;border-radius:4px;margin:16px 0;">
          Restablecer contraseña
        </a>
        <p style="color:#666;font-size:14px;">
          Este enlace expirará en <strong>1 hora</strong>.
        </p>
        <p style="color:#666;font-size:14px;">
          Si no solicitaste restablecer tu contraseña, podés ignorar este email.
          Tu contraseña no será cambiada.
        </p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
        <p style="color:#999;font-size:12px;">
          Si el botón no funciona, copiá y pegá este enlace en tu navegador:<br/>
          <a href="${resetUrl}" style="color:#1976d2;">${resetUrl}</a>
        </p>
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || '"Catan Tournament" <noreply@catantournament.com>',
        to,
        subject: 'Restablecer contraseña — Catan Tournament',
        html,
      });
    } catch (err) {
      this.logger.error(`Failed to send reset email to ${to}`, err);
      throw err;
    }
  }
}
