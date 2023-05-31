import { CognitoJwtVerifier } from "aws-jwt-verify";
import { assert } from "chai";
import { Action } from "routing-controllers";
import { User } from "../common/types";
import { loggerInstance } from "../services";

const logger = loggerInstance(__filename);

/**
 * function to check whether the given access/id token has authentication. 
 * It also checks whether the user has access to particular API based on the roles defined for the API
 * @param action is the response from frontend when a user signin
 * @param roles list of roles for a particular api
 * @returns boolean
 */
export async function authorizationChecker(action: Action, roles: string[]) {
    // action.request.user = {name:'cu', groups:[]} as User;
    // return true;
    assert(process.env.COGNITO_USER_POOL_ID != undefined && process.env.COGNITO_CLIENT_ID != undefined);
    const authHeader = action.request.headers['authorization'];
    if (!authHeader) return false;
    const token = authHeader.split(' ')[1]
    const verifier = CognitoJwtVerifier.create({
        userPoolId: process.env.COGNITO_USER_POOL_ID,
        tokenUse: "id",
        clientId: process.env.COGNITO_CLIENT_ID,
    });
    try {
        const payload = await verifier.verify(token);
        logger.info("Token is valid. Payload:" + JSON.stringify(payload));
        //action.request.user = {name:payload["cognito:username"], groups:payload["cognito:groups"]} as User;
        action.request.user = { name: payload["email"], groups: payload["cognito:groups"], cognitoId: payload["cognito:username"] } as User;
        logger.info(action.request.user);
        if (roles.find(role => !action.request.user.groups.includes(role))) {
            return false;
        }
        return true;
    } catch (e) {
        logger.error("Token not valid!");
        logger.error(e);
    }
    return false;
}

/**
 * function to get the user information
 * @param action is the response from frontend when a user signin
 * @returns user details
 */
export async function currentUserChecker(action: Action) {
    return action.request.user;
}