export interface companyMasterJourneyInput {
    companyName?: string;
    companyRegistrationNumber?: string;
}

export interface keyIndividualsDetails {
    title: string;
    firstName?: string;
    lastName?: string;
    dob: Date;
    email: string;
    phone: string;
    nationality: string;
    positionHeld?: string;
}

export interface individualDIPJourneyInput {
    keyIndividuals: keyIndividualsDetails[];
}