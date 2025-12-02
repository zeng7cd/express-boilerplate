import type { ErrorRequestHandler } from "express";
import { StatusCodes } from "http-status-codes";
import { ServiceResponse } from "@/common/serviceResponse";
import { env } from "@/config/envConfig";
import { getAppPinoLogger } from "@/utils/pino";

const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
	const logger = getAppPinoLogger();
	logger.error({ err }, "An unexpected error occurred");

	const statusCode = err.statusCode ?? StatusCodes.INTERNAL_SERVER_ERROR;
	const message = err.message || "Internal Server Error";

	const responseData = {
		error: {
			code: err.code || "UNEXPECTED_ERROR",
			details: env.isProduction ? undefined : err.stack,
		},
	};

	const response = ServiceResponse.failure(message, responseData, statusCode);

	res.status(statusCode).json(response);
};

export default errorHandler;
