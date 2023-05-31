import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserAttribute,
  CognitoUserPool,
  CookieStorage,
} from "amazon-cognito-identity-js";

import * as aws from "aws-sdk";

import generator from "generate-password";

import dotenv from "dotenv";
import { PortalUser, PortalUserSession } from "../models";
import { loggerInstance } from "./auditService";
import { sequelize } from "./dbService";
import { getPortalUser } from "./portalUserService";

dotenv.config();

const logger = loggerInstance(__filename);

aws.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

//User Pool Information contains UserPoolId, App ClientId
var UserPoolInfo = {
  UserPoolId: String(process.env.COGNITO_USER_POOL_ID),
  ClientId: String(process.env.COGNITO_CLIENT_ID),
  Storage: new CookieStorage({
    domain: process.env.AUTH0_DOMAIN,
  }),
};

//userPool
var userPool = new CognitoUserPool(UserPoolInfo);

const CISProvider = new aws.CognitoIdentityServiceProvider({
  region: process.env.AWS_DEFAULT_REGION,
});

/**
 * function to do signup of a user in the Cognito Pool
 * @param username mandatory
 * @param firstname mandatory
 * @param lastname mandatory
 * @param email optional or username can be used here
 * @returns signup of user to the pool and add record to the database
 */

export const signup = async function (
  username: string,
  firstname: string,
  lastname: string,
  email: string
) {
  var userAttributes: CognitoUserAttribute[] = [];

  var Name = {
    Name: "name",
    Value: firstname + " " + lastname,
  };

  var FirstName = {
    Name: "given_name",
    Value: firstname,
  };

  var LastName = {
    Name: "family_name",
    Value: lastname,
  };

  var Email = {
    Name: "email",
    Value: email || username,
  };

  //List of Attributes being used as part of Signup functionality

  var EmailAttribute = new CognitoUserAttribute(Email);
  var NameAttribute = new CognitoUserAttribute(Name);
  var FirstNameAttribute = new CognitoUserAttribute(FirstName);
  var LastNameAttribute = new CognitoUserAttribute(LastName);

  //Other attirbutes will be added based on the configuration

  //Adding attributes to CognitoUserAttributes
  userAttributes.push(EmailAttribute);
  userAttributes.push(NameAttribute);
  userAttributes.push(FirstNameAttribute);
  userAttributes.push(LastNameAttribute);

  var temp_pwd = generator.generate({
    length: 8,
    numbers: true,
  });

  var CognitoParams = {
    UserPoolId: String(process.env.COGNITO_USER_POOL_ID),
    Username: username,
    UserAttributes: userAttributes,
    TemporaryPassword: temp_pwd,
  };

  const cgnResponse = await CISProvider.adminCreateUser(
    CognitoParams
  ).promise();

  const groupName =
    process.env.COGNITO_USER_POOL_CUSTOMER_GROUP != "Customer"
      ? "Broker"
      : "Customer";

  // Add user to cognito user Group
  addUsertoPoolGroup(username, groupName);

  // TODO:: Remove dummy gender while saving PortalUser details.
  const User = new PortalUser({
    cognitoId: cgnResponse.User!.Username,
    cognitoGroup: groupName,
    firstName: cgnResponse.User!.Attributes!.find(
      (elem) => elem.Name === "given_name"
    )!.Value,
    lastName: cgnResponse.User!.Attributes!.find(
      (elem) => elem.Name === "family_name"
    )!.Value,
    Phone: "",
    email: cgnResponse.User!.Attributes!.find((elem) => elem.Name === "email")!
      .Value,
    gender: "Male",
  });

  sequelize
    .sync()
    .then(() => {
      User.save();
    })
    .catch((error) => {
      logger.error("Error creating user: ", error);
    });

  // Payload will be modified further based on requirement
  return {
    user: JSON.stringify(cgnResponse.User),
  };
};

/**
 * function to add user from user pool group to selected Group in the pool
 * @param username mandatory
 * @param groupName mandatory
 */

const addUsertoPoolGroup = (username: string, groupName: string) => {
  const groupParams = {
    UserPoolId: String(process.env.COGNITO_USER_POOL_ID),
    GroupName: String(groupName),
    Username: username,
  };

  CISProvider.adminAddUserToGroup(groupParams, (err, data) => {
    if (err) logger.info(err);
    else logger.info(data);
    return {
      status:
        groupParams.Username +
        " added successfully to " +
        groupParams.GroupName,
    };
  });
};

/**
 * function to do login operation to userpool in cognito
 * @param username mandatory
 * @param password mandatory
 * @param email optional
 * @returns login response from the cognito and further authentication tokens can be extracted from the response
 */
