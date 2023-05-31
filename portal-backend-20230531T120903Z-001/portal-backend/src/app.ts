import 'reflect-metadata';
import {
  createExpressServer,
  getMetadataArgsStorage,
} from 'routing-controllers';
import {
  authorizationChecker,
  currentUserChecker,
} from './middleware/cognito-auth';

import {
  AuthController,
  CodatController,
  CompaniesHouseController,
  LoanController,
  OpenBankingController,
  PostCoderController,
  TruNarrativeController,
} from './controllers';

import * as swaggerUi from 'swagger-ui-express';

import { defaultMetadataStorage } from 'class-transformer/cjs/storage';
import { validationMetadatasToSchemas } from 'class-validator-jsonschema';
import dotenv from 'dotenv';
import { ReferenceObject, SchemaObject } from 'openapi3-ts/src/model/OpenApi';
import { routingControllersToSpec } from 'routing-controllers-openapi';
import { createdb, loggerInstance, sequelize } from './services';

const logger = loggerInstance('app');
dotenv.config();

let server: any;
const port = process.env.PORT;

export const app = createExpressServer({
  cors: true,
  routePrefix: '',
  controllers: [
    AuthController,
    LoanController,
    CompaniesHouseController,
    PostCoderController,
    TruNarrativeController,
    CodatController,
    OpenBankingController,
  ],
  authorizationChecker: authorizationChecker,
  currentUserChecker: currentUserChecker,
});

const initServer = async () => {
  createdb()
    .then((res) => {
      if (res) {
        sequelize.sync({ force: false, alter: true }).then((res) => {
          if (res) {
            logger.info('sequelize instance initialized successfully');
          }
        });
      }
    })
    .catch((err) => {
      logger.info(`error creating Database : ${err}`);
    });

  setupSwagger();
  server = app.listen(port, (req: any, res: any) => {
    logger.info(
      `⚡️[server]: Server is running at ${process.env.HOST_SERVER}:${port}`
    );
  });
};

export const setupSwagger = async function () {
  const storage = getMetadataArgsStorage();
  const schemas: any = validationMetadatasToSchemas({
    classTransformerMetadataStorage: defaultMetadataStorage,
    refPointerPrefix: '#/components/schemas/',
  }) as { [schema: string]: SchemaObject | ReferenceObject };

  const swaggerUiOptions = {
    explorer: true,
  };

  let spec = routingControllersToSpec(
    storage,
    {
      authorizationChecker: authorizationChecker,
      currentUserChecker: currentUserChecker,
    },
    {
      info: {
        title: 'Portal API',
        version: 'v1',
      },
      components: {
        schemas,
        securitySchemes: {
          Authorization: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            value: 'Bearer <JWT token>',
          },
        },
      },
      security: [{ Authorization: [] }],
    }
  );

  app.use('/swagger', swaggerUi.serve, swaggerUi.setup(spec, swaggerUiOptions));
};

initServer();
