const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Sample modules and assignments with mini questions
const moduleTemplates = [
  {
    moduleNumber: 1,
    title: "Introduction to Web Development",
    description: "Learn the basics of web development including HTML, CSS, and JavaScript fundamentals.",
    assignments: [
      {
        topicNumber: 1,
        title: "HTML Fundamentals",
        content: "Learn about HTML structure, semantic elements, and best practices for creating well-structured web pages.",
        description: "Master the building blocks of web development with HTML",
        points: 100,
        bonusPoints: 20,
        contents: [
          {
            title: "HTML Basics",
            material: "Introduction to HTML tags, attributes, and document structure. Learn about semantic HTML and accessibility best practices.",
            orderIndex: 1,
            miniQuestions: [
              {
                title: "HTML Document Structure",
                question: "Create a basic HTML5 document with proper DOCTYPE, head, and body sections. Include meta tags for viewport and character encoding.",
                description: "Practice creating a well-structured HTML document",
                orderIndex: 1
              },
              {
                title: "Semantic HTML Elements",
                question: "Build a webpage using semantic HTML elements like header, nav, main, section, article, aside, and footer.",
                description: "Learn to use semantic elements for better accessibility",
                orderIndex: 2
              }
            ]
          },
          {
            title: "Forms and Input Elements",
            material: "Learn about HTML forms, input types, validation, and form accessibility.",
            orderIndex: 2,
            miniQuestions: [
              {
                title: "Contact Form",
                question: "Create a contact form with name, email, phone, and message fields. Include proper labels and validation attributes.",
                description: "Practice building accessible forms",
                orderIndex: 1
              }
            ]
          }
        ]
      },
      {
        topicNumber: 2,
        title: "CSS Styling and Layout",
        content: "Explore CSS selectors, properties, flexbox, grid, and responsive design principles.",
        description: "Style your web pages with modern CSS techniques",
        points: 120,
        bonusPoints: 25,
        contents: [
          {
            title: "CSS Selectors and Properties",
            material: "Learn about CSS selectors, specificity, cascade, and common properties for styling text, colors, and spacing.",
            orderIndex: 1,
            miniQuestions: [
              {
                title: "CSS Styling Practice",
                question: "Style a webpage using various CSS selectors and properties. Include hover effects and transitions.",
                description: "Practice applying CSS styles effectively",
                orderIndex: 1
              }
            ]
          },
          {
            title: "Flexbox Layout",
            material: "Master CSS Flexbox for creating flexible and responsive layouts.",
            orderIndex: 2,
            miniQuestions: [
              {
                title: "Flexbox Navigation",
                question: "Create a responsive navigation bar using CSS Flexbox. Include mobile-friendly styling.",
                description: "Build layouts with Flexbox",
                orderIndex: 1
              }
            ]
          }
        ]
      },
      {
        topicNumber: 3,
        title: "JavaScript Fundamentals",
        content: "Learn JavaScript syntax, variables, functions, DOM manipulation, and event handling.",
        description: "Add interactivity to your web pages with JavaScript",
        points: 150,
        bonusPoints: 30,
        contents: [
          {
            title: "JavaScript Basics",
            material: "Variables, data types, operators, control structures, and functions in JavaScript.",
            orderIndex: 1,
            miniQuestions: [
              {
                title: "JavaScript Functions",
                question: "Write JavaScript functions to perform calculations and manipulate data. Include arrow functions and callbacks.",
                description: "Practice writing clean JavaScript functions",
                orderIndex: 1
              }
            ]
          },
          {
            title: "DOM Manipulation",
            material: "Learn to select, modify, and create HTML elements using JavaScript.",
            orderIndex: 2,
            miniQuestions: [
              {
                title: "Interactive Web Page",
                question: "Create an interactive webpage that responds to user clicks and form inputs using DOM manipulation.",
                description: "Build interactive user interfaces",
                orderIndex: 1
              }
            ]
          }
        ]
      }
    ]
  },
  {
    moduleNumber: 2,
    title: "Frontend Frameworks and Libraries",
    description: "Explore modern frontend frameworks like React, Vue, or Angular, and learn about component-based architecture.",
    assignments: [
      {
        topicNumber: 1,
        title: "React Components and JSX",
        content: "Learn React basics including components, JSX syntax, props, and state management.",
        description: "Build dynamic user interfaces with React",
        points: 140,
        bonusPoints: 28,
        contents: [
          {
            title: "React Fundamentals",
            material: "Introduction to React, JSX, components, and the virtual DOM concept.",
            orderIndex: 1,
            miniQuestions: [
              {
                title: "React Component Creation",
                question: "Create functional React components with props and demonstrate component composition.",
                description: "Practice building reusable components",
                orderIndex: 1
              }
            ]
          },
          {
            title: "State and Event Handling",
            material: "Learn about React hooks, state management, and handling user interactions.",
            orderIndex: 2,
            miniQuestions: [
              {
                title: "Interactive React App",
                question: "Build a React application with state management and event handlers for user interactions.",
                description: "Create interactive React applications",
                orderIndex: 1
              }
            ]
          }
        ]
      },
      {
        topicNumber: 2,
        title: "React Hooks and Effects",
        content: "Deep dive into React hooks including useState, useEffect, useContext, and custom hooks.",
        description: "Master React hooks for advanced state management",
        points: 160,
        bonusPoints: 32,
        contents: [
          {
            title: "Essential React Hooks",
            material: "useState, useEffect, useContext, useReducer, and when to use each hook.",
            orderIndex: 1,
            miniQuestions: [
              {
                title: "Data Fetching with useEffect",
                question: "Create a React component that fetches data from an API using useEffect and displays loading states.",
                description: "Practice side effects in React",
                orderIndex: 1
              }
            ]
          }
        ]
      }
    ]
  },
  {
    moduleNumber: 3,
    title: "Backend Development with Node.js",
    description: "Learn server-side development with Node.js, Express, databases, and API design.",
    assignments: [
      {
        topicNumber: 1,
        title: "Node.js and Express Basics",
        content: "Introduction to Node.js runtime, Express framework, middleware, and routing.",
        description: "Build server-side applications with Node.js",
        points: 130,
        bonusPoints: 26,
        contents: [
          {
            title: "Express Server Setup",
            material: "Setting up an Express server, middleware, routing, and handling requests/responses.",
            orderIndex: 1,
            miniQuestions: [
              {
                title: "RESTful API Creation",
                question: "Create a RESTful API with Express including GET, POST, PUT, and DELETE endpoints.",
                description: "Build APIs with Express",
                orderIndex: 1
              }
            ]
          }
        ]
      },
      {
        topicNumber: 2,
        title: "Database Integration",
        content: "Learn to integrate databases with Node.js applications using ORMs and database management.",
        description: "Persist data with databases",
        points: 170,
        bonusPoints: 34,
        contents: [
          {
            title: "Database Design and ORM",
            material: "Database design principles, SQL vs NoSQL, and using ORMs like Prisma or Sequelize.",
            orderIndex: 1,
            miniQuestions: [
              {
                title: "Database Schema Design",
                question: "Design a database schema for a blog application with users, posts, and comments. Implement with an ORM.",
                description: "Practice database design and implementation",
                orderIndex: 1
              }
            ]
          }
        ]
      }
    ]
  },
  {
    moduleNumber: 4,
    title: "Full Stack Project Development",
    description: "Combine frontend and backend skills to build complete web applications.",
    assignments: [
      {
        topicNumber: 1,
        title: "Project Planning and Architecture",
        content: "Learn project planning, architecture design, and full-stack application structure.",
        description: "Plan and architect full-stack applications",
        points: 120,
        bonusPoints: 24,
        contents: [
          {
            title: "Application Architecture",
            material: "MVC pattern, API design, database schema planning, and project structure organization.",
            orderIndex: 1,
            miniQuestions: [
              {
                title: "Project Proposal",
                question: "Create a detailed project proposal including architecture diagram, database schema, and API endpoints.",
                description: "Plan a comprehensive full-stack project",
                orderIndex: 1
              }
            ]
          }
        ]
      },
      {
        topicNumber: 2,
        title: "Full Stack Implementation",
        content: "Build a complete web application integrating frontend, backend, and database components.",
        description: "Implement your full-stack project",
        points: 200,
        bonusPoints: 40,
        contents: [
          {
            title: "Frontend-Backend Integration",
            material: "Connecting React frontend with Node.js backend, handling authentication, and state management.",
            orderIndex: 1,
            miniQuestions: [
              {
                title: "Full Stack Application",
                question: "Build a complete web application with user authentication, CRUD operations, and responsive design.",
                description: "Create a production-ready application",
                orderIndex: 1
              }
            ]
          }
        ]
      }
    ]
  }
];

