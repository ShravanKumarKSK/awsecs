const jwtAuthz = require("express-jwt-authz");

export const checkPermissions = (permissions: string | string[]) => {
  return jwtAuthz([permissions], {
    customScopeKey: "permissions",
    customUserKey: "auth",
    checkAllScopes: true,
    failWithError: true
  });
};