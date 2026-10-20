import { Router, type IRouter } from "express";
import authRouter from "./auth";

const router: IRouter = Router();

router.use(authRouter);

export default router;
