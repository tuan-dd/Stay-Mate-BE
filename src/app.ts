/* eslint-disable @typescript-eslint/no-var-requires */

require('dotenv').config();
import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import indexRouter from './routes/index';

class App {
   public app: express.Application;
   private allowlist = ['http://localhost:5000/', 'http://localhost:3000'];
   constructor() {
      this.app = express();
      this.config();
      this.routerSetup();
   }

   private config() {
      this.app.use(helmet());
      this.app.use(cors({ origin: this.allowlist }));
      this.app.use(compression());
      this.app.use(logger('dev'));
      this.app.use(express.json());
      this.app.use(express.urlencoded({ extended: false }));
      this.app.use(cookieParser());
      this.app.use(express.static(path.join(__dirname, 'public')));
      require('./database/init.mongodb');
   }

   private routerSetup() {
      this.app.use('/', indexRouter);
   }
}

export default new App().app;
