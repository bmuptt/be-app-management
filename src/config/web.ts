import express, { Request, Response, NextFunction } from 'express';
import { mainRouter } from '../router/main-api';
import { errorMiddleware } from '../middleware/error-middleware';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import limiter from '../middleware/ratelimiter-middleware';

dotenv.config();
export const web = express();

web.set('trust proxy', 1);
web.use(cookieParser());
web.use(express.urlencoded({ extended: false }));
web.use(express.json());

web.use((req, res, next) => {
  const origin = req.headers.origin;

  res.header('Access-Control-Allow-Origin', origin);
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }

  next();

})

web.use(limiter);
web.use(mainRouter);
web.use(errorMiddleware);
