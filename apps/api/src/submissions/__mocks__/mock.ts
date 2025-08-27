import { Student, Submission } from '@prisma/client';

export const mockStudent: Student = {
  id: 1,
  name: '홍길동',
  createdAt: new Date(),
};

export const mockSubmission: Submission = {
  id: 123,
  studentId: 1,
  componentType: 'ESSAY',
  submitText: 'hello',
  status: 'PENDING',
  score: null,
  feedback: null,
  resultJson: {},
  lastError: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const mockSubmissionList: Submission[] = [{ ...mockSubmission, id: 1 }];
