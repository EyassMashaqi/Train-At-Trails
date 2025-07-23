export declare const startQuestionScheduler: () => void;
export declare const releaseQuestion: (questionNumber: number) => Promise<{
    id: string;
    createdAt: Date;
    updatedAt: Date;
    content: string;
    questionNumber: number;
    title: string;
    isActive: boolean;
    releaseDate: Date | null;
}>;
//# sourceMappingURL=questionScheduler.d.ts.map