const Yup = require("yup");
import loanDetailsConfig from "../config/loanDetailsConfig.json";
import { loanTypeIndex } from "./types";

let ltIndex = 0;
loanTypeIndex().then((res) => {
    ltIndex = res;
}); //loanType should be passed, by default 'WorkingCapital' opted

const isRequiredWhenClause = Yup.mixed().when("businessType", {
    is: (val: string) => val === "SoleTrader" || val === "Partnership",
    then: () => Yup.string().notRequired(),
    otherwise: () => Yup.string().required(),
});

export const loanSchema = Yup.object().shape({
    id: Yup.number().min(1).required(),
    portaluserId: Yup.number().required(),
    companyId: Yup.number().nullable(),
    loanType: Yup.string().required(),
    loanTerm: Yup.number().required(),
    loanAmount: Yup.number().required(),
    loanPurpose: Yup.string().required(),
});

export const addressesSchema = Yup.object().shape({
    id: Yup.number().min(1).required(),
    companyId: Yup.number().min(1).required(),
    line1: Yup.string().required(),
    line2: Yup.string(),
    city: Yup.string().required(),
    country: Yup.string().notRequired(),
    postalCode: Yup.string().required(),
    addressType: Yup.string()
        .oneOf(
            loanDetailsConfig.loanTypes[ltIndex].configs.companyDetails
                .addressType,
            "Invalid address type provided"
        )
        .required(),
});

export const keyIndividualsSchema = Yup.object().shape({
    id: Yup.number().min(1).required(),
    companyId: Yup.number().required(),
    title: Yup.string()
        .oneOf(
            loanDetailsConfig.loanTypes[ltIndex].configs.companyDetails
                .keyIndividualConfigs.titles,
            "Invalid title provided"
        )
        .required(),
    firstName: Yup.string().required(),
    lastName: Yup.string().required(),
    phone: Yup.string().required(),
    email: Yup.string().required(),
    dob: Yup.date().required(),
    gender: Yup.string().notRequired(),
    nationality: Yup.string().required(),
    permanentResident: Yup.boolean().required(),
    role: Yup.string().required(),
    companyOwnershipPercentage: Yup.number().required(),
    address: Yup.string().required(),
});

export const businessDescriptionSchema = Yup.object().shape({
    tradingSince: isRequiredWhenClause,
    sicCode: isRequiredWhenClause,
    businessDescription: isRequiredWhenClause.oneOf(
        loanDetailsConfig.loanTypes[
            ltIndex
        ].configs.companyDetails.businessDescription.sicInformation.map(
            (elem) => elem.sicDescription
        ),
        "Invalid or missing business Description"
    ),
    employeeCount: isRequiredWhenClause.oneOf(
        loanDetailsConfig.loanTypes[ltIndex].configs.companyDetails
            .businessDescription.fullTimeEmployeeCount,
        "Invalid or missing employee Count"
    ),
});

export const businessTypeSchema = Yup.object().shape({
    businessType: Yup.string()
        .required()
        .oneOf(
            loanDetailsConfig.loanTypes[
                ltIndex
            ].configs.companyDetails.businessEntities.map((elem) => elem.name),
            "Invalid or missing business Type"
        ),
});

export const regInfoSchema = Yup.object().shape({
    name: isRequiredWhenClause,
    registrationNumber: isRequiredWhenClause,
    addresses: Yup.array().when("businessType", {
        is: (val: string) => val === "SoleTrader" || val === "Partnership",
        then: () => Yup.array().notRequired(),
        otherwise: () => Yup.array().of(addressesSchema).min(3).required(),
    }),
});

export const companySchema = Yup.lazy((data) => {
    return Yup.object().shape({
        ...businessTypeSchema.fields,
        ...regInfoSchema.fields,
        ...businessDescriptionSchema.fields,
        keyIndividuals: Yup.array().when("businessType", {
            is: (val: string) => val === "SoleTrader" || val === "Partnership",
            then: () => Yup.array().of(keyIndividualsSchema).min(1).required(),
            otherwise: () => Yup.array().notRequired(),
        }),
    });
});

// export const companySchema = Yup.lazy((data) => {
//     if (data && data.registrationNumber) {
//         return Yup.object().shape({
//             ...businessTypeSchema.fields,
//             ...regInfoSchema.fields,
//         });
//     }
//     if (data && data.businessDescription) {
//         return Yup.object().shape({
//             ...businessTypeSchema.fields,
//             ...businessDescriptionSchema.fields,
//         });
//     }
//     if (data && data.keyIndividuals) {
//         return Yup.object().shape({
//             ...businessTypeSchema.fields,
//             keyIndividuals: Yup.array().when("businessType", {
//                 is: (val: string) =>
//                     val === "SoleTrader" || val === "Partnership",
//                 then: () =>
//                     Yup.array().of(keyIndividualsSchema).min(1).required(),
//                 otherwise: () => Yup.array().notRequired(),
//             }),
//         });
//     }
//     return businessTypeSchema;
// });

// export const compSchema = Yup.object().shape({
//     keyIndividuals: Yup.array().when("businessType", {
//         is: (val: string) => val === "SoleTrader" || val === "Partnership",
//         then: () => Yup.array().of(keyIndividualsSchema).min(1).required(),
//         otherwise: () => Yup.array().notRequired(),
//     }),
// });

export const validationSchema = Yup.object().shape({
    id: Yup.number().min(1).required(),
    portaluserId: Yup.number().required(),
    companyId: Yup.number().nullable(),
    loanType: Yup.string().required(),
    loanTerm: Yup.number().required().min(3).max(36),
    loanAmount: Yup.number()
        .required()
        .min(loanDetailsConfig.loanTypes[ltIndex].configs.loanRange.min)
        .max(loanDetailsConfig.loanTypes[ltIndex].configs.loanRange.max),
    loanPurpose: Yup.string().required(),
    company: Yup.string().when("companyId", {
        is: (val) => val === null || val === undefined || val === "",
        then: () => Yup.string().nullable(),
        otherwise: () => companySchema,
    }),
    DIPStatus: Yup.string().when("company", {
        is: (val) => val === null || val === undefined || val === "",
        then: () => Yup.string().nullable(),
        otherwise: () => Yup.string().required(),
    }),
});