export const login = function (
  username: string,
  password: string,
  email: string
) {
  return new Promise((success, reject) => {
    logger.defaultMeta.eventType = "login";
    logger.defaultMeta.eventParams = { username };
    var authData = {
      Username: username,
      Password: password,
    };

    var authDetails = new AuthenticationDetails(authData);

    var userData = {
      Username: username,
      Pool: userPool,
      Storage: new CookieStorage({
        domain: process.env.AUTH0_DOMAIN,
      }),
    };

    var cognitoUser = new CognitoUser(userData);
    cognitoUser.authenticateUser(authDetails, {
      onSuccess: async function (res) {
        var accessToken = res.getAccessToken().getJwtToken();
        var idToken = res.getIdToken().getJwtToken();

        const session = new PortalUserSession({
          cognitoId: cognitoUser.getSignInUserSession().getIdToken().payload[
            "cognito:username"
          ],
          loginTime: new Date(
            cognitoUser.getSignInUserSession().getIdToken().payload[
              "auth_time"
            ] * 1000
          ),
          expiryTime: new Date(
            cognitoUser.getSignInUserSession().getIdToken().payload["exp"] *
              1000
          ),
        });

        session.save();

        logger.info(`${username} has been logged-In`);
        logger.defaultMeta.status = "successsss";
        success(cognitoUser);
      },
      onFailure: function (err: any): void {
        reject(err);
        logger.error("Error", err);
      },
    });
  });
};

/**
 * function used to invoke when user forgots the password
 * @param username mandatory
 * @returns mail has been sent or not with verification code
 */

export const forgotPassword = function (username: string) {
  return new Promise((success, reject) => {
    var userData = {
      Username: username,
      Pool: userPool,
    };

    var cognitoUser = new CognitoUser(userData);

    const params = {
      ClientId: String(process.env.COGNITO_CLIENT_ID),
      Username: username,
    };

    let temp = CISProvider.forgotPassword(params, (err, data) => {
      if (err) {
        reject(err);
      } else {
        success({
          status:
            "Verification code has been sent to the registered email address",
        });
      }
    });
  });
};

/**
 * function to do reset password for the user at a later point in time when user forgot the password
 * @param username mandatory
 * @param verificationCode mandatory and this value from the email to the user
 * @param newPassword mandatory to reset password
 * @returns Password successful status
 */

export const resetPassword = async function (
  username: string,
  verificationCode: string,
  newPassword: string
) {
  return new Promise((success, reject) => {
    var userData = {
      Username: username,
      Pool: userPool,
    };
    var cognitoUser = new CognitoUser(userData);

    cognitoUser.confirmPassword(verificationCode, newPassword, {
      onSuccess() {
        success({ status: "Password reset successful" });
      },
      onFailure(err) {
        reject({ status: "Password reset not successful!" });
      },
    });
  });
};

/**
 * functionality to do reset password with newPassword
 * @param username is mail provided at the time of signup functionality
 * @param newPassword new Password
 * @returns
 */

export const initResetPassword = async function (
  username: string,
  newPassword: string
) {
  return new Promise(async (success, reject) => {
    var userData = {
      Username: username,
      Pool: userPool,
    };

    const pwdParams = {
      Password: newPassword,
      Permanent: true,
      Username: username,
      UserPoolId: userData.Pool.getUserPoolId(),
    };

    let res = await CISProvider.adminSetUserPassword(
      pwdParams,
      function (err, data) {
        if (err) {
          reject(err.message);
        } else {
          if (data) {
            success({ status: "Password reset successful" });
          } else {
            reject({ status: "Password reset unsuccessful" });
          }
        }
      }
    );
  });
};

/**
 * userExistence
 * @param username alias regiestered email can be passed to get the user Existince status in db
 * @returns user exist or not
 */

export const userExistence = async function (username: string) {
  return new Promise(async (success, reject) => {
    const portalUser = await getPortalUser({ email: username }).catch((err) => {
      reject("error: " + err);
    });
    portalUser
      ? success({
          user: portalUser.cognitoId,
          email: portalUser.email,
          status: "Exists",
        })
      : success({
          user: null,
          email: username,
          status: "Not Exists",
        });
  });
};

/**
 * function to update email_verified attribute in cognito
 * @param username to be provided to forcibly update the email_verified attribute to true once after initial reset password
 * @returns status of updation of email_verified
 */

export const updatedAdminEmailAttribute = async function (username: string) {
  logger.info("username in updatedAdminEmailAttribute: " + username);

  const attribParams = {
    UserPoolId: userPool.getUserPoolId(),
    Username: username,
    UserAttributes: [
      {
        Name: "email_verified",
        Value: "true",
      },
    ],
  };

  const cgnResponse = await CISProvider.adminUpdateUserAttributes(
    attribParams
  ).promise();

  return cgnResponse;
};

// export const confirmUser = function (username, ConfirmationCode) {
//     var userData = {
//         Username: username,
//         Pool: userPool
//     }
//     var cognitoUser = new CognitoUser(userData)

//     cognitoUser.confirmRegistration(confirmationCode, true, function (err, res) {
//         if (err) {
//             logger.info(err.mesage || JSON.stringify(err));
//             return;
//         }
//         logger.info('Result : ' + res);
//     })
// }
