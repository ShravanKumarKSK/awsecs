import "reflect-metadata";
import {
  Authorized,
  BodyParam,
  CurrentUser,
  Get,
  JsonController,
  Post
} from "routing-controllers";
import {
  forgotPassword,
  initResetPassword,
  login,
  resetPassword,
  signup,
  updatedAdminEmailAttribute,
  userExistence,
} from "../services";

import { User } from "../common/types";

@JsonController()
export class AuthController {
  @Post("/signup")
  async signup(
    @BodyParam("username") userName: string,
    @BodyParam("firstname") firstname: string,
    @BodyParam("lastname") lastname: string,
    @BodyParam("email") email: string
  ) {
    var response = {};
    try {
      response = await signup(userName, firstname, lastname, email);
    } catch (err) {
      throw new Error(err.message);
    }
    return response;
  }

  @Post("/login")
  async login(
    @BodyParam("username") userName: string,
    @BodyParam("password") password: string,
    @BodyParam("email") email: string
  ) {
    var response = {};
    // if (!userName || !password || !email) {
    //   throw new Error("Missing required parameters");
    // }

    try {
      response = await login(userName, password, email);
    } catch (err) {
      //throw new Error(err.message)
      return {
        Error: err.message,
      };
    }

    return response;
  }

  @Post("/forgotPassword")
  async forgotPassword(@BodyParam("username") userName: string) {
    var response = {};
    try {
      response = forgotPassword(userName);
    } catch (err) {
      throw new Error(err.message);
    }
    return response;
  }

  @Post("/resetPassword")
  async resetPassword(
    @BodyParam("username") userName: string,
    @BodyParam("verificationCode") verificationCode: string,
    @BodyParam("newPassword") newPassword: string
  ) {
    var response = {};
    try {
      response = resetPassword(userName, verificationCode, newPassword);
    } catch (err) {
      throw new Error(err.message);
    }
    return response;
  }

  @Post("/initResetPassword")
  async initResetPassword(
    @BodyParam("username") userName: string,
    @BodyParam("newPassword") newPassword: string
  ) {
    var response = {};
    try {
      response = initResetPassword(userName, newPassword);
    } catch (err) {
      throw new Error(err.message);
    }
    return response;
  }

  @Post("/userExistence")
  async userExistence(@BodyParam("username") userName: string) {
    var response = {};
    try {
      response = userExistence(userName);
    } catch (err) {
      throw new Error(err.message);
    }
    return response;
  }

  @Get("/onNewPasswordSet")
  @Authorized()
  async onNewPasswordSet(@CurrentUser() user: User) {
    var response = {};
    try {
      response = updatedAdminEmailAttribute(user.name);
    } catch (err) {
      throw new Error(err.message);
    }
    return response;
  }
}
