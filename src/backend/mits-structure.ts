import type { AcademicLevel } from "@/shared/types";

/**
 * Official academic structure of Madhav Institute of Technology and Science
 * (MITS), Gwalior. This is institutional reference data used once by an
 * administrator to initialise the MongoDB collections — it is NOT demo data
 * and the application always reads from MongoDB at runtime.
 */
export interface StructureProgram {
  name: string;
  code: string;
  level: AcademicLevel;
  durationSemesters: number;
}

export interface StructureDepartment {
  name: string;
  code: string;
  programs: StructureProgram[];
}

const UG = 8;
const PG = 4;
const PHD = 6;

export const MITS_STRUCTURE: StructureDepartment[] = [
  {
    name: "Civil Engineering",
    code: "CE",
    programs: [
      { name: "B.Tech Civil Engineering", code: "BT-CE", level: "UG", durationSemesters: UG },
      {
        name: "M.E Construction Technology & Management",
        code: "ME-CTM",
        level: "PG",
        durationSemesters: PG,
      },
      {
        name: "M.Tech Structural Engineering",
        code: "MT-STR",
        level: "PG",
        durationSemesters: PG,
      },
      { name: "M.Tech Structural Design", code: "MT-STD", level: "PG", durationSemesters: PG },
      { name: "PhD Civil Engineering", code: "PHD-CE", level: "PHD", durationSemesters: PHD },
    ],
  },
  {
    name: "Mechanical Engineering",
    code: "ME",
    programs: [
      { name: "B.Tech Mechanical Engineering", code: "BT-ME", level: "UG", durationSemesters: UG },
      { name: "PhD Mechanical Engineering", code: "PHD-ME", level: "PHD", durationSemesters: PHD },
    ],
  },
  {
    name: "Electrical Engineering",
    code: "EE",
    programs: [
      { name: "B.Tech Electrical Engineering", code: "BT-EE", level: "UG", durationSemesters: UG },
      { name: "PhD Electrical Engineering", code: "PHD-EE", level: "PHD", durationSemesters: PHD },
    ],
  },
  {
    name: "Computer Science & Engineering",
    code: "CSE",
    programs: [
      {
        name: "B.Tech Computer Science & Engineering",
        code: "BT-CSE",
        level: "UG",
        durationSemesters: UG,
      },
      {
        name: "B.Tech Computer Science and Design",
        code: "BT-CSD",
        level: "UG",
        durationSemesters: UG,
      },
      {
        name: "M.Tech Computer Science & Engineering",
        code: "MT-CSE",
        level: "PG",
        durationSemesters: PG,
      },
      {
        name: "PhD Computer Science & Engineering",
        code: "PHD-CSE",
        level: "PHD",
        durationSemesters: PHD,
      },
    ],
  },
  {
    name: "Information Technology",
    code: "IT",
    programs: [
      {
        name: "B.Tech Information Technology",
        code: "BT-IT",
        level: "UG",
        durationSemesters: UG,
      },
      {
        name: "M.Tech Information Technology",
        code: "MT-IT",
        level: "PG",
        durationSemesters: PG,
      },
      { name: "PhD Information Technology", code: "PHD-IT", level: "PHD", durationSemesters: PHD },
    ],
  },
  {
    name: "Electronic Engineering",
    code: "ECE",
    programs: [
      {
        name: "B.Tech Electronics Engineering",
        code: "BT-ECE",
        level: "UG",
        durationSemesters: UG,
      },
      {
        name: "B.Tech Electronics & Telecommunication Engineering",
        code: "BT-ETC",
        level: "UG",
        durationSemesters: UG,
      },
      {
        name: "M.E Communication Control & Networking",
        code: "ME-CCN",
        level: "PG",
        durationSemesters: PG,
      },
      {
        name: "PhD Electronic Engineering",
        code: "PHD-ECE",
        level: "PHD",
        durationSemesters: PHD,
      },
    ],
  },
  {
    name: "Artificial Intelligence",
    code: "AI",
    programs: [
      {
        name: "B.Tech Information Technology (Artificial Intelligence and Robotics)",
        code: "BT-ITAIR",
        level: "UG",
        durationSemesters: UG,
      },
      {
        name: "B.Tech Artificial Intelligence and Machine Learning",
        code: "BT-AIML",
        level: "UG",
        durationSemesters: UG,
      },
      {
        name: "B.Tech Artificial Intelligence and Data Science",
        code: "BT-AIDS",
        level: "UG",
        durationSemesters: UG,
      },
      {
        name: "B.Tech Artificial Intelligence",
        code: "BT-AI",
        level: "UG",
        durationSemesters: UG,
      },
      {
        name: "M.Tech Artificial Intelligence",
        code: "MT-AI",
        level: "PG",
        durationSemesters: PG,
      },
      {
        name: "PhD Artificial Intelligence",
        code: "PHD-AI",
        level: "PHD",
        durationSemesters: PHD,
      },
    ],
  },
  {
    name: "Internet of Things",
    code: "IOT",
    programs: [
      {
        name: "B.Tech Electrical and Computer Engineering",
        code: "BT-ECEG",
        level: "UG",
        durationSemesters: UG,
      },
      { name: "B.Tech Internet of Things", code: "BT-IOT", level: "UG", durationSemesters: UG },
      { name: "M.Tech Internet of Things", code: "MT-IOT", level: "PG", durationSemesters: PG },
      { name: "PhD Internet of Things", code: "PHD-IOT", level: "PHD", durationSemesters: PHD },
    ],
  },
  {
    name: "Computer Science and Technology",
    code: "CST",
    programs: [
      {
        name: "B.Tech Computer Science & Business Systems",
        code: "BT-CSBS",
        level: "UG",
        durationSemesters: UG,
      },
      {
        name: "B.Tech Computer Science and Technology",
        code: "BT-CST",
        level: "UG",
        durationSemesters: UG,
      },
      {
        name: "PhD Computer Science and Technology",
        code: "PHD-CST",
        level: "PHD",
        durationSemesters: PHD,
      },
    ],
  },
  {
    name: "Engineering Mathematics and Computing",
    code: "EMC",
    programs: [
      {
        name: "B.Tech Mathematics and Computing",
        code: "BT-MAC",
        level: "UG",
        durationSemesters: UG,
      },
      {
        name: "PhD Engineering Mathematics and Computing",
        code: "PHD-EMC",
        level: "PHD",
        durationSemesters: PHD,
      },
    ],
  },
  {
    name: "Chemical Engineering",
    code: "CHE",
    programs: [
      { name: "B.Tech Chemical Engineering", code: "BT-CHE", level: "UG", durationSemesters: UG },
      { name: "PhD Chemical Engineering", code: "PHD-CHE", level: "PHD", durationSemesters: PHD },
    ],
  },
  {
    name: "Architecture and Planning",
    code: "ARCH",
    programs: [
      { name: "B.Architecture", code: "BARCH", level: "UG", durationSemesters: 10 },
      { name: "Master of Urban Planning", code: "MUP", level: "PG", durationSemesters: PG },
      {
        name: "PhD Architecture and Planning",
        code: "PHD-ARCH",
        level: "PHD",
        durationSemesters: PHD,
      },
    ],
  },
  {
    name: "Humanities and Management",
    code: "HM",
    programs: [
      { name: "MBA", code: "MBA", level: "PG", durationSemesters: PG },
      {
        name: "PhD Humanities and Management",
        code: "PHD-HM",
        level: "PHD",
        durationSemesters: PHD,
      },
    ],
  },
];
