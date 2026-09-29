import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { requestContext } from './middleware/requestContext.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.routes.js';
import metaRoutes from './routes/meta.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import purchasesRoutes from './routes/purchases.routes.js';
import transfersRoutes from './routes/transfers.routes.js';
import assignmentsRoutes from './routes/assignments.routes.js';
import expendituresRoutes from './routes/expenditures.routes.js';
import inventoryRoutes from './routes/inventory.routes.js';
import auditRoutes from './routes/audit.routes.js';

export const app=express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(requestContext);
app.use(helmet());
app.use(cors({origin:process.env.CORS_ORIGIN?.split(',') || false,credentials:false}));
app.use(express.json({limit:'200kb'}));
app.use(morgan(':method :url :status :response-time ms'));

app.get('/health',(_req,res)=>res.json({status:'ok'}));
app.use('/api/auth',authRoutes);
app.use('/api/meta',metaRoutes);
app.use('/api/dashboard',dashboardRoutes);
app.use('/api/purchases',purchasesRoutes);
app.use('/api/transfers',transfersRoutes);
app.use('/api/assignments',assignmentsRoutes);
app.use('/api/expenditures',expendituresRoutes);
app.use('/api/inventory',inventoryRoutes);
app.use('/api/audit',auditRoutes);

app.use(notFound);
app.use(errorHandler);
