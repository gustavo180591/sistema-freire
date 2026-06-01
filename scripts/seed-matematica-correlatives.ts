import { PrismaClient, SubjectType, TrainingField, AccreditationMode, CorrelativeType } from '@prisma/client';

const prisma = new PrismaClient();

type SubjectSeed = {
  yearLevel: number;
  name: string;
  accreditationMode: AccreditationMode;
  subjectType: SubjectType;
  trainingField: TrainingField;
};

type CorrelativeSeed = {
  subject: string;
  requiredSubject: string;
  correlativeType: CorrelativeType;
  sourceColumn: 'Para cursar deberá haber Regularizado' | 'Para cursar deberá haber Aprobado' | 'Para aprobar deberá haber Aprobado';
};

const CAREER = {
  code: 'MATEMATICA',
  name: 'Profesorado de Matemática',
  trainingField: TrainingField.ESPECIFICA,
  resolution: null as string | null,
  durationYears: 4,
  active: true,
};

const subjects: SubjectSeed[] = [
  { yearLevel: 1, name: 'Taller de Oralidad, Lectura y Escritura', accreditationMode: AccreditationMode.PROMOCIONAL, subjectType: SubjectType.COMMON, trainingField: TrainingField.GENERAL },
  { yearLevel: 1, name: 'Filosofía', accreditationMode: AccreditationMode.PROMOCIONAL, subjectType: SubjectType.COMMON, trainingField: TrainingField.GENERAL },
  { yearLevel: 1, name: 'Pedagogía', accreditationMode: AccreditationMode.EXAMEN_FINAL, subjectType: SubjectType.COMMON, trainingField: TrainingField.GENERAL },
  { yearLevel: 1, name: 'Álgebra I', accreditationMode: AccreditationMode.EXAMEN_FINAL, subjectType: SubjectType.CAREER_SPECIFIC, trainingField: TrainingField.ESPECIFICA },
  { yearLevel: 1, name: 'Geometría I', accreditationMode: AccreditationMode.EXAMEN_FINAL, subjectType: SubjectType.CAREER_SPECIFIC, trainingField: TrainingField.ESPECIFICA },
  { yearLevel: 1, name: 'Taller de Resolución de Problemas', accreditationMode: AccreditationMode.PROMOCIONAL, subjectType: SubjectType.CAREER_SPECIFIC, trainingField: TrainingField.ESPECIFICA },
  { yearLevel: 1, name: 'Práctica I', accreditationMode: AccreditationMode.PROMOCIONAL_SIN_FINAL, subjectType: SubjectType.COMMON, trainingField: TrainingField.PRACTICA },
  { yearLevel: 1, name: 'EDI I: Taller de Ciudadanía', accreditationMode: AccreditationMode.PROMOCIONAL, subjectType: SubjectType.EDI, trainingField: TrainingField.EDI },
  { yearLevel: 2, name: 'TIC', accreditationMode: AccreditationMode.PROMOCIONAL, subjectType: SubjectType.COMMON, trainingField: TrainingField.GENERAL },
  { yearLevel: 2, name: 'Didáctica General', accreditationMode: AccreditationMode.EXAMEN_FINAL, subjectType: SubjectType.COMMON, trainingField: TrainingField.GENERAL },
  { yearLevel: 2, name: 'Psicología Educacional', accreditationMode: AccreditationMode.EXAMEN_FINAL, subjectType: SubjectType.COMMON, trainingField: TrainingField.GENERAL },
  { yearLevel: 2, name: 'Sujeto de le Educación Secundaria', accreditationMode: AccreditationMode.EXAMEN_FINAL, subjectType: SubjectType.COMMON, trainingField: TrainingField.GENERAL },
  { yearLevel: 2, name: 'Álgebra II', accreditationMode: AccreditationMode.EXAMEN_FINAL, subjectType: SubjectType.CAREER_SPECIFIC, trainingField: TrainingField.ESPECIFICA },
  { yearLevel: 2, name: 'Geometría II', accreditationMode: AccreditationMode.EXAMEN_FINAL, subjectType: SubjectType.CAREER_SPECIFIC, trainingField: TrainingField.ESPECIFICA },
  { yearLevel: 2, name: 'Análisis Matemático I', accreditationMode: AccreditationMode.EXAMEN_FINAL, subjectType: SubjectType.CAREER_SPECIFIC, trainingField: TrainingField.ESPECIFICA },
  { yearLevel: 2, name: 'Didáctica de la Matemática I', accreditationMode: AccreditationMode.PROMOCIONAL, subjectType: SubjectType.CAREER_SPECIFIC, trainingField: TrainingField.ESPECIFICA },
  { yearLevel: 2, name: 'TIC en la Enseñanza de la Matemática', accreditationMode: AccreditationMode.PROMOCIONAL, subjectType: SubjectType.CAREER_SPECIFIC, trainingField: TrainingField.ESPECIFICA },
  { yearLevel: 2, name: 'Práctica II', accreditationMode: AccreditationMode.PROMOCIONAL_SIN_FINAL, subjectType: SubjectType.COMMON, trainingField: TrainingField.PRACTICA },
  { yearLevel: 2, name: 'EDI II: Taller de Expresión corporal y Uso Apropiado de la voz', accreditationMode: AccreditationMode.PROMOCIONAL, subjectType: SubjectType.EDI, trainingField: TrainingField.EDI },
  { yearLevel: 3, name: 'Historia y Política de la Eduación Argentina', accreditationMode: AccreditationMode.EXAMEN_FINAL, subjectType: SubjectType.COMMON, trainingField: TrainingField.GENERAL },
  { yearLevel: 3, name: 'Sociología de la Educación', accreditationMode: AccreditationMode.EXAMEN_FINAL, subjectType: SubjectType.COMMON, trainingField: TrainingField.GENERAL },
  { yearLevel: 3, name: 'Álgebra III', accreditationMode: AccreditationMode.EXAMEN_FINAL, subjectType: SubjectType.CAREER_SPECIFIC, trainingField: TrainingField.ESPECIFICA },
  { yearLevel: 3, name: 'Análisis Matemático II', accreditationMode: AccreditationMode.EXAMEN_FINAL, subjectType: SubjectType.CAREER_SPECIFIC, trainingField: TrainingField.ESPECIFICA },
  { yearLevel: 3, name: 'Estadística y Probabilidad', accreditationMode: AccreditationMode.EXAMEN_FINAL, subjectType: SubjectType.CAREER_SPECIFIC, trainingField: TrainingField.ESPECIFICA },
  { yearLevel: 3, name: 'Geometría III', accreditationMode: AccreditationMode.EXAMEN_FINAL, subjectType: SubjectType.CAREER_SPECIFIC, trainingField: TrainingField.ESPECIFICA },
  { yearLevel: 3, name: 'Didáctica de la Matemática II', accreditationMode: AccreditationMode.PROMOCIONAL, subjectType: SubjectType.CAREER_SPECIFIC, trainingField: TrainingField.ESPECIFICA },
  { yearLevel: 3, name: 'Matemática Financiera', accreditationMode: AccreditationMode.PROMOCIONAL, subjectType: SubjectType.CAREER_SPECIFIC, trainingField: TrainingField.ESPECIFICA },
  { yearLevel: 3, name: 'Matemática Aplicada', accreditationMode: AccreditationMode.PROMOCIONAL, subjectType: SubjectType.CAREER_SPECIFIC, trainingField: TrainingField.ESPECIFICA },
  { yearLevel: 3, name: 'Práctica III', accreditationMode: AccreditationMode.PROMOCIONAL_SIN_FINAL, subjectType: SubjectType.COMMON, trainingField: TrainingField.PRACTICA },
  { yearLevel: 3, name: 'EDI III: Derecho Laboral Docente y Seguridad Social', accreditationMode: AccreditationMode.EXAMEN_FINAL, subjectType: SubjectType.EDI, trainingField: TrainingField.EDI },
  { yearLevel: 4, name: 'Educación Sexual Integral', accreditationMode: AccreditationMode.PROMOCIONAL, subjectType: SubjectType.COMMON, trainingField: TrainingField.GENERAL },
  { yearLevel: 4, name: 'Formación Ética y Ciudadana', accreditationMode: AccreditationMode.PROMOCIONAL, subjectType: SubjectType.COMMON, trainingField: TrainingField.GENERAL },
  { yearLevel: 4, name: 'Métodos Numéricos', accreditationMode: AccreditationMode.PROMOCIONAL, subjectType: SubjectType.CAREER_SPECIFIC, trainingField: TrainingField.ESPECIFICA },
  { yearLevel: 4, name: 'Historia y Fundamentos de la Matemática', accreditationMode: AccreditationMode.EXAMEN_FINAL, subjectType: SubjectType.CAREER_SPECIFIC, trainingField: TrainingField.ESPECIFICA },
  { yearLevel: 4, name: 'Seminario de Didáctica de la Matemática', accreditationMode: AccreditationMode.EXAMEN_FINAL, subjectType: SubjectType.CAREER_SPECIFIC, trainingField: TrainingField.ESPECIFICA },
  { yearLevel: 4, name: 'Análisis Matemático III', accreditationMode: AccreditationMode.EXAMEN_FINAL, subjectType: SubjectType.CAREER_SPECIFIC, trainingField: TrainingField.ESPECIFICA },
  { yearLevel: 4, name: 'Residencia Pedagógica', accreditationMode: AccreditationMode.PROMOCIONAL_SIN_FINAL, subjectType: SubjectType.COMMON, trainingField: TrainingField.PRACTICA },
  { yearLevel: 4, name: 'EDI IV: Investigación - Acción', accreditationMode: AccreditationMode.EXAMEN_FINAL, subjectType: SubjectType.EDI, trainingField: TrainingField.EDI },
];

