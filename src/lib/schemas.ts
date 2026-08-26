import { Type } from "@google/genai";

export const bboxSchema = {
  type: Type.ARRAY,
  items: { type: Type.NUMBER },
  minItems: 4,
  maxItems: 4,
  description: "[ymin, xmin, ymax, xmax] normalized 0-1000 over the full page image",
};

export const questionsSchema = {
  type: Type.OBJECT,
  properties: {
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          number: { type: Type.STRING, description: "printed main question number, verbatim, e.g. '11'" },
          subpart: { type: Type.STRING, nullable: true, description: "printed sub-part label, e.g. 'a', or null" },
          text: { type: Type.STRING },
          maxMarks: { type: Type.NUMBER, nullable: true },
          page: { type: Type.INTEGER },
        },
        required: ["number", "subpart", "text", "maxMarks", "page"],
        propertyOrdering: ["number", "subpart", "text", "maxMarks", "page"],
      },
    },
  },
  required: ["questions"],
};

export const answerBlocksSchema = {
  type: Type.OBJECT,
  properties: {
    blocks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          questionLabelSeen: { type: Type.STRING, nullable: true },
          transcribedText: { type: Type.STRING },
          boundingBox: bboxSchema,
        },
        required: ["questionLabelSeen", "transcribedText", "boundingBox"],
        propertyOrdering: ["questionLabelSeen", "transcribedText", "boundingBox"],
      },
    },
  },
  required: ["blocks"],
};

export const mapAssignmentsSchema = {
  type: Type.OBJECT,
  properties: {
    assignments: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          blockId: { type: Type.STRING },
          questionKey: { type: Type.STRING, nullable: true },
          confidence: { type: Type.STRING, enum: ["high", "medium", "low"] },
        },
        required: ["blockId", "questionKey", "confidence"],
        propertyOrdering: ["blockId", "questionKey", "confidence"],
      },
    },
  },
  required: ["assignments"],
};

export const rubricsSchema = {
  type: Type.OBJECT,
  properties: {
    rubrics: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          key: { type: Type.STRING },
          modelAnswerSummary: { type: Type.STRING },
          criteria: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                point: { type: Type.STRING },
                marks: { type: Type.NUMBER },
              },
              required: ["point", "marks"],
            },
          },
        },
        required: ["key", "modelAnswerSummary", "criteria"],
      },
    },
  },
  required: ["rubrics"],
};

export const gradingSchema = {
  type: Type.OBJECT,
  properties: {
    grades: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          key: { type: Type.STRING },
          marksAwarded: { type: Type.NUMBER },
          verdict: { type: Type.STRING, enum: ["correct", "partial", "incorrect"] },
          feedback: { type: Type.STRING },
        },
        required: ["key", "marksAwarded", "verdict", "feedback"],
      },
    },
  },
  required: ["grades"],
};
