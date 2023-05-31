import { defaultMetadataStorage } from "class-transformer/cjs/storage";
import { validationMetadatasToSchemas } from "class-validator-jsonschema";
import { ReferenceObject, SchemaObject } from "openapi3-ts/src/model/OpenApi";
import { routingControllersToSpec } from "routing-controllers-openapi";

import { OpenAPIObject } from "openapi3-ts";
import { getMetadataArgsStorage } from "routing-controllers";
import {
  authorizationChecker,
  currentUserChecker,
} from "../middleware/cognito-auth";
import { loggerInstance } from './auditService'


const logger = loggerInstance(__filename);

const storage = getMetadataArgsStorage();
const schemas: any = validationMetadatasToSchemas({
  classTransformerMetadataStorage: defaultMetadataStorage,
  refPointerPrefix: "#/components/schemas/",
}) as { [schema: string]: SchemaObject | ReferenceObject };

export const swaggerUiOptions = {
  explorer: true,
};

export let spec: OpenAPIObject = routingControllersToSpec(
  storage,
  {
    authorizationChecker: authorizationChecker,
    currentUserChecker: currentUserChecker,
  },
  {
    components: {
      schemas,
      securitySchemes: {
        Authorization: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          value: "Bearer <JWT token>",
        },
      },
    },
    security: [{ Authroization: [] }],
  }
);
