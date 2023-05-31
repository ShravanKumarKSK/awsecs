import AWS from "aws-sdk";
import ejs from "ejs";
import moment from "moment";
import puppeteer from "puppeteer";
import { indicativeHoT } from "./headOfTermsService";
import { getLoanApplication } from "./loanApplicationService";
import { getPortalUser } from "./portalUserService";
import { loggerInstance } from './auditService'
const path = require("path");

//options to format pdf
// export const options = {
//   format: 'Letter',
//   // border: {
//   //   top: '0.01in',
//   //   right: '0.1in',
//   //   bottom: '0.1in',
//   //   left: '0.1in'
//   // }
// }



const logger = loggerInstance(__filename);

const ses = new AWS.SES({
  region: process.env.AWS_DEFAULT_REGION,
});

// Function to create MIME message
export function createMimeMessage(mailOptions) {
  const mailcomposer = require("mailcomposer");
  const message = mailcomposer(mailOptions);
  return new Promise((resolve, reject) => {
    message.build((error, message) => {
      if (error) {
        reject(error);
      } else {
        resolve(message);
      }
    });
  });
}

//send email using aws ses sendRawEmail
export const sendMail = (params) => {
  return new Promise((resolve, reject) => {
    ses.sendRawEmail(params, (error, data) => {
      {
        if (error) {
          reject(error);
        } else {
          resolve(data);
        }
      }
    });
  });
};

/**
 * function to send emails to key individuals
 * @param cognitoId
 * @returns Message Id
 */
export async function sendEmailsToKeyIndividuals(cognitoId) {
  try {
    //fetch loan application details from db
    const loanInput: any = await getLoanApplication(cognitoId);
    const loanInputDetails = loanInput.dataValues;
    const keyIndividuals = loanInputDetails.company.keyIndividuals;
    //if there are no key individuals then throw error
    if (keyIndividuals.length == 0) {
      throw new Error("No Key Individuals to send Emails");
    }
    //if business type is SoleTrader then borrower is key individual else company name
    const borrower =
      loanInputDetails.company.businessType === "SoleTrader"
        ? `${loanInputDetails.company.keyIndividuals[0].firstName} ${loanInputDetails.company.keyIndividuals[0].lastName}`
        : loanInputDetails.company.name;
    //fetch indicative HoT
    const indicativeHot = await indicativeHoT(
      loanInputDetails.loanAmount,
      loanInputDetails.loanTerm,
      loanInputDetails.loanPurpose,
      borrower
    );
    let addressIndex = loanInputDetails.company.addresses.findIndex(
      (type) => type.addressType == "REGISTERED_ADDRESS"
    );
    const requiredAddress = loanInputDetails.company.addresses[addressIndex];
    const input = {
      ...indicativeHot,
      ...loanInputDetails,
      ...{ requiredAddress: requiredAddress },
      ...{ currentDate: moment().format("DD MMMM YY") },
    };
    // path for html .ejs file
    const htmlPath = path.join(
      __dirname,
      "../..",
      "src/config/indicativeHot.ejs"
    );
    let info: any;
    let finalOutput;
    for (let i = 0; i < keyIndividuals.length; i++) {
      var inputData = { ...input, ...keyIndividuals[i].dataValues };
      var requiredHtml = await ejs.renderFile(htmlPath, inputData);
      var obtainedDocumnet = await pdfGeneratorHtml(requiredHtml);
      info = {
        from: `${process.env.SES_SENDER_EMAIL}`,
        to: keyIndividuals[i].email,
        subject: "Indicative Head of Terms",
        generateTextFromHtml: true,
        html: requiredHtml,
        attachments: [
          {
            filename: "Indicative HoT.pdf",
            content: obtainedDocumnet,
          },
        ],
      };
      logger.info(info.to);
      // Convert attachments to MIME format
      const params = await {
        RawMessage: {
          Data: await createMimeMessage(info),
        },
      };
      var output = await sendMail(params);
      finalOutput = { ...{ output: output }, ...{ finalOutput: finalOutput } };
    }
    return await finalOutput;
  } catch (err) {
    logger.info("error message", err.message);
    return err.message;
  }
}

//to create pdf for a given html
// const document = (html, options) => {
//   return new Promise((resolve, reject) => {
//     pdf.create(html, options).toStream((err, stream) => {
//       if (err) { reject(err); }
//       else { resolve(stream) };
//     });
//   })
// }

