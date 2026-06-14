export interface CourseraCourse {
  title: string;
  progressPercent: number;
  skills: string[];
  status: "in_progress" | "completed";
}

export const sampleCourseraCourses: CourseraCourse[] = [
  {
    title: "Machine Learning Foundations",
    progressPercent: 80,
    skills: ["Python", "Supervised Learning", "Regression"],
    status: "in_progress"
  },
  {
    title: "System Design Essentials",
    progressPercent: 45,
    skills: ["Scalability", "Caching", "Load Balancing"],
    status: "in_progress"
  },
  {
    title: "Prompt Engineering Fundamentals",
    progressPercent: 100,
    skills: ["LLMs", "Prompt Engineering", "RAG"],
    status: "completed"
  }
];
