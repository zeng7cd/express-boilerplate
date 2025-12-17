import { type Request, type Response, type NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { z, ZodError } from 'zod';

import { ServiceResponse } from '@/shared/utils/serviceResponse';

export const validate = (schema: z.ZodTypeAny) => (req: Request, res: Response, next: NextFunction) => {
  try {
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      const errorMessages = error.issues.map((issue) => ({
        message: `${issue.path.join('.')} is ${issue.message}`,
      }));
      const serviceResponse = ServiceResponse.failure('Invalid input', errorMessages, StatusCodes.BAD_REQUEST);
      res.status(serviceResponse.statusCode).send(serviceResponse);
    } else {
      const serviceResponse = ServiceResponse.failure('Internal server error', null, StatusCodes.INTERNAL_SERVER_ERROR);
      res.status(serviceResponse.statusCode).send(serviceResponse);
    }
  }
};
