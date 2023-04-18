import { google } from 'googleapis';
import nodemailer from 'nodemailer';

const CLIENT_ID: string | undefined = process.env.CLIENT_ID;
const CLIENT_SECRET: string | undefined = process.env.CLIENT_SECRET;
const REDIRECT_URL: string | undefined = process.env.REDIRECT_URL;
const REFRESH_TOKEN: string | undefined = process.env.REFRESH_TOKEN;

interface Email {
  from: string; // sender address
  to: string; // list of receivers
  subject: string; // Subject line
  text: string; // plain text body
  html: string; // html body
}
const oAuth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URL,
);

oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const sendMail = async (email: Email): Promise<any> => {
  const accessToken = (await oAuth2Client.getAccessToken()) as string;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: 'huynh.atuan.97@gmail.com',
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      refreshToken: REFRESH_TOKEN,
      accessToken: accessToken,
    },
  });
  return transporter.sendMail(
    {
      ...email,
    },
    (err, info) => {
      if (err) return err;
      return info;
    },
  );
};
