import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import voiceRouter from "./voice";
import aiRouter from "./ai";
import galleryRouter from "./gallery";
import customersRouter from "./customers";
import cadRouter from "./cad";
import imageRouter from "./image";
import messagesRouter from "./messages";
import uploadsRouter from "./uploads";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(voiceRouter);
router.use(aiRouter);
router.use(galleryRouter);
router.use(customersRouter);
router.use(cadRouter);
router.use(imageRouter);
router.use(messagesRouter);
router.use(uploadsRouter);

export default router;