const correlatives: CorrelativeSeed[] = [
  { subject: 'Didáctica General', requiredSubject: 'Pedagogía', correlativeType: CorrelativeType.REGULAR, sourceColumn: 'Para cursar deberá haber Regularizado' },
  { subject: 'Didáctica General', requiredSubject: 'Pedagogía', correlativeType: CorrelativeType.APROBADO_APROBAR, sourceColumn: 'Para aprobar deberá haber Aprobado' },
  { subject: 'Psicología Educacional', requiredSubject: 'Pedagogía', correlativeType: CorrelativeType.REGULAR, sourceColumn: 'Para cursar deberá haber Regularizado' },
  { subject: 'Psicología Educacional', requiredSubject: 'Pedagogía', correlativeType: CorrelativeType.APROBADO_APROBAR, sourceColumn: 'Para aprobar deberá haber Aprobado' },
  { subject: 'Sujeto de le Educación Secundaria', requiredSubject: 'Pedagogía', correlativeType: CorrelativeType.REGULAR, sourceColumn: 'Para cursar deberá haber Regularizado' },
  { subject: 'Sujeto de le Educación Secundaria', requiredSubject: 'Pedagogía', correlativeType: CorrelativeType.APROBADO_APROBAR, sourceColumn: 'Para aprobar deberá haber Aprobado' },
  { subject: 'Álgebra II', requiredSubject: 'Álgebra I', correlativeType: CorrelativeType.REGULAR, sourceColumn: 'Para cursar deberá haber Regularizado' },
  { subject: 'Álgebra II', requiredSubject: 'Taller de Resolución de Problemas', correlativeType: CorrelativeType.REGULAR, sourceColumn: 'Para cursar deberá haber Regularizado' },
  { subject: 'Álgebra II', requiredSubject: 'Álgebra I', correlativeType: CorrelativeType.APROBADO_APROBAR, sourceColumn: 'Para aprobar deberá haber Aprobado' },
  { subject: 'Álgebra II', requiredSubject: 'Taller de Resolución de Problemas', correlativeType: CorrelativeType.APROBADO_APROBAR, sourceColumn: 'Para aprobar deberá haber Aprobado' },
  { subject: 'Geometría II', requiredSubject: 'Álgebra I', correlativeType: CorrelativeType.REGULAR, sourceColumn: 'Para cursar deberá haber Regularizado' },
  { subject: 'Geometría II', requiredSubject: 'Geometría I', correlativeType: CorrelativeType.REGULAR, sourceColumn: 'Para cursar deberá haber Regularizado' },
  { subject: 'Geometría II', requiredSubject: 'Taller de Resolución de Problemas', correlativeType: CorrelativeType.REGULAR, sourceColumn: 'Para cursar deberá haber Regularizado' },
  { subject: 'Geometría II', requiredSubject: 'Álgebra I', correlativeType: CorrelativeType.APROBADO_APROBAR, sourceColumn: 'Para aprobar deberá haber Aprobado' },
  { subject: 'Geometría II', requiredSubject: 'Geometría I', correlativeType: CorrelativeType.APROBADO_APROBAR, sourceColumn: 'Para aprobar deberá haber Aprobado' },
  { subject: 'Geometría II', requiredSubject: 'Taller de Resolución de Problemas', correlativeType: CorrelativeType.APROBADO_APROBAR, sourceColumn: 'Para aprobar deberá haber Aprobado' },
  { subject: 'Análisis Matemático I', requiredSubject: 'Álgebra I', correlativeType: CorrelativeType.REGULAR, sourceColumn: 'Para cursar deberá haber Regularizado' },
  { subject: 'Análisis Matemático I', requiredSubject: 'Geometría I', correlativeType: CorrelativeType.REGULAR, sourceColumn: 'Para cursar deberá haber Regularizado' },
  { subject: 'Análisis Matemático I', requiredSubject: 'Taller de Resolución de Problemas', correlativeType: CorrelativeType.REGULAR, sourceColumn: 'Para cursar deberá haber Regularizado' },
  { subject: 'Análisis Matemático I', requiredSubject: 'Álgebra I', correlativeType: CorrelativeType.APROBADO_APROBAR, sourceColumn: 'Para aprobar deberá haber Aprobado' },
  { subject: 'Análisis Matemático I', requiredSubject: 'Geometría I', correlativeType: CorrelativeType.APROBADO_APROBAR, sourceColumn: 'Para aprobar deberá haber Aprobado' },
  { subject: 'Análisis Matemático I', requiredSubject: 'Taller de Resolución de Problemas', correlativeType: CorrelativeType.APROBADO_APROBAR, sourceColumn: 'Para aprobar deberá haber Aprobado' },
  { subject: 'Didáctica de la Matemática I', requiredSubject: 'Álgebra I', correlativeType: CorrelativeType.REGULAR, sourceColumn: 'Para cursar deberá haber Regularizado' },
  { subject: 'Didáctica de la Matemática I', requiredSubject: 'Geometría I', correlativeType: CorrelativeType.REGULAR, sourceColumn: 'Para cursar deberá haber Regularizado' },
  { subject: 'Didáctica de la Matemática I', requiredSubject: 'Pedagogía', correlativeType: CorrelativeType.REGULAR, sourceColumn: 'Para cursar deberá haber Regularizado' },
  { subject: 'Didáctica de la Matemática I', requiredSubject: 'Álgebra I', correlativeType: CorrelativeType.APROBADO_APROBAR, sourceColumn: 'Para aprobar deberá haber Aprobado' },
  { subject: 'Didáctica de la Matemática I', requiredSubject: 'Geometría I', correlativeType: CorrelativeType.APROBADO_APROBAR, sourceColumn: 'Para aprobar deberá haber Aprobado' },
  { subject: 'Didáctica de la Matemática I', requiredSubject: 'Pedagogía', correlativeType: CorrelativeType.APROBADO_APROBAR, sourceColumn: 'Para aprobar deberá haber Aprobado' },
  { subject: 'TIC en la Enseñanza de la Matemática', requiredSubject: 'Taller de Resolución de Problemas', correlativeType: CorrelativeType.REGULAR, sourceColumn: 'Para cursar deberá haber Regularizado' },
  { subject: 'TIC en la Enseñanza de la Matemática', requiredSubject: 'Pedagogía', correlativeType: CorrelativeType.REGULAR, sourceColumn: 'Para cursar deberá haber Regularizado' },
  { subject: 'TIC en la Enseñanza de la Matemática', requiredSubject: 'Taller de Resolución de Problemas', correlativeType: CorrelativeType.APROBADO_APROBAR, sourceColumn: 'Para aprobar deberá haber Aprobado' },
  { subject: 'TIC en la Enseñanza de la Matemática', requiredSubject: 'Pedagogía', correlativeType: CorrelativeType.APROBADO_APROBAR, sourceColumn: 'Para aprobar deberá haber Aprobado' },
  { subject: 'Práctica II', requiredSubject: 'Práctica I', correlativeType: CorrelativeType.REGULAR, sourceColumn: 'Para cursar deberá haber Regularizado' },
  { subject: 'Práctica II', requiredSubject: 'Pedagogía', correlativeType: CorrelativeType.REGULAR, sourceColumn: 'Para cursar deberá haber Regularizado' },
  { subject: 'Práctica II', requiredSubject: 'Práctica I', correlativeType: CorrelativeType.APROBADO_APROBAR, sourceColumn: 'Para aprobar deberá haber Aprobado' },
  { subject: 'EDI II: Taller de Expresión corporal y Uso Apropiado de la voz', requiredSubject: 'EDI I: Taller de Ciudadanía', correlativeType: CorrelativeType.REGULAR, sourceColumn: 'Para cursar deberá haber Regularizado' },
  { subject: 'EDI II: Taller de Expresión corporal y Uso Apropiado de la voz', requiredSubject: 'Taller de Oralidad, Lectura y Escritura', correlativeType: CorrelativeType.REGULAR, sourceColumn: 'Para cursar deberá haber Regularizado' },
  { subject: 'Historia y Política de la Eduación Argentina', requiredSubject: 'Filosofía', correlativeType: CorrelativeType.REGULAR, sourceColumn: 'Para cursar deberá haber Regularizado' },
  { subject: 'Historia y Política de la Eduación Argentina', requiredSubject: 'Pedagogía', correlativeType: CorrelativeType.REGULAR, sourceColumn: 'Para cursar deberá haber Regularizado' },
  { subject: 'Historia y Política de la Eduación Argentina', requiredSubject: 'Filosofía', correlativeType: CorrelativeType.APROBADO_APROBAR, sourceColumn: 'Para aprobar deberá haber Aprobado' },
  { subject: 'Historia y Política de la Eduación Argentina', requiredSubject: 'Pedagogía', correlativeType: CorrelativeType.APROBADO_APROBAR, sourceColumn: 'Para aprobar deberá haber Aprobado' },
  { subject: 'Sociología de la Educación', requiredSubject: 'Sujeto de le Educación Secundaria', correlativeType: CorrelativeType.REGULAR, sourceColumn: 'Para cursar deberá haber Regularizado' },
  { subject: 'Sociología de la Educación', requiredSubject: 'Pedagogía', correlativeType: CorrelativeType.APROBADO, sourceColumn: 'Para cursar deberá haber Aprobado' },
  { subject: 'Álgebra III', requiredSubject: 'Álgebra II', correlativeType: CorrelativeType.REGULAR, sourceColumn: 'Para cursar deberá haber Regularizado' },
  { subject: 'Álgebra III', requiredSubject: 'Álgebra I', correlativeType: CorrelativeType.APROBADO, sourceColumn: 'Para cursar deberá haber Aprobado' },
  { subject: 'Álgebra III', requiredSubject: 'Taller de Resolución de Problemas', correlativeType: CorrelativeType.APROBADO, sourceColumn: 'Para cursar deberá haber Aprobado' },
  { subject: 'Álgebra III', requiredSubject: 'Álgebra II', correlativeType: CorrelativeType.APROBADO_APROBAR, sourceColumn: 'Para aprobar deberá haber Aprobado' },
  { subject: 'Análisis Matemático II', requiredSubject: 'Análisis Matemático I', correlativeType: CorrelativeType.REGULAR, sourceColumn: 'Para cursar deberá haber Regularizado' },
  { subject: 'Análisis Matemático II', requiredSubject: 'Geometría II', correlativeType: CorrelativeType.REGULAR, sourceColumn: 'Para cursar deberá haber Regularizado' },
  { subject: 'Análisis Matemático II', requiredSubject: 'Álgebra I', correlativeType: CorrelativeType.APROBADO, sourceColumn: 'Para cursar deberá haber Aprobado' },
  { subject: 'Análisis Matemático II', requiredSubject: 'Geometría I', correlativeType: CorrelativeType.APROBADO, sourceColumn: 'Para cursar deberá haber Aprobado' },
  { subject: 'Análisis Matemático II', requiredSubject: 'Taller de Resolución de Problemas', correlativeType: CorrelativeType.APROBADO, sourceColumn: 'Para cursar deberá haber Aprobado' },
  { subject: 'Análisis Matemático II', requiredSubject: 'Análisis Matemático I', correlativeType: CorrelativeType.APROBADO_APROBAR, sourceColumn: 'Para aprobar deberá haber Aprobado' },
  { subject: 'Análisis Matemático II', requiredSubject: 'Geometría II', correlativeType: CorrelativeType.APROBADO_APROBAR, sourceColumn: 'Para aprobar deberá haber Aprobado' },
  { subject: 'Estadística y Probabilidad', requiredSubject: 'Análisis Matemático I', correlativeType: CorrelativeType.REGULAR, sourceColumn: 'Para cursar deberá haber Regularizado' },
  { subject: 'Estadística y Probabilidad', requiredSubject: 'TIC en la Enseñanza de la Matemática', correlativeType: CorrelativeType.REGULAR, sourceColumn: 'Para cursar deberá haber Regularizado' },
  { subject: 'Estadística y Probabilidad', requiredSubject: 'Álgebra I', correlativeType: CorrelativeType.APROBADO, sourceColumn: 'Para cursar deberá haber Aprobado' },
  { subject: 'Estadística y Probabilidad', requiredSubject: 'Taller de Resolución de Problemas', correlativeType: CorrelativeType.APROBADO, sourceColumn: 'Para cursar deberá haber Aprobado' },
  { subject: 'Estadística y Probabilidad', requiredSubject: 'TIC en la Enseñanza de la Matemática', correlativeType: CorrelativeType.APROBADO_APROBAR, sourceColumn: 'Para aprobar deberá haber Aprobado' },
  { subject: 'Geometría III', requiredSubject: 'Geometría II', correlativeType: CorrelativeType.REGULAR, sourceColumn: 'Para cursar deberá haber Regularizado' },
  { subject: 'Geometría III', requiredSubject: 'TIC en la Enseñanza de la Matemática', correlativeType: CorrelativeType.REGULAR, sourceColumn: 'Para cursar deberá haber Regularizado' },
  { subject: 'Geometría III', requiredSubject: 'Álgebra I', correlativeType: CorrelativeType.APROBADO, sourceColumn: 'Para cursar deberá haber Aprobado' },
  { subject: 'Geometría III', requiredSubject: 'Geometría I', correlativeType: CorrelativeType.APROBADO, sourceColumn: 'Para cursar deberá haber Aprobado' },
  { subject: 'Geometría III', requiredSubject: 'Taller de Resolución de Problemas', correlativeType: CorrelativeType.APROBADO, sourceColumn: 'Para cursar deberá haber Aprobado' },
  { subject: 'Geometría III', requiredSubject: 'Geometría II', correlativeType: CorrelativeType.APROBADO_APROBAR, sourceColumn: 'Para aprobar deberá haber Aprobado' },
  { subject: 'Geometría III', requiredSubject: 'TIC en la Enseñanza de la Matemática', correlativeType: CorrelativeType.APROBADO_APROBAR, sourceColumn: 'Para aprobar deberá haber Aprobado' },
  { subject: 'Didáctica de la Matemática II', requiredSubject: 'Didáctica General', correlativeType: CorrelativeType.REGULAR, sourceColumn: 'Para cursar deberá haber Regularizado' },
  { subject: 'Didáctica de la Matemática II', requiredSubject: 'Didáctica de la Matemática I', correlativeType: CorrelativeType.REGULAR, sourceColumn: 'Para cursar deberá haber Regularizado' },
  { subject: 'Didáctica de la Matemática II', requiredSubject: 'Análisis Matemático I', correlativeType: CorrelativeType.REGULAR, sourceColumn: 'Para cursar deberá haber Regularizado' },
  { subject: 'Didáctica de la Matemática II', requiredSubject: 'Álgebra II', correlativeType: CorrelativeType.REGULAR, sourceColumn: 'Para cursar deberá haber Regularizado' },
  { subject: 'Didáctica de la Matemática II', requiredSubject: 'Geometría II', correlativeType: CorrelativeType.REGULAR, sourceColumn: 'Para cursar deberá haber Regularizado' },
  { subject: 'Didáctica de la Matemática II', requiredSubject: 'Sujeto de le Educación Secundaria', correlativeType: CorrelativeType.REGULAR, sourceColumn: 'Para cursar deberá haber Regularizado' },
  { subject: 'Didáctica de la Matemática II', requiredSubject: 'Álgebra I', correlativeType: CorrelativeType.APROBADO, sourceColumn: 'Para cursar deberá haber Aprobado' },
  { subject: 'Didáctica de la Matemática II', requiredSubject: 'Geometría I', correlativeType: CorrelativeType.APROBADO, sourceColumn: 'Para cursar deberá haber Aprobado' },
  { subject: 'Didáctica de la Matemática II', requiredSubject: 'Taller de Resolución de Problemas', correlativeType: CorrelativeType.APROBADO, sourceColumn: 'Para cursar deberá haber Aprobado' },
  { subject: 'Didáctica de la Matemática II', requiredSubject: 'Didáctica General', correlativeType: CorrelativeType.APROBADO_APROBAR, sourceColumn: 'Para aprobar deberá haber Aprobado' },
  { subject: 'Didáctica de la Matemática II', requiredSubject: 'Didáctica de la Matemática I', correlativeType: CorrelativeType.APROBADO_APROBAR, sourceColumn: 'Para aprobar deberá haber Aprobado' },
  { subject: 'Matemática Financiera', requiredSubject: 'Análisis Matemático I', correlativeType: CorrelativeType.REGULAR, sourceColumn: 'Para cursar deberá haber Regularizado' },
  { subject: 'Matemática Financiera', requiredSubject: 'TIC en la Enseñanza de la Matemática', correlativeType: CorrelativeType.REGULAR, sourceColumn: 'Para cursar deberá haber Regularizado' },
  { subject: 'Matemática Financiera', requiredSubject: 'Álgebra I', correlativeType: CorrelativeType.APROBADO, sourceColumn: 'Para cursar deberá haber Aprobado' },
  { subject: 'Matemática Financiera', requiredSubject: 'Taller de Resolución de Problemas', correlativeType: CorrelativeType.APROBADO, sourceColumn: 'Para cursar deberá haber Aprobado' },
  { subject: 'Matemática Financiera', requiredSubject: 'Análisis Matemático I', correlativeType: CorrelativeType.APROBADO_APROBAR, sourceColumn: 'Para aprobar deberá haber Aprobado' },
  { subject: 'Matemática Financiera', requiredSubject: 'TIC en la Enseñanza de la Matemática', correlativeType: CorrelativeType.APROBADO_APROBAR, sourceColumn: 'Para aprobar deberá haber Aprobado' },
  { subject: 'Matemática Aplicada', requiredSubject: 'Análisis Matemático I', correlativeType: CorrelativeType.REGULAR, sourceColumn: 'Para cursar deberá haber Regularizado' },
  { subject: 'Matemática Aplicada', requiredSubject: 'Geometría II', correlativeType: CorrelativeType.REGULAR, sourceColumn: 'Para cursar deberá haber Regularizado' },
  { subject: 'Matemática Aplicada', requiredSubject: 'Álgebra I', correlativeType: CorrelativeType.APROBADO, sourceColumn: 'Para cursar deberá haber Aprobado' },
  { subject: 'Matemática Aplicada', requiredSubject: 'Geometría I', correlativeType: CorrelativeType.APROBADO, sourceColumn: 'Para cursar deberá haber Aprobado' },
  { subject: 'Matemática Aplicada', requiredSubject: 'Taller de Resolución de Problemas', correlativeType: CorrelativeType.APROBADO, sourceColumn: 'Para cursar deberá haber Aprobado' },
  { subject: 'Matemática Aplicada', requiredSubject: 'Análisis Matemático I', correlativeType: CorrelativeType.APROBADO_APROBAR, sourceColumn: 'Para aprobar deberá haber Aprobado' },
  { subject: 'Matemática Aplicada', requiredSubject: 'Geometría II', correlativeType: CorrelativeType.APROBADO_APROBAR, sourceColumn: 'Para aprobar deberá haber Aprobado' },
  { subject: 'Práctica III', requiredSubject: 'Análisis Matemático I', correlativeType: CorrelativeType.REGULAR, sourceColumn: 'Para cursar deberá haber Regularizado' },
  { subject: 'Práctica III', requiredSubject: 'TIC en la Enseñanza de la Matemática', correlativeType: CorrelativeType.REGULAR, sourceColumn: 'Para cursar deberá haber Regularizado' },
  { subject: 'Práctica III', requiredSubject: 'Sujeto de le Educación Secundaria', correlativeType: CorrelativeType.REGULAR, sourceColumn: 'Para cursar deberá haber Regularizado' },
  { subject: 'Práctica III', requiredSubject: 'Didáctica de la Matemática I', correlativeType: CorrelativeType.REGULAR, sourceColumn: 'Para cursar deberá haber Regularizado' },
  { subject: 'Práctica III', requiredSubject: 'Práctica II', correlativeType: CorrelativeType.REGULAR, sourceColumn: 'Para cursar deberá haber Regularizado' },
  { subject: 'Práctica III', requiredSubject: 'Psicología Educacional', correlativeType: CorrelativeType.REGULAR, sourceColumn: 'Para cursar deberá haber Regularizado' },
  { subject: 'Práctica III', requiredSubject: 'Álgebra I', correlativeType: CorrelativeType.APROBADO, sourceColumn: 'Para cursar deberá haber Aprobado' },
  { subject: 'Práctica III', requiredSubject: 'Geometría I', correlativeType: CorrelativeType.APROBADO, sourceColumn: 'Para cursar deberá haber Aprobado' },
  { subject: 'Práctica III', requiredSubject: 'Taller de Resolución de Problemas', correlativeType: CorrelativeType.APROBADO, sourceColumn: 'Para cursar deberá haber Aprobado' },
  { subject: 'Práctica III', requiredSubject: 'TIC en la Enseñanza de la Matemática', correlativeType: CorrelativeType.APROBADO_APROBAR, sourceColumn: 'Para aprobar deberá haber Aprobado' },
  { subject: 'Práctica III', requiredSubject: 'Sujeto de le Educación Secundaria', correlativeType: CorrelativeType.APROBADO_APROBAR, sourceColumn: 'Para aprobar deberá haber Aprobado' },
  { subject: 'Práctica III', requiredSubject: 'Didáctica de la Matemática I', correlativeType: CorrelativeType.APROBADO_APROBAR, sourceColumn: 'Para aprobar deberá haber Aprobado' },
  { subject: 'Práctica III', requiredSubject: 'Práctica II', correlativeType: CorrelativeType.APROBADO_APROBAR, sourceColumn: 'Para aprobar deberá haber Aprobado' },
  { subject: 'Práctica III', requiredSubject: 'Psicología Educacional', correlativeType: CorrelativeType.APROBADO_APROBAR, sourceColumn: 'Para aprobar deberá haber Aprobado' },
  { subject: 'EDI III: Derecho Laboral Docente y Seguridad Social', requiredSubject: 'EDI II: Taller de Expresión corporal y Uso Apropiado de la voz', correlativeType: CorrelativeType.REGULAR, sourceColumn: 'Para cursar deberá haber Regularizado' },
  { subject: 'EDI III: Derecho Laboral Docente y Seguridad Social', requiredSubject: 'EDI I: Taller de Ciudadanía', correlativeType: CorrelativeType.APROBADO, sourceColumn: 'Para cursar deberá haber Aprobado' },
  { subject: 'Educación Sexual Integral', requiredSubject: 'Sujeto de le Educación Secundaria', correlativeType: CorrelativeType.REGULAR, sourceColumn: 'Para cursar deberá haber Regularizado' },
  { subject: 'Educación Sexual Integral', requiredSubject: 'Psicología Educacional', correlativeType: CorrelativeType.APROBADO, sourceColumn: 'Para cursar deberá haber Aprobado' },
  { subject: 'Formación Ética y Ciudadana', requiredSubject: 'Sociología de la Educación', correlativeType: CorrelativeType.REGULAR, sourceColumn: 'Para cursar deberá haber Regularizado' },
  { subject: 'Formación Ética y Ciudadana', requiredSubject: 'Sociología de la Educación', correlativeType: CorrelativeType.APROBADO_APROBAR, sourceColumn: 'Para aprobar deberá haber Aprobado' },
  { subject: 'Métodos Numéricos', requiredSubject: 'Estadística y Probabilidad', correlativeType: CorrelativeType.REGULAR, sourceColumn: 'Para cursar deberá haber Regularizado' },
  { subject: 'Métodos Numéricos', requiredSubject: 'Análisis Matemático II', correlativeType: CorrelativeType.REGULAR, sourceColumn: 'Para cursar deberá haber Regularizado' },
  { subject: 'Métodos Numéricos', requiredSubject: 'TIC en la Enseñanza de la Matemática', correlativeType: CorrelativeType.APROBADO, sourceColumn: 'Para cursar deberá haber Aprobado' },
  { subject: 'Métodos Numéricos', requiredSubject: 'Análisis Matemático I', correlativeType: CorrelativeType.APROBADO, sourceColumn: 'Para cursar deberá haber Aprobado' },
  { subject: 'Métodos Numéricos', requiredSubject: 'Álgebra II', correlativeType: CorrelativeType.APROBADO, sourceColumn: 'Para cursar deberá haber Aprobado' },
  { subject: 'Historia y Fundamentos de la Matemática', requiredSubject: 'Álgebra III', correlativeType: CorrelativeType.REGULAR, sourceColumn: 'Para cursar deberá haber Regularizado' },
  { subject: 'Historia y Fundamentos de la Matemática', requiredSubject: 'Estadística y Probabilidad', correlativeType: CorrelativeType.REGULAR, sourceColumn: 'Para cursar deberá haber Regularizado' },
  { subject: 'Historia y Fundamentos de la Matemática', requiredSubject: 'Análisis Matemático II', correlativeType: CorrelativeType.REGULAR, sourceColumn: 'Para cursar deberá haber Regularizado' },
  { subject: 'Historia y Fundamentos de la Matemática', requiredSubject: 'Geometría III', correlativeType: CorrelativeType.REGULAR, sourceColumn: 'Para cursar deberá haber Regularizado' },
  { subject: 'Historia y Fundamentos de la Matemática', requiredSubject: 'Matemática Aplicada', correlativeType: CorrelativeType.REGULAR, sourceColumn: 'Para cursar deberá haber Regularizado' },
  { subject: 'Historia y Fundamentos de la Matemática', requiredSubject: 'Álgebra II', correlativeType: CorrelativeType.APROBADO, sourceColumn: 'Para cursar deberá haber Aprobado' },
  { subject: 'Historia y Fundamentos de la Matemática', requiredSubject: 'Geometría II', correlativeType: CorrelativeType.APROBADO, sourceColumn: 'Para cursar deberá haber Aprobado' },
  { subject: 'Historia y Fundamentos de la Matemática', requiredSubject: 'Análisis Matemático I', correlativeType: CorrelativeType.APROBADO, sourceColumn: 'Para cursar deberá haber Aprobado' },
  { subject: 'Historia y Fundamentos de la Matemática', requiredSubject: 'Álgebra III', correlativeType: CorrelativeType.APROBADO_APROBAR, sourceColumn: 'Para aprobar deberá haber Aprobado' },
  { subject: 'Historia y Fundamentos de la Matemática', requiredSubject: 'Estadística y Probabilidad', correlativeType: CorrelativeType.APROBADO_APROBAR, sourceColumn: 'Para aprobar deberá haber Aprobado' },
  { subject: 'Historia y Fundamentos de la Matemática', requiredSubject: 'Análisis Matemático II', correlativeType: CorrelativeType.APROBADO_APROBAR, sourceColumn: 'Para aprobar deberá haber Aprobado' },
  { subject: 'Historia y Fundamentos de la Matemática', requiredSubject: 'Geometría III', correlativeType: CorrelativeType.APROBADO_APROBAR, sourceColumn: 'Para aprobar deberá haber Aprobado' },
  { subject: 'Historia y Fundamentos de la Matemática', requiredSubject: 'Matemática Aplicada', correlativeType: CorrelativeType.APROBADO_APROBAR, sourceColumn: 'Para aprobar deberá haber Aprobado' },
  { subject: 'Seminario de Didáctica de la Matemática', requiredSubject: 'Didáctica de la Matemática II', correlativeType: CorrelativeType.REGULAR, sourceColumn: 'Para cursar deberá haber Regularizado' },
  { subject: 'Seminario de Didáctica de la Matemática', requiredSubject: 'Geometría III', correlativeType: CorrelativeType.REGULAR, sourceColumn: 'Para cursar deberá haber Regularizado' },
  { subject: 'Seminario de Didáctica de la Matemática', requiredSubject: 'Estadística y Probabilidad', correlativeType: CorrelativeType.REGULAR, sourceColumn: 'Para cursar deberá haber Regularizado' },
  { subject: 'Seminario de Didáctica de la Matemática', requiredSubject: 'Análisis Matemático II', correlativeType: CorrelativeType.REGULAR, sourceColumn: 'Para cursar deberá haber Regularizado' },
  { subject: 'Seminario de Didáctica de la Matemática', requiredSubject: 'Matemática Aplicada', correlativeType: CorrelativeType.REGULAR, sourceColumn: 'Para cursar deberá haber Regularizado' },
  { subject: 'Seminario de Didáctica de la Matemática', requiredSubject: 'Matemática Financiera', correlativeType: CorrelativeType.REGULAR, sourceColumn: 'Para cursar deberá haber Regularizado' },
  { subject: 'Seminario de Didáctica de la Matemática', requiredSubject: 'Geometría II', correlativeType: CorrelativeType.APROBADO, sourceColumn: 'Para cursar deberá haber Aprobado' },
  { subject: 'Seminario de Didáctica de la Matemática', requiredSubject: 'Álgebra II', correlativeType: CorrelativeType.APROBADO, sourceColumn: 'Para cursar deberá haber Aprobado' },
  { subject: 'Seminario de Didáctica de la Matemática', requiredSubject: 'Análisis Matemático I', correlativeType: CorrelativeType.APROBADO, sourceColumn: 'Para cursar deberá haber Aprobado' },
  { subject: 'Seminario de Didáctica de la Matemática', requiredSubject: 'TIC en la Enseñanza de la Matemática', correlativeType: CorrelativeType.APROBADO, sourceColumn: 'Para cursar deberá haber Aprobado' },
  { subject: 'Seminario de Didáctica de la Matemática', requiredSubject: 'Sujeto de le Educación Secundaria', correlativeType: CorrelativeType.APROBADO, sourceColumn: 'Para cursar deberá haber Aprobado' },
  { subject: 'Seminario de Didáctica de la Matemática', requiredSubject: 'Didáctica de la Matemática II', correlativeType: CorrelativeType.APROBADO_APROBAR, sourceColumn: 'Para aprobar deberá haber Aprobado' },
  { subject: 'Seminario de Didáctica de la Matemática', requiredSubject: 'Geometría III', correlativeType: CorrelativeType.APROBADO_APROBAR, sourceColumn: 'Para aprobar deberá haber Aprobado' },
  { subject: 'Seminario de Didáctica de la Matemática', requiredSubject: 'Estadística y Probabilidad', correlativeType: CorrelativeType.APROBADO_APROBAR, sourceColumn: 'Para aprobar deberá haber Aprobado' },
  { subject: 'Seminario de Didáctica de la Matemática', requiredSubject: 'Análisis Matemático II', correlativeType: CorrelativeType.APROBADO_APROBAR, sourceColumn: 'Para aprobar deberá haber Aprobado' },
  { subject: 'Seminario de Didáctica de la Matemática', requiredSubject: 'Matemática Aplicada', correlativeType: CorrelativeType.APROBADO_APROBAR, sourceColumn: 'Para aprobar deberá haber Aprobado' },
  { subject: 'Seminario de Didáctica de la Matemática', requiredSubject: 'Matemática Financiera', correlativeType: CorrelativeType.APROBADO_APROBAR, sourceColumn: 'Para aprobar deberá haber Aprobado' },
  { subject: 'Análisis Matemático III', requiredSubject: 'Análisis Matemático II', correlativeType: CorrelativeType.REGULAR, sourceColumn: 'Para cursar deberá haber Regularizado' },
  { subject: 'Análisis Matemático III', requiredSubject: 'Álgebra II', correlativeType: CorrelativeType.APROBADO, sourceColumn: 'Para cursar deberá haber Aprobado' },
  { subject: 'Análisis Matemático III', requiredSubject: 'Geometría II', correlativeType: CorrelativeType.APROBADO, sourceColumn: 'Para cursar deberá haber Aprobado' },
  { subject: 'Análisis Matemático III', requiredSubject: 'Análisis Matemático I', correlativeType: CorrelativeType.APROBADO, sourceColumn: 'Para cursar deberá haber Aprobado' },
  { subject: 'Análisis Matemático III', requiredSubject: 'Análisis Matemático II', correlativeType: CorrelativeType.APROBADO_APROBAR, sourceColumn: 'Para aprobar deberá haber Aprobado' },
  { subject: 'Residencia Pedagógica', requiredSubject: 'Estadística y Probabilidad', correlativeType: CorrelativeType.REGULAR, sourceColumn: 'Para cursar deberá haber Regularizado' },
  { subject: 'Residencia Pedagógica', requiredSubject: 'Matemática Financiera', correlativeType: CorrelativeType.REGULAR, sourceColumn: 'Para cursar deberá haber Regularizado' },
  { subject: 'Residencia Pedagógica', requiredSubject: 'Geometría III', correlativeType: CorrelativeType.REGULAR, sourceColumn: 'Para cursar deberá haber Regularizado' },
  { subject: 'Residencia Pedagógica', requiredSubject: 'Didáctica de la Matemática II', correlativeType: CorrelativeType.REGULAR, sourceColumn: 'Para cursar deberá haber Regularizado' },
  { subject: 'Residencia Pedagógica', requiredSubject: 'Sujeto de le Educación Secundaria', correlativeType: CorrelativeType.APROBADO, sourceColumn: 'Para cursar deberá haber Aprobado' },
  { subject: 'Residencia Pedagógica', requiredSubject: 'Práctica III', correlativeType: CorrelativeType.APROBADO, sourceColumn: 'Para cursar deberá haber Aprobado' },
  { subject: 'Residencia Pedagógica', requiredSubject: 'Geometría II', correlativeType: CorrelativeType.APROBADO, sourceColumn: 'Para cursar deberá haber Aprobado' },
  { subject: 'Residencia Pedagógica', requiredSubject: 'Álgebra II', correlativeType: CorrelativeType.APROBADO, sourceColumn: 'Para cursar deberá haber Aprobado' },
  { subject: 'Residencia Pedagógica', requiredSubject: 'Análisis Matemático I', correlativeType: CorrelativeType.APROBADO, sourceColumn: 'Para cursar deberá haber Aprobado' },
  { subject: 'Residencia Pedagógica', requiredSubject: 'TIC en la Enseñanza de la Matemática', correlativeType: CorrelativeType.APROBADO, sourceColumn: 'Para cursar deberá haber Aprobado' },
  { subject: 'EDI IV: Investigación - Acción', requiredSubject: 'EDI III: Derecho Laboral Docente y Seguridad Social', correlativeType: CorrelativeType.REGULAR, sourceColumn: 'Para cursar deberá haber Regularizado' },
  { subject: 'EDI IV: Investigación - Acción', requiredSubject: 'Historia y Política de la Eduación Argentina', correlativeType: CorrelativeType.REGULAR, sourceColumn: 'Para cursar deberá haber Regularizado' },
  { subject: 'EDI IV: Investigación - Acción', requiredSubject: 'Sociología de la Educación', correlativeType: CorrelativeType.REGULAR, sourceColumn: 'Para cursar deberá haber Regularizado' },
  { subject: 'EDI IV: Investigación - Acción', requiredSubject: 'Historia y Política de la Eduación Argentina', correlativeType: CorrelativeType.APROBADO_APROBAR, sourceColumn: 'Para aprobar deberá haber Aprobado' },
  { subject: 'EDI IV: Investigación - Acción', requiredSubject: 'Sociología de la Educación', correlativeType: CorrelativeType.APROBADO_APROBAR, sourceColumn: 'Para aprobar deberá haber Aprobado' },
];