async function createModulesAndAssignments() {
  try {
    console.log('🚀 Starting to create modules and assignments for all cohorts...');
    
    // Get all cohorts
    const cohorts = await prisma.cohort.findMany({
      select: {
        id: true,
        name: true
      }
    });
    
    console.log(`Found ${cohorts.length} cohorts`);
    
    for (const cohort of cohorts) {
      console.log(`\n📚 Creating modules for cohort: ${cohort.name}`);
      
      let globalQuestionNumber = 1; // Reset for each cohort to avoid conflicts
      
      for (const moduleTemplate of moduleTemplates) {
        console.log(`  📖 Creating module: ${moduleTemplate.title}`);
        
        // Create module
        const module = await prisma.module.create({
          data: {
            moduleNumber: moduleTemplate.moduleNumber,
            title: moduleTemplate.title,
            description: moduleTemplate.description,
            cohortId: cohort.id,
            isReleased: false, // Keep unreleased as requested
            isActive: false,
            releaseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
          }
        });
        
        console.log(`    ✅ Module created with ID: ${module.id}`);
        
        // Create assignments (questions) for this module
        for (const assignmentTemplate of moduleTemplate.assignments) {
          console.log(`    📝 Creating assignment: ${assignmentTemplate.title}`);
          
          // Create question (assignment)
          const question = await prisma.question.create({
            data: {
              questionNumber: globalQuestionNumber++, // Use incremental number per cohort
              topicNumber: assignmentTemplate.topicNumber,
              title: assignmentTemplate.title,
              content: assignmentTemplate.content,
              description: assignmentTemplate.description,
              points: assignmentTemplate.points,
              bonusPoints: assignmentTemplate.bonusPoints,
              moduleId: module.id,
              cohortId: cohort.id,
              isReleased: false, // Keep unreleased as requested
              isActive: false,
              releaseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
              deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000) // 45 days from now
            }
          });
          
          console.log(`      ✅ Assignment created with ID: ${question.id}`);
          
          // Create content sections and mini questions
          for (const contentTemplate of assignmentTemplate.contents) {
            console.log(`      📄 Creating content: ${contentTemplate.title}`);
            
            // Create content section
            const content = await prisma.content.create({
              data: {
                title: contentTemplate.title,
                material: contentTemplate.material,
                orderIndex: contentTemplate.orderIndex,
                questionId: question.id
              }
            });
            
            console.log(`        ✅ Content created with ID: ${content.id}`);
            
            // Create mini questions for this content
            for (const miniQuestionTemplate of contentTemplate.miniQuestions) {
              console.log(`        🔍 Creating mini question: ${miniQuestionTemplate.title}`);
              
              const miniQuestion = await prisma.miniQuestion.create({
                data: {
                  title: miniQuestionTemplate.title,
                  question: miniQuestionTemplate.question,
                  description: miniQuestionTemplate.description,
                  orderIndex: miniQuestionTemplate.orderIndex,
                  contentId: content.id,
                  isReleased: false, // Keep unreleased as requested
                  releaseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
                }
              });
              
              console.log(`          ✅ Mini question created with ID: ${miniQuestion.id}`);
            }
          }
        }
      }
    }
    
    console.log('\n🎉 Successfully created all modules and assignments with mini questions!');
    console.log('📋 Summary:');
    
    // Get summary statistics
    const moduleCount = await prisma.module.count();
    const questionCount = await prisma.question.count({ where: { moduleId: { not: null } } });
    const contentCount = await prisma.content.count();
    const miniQuestionCount = await prisma.miniQuestion.count();
    
    console.log(`  - Total Modules: ${moduleCount}`);
    console.log(`  - Total Assignments: ${questionCount}`);
    console.log(`  - Total Content Sections: ${contentCount}`);
    console.log(`  - Total Mini Questions: ${miniQuestionCount}`);
    console.log('\n⚠️  Note: All modules, assignments, and mini questions are created as UNRELEASED');
    console.log('   You can release them individually through the admin panel when ready.');
    
  } catch (error) {
    console.error('❌ Error creating modules and assignments:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createModulesAndAssignments();
