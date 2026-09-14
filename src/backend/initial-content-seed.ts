import { collection, COLLECTIONS, ObjectId } from "@/backend/mongo.server";

export async function seedAcademicContentIfEmpty(): Promise<void> {
  const subjectsCol = await collection(COLLECTIONS.subjects);
  const count = await subjectsCol.countDocuments({});
  if (count > 0) return;

  const programsCol = await collection(COLLECTIONS.programs);
  const departmentsCol = await collection(COLLECTIONS.departments);

  // Find CSE or IT program
  let cseProgram = await programsCol.findOne({
    code: { $regex: /CSE|CS|IT/i },
  });
  if (!cseProgram) {
    cseProgram = await programsCol.findOne({});
  }
  if (!cseProgram) return;

  const programId = cseProgram._id.toString();
  const departmentId = String(cseProgram["departmentId"] ?? "");

  // 1. Seed Subjects for Sem 3 and Sem 4
  const oopmSubjectId = new ObjectId().toString();
  const dsSubjectId = new ObjectId().toString();
  const dmSubjectId = new ObjectId().toString();
  const deSubjectId = new ObjectId().toString();
  const dbmsSubjectId = new ObjectId().toString();

  const subjectsToInsert = [
    {
      _id: new ObjectId(oopmSubjectId),
      code: "160301",
      name: "Object Oriented Programming & Methodology (OOPM)",
      programId,
      semester: 3,
      departmentId,
      credits: 4,
      chapters: [
        "Unit 1: Introduction to OOP & C++ Basics",
        "Unit 2: Classes, Objects & Constructors",
        "Unit 3: Inheritance, Polymorphism & Virtual Functions",
        "Unit 4: Templates, Generic Programming & STL",
        "Unit 5: Exception Handling & File I/O",
      ],
      createdAt: new Date(),
    },
    {
      _id: new ObjectId(dsSubjectId),
      code: "160302",
      name: "Data Structures & Algorithms",
      programId,
      semester: 3,
      departmentId,
      credits: 4,
      chapters: [
        "Unit 1: Linear Data Structures: Arrays & Stacks",
        "Unit 2: Queues and Linked Lists",
        "Unit 3: Trees and Binary Search Trees",
        "Unit 4: Graphs and Shortest Path Algorithms",
        "Unit 5: Sorting, Searching & Hashing",
      ],
      createdAt: new Date(),
    },
    {
      _id: new ObjectId(dmSubjectId),
      code: "160303",
      name: "Discrete Mathematics",
      programId,
      semester: 3,
      departmentId,
      credits: 3,
      chapters: [
        "Unit 1: Set Theory, Relations & Functions",
        "Unit 2: Propositional and Predicate Logic",
        "Unit 3: Combinatorics & Recurrence Relations",
        "Unit 4: Graph Theory & Trees",
        "Unit 5: Algebraic Structures & Monoids",
      ],
      createdAt: new Date(),
    },
    {
      _id: new ObjectId(deSubjectId),
      code: "160304",
      name: "Digital Electronics & Logic Design",
      programId,
      semester: 3,
      departmentId,
      credits: 3,
      chapters: [
        "Unit 1: Number Systems & Boolean Algebra",
        "Unit 2: Combinational Logic Circuits",
        "Unit 3: Sequential Circuits: Flip Flops & Registers",
        "Unit 4: Counters & State Machines",
        "Unit 5: Logic Families & Semiconductor Memories",
      ],
      createdAt: new Date(),
    },
    {
      _id: new ObjectId(dbmsSubjectId),
      code: "160401",
      name: "Database Management Systems (DBMS)",
      programId,
      semester: 4,
      departmentId,
      credits: 4,
      chapters: [
        "Unit 1: ER Modeling & Relational Model",
        "Unit 2: SQL, DDL, DML & Joins",
        "Unit 3: Normalization: 1NF to BCNF",
        "Unit 4: Transaction Processing & ACID Properties",
        "Unit 5: Concurrency Control & Indexing",
      ],
      createdAt: new Date(),
    },
  ];

  for (const s of subjectsToInsert) {
    await subjectsCol.insertOne(s);
  }

  // 2. Seed Notes, Study Materials, PYQs, and Practice Questions
  const materialsCol = await collection(COLLECTIONS.materials);

  const sampleMaterials = [
    // Unit Notes
    {
      title: "Unit 1 Lecture Notes: OOP Paradigms & C++ Primer",
      description:
        "Comprehensive class notes covering abstraction, encapsulation, data hiding, and dynamic memory allocation.",
      documentType: "unit_notes",
      subjectId: oopmSubjectId,
      subjectName: "Object Oriented Programming & Methodology (OOPM)",
      subjectCode: "160301",
      chapterName: "Unit 1: Introduction to OOP & C++ Basics",
      unitNo: 1,
      fileType: "pdf",
      fileName: "OOPM_Unit1_Notes_MITS.pdf",
      fileSize: "2.4 MB",
      contentText:
        "Object Oriented Programming (OOP) is a programming paradigm based on the concept of 'objects' containing data in the form of fields and code in the form of procedures. The fundamental pillars of OOP are Encapsulation, Abstraction, Inheritance, and Polymorphism. In C++, classes serve as blueprints while objects are instances. Dynamic allocation is done using new and delete operators. Const member functions guarantee that no object attributes are modified.",
      programId,
      semester: 3,
      uploadedBy: "mits-faculty",
      uploaderName: "Dr. R. K. Sharma (Dept of CSE)",
      viewsCount: 142,
      downloadsCount: 89,
      createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000),
    },
    {
      title: "Unit 2 Notes: Classes, Constructors & Operator Overloading",
      description:
        "Detailed derivations of copy constructors, deep vs shallow copy, and friend functions in C++.",
      documentType: "chapter_notes",
      subjectId: oopmSubjectId,
      subjectName: "Object Oriented Programming & Methodology (OOPM)",
      subjectCode: "160301",
      chapterName: "Unit 2: Classes, Objects & Constructors",
      unitNo: 2,
      fileType: "pdf",
      fileName: "OOPM_Unit2_Constructors_Overloading.pdf",
      fileSize: "3.1 MB",
      contentText:
        "Constructors are special member functions called automatically upon object creation. Types of constructors: Default, Parameterized, and Copy Constructors. Shallow copy copies member values directly which leads to double-free errors with pointers; Deep copy allocates dedicated memory. Operator overloading allows defining custom behavior for standard operators like +, -, <<, >> using either member functions or friend functions.",
      programId,
      semester: 3,
      uploadedBy: "mits-faculty",
      uploaderName: "Prof. S. Gupta",
      viewsCount: 98,
      downloadsCount: 65,
      createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000),
    },
    // Lab Manual
    {
      title: "OOPM Laboratory Manual & Exercise Sheets (2025-26)",
      description:
        "Official MITS laboratory manual including 12 practical assignments, viva questions, and grading rubrics.",
      documentType: "lab_manual",
      subjectId: oopmSubjectId,
      subjectName: "Object Oriented Programming & Methodology (OOPM)",
      subjectCode: "160301",
      chapterName: "Laboratory Practicals",
      fileType: "pdf",
      fileName: "OOPM_Lab_Manual_MITS_Gwalior.pdf",
      fileSize: "4.8 MB",
      contentText:
        "Practical 1: Implementation of Classes and Complex Numbers addition. Practical 2: Banking account simulation with transactions and deposit validation. Practical 3: Dynamic string manipulation using custom String class with copy constructor. Practical 4: Inheritance hierarchy for Employee payroll system. Practical 5: Virtual functions and runtime polymorphism in Shape drawer.",
      programId,
      semester: 3,
      uploadedBy: "mits-faculty",
      uploaderName: "Dr. R. K. Sharma (Dept of CSE)",
      viewsCount: 215,
      downloadsCount: 180,
      createdAt: new Date(Date.now() - 10 * 24 * 3600 * 1000),
    },
    // Data Structures Notes
    {
      title: "Data Structures Unit 1 & 2: Stacks, Queues and Linked Lists",
      description:
        "Algorithm walkthroughs for infix-to-postfix conversion, circular queues, and doubly linked list manipulation.",
      documentType: "unit_notes",
      subjectId: dsSubjectId,
      subjectName: "Data Structures & Algorithms",
      subjectCode: "160302",
      chapterName: "Unit 1: Linear Data Structures: Arrays & Stacks",
      unitNo: 1,
      fileType: "pdf",
      fileName: "DSA_Stacks_Queues_Complete.pdf",
      fileSize: "3.5 MB",
      contentText:
        "A Stack is a LIFO (Last In First Out) structure with push, pop, and peek operations running in O(1) time. Applications include expression parsing, backtrack recursion, and browser history. A Queue is a FIFO (First In First Out) structure. Circular queues resolve array overflow issues by wrapping indices using modulo arithmetic (rear = (rear + 1) % capacity). Linked lists provide dynamic sizing with pointers.",
      programId,
      semester: 3,
      uploadedBy: "mits-faculty",
      uploaderName: "Dr. A. Verma",
      viewsCount: 176,
      downloadsCount: 110,
      createdAt: new Date(Date.now() - 4 * 24 * 3600 * 1000),
    },
    // PYQ
    {
      title: "MITS End-Sem PYQ 2024: Object Oriented Programming (OOPM)",
      description:
        "Previous Year Question Paper for November-December 2024 End Semester Examination with marks distribution.",
      documentType: "pyq",
      subjectId: oopmSubjectId,
      subjectName: "Object Oriented Programming & Methodology (OOPM)",
      subjectCode: "160301",
      year: 2024,
      fileType: "pdf",
      fileName: "MITS_OOPM_EndSem_2024.pdf",
      fileSize: "1.2 MB",
      contentText:
        "Question 1 (a) Explain virtual destructors and why they are required when deleting base class pointers (7 marks). Question 1 (b) Differentiate between function overloading and function overriding with examples (7 marks). Question 2 Explain the diamond problem in multiple inheritance and how virtual base classes resolve it in C++ (14 marks). Question 3 Write a template class for a generic Stack with push, pop, and exception handling for stack overflow/underflow (14 marks).",
      programId,
      semester: 3,
      uploadedBy: "mits-faculty",
      uploaderName: "Examination Cell MITS",
      viewsCount: 340,
      downloadsCount: 290,
      createdAt: new Date(Date.now() - 20 * 24 * 3600 * 1000),
    },
    {
      title: "MITS End-Sem PYQ 2023: Data Structures & Algorithms",
      description:
        "Previous Year Question Paper December 2023 for 3rd Semester B.Tech Computer Science and IT.",
      documentType: "pyq",
      subjectId: dsSubjectId,
      subjectName: "Data Structures & Algorithms",
      subjectCode: "160302",
      year: 2023,
      fileType: "pdf",
      fileName: "MITS_DSA_EndSem_2023.pdf",
      fileSize: "1.1 MB",
      contentText:
        "Question 1 Describe AVL tree rotations (LL, RR, LR, RL) with an insertion sequence of keys: 21, 26, 30, 9, 4, 14, 28 (14 marks). Question 2 Compare Dijkstra's and Bellman-Ford shortest path algorithms with time complexities (14 marks). Question 3 Write an algorithm for QuickSort and derive its average and worst-case time complexity (14 marks).",
      programId,
      semester: 3,
      uploadedBy: "mits-faculty",
      uploaderName: "Examination Cell MITS",
      viewsCount: 280,
      downloadsCount: 240,
      createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000),
    },
    // Practice Questions
    {
      title: "OOPM Practice Problem Set: Inheritance, Polymorphism & STL",
      description:
        "Curated collection of 25 conceptual questions, code output tracing, and programming challenges.",
      documentType: "practice_question",
      subjectId: oopmSubjectId,
      subjectName: "Object Oriented Programming & Methodology (OOPM)",
      subjectCode: "160301",
      chapterName: "Unit 3: Inheritance, Polymorphism & Virtual Functions",
      unitNo: 3,
      fileType: "pdf",
      fileName: "OOPM_Practice_Set_Polymorphism.pdf",
      fileSize: "1.8 MB",
      contentText:
        "Practice Problem 1: Implement an abstract class Shape with pure virtual function calculateArea() and calculatePerimeter(). Derive Circle, Rectangle, and Triangle classes. Practice Problem 2: Trace the output of virtual functions invoked via base class pointer arrays. Practice Problem 3: Write a C++ program utilizing std::map and std::vector to manage student grade catalogs.",
      programId,
      semester: 3,
      uploadedBy: "mits-faculty",
      uploaderName: "Dr. R. K. Sharma (Dept of CSE)",
      viewsCount: 160,
      downloadsCount: 120,
      createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000),
    },
    // Assignment
    {
      title: "Assignment 1: Linked List & Stack Applications",
      description:
        "Graded assignment on evaluating postfix expressions and reversing singly linked lists in O(1) space.",
      documentType: "assignment",
      subjectId: dsSubjectId,
      subjectName: "Data Structures & Algorithms",
      subjectCode: "160302",
      chapterName: "Unit 1: Linear Data Structures: Arrays & Stacks",
      fileType: "pdf",
      fileName: "DSA_Assignment_1_2025.pdf",
      fileSize: "950 KB",
      contentText:
        "Submission Deadline: Friday, End of Week. Task 1: Write an algorithm to reverse a linked list using 3 pointers (prev, current, next) in O(n) time and O(1) auxiliary memory. Task 2: Evaluate postfix expression: '5 3 + 8 2 - *' using stack simulation.",
      programId,
      semester: 3,
      uploadedBy: "mits-faculty",
      uploaderName: "Dr. A. Verma",
      viewsCount: 130,
      downloadsCount: 95,
      createdAt: new Date(Date.now() - 1 * 24 * 3600 * 1000),
    },
  ];

  for (const m of sampleMaterials) {
    await materialsCol.insertOne(m);
  }

  // 3. Seed Digital Library Books
  const booksCol = await collection(COLLECTIONS.books);
  const sampleBooks = [
    {
      title: "Object-Oriented Programming in C++",
      author: "Robert Lafore",
      isbn: "978-0672323089",
      category: "Textbook",
      edition: "4th Edition",
      pages: 1040,
      description:
        "The standard recommended textbook for OOPM at MITS Gwalior. Covers fundamental concepts, object oriented modeling, templates, exception handling, and real world programming examples.",
      fileUrl: "/books/robert_lafore_oop_cpp.pdf",
      fileName: "Robert_Lafore_OOP_Cpp.pdf",
      departmentId,
      programId,
      semester: 3,
      subjectName: "Object Oriented Programming & Methodology (OOPM)",
      createdAt: new Date(),
    },
    {
      title: "Data Structures Using C and C++",
      author: "Yedidyah Langsam, Moshe J. Augenstein, Aaron M. Tenenbaum",
      isbn: "978-0130369970",
      category: "Textbook",
      edition: "2nd Edition",
      pages: 672,
      description:
        "Classic reference book for data structure implementations, pointer arithmetic, dynamic node trees, graph traversals, and complexity analysis.",
      fileUrl: "/books/tenenbaum_data_structures.pdf",
      fileName: "Tenenbaum_Data_Structures.pdf",
      departmentId,
      programId,
      semester: 3,
      subjectName: "Data Structures & Algorithms",
      createdAt: new Date(),
    },
    {
      title: "Discrete Mathematics and Its Applications",
      author: "Kenneth H. Rosen",
      isbn: "978-1259676512",
      category: "Reference Book",
      edition: "8th Edition",
      pages: 1024,
      description:
        "World-renowned discrete math textbook covering proofs, logic, graph algorithms, discrete probability, and mathematical induction.",
      fileUrl: "/books/rosen_discrete_mathematics.pdf",
      fileName: "Kenneth_Rosen_Discrete_Math.pdf",
      departmentId,
      programId,
      semester: 3,
      subjectName: "Discrete Mathematics",
      createdAt: new Date(),
    },
    {
      title: "Digital Design: With an Introduction to the Verilog HDL",
      author: "M. Morris Mano, Michael D. Ciletti",
      isbn: "978-0132774208",
      category: "Textbook",
      edition: "5th Edition",
      pages: 592,
      description:
        "Core text for digital electronics, logic gates, Karnaugh maps, sequential flip-flops, multiplexers, and hardware description.",
      fileUrl: "/books/morris_mano_digital_design.pdf",
      fileName: "Morris_Mano_Digital_Design.pdf",
      departmentId,
      programId,
      semester: 3,
      subjectName: "Digital Electronics & Logic Design",
      createdAt: new Date(),
    },
    {
      title: "GATE CSE Question Bank & Solved Papers (2010 - 2024)",
      author: "MITS Faculty & Editorial Board",
      isbn: "978-9352839210",
      category: "Question Bank",
      edition: "2025 Edition",
      pages: 450,
      description:
        "Topic-wise classified previous 15 years GATE and technical campus placement questions with step-by-step solutions.",
      fileUrl: "/books/gate_cse_solved_question_bank.pdf",
      fileName: "GATE_CSE_Question_Bank.pdf",
      departmentId,
      programId,
      semester: 3,
      subjectName: "General Academic Resources",
      createdAt: new Date(),
    },
  ];

  for (const b of sampleBooks) {
    await booksCol.insertOne(b);
  }

  // 4. Seed Teacher Quizzes
  const quizzesCol = await collection(COLLECTIONS.quizzes);
  const sampleQuiz = {
    title: "OOPM Mid-Term Assessment: Fundamentals & Polymorphism",
    subjectId: oopmSubjectId,
    subjectName: "Object Oriented Programming & Methodology (OOPM)",
    chapterName: "Units 1, 2 and 3",
    programId,
    semester: 3,
    durationMinutes: 20,
    maxMarks: 20,
    questionsCount: 4,
    createdBy: "mits-faculty",
    authorName: "Dr. R. K. Sharma",
    createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000),
    questions: [
      {
        id: "q1",
        type: "mcq",
        text: "Which of the following OOP principles facilitates binding data and code into a single unit?",
        options: ["Encapsulation", "Polymorphism", "Abstraction", "Inheritance"],
        correctAnswer: 0,
        marks: 5,
        explanation:
          "Encapsulation binds together data and the functions that manipulate them, preventing direct outside interference.",
        groundedSource: "Unit 1 Lecture Notes: OOP Paradigms & C++ Primer",
      },
      {
        id: "q2",
        type: "mcq",
        text: "What happens if a destructor in a C++ base class is NOT declared as virtual when deleting via a base pointer?",
        options: [
          "Compiler throws a syntax error",
          "Only the base class destructor is executed, leading to a resource leak",
          "Derived class destructor runs first automatically",
          "Both destructors run normally",
        ],
        correctAnswer: 1,
        marks: 5,
        explanation:
          "Without a virtual destructor, deleting a derived object via a base pointer causes undefined behavior, typically invoking only the base destructor.",
        groundedSource: "Unit 3 Notes & MITS 2024 End-Sem PYQ",
      },
      {
        id: "q3",
        type: "true_false",
        text: "In C++, a constructor can be declared as virtual.",
        options: ["True", "False"],
        correctAnswer: 1,
        marks: 5,
        explanation:
          "Constructors cannot be virtual because an object's vtable is not initialized until the constructor finishes executing.",
        groundedSource: "Unit 2 Notes: Classes, Constructors & Operator Overloading",
      },
      {
        id: "q4",
        type: "mcq",
        text: "Which operator CANNOT be overloaded in C++?",
        options: ["+", "::", "[]", "->"],
        correctAnswer: 1,
        marks: 5,
        explanation:
          "Scope resolution operator (::), dot operator (.), ternary operator (?:), and sizeof cannot be overloaded in C++.",
        groundedSource: "Unit 2 Notes: Classes, Constructors & Operator Overloading",
      },
    ],
  };

  await quizzesCol.insertOne(sampleQuiz);

  // 5. Seed SDMS-Style Project
  const projectsCol = await collection(COLLECTIONS.projects);
  const sampleProject = {
    title: "AI-Powered Adaptive Learning & Automated Academic Assessment System",
    description:
      "A distributed academic platform implementing intelligent knowledge tracing, automated question generation from syllabus notes, and progress analytics.",
    departmentId,
    programId,
    academicYear: "2025-2026",
    facultyGuideId: "mits-guide-1",
    facultyGuideName: "Dr. R. K. Sharma",
    studentIds: [],
    studentNames: ["Prashant Singh", "Aman Verma", "Priya Sharma"],
    studentEnrollments: ["0901CS221085", "0901CS221086", "0901CS221087"],
    status: "in_progress",
    progressPercentage: 65,
    facultyFeedback:
      "Synopsis and Literature Review approved. Ensure dataset preprocessing and API integration tests are completed by next milestone review.",
    documents: [
      {
        id: "doc-synopsis",
        type: "synopsis",
        title: "Project Synopsis & Scope Document",
        fileUrl: "/projects/synopsis_ai_adaptive.pdf",
        fileName: "Synopsis_SmartStudyAI.pdf",
        submittedAt: new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString(),
        status: "approved",
        remarks: "Approved by Project Committee on Sep 1st.",
      },
      {
        id: "doc-midreport",
        type: "report",
        title: "Mid-Term Progress Report & Architecture Diagrams",
        fileUrl: "/projects/midterm_report.pdf",
        fileName: "MidTerm_Report_v2.pdf",
        submittedAt: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
        status: "submitted",
        remarks: "Under review by faculty guide.",
      },
    ],
    createdAt: new Date(Date.now() - 20 * 24 * 3600 * 1000),
    updatedAt: new Date(),
  };

  await projectsCol.insertOne(sampleProject);

  // 6. Seed Announcements
  const announcementsCol = await collection(COLLECTIONS.announcements);
  const sampleAnnouncements = [
    {
      title: "Mid-Term Examination Schedule: 3rd Semester B.Tech (Nov 2025)",
      content:
        "The Mid-Term assessments for OOPM, Data Structures, and Discrete Mathematics will commence from next Monday. Please review the uploaded PYQs and lecture notes in your academic space.",
      type: "academic",
      targetProgramId: programId,
      targetSemester: 3,
      authorName: "Dean Academics & Head CSE",
      authorRole: "admin",
      createdAt: new Date(Date.now() - 1 * 24 * 3600 * 1000),
    },
    {
      title: "New Unit Notes Uploaded: C++ STL & Templates",
      content:
        "Unit 4 detailed notes with coding examples for STL vectors, maps, and algorithms have been posted to your OOPM space. A practice quiz is now open.",
      type: "notes",
      targetProgramId: programId,
      targetSemester: 3,
      authorName: "Dr. R. K. Sharma",
      authorRole: "teacher",
      createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000),
    },
    {
      title: "SDMS Major Project Phase-1 Milestone Submission Deadline",
      content:
        "All final year and pre-final year project groups must upload their Synopsis and Project Architecture PPT by the end of this month.",
      type: "deadline",
      targetProgramId: programId,
      targetSemester: 3,
      authorName: "Project Coordinator MITS",
      authorRole: "teacher",
      createdAt: new Date(Date.now() - 4 * 24 * 3600 * 1000),
    },
  ];

  for (const a of sampleAnnouncements) {
    await announcementsCol.insertOne(a);
  }

  console.info(
    "[Smart Study AI] Seeded academic subjects, notes, PYQs, library books, and quizzes successfully.",
  );
}
