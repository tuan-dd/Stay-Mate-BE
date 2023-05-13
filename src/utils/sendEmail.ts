import { google } from 'googleapis';
import nodemailer from 'nodemailer';
import appConfig from '@/config/config';

const { clientId, clientSecret, refreshToken, redirectUrl, emailFrom } = appConfig.email;

const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUrl);

oAuth2Client.setCredentials({ refresh_token: refreshToken });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const sendMail = async (
  sixCode: number | string,
  email: string,
  text?: string,
): Promise<any> => {
  const accessToken = (await oAuth2Client.getAccessToken()) as string;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: emailFrom,
      clientId: clientId,
      clientSecret: clientSecret,
      refreshToken: refreshToken,
      accessToken: accessToken,
    },
  });
  return transporter.sendMail(
    {
      from: appConfig.email.emailFrom,
      to: `${email}`,
      subject: 'Hello ✔',
      text: ` Hello ${email} `,
      html: `<b>${text}${sixCode}</b>`,
    },
    (err, info) => {
      if (err) return err;
      return info;
    },
  );
};
