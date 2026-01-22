import { Gender, SmokingStatus, AlcoholConsumption, ExerciseFrequency, CommunicationMethod } from './profile.enums';

export interface LifestyleFactors {
  smokingStatus: SmokingStatus;
  smokingPackYears?: number;
  alcoholConsumption: AlcoholConsumption;
  exerciseFrequency: ExerciseFrequency;
  sleepHours: number;
}

export interface UserProfile {
  id: number;
  userId: number;
  firstName: string;
  lastName: string;
  email?: string;
  birthDate: string;
  gender: Gender;
  phone?: string;
  occupation?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  medicalHistory: any[];
  allergies: any[];
  currentMedications: any[];
  lifestyleFactors: LifestyleFactors;
  preferredLanguage: string;
  preferredCommunicationMethod: CommunicationMethod;
  consentTerms: boolean;
  consentDataSharing: boolean;
  consentMarketing: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProfileRequest {
  userId: number;
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: Gender;
  phone?: string | null;
  occupation?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  medicalHistory: any[];
  allergies: any[];
  currentMedications: any[];
  lifestyleFactors: LifestyleFactors;
  preferredLanguage: string;
  preferredCommunicationMethod: CommunicationMethod;
  consentTerms: boolean;
  consentDataSharing: boolean;
  consentMarketing: boolean;
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  gender?: Gender;
  phone?: string;
  occupation?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  medicalHistory?: any[];
  allergies?: any[];
  currentMedications?: any[];
  lifestyleFactors?: LifestyleFactors;
  preferredLanguage?: string;
  preferredCommunicationMethod?: CommunicationMethod;
  consentTerms?: boolean;
  consentDataSharing?: boolean;
  consentMarketing?: boolean;
}
