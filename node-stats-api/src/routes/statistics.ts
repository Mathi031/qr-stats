import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from "express";

import { validateMatrices, computeStatistics } from "../stats.js";

export const statisticsRouter = Router();

statisticsRouter.post(
  "/",
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const matrices = validateMatrices(req.body);
      res.json(computeStatistics(matrices));
    } catch (err) {
      next(err);
    }
  },
);