// /**
//  * function to generate PDF for a given HTML
//  * @param sampleHtml
//  * @param options
//  * @returns generated PDF File
//  */
// export async function pdfGeneratorHtml1(sampleHtml, options) {
//   try {
//     const requiredDocument = await document(sampleHtml, options)
//     return requiredDocument
//   }
//   catch (error) {
//     logger.info(error)
//     return error
//   }
// }

/**
 * function to download PDF
 * @param cognitoId
 * @returns PDF
 */
export async function downloadHoT(cognitoId) {
  try {
    //fetch portal user details
    const userDetails = (await getPortalUser({ cognitoId: cognitoId }))
      .dataValues;
    //fetch loan application details
    const loanInput: any = await getLoanApplication(cognitoId);
    const loanInputDetails = loanInput.dataValues;
    const borrower =
      loanInputDetails.company.businessType === "SoleTrader"
        ? `${loanInputDetails.company.keyIndividuals[0].firstName} ${loanInputDetails.company.keyIndividuals[0].lastName}`
        : loanInputDetails.company.name;
    const indicativeHot = await indicativeHoT(
      loanInputDetails.loanAmount,
      loanInputDetails.loanTerm,
      loanInputDetails.loanPurpose,
      borrower
    );
    let addressIndex = loanInputDetails.company.addresses.findIndex(
      (type) => type.addressType == "REGISTERED_ADDRESS"
    );
    const requiredAddress = loanInputDetails.company.addresses[addressIndex];
    const input = {
      ...indicativeHot,
      ...userDetails,
      ...loanInputDetails,
      ...{ requiredAddress: requiredAddress },
      ...{ currentDate: moment().format("DD MMMM YY") },
    };
    const htmlPathHOT = path.join(
      __dirname,
      "../..",
      "src/config/indicativeHot.ejs"
    );
    const requiredHtml = await ejs.renderFile(htmlPathHOT, input);
    const requirePDF = await pdfGeneratorHtml(requiredHtml);
    return requirePDF;
  } catch (error) {
    return error.message;
  }
}

// export async function sendEmailsTrail1(req, res, fromAddress, toAddress, name) {
//   //const name = {"name" : ['Kiran', 'Gayatri']}
//   const indicativeHead = await indicativeHoT(10000,24,"VAT","ABC")
//   let input = {...{"name": name},...indicativeHead}
//   //const sampleFile = sampleHtml(input)
//   const obtainedDocumnet = await pdfGeneratorHtml(req,res, sampleHtml(input,name))
//   const sendMail = (params) => {
//     return new Promise((resolve, reject) => {
//       ses.sendRawEmail(params, (error, data) => {
//         {
//           if (error) { reject(error);}
//           else {resolve(data)};
//       }
//       })
//     })
//   }

//   let info
//   try {
//     // var transport = nodemailer.createTransport(sesTransport({
//     //     accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//     //     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//     //     region: process.env.AWS_DEFAULT_REGION
//     //   }));
//     //logger.info(userEmails)
//     info = {
//       //from: "sai.kothawadla@recognisebank.co.uk",
//       from : fromAddress,
//       //to: ["kiran.bedi@recognisebank.co.uk", "sai.kothawadla@recognisebank.co.uk"],
//       to : toAddress,
//       //to: userEmails,
//       subject: "AWS-Test-multiple",
//       html: sampleHtml(input, name),
//       attachments: [
//         {
//           filename: 'example.pdf',
//           // path: path.join(__dirname, path1),
//           // contentType: 'application/pdf'
//           //content: fs.readFileSync(path.join(__dirname, path1))
//           content : obtainedDocumnet
//         }]
//     };
//     // Convert attachments to MIME format
//     const params = await {
//       RawMessage: {
//         Data: await createMimeMessage(info)
//       }
//     };
//     const output = await sendMail(params)
//     return output
//   }
//   catch (err) {
//     logger.info("error message", err.message)
//     return err.message
//   }
// }

/**
 * function to generate PDF for a given HTML
 * @param sampleHtml
 * @param options
 * @returns generated PDF File
 */
export async function pdfGeneratorHtml(sampleHTML) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  //const content = fs.readFileSync('path/to/your/file.html', 'utf8');

  await page.setContent(sampleHTML);
  const pdf = await page.pdf({ format: "A4" });
  await browser.close();
  return pdf;
}
