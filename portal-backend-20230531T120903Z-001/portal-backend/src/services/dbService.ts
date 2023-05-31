import mysql from "mysql2";
import { resolve } from "path";

import dotenv from "dotenv";

import { Sequelize } from "sequelize-typescript";
import { loggerInstance } from "./auditService";

dotenv.config();

const logger = loggerInstance(__filename);


export const createdb = async function () {
  return new Promise((success, reject) => {
    const conn = mysql.createPool({
      host: process.env.MYSQL_HOST,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
    });

    logger.defaultMeta.eventyType = "sequelizeInstance";
    logger.defaultMeta.eventParams = {};
    conn.query(
      `CREATE DATABASE IF NOT EXISTS ${process.env.MYSQL_DB}`,
      (err) => {
        if (err) {
          logger.defaultMeta.status = "failure";
          logger.error(err);
          reject(err);
        } else {
          logger.info("Database initialized", { status: "success" });
          success("Database initalized")         
        }
      }
    );
    conn.end;
  });
};

export const sequelize = new Sequelize({
  dialect: "mysql",
  host: process.env.MYSQL_HOST,
  username: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DB,
  logging: process.env.SEQUELIZE_LOG === "true",
  port: 3306,
  models: [resolve(__dirname, "../models/*.model.js")],
});