function normalizeSpaces(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function normalizeKey(value: string): string {
  return normalizeSpaces(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.]/g, '')
    .replace(/\s+-\s+/g, ' - ')
    .toUpperCase();
}

function makeSubjectCode(name: string): string {
  return normalizeSpaces(name)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')
    .toUpperCase();
}

function buildNotes(types: Set<CorrelativeType>, sourceColumns: Set<string>): string {
  return `Origen Excel 2026. Tipos registrados para esta misma materia requerida: ${Array.from(types).join(', ')}. Columnas: ${Array.from(sourceColumns).join(' | ')}.`;
}

function chooseStoredCorrelativeType(types: Set<CorrelativeType>): CorrelativeType {
  if (types.has(CorrelativeType.APROBADO_APROBAR)) return CorrelativeType.APROBADO_APROBAR;
  if (types.has(CorrelativeType.APROBADO)) return CorrelativeType.APROBADO;
  if (types.has(CorrelativeType.REGULAR)) return CorrelativeType.REGULAR;
  return Array.from(types)[0];
}

async function main() {
  console.log('🌱 Iniciando seed de correlatividades Matemática 2026...');

  const subjectByName = new Map<string, { id: string; code: string; name: string }>();
  const subjectByCode = new Map<string, { id: string; code: string; name: string }>();

  const career = await prisma.career.upsert({
    where: { code: CAREER.code },
    update: {
      name: CAREER.name,
      trainingField: CAREER.trainingField,
      resolution: CAREER.resolution,
      durationYears: CAREER.durationYears,
      active: CAREER.active,
    },
    create: CAREER,
  });

  console.log(`✅ Carrera lista: ${career.name}`);

  for (const item of subjects) {
    const name = normalizeSpaces(item.name);
    const code = makeSubjectCode(name);

    const subject = await prisma.subject.upsert({
      where: { code },
      update: {
        name,
        subjectType: item.subjectType,
        trainingField: item.trainingField,
        yearLevel: item.yearLevel,
        accreditationMode: item.accreditationMode,
        active: true,
      },
      create: {
        code,
        name,
        subjectType: item.subjectType,
        trainingField: item.trainingField,
        yearLevel: item.yearLevel,
        accreditationMode: item.accreditationMode,
        active: true,
      },
    });

    await prisma.careerSubject.upsert({
      where: {
        careerId_subjectId: {
          careerId: career.id,
          subjectId: subject.id,
        },
      },
      update: {
        yearLevel: item.yearLevel,
        isMandatory: true,
      },
      create: {
        careerId: career.id,
        subjectId: subject.id,
        yearLevel: item.yearLevel,
        isMandatory: true,
      },
    });

    subjectByName.set(normalizeKey(name), subject);
    subjectByCode.set(code, subject);
  }

  const unresolved = new Set<string>();

  function getSubjectOrThrow(rawName: string) {
    const key = normalizeKey(rawName);
    const subject = subjectByName.get(key) ?? subjectByCode.get(makeSubjectCode(rawName));

    if (!subject) {
      unresolved.add(rawName);
      throw new Error(`No se encontró la materia referenciada: "${rawName}"`);
    }

    return subject;
  }

  // El schema actual tiene @@unique([subjectId, requiredSubjectId, careerId]).
  // Por eso no permite guardar dos filas separadas para la misma pareja con distinto correlativeType.
  // Para no perder información del Excel, agrupamos esos casos y dejamos todos los tipos originales en notes.
  const groupedCorrelatives = new Map<string, {
    subject: string;
    requiredSubject: string;
    types: Set<CorrelativeType>;
    sourceColumns: Set<string>;
  }>();

  for (const item of correlatives) {
    const subject = normalizeSpaces(item.subject);
    const requiredSubject = normalizeSpaces(item.requiredSubject);
    const key = `${normalizeKey(subject)}::${normalizeKey(requiredSubject)}`;

    const current = groupedCorrelatives.get(key) ?? {
      subject,
      requiredSubject,
      types: new Set<CorrelativeType>(),
      sourceColumns: new Set<string>(),
    };

    current.types.add(item.correlativeType);
    current.sourceColumns.add(item.sourceColumn);
    groupedCorrelatives.set(key, current);
  }

  let createdOrUpdatedCorrelatives = 0;

  for (const item of groupedCorrelatives.values()) {
    const subject = getSubjectOrThrow(item.subject);
    const requiredSubject = getSubjectOrThrow(item.requiredSubject);
    const storedType = chooseStoredCorrelativeType(item.types);
    const notes = buildNotes(item.types, item.sourceColumns);

    const existing = await prisma.subjectCorrelative.findFirst({
      where: {
        subjectId: subject.id,
        requiredSubjectId: requiredSubject.id,
        careerId: career.id,
      },
    });

    if (existing) {
      await prisma.subjectCorrelative.update({
        where: { id: existing.id },
        data: {
          correlativeType: storedType,
          isActive: true,
          notes,
        },
      });
    } else {
      await prisma.subjectCorrelative.create({
        data: {
          subjectId: subject.id,
          requiredSubjectId: requiredSubject.id,
          careerId: career.id,
          correlativeType: storedType,
          isActive: true,
          notes,
        },
      });
    }

    createdOrUpdatedCorrelatives += 1;
  }

  if (unresolved.size > 0) {
    throw new Error(`Materias sin resolver: ${Array.from(unresolved).join(', ')}`);
  }

  console.log('✅ Seed finalizado correctamente.');
  console.log(`📚 Materias procesadas: ${subjects.length}`);
  console.log(`🔗 Correlatividades originales del Excel: ${correlatives.length}`);
  console.log(`🔗 Correlatividades guardadas según unique actual: ${createdOrUpdatedCorrelatives}`);
  console.log('ℹ️ Las correlatividades repetidas por misma materia/requisito/carrera se consolidaron en notes por limitación del @@unique actual.');
}

main()
  .catch((error) => {
    console.error('❌ Error ejecutando seed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
