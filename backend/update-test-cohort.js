const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Different content templates for the test cohort
const testCohortModuleUpdates = [
  {
    moduleNumber: 1,
    title: "Advanced Web Technologies",
    description: "Explore cutting-edge web technologies including modern frameworks, PWAs, and advanced JavaScript concepts.",
    assignments: [
      {
        topicNumber: 1,
        title: "Modern JavaScript ES6+",
        content: "Master advanced JavaScript features including arrow functions, destructuring, promises, async/await, and modules.",
        description: "Deep dive into modern JavaScript programming paradigms",
        points: 110,
        bonusPoints: 25,
        contents: [
          {
            title: "ES6+ Features",
            material: "Advanced JavaScript syntax including let/const, template literals, destructuring, spread operator, and arrow functions.",
            orderIndex: 1,
            miniQuestions: [
              {
                title: "Advanced Function Syntax",
                question: "Implement a complex application using arrow functions, destructuring, and async/await patterns.",
                description: "Practice modern JavaScript syntax and patterns",
                orderIndex: 1
              },
              {
                title: "Module System Implementation",
                question: "Create a modular JavaScript application using ES6 import/export syntax and organize code into logical modules.",
                description: "Learn modern JavaScript module patterns",
                orderIndex: 2
              }
            ]
          },
          {
            title: "Asynchronous Programming",
            material: "Promises, async/await, fetch API, and handling asynchronous operations in modern JavaScript.",
            orderIndex: 2,
            miniQuestions: [
              {
                title: "API Integration Project",
                question: "Build a weather dashboard that fetches data from multiple APIs using async/await and handles errors gracefully.",
                description: "Master asynchronous JavaScript programming",
                orderIndex: 1
              }
            ]
          }
        ]
      },
      {
        topicNumber: 2,
        title: "Progressive Web Applications",
        content: "Learn to build Progressive Web Apps with service workers, offline functionality, and native app-like features.",
        description: "Create modern web applications with native capabilities",
        points: 140,
        bonusPoints: 30,
        contents: [
          {
            title: "Service Workers and Caching",
            material: "Implementing service workers for offline functionality, caching strategies, and background sync.",
            orderIndex: 1,
            miniQuestions: [
              {
                title: "Offline-First Application",
                question: "Implement a task manager PWA that works offline and syncs when connection is restored.",
                description: "Build offline-capable web applications",
                orderIndex: 1
              }
            ]
          },
          {
            title: "Web App Manifest and Installation",
            material: "Creating app manifests, installation prompts, and native app-like experiences on mobile devices.",
            orderIndex: 2,
            miniQuestions: [
              {
                title: "Installable Web App",
                question: "Create a PWA with proper manifest configuration that can be installed on mobile devices.",
                description: "Make web apps installable and native-like",
                orderIndex: 1
              }
            ]
          }
        ]
      },
      {
        topicNumber: 3,
        title: "Advanced CSS Techniques",
        content: "Explore CSS Grid, animations, custom properties, and modern layout techniques for complex designs.",
        description: "Master advanced CSS for sophisticated web interfaces",
        points: 130,
        bonusPoints: 28,
        contents: [
          {
            title: "CSS Grid and Advanced Layouts",
            material: "CSS Grid system, complex layouts, responsive design patterns, and modern CSS architecture.",
            orderIndex: 1,
            miniQuestions: [
              {
                title: "Complex Grid Layout",
                question: "Design a magazine-style layout using CSS Grid with responsive breakpoints and dynamic content areas.",
                description: "Create sophisticated layouts with CSS Grid",
                orderIndex: 1
              }
            ]
          },
          {
            title: "CSS Animations and Interactions",
            material: "CSS transitions, keyframe animations, transforms, and creating engaging user interactions.",
            orderIndex: 2,
            miniQuestions: [
              {
                title: "Interactive Animation Portfolio",
                question: "Build an interactive portfolio website with smooth animations, hover effects, and scroll-triggered animations.",
                description: "Implement engaging CSS animations",
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
    title: "Advanced Frontend Architecture",
    description: "Learn advanced frontend patterns, state management, testing, and performance optimization techniques.",
    assignments: [
      {
        topicNumber: 1,
        title: "State Management Patterns",
        content: "Master advanced state management with Redux, Context API, and modern state management libraries.",
        description: "Implement scalable state management solutions",
        points: 160,
        bonusPoints: 35,
        contents: [
          {
            title: "Redux and Complex State",
            material: "Redux patterns, middleware, async actions, and managing complex application state.",
            orderIndex: 1,
            miniQuestions: [
              {
                title: "E-commerce State Management",
                question: "Build a shopping cart system with Redux that handles user authentication, product catalog, and order management.",
                description: "Implement complex state management with Redux",
                orderIndex: 1
              }
            ]
          },
          {
            title: "Custom Hooks and Context",
            material: "Creating custom React hooks, context providers, and efficient state sharing patterns.",
            orderIndex: 2,
            miniQuestions: [
              {
                title: "Custom Hook Library",
                question: "Create a library of reusable custom hooks for common functionality like data fetching, local storage, and form handling.",
                description: "Build reusable React patterns",
                orderIndex: 1
              }
            ]
          }
        ]
      },
      {
        topicNumber: 2,
        title: "Performance Optimization",
        content: "Learn advanced techniques for optimizing React applications including code splitting, lazy loading, and performance monitoring.",
        description: "Build high-performance React applications",
        points: 180,
        bonusPoints: 40,
        contents: [
          {
            title: "Code Splitting and Lazy Loading",
            material: "React.lazy, Suspense, dynamic imports, and optimizing bundle sizes for better performance.",
            orderIndex: 1,
            miniQuestions: [
              {
                title: "Optimized Dashboard Application",
                question: "Build a dashboard with lazy-loaded components, route-based code splitting, and performance monitoring.",
                description: "Optimize React application performance",
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
    title: "Advanced Backend Systems",
    description: "Build scalable backend systems with microservices, real-time features, and advanced database patterns.",
    assignments: [
      {
        topicNumber: 1,
        title: "Microservices Architecture",
        content: "Design and implement microservices using Node.js, Docker, and API gateway patterns.",
        description: "Build scalable microservices systems",
        points: 150,
        bonusPoints: 32,
        contents: [
          {
            title: "Service Design and Communication",
            material: "Microservice patterns, inter-service communication, API design, and service discovery.",
            orderIndex: 1,
            miniQuestions: [
              {
                title: "Multi-Service Application",
                question: "Design a blog platform with separate services for users, posts, comments, and notifications.",
                description: "Implement microservices architecture",
                orderIndex: 1
              }
            ]
          }
        ]
      },
      {
        topicNumber: 2,
        title: "Real-time Applications",
        content: "Implement real-time features using WebSockets, Socket.io, and event-driven architectures.",
        description: "Build applications with real-time communication",
        points: 190,
        bonusPoints: 42,
        contents: [
          {
            title: "WebSocket Implementation",
            material: "WebSocket protocols, Socket.io, real-time data synchronization, and scalable real-time systems.",
            orderIndex: 1,
            miniQuestions: [
              {
                title: "Real-time Collaboration Tool",
                question: "Build a collaborative whiteboard application with real-time drawing, user cursors, and chat functionality.",
                description: "Implement real-time communication features",
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
    title: "Enterprise Development",
    description: "Learn enterprise-level development practices including DevOps, testing strategies, and deployment automation.",
    assignments: [
      {
        topicNumber: 1,
        title: "DevOps and CI/CD",
        content: "Implement continuous integration, deployment pipelines, and infrastructure as code practices.",
        description: "Master DevOps practices for modern development",
        points: 140,
        bonusPoints: 30,
        contents: [
          {
            title: "Pipeline Automation",
            material: "GitHub Actions, Docker, automated testing, deployment strategies, and infrastructure management.",
            orderIndex: 1,
            miniQuestions: [
              {
                title: "Complete CI/CD Pipeline",
                question: "Set up a complete CI/CD pipeline with automated testing, Docker containerization, and deployment to cloud platforms.",
                description: "Implement enterprise deployment practices",
                orderIndex: 1
              }
            ]
          }
        ]
      },
      {
        topicNumber: 2,
        title: "Enterprise Architecture Project",
        content: "Design and implement a complete enterprise-level application with all advanced concepts integrated.",
        description: "Build a production-ready enterprise application",
        points: 250,
        bonusPoints: 50,
        contents: [
          {
            title: "Full-Scale Application Development",
            material: "Combining all advanced concepts into a comprehensive, scalable, and maintainable enterprise application.",
            orderIndex: 1,
            miniQuestions: [
              {
                title: "Enterprise Platform",
                question: "Build a complete enterprise platform with microservices, real-time features, advanced frontend, and full DevOps pipeline.",
                description: "Create a comprehensive enterprise solution",
                orderIndex: 1
              }
            ]
          }
        ]
      }
    ]
  }
];

async function updateTestCohortContent() {
  try {
    console.log('🔄 Updating test cohort content to be different from Default Cohort...');
    
    // Find the test cohort
    const testCohort = await prisma.cohort.findFirst({
      where: {
        name: 'test1111'
      }
    });
    
    if (!testCohort) {
      console.log('❌ Test cohort "test1111" not found');
      return;
    }
    
    console.log(`Found test cohort: ${testCohort.name} (ID: ${testCohort.id})`);
    
    // Get existing modules for the test cohort
    const existingModules = await prisma.module.findMany({
      where: {
        cohortId: testCohort.id
      },
      include: {
        questions: {
          include: {
            contents: {
              include: {
                miniQuestions: true
              }
            }
          }
        }
      },
      orderBy: {
        moduleNumber: 'asc'
      }
    });
    
    console.log(`Found ${existingModules.length} existing modules to update`);
    
    for (let i = 0; i < existingModules.length && i < testCohortModuleUpdates.length; i++) {
      const module = existingModules[i];
      const updateData = testCohortModuleUpdates[i];
      
      console.log(`\n📚 Updating Module ${module.moduleNumber}: ${module.title}`);
      
      // Update module
      await prisma.module.update({
        where: { id: module.id },
        data: {
          title: updateData.title,
          description: updateData.description
        }
      });
      
      console.log(`  ✅ Module updated to: ${updateData.title}`);
      
      // Update questions (assignments)
      for (let j = 0; j < module.questions.length && j < updateData.assignments.length; j++) {
        const question = module.questions[j];
        const assignmentUpdate = updateData.assignments[j];
        
        console.log(`    📝 Updating Assignment: ${question.title}`);
        
        // Update question
        await prisma.question.update({
          where: { id: question.id },
          data: {
            title: assignmentUpdate.title,
            content: assignmentUpdate.content,
            description: assignmentUpdate.description,
            points: assignmentUpdate.points,
            bonusPoints: assignmentUpdate.bonusPoints
          }
        });
        
        console.log(`      ✅ Assignment updated to: ${assignmentUpdate.title}`);
        
        // Update content sections and mini questions
        for (let k = 0; k < question.contents.length && k < assignmentUpdate.contents.length; k++) {
          const content = question.contents[k];
          const contentUpdate = assignmentUpdate.contents[k];
          
          console.log(`      📄 Updating Content: ${content.title}`);
          
          // Update content
          await prisma.content.update({
            where: { id: content.id },
            data: {
              title: contentUpdate.title,
              material: contentUpdate.material
            }
          });
          
          console.log(`        ✅ Content updated to: ${contentUpdate.title}`);
          
          // Update mini questions
          for (let l = 0; l < content.miniQuestions.length && l < contentUpdate.miniQuestions.length; l++) {
            const miniQuestion = content.miniQuestions[l];
            const miniQuestionUpdate = contentUpdate.miniQuestions[l];
            
            console.log(`        🔍 Updating Mini Question: ${miniQuestion.title}`);
            
            await prisma.miniQuestion.update({
              where: { id: miniQuestion.id },
              data: {
                title: miniQuestionUpdate.title,
                question: miniQuestionUpdate.question,
                description: miniQuestionUpdate.description
              }
            });
            
            console.log(`          ✅ Mini question updated to: ${miniQuestionUpdate.title}`);
          }
        }
      }
    }
    
    console.log('\n🎉 Successfully updated test cohort content!');
    console.log('\n📋 Test Cohort Now Contains:');
    console.log('  Module 1: Advanced Web Technologies');
    console.log('    - Modern JavaScript ES6+');
    console.log('    - Progressive Web Applications');
    console.log('    - Advanced CSS Techniques');
    console.log('  Module 2: Advanced Frontend Architecture');
    console.log('    - State Management Patterns');
    console.log('    - Performance Optimization');
    console.log('  Module 3: Advanced Backend Systems');
    console.log('    - Microservices Architecture');
    console.log('    - Real-time Applications');
    console.log('  Module 4: Enterprise Development');
    console.log('    - DevOps and CI/CD');
    console.log('    - Enterprise Architecture Project');
    
    console.log('\n✨ Test cohort content is now completely different from Default Cohort!');
    
  } catch (error) {
    console.error('❌ Error updating test cohort content:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateTestCohortContent();
