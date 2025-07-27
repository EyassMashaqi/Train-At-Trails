# Module & Topic System Documentation

## Overview

The Train-At-Trails application has been restructured from a 12-question system to a 4-module system with varying numbers of topics per module. This provides a more organized learning experience aligned with leadership development principles.

## Module Structure

### Module 1: Leadership Foundation (4 topics)
1. **Leadership Development**
   - Explore fundamental leadership principles and personal leadership style
   - Focus: Self-awareness and leadership competencies

2. **Continuous Learning Plan & Skill Learning**
   - Create structured approach to continuous learning
   - Focus: Personal development planning

3. **Reflection & Emotional Intelligence**
   - Develop self-awareness and emotional intelligence
   - Focus: Self-reflection and EQ building

4. **Presentation**
   - Present learning and insights from Module One
   - Focus: Communication and knowledge consolidation

### Module 2: Team Leadership & Communication (6 topics)
1. **Zone 1**
   - Master fundamentals of team dynamics and leadership zones
   - Focus: Basic team leadership concepts

2. **Zone 2**
   - Advance understanding of leadership zones and team management
   - Focus: Intermediate team leadership strategies

3. **Zone 3**
   - Master advanced leadership zone concepts and applications
   - Focus: Complex situation management

4. **Presentation**
   - Present understanding of leadership zones
   - Focus: Demonstrating team leadership mastery

5. **Powerful Questions**
   - Learn to ask questions that drive meaningful conversations
   - Focus: Communication skills and inquiry techniques

6. **Run Feedback 1:1s & Plan Completion**
   - Conduct effective one-on-one feedback sessions
   - Focus: Feedback delivery and planning completion

### Module 3: Delegation & Performance Management (4 topics)
1. **Practice Running 1:1**
   - Practice conducting effective one-on-one meetings
   - Focus: Hands-on meeting facilitation

2. **Delegation Plan**
   - Create comprehensive delegation strategies
   - Focus: Strategic delegation planning

3. **Task Delegation**
   - Master practical aspects of delegating tasks
   - Focus: Operational delegation skills

4. **Performance Sheet**
   - Develop performance tracking and evaluation systems
   - Focus: Performance management tools

### Module 4: Mindset & Resilience (3 topics)
1. **Presentation - Mindset Shift**
   - Present understanding of mindset shifts in leadership
   - Focus: Demonstrating mindset transformation

2. **Energy Redirection**
   - Learn to redirect negative energy into positive outcomes
   - Focus: Energy management and transformation

3. **Flip the Frame - Obstacle to Opportunity**
   - Transform obstacles into opportunities through reframing
   - Focus: Resilience and opportunity identification

## Release Schedule

### Module Release Pattern
- **Module 1**: Available immediately (August 1, 2025)
- **Module 2**: Released after 2 weeks (August 15, 2025)
- **Module 3**: Released after 4 weeks (August 29, 2025)
- **Module 4**: Released after 6 weeks (September 12, 2025)

### Topic Release Pattern
Within each module, topics are released every 2 days:
- **Topic 1**: Day 1 of module release
- **Topic 2**: Day 3 of module release
- **Topic 3**: Day 5 of module release
- **And so on...**

### Deadlines
- Each topic has a 48-hour deadline for full points
- Modules have a 2-week completion window
- Late submissions receive reduced points

## API Changes

### New Endpoints

#### GET `/api/game/modules`
Returns all available modules with their topics.

#### GET `/api/game/modules/:moduleNumber`
Returns specific module with its topics.

#### GET `/api/game/progress`
Returns detailed user progress through modules and topics.

#### Updated `/api/game/status`
Now includes both module/topic information and backward compatibility with questions.

#### Updated `/api/game/answer`
Supports submitting answers for topics with optional `topicId` parameter.

### Database Schema Changes

#### New Tables
- **modules**: Stores module information
- **topics**: Stores topic information within modules

#### Updated Tables
- **users**: Added `currentModule` and `currentTopic` fields
- **answers**: Added optional `topicId` field for topic-based answers

## Implementation Details

### Backward Compatibility
The system maintains compatibility with the original question-based structure:
- Existing questions remain functional
- API responses include both question and topic data
- Users can complete either system

### Automatic Content Release
- New `ModuleTopicScheduler` service manages automatic release
- Runs every hour to check for scheduled releases
- Logs release activities for monitoring

### Progress Tracking
- User progress tracked at both module and topic levels
- Completion percentages calculated across all topics
- Module completion unlocks next module access

## Frontend Integration

### GameView Updates Needed
1. **Module Navigation**: Add module-based navigation
2. **Topic Display**: Show current topic within module context
3. **Progress Indicators**: Update to show module/topic progress
4. **Answer Submission**: Support topic-based answer submission

### Dashboard Updates Needed
1. **Module Overview**: Display all modules with completion status
2. **Topic Timeline**: Show topic release schedule
3. **Progress Visualization**: Module-based progress tracking

## Migration Process

### Database Migration
```bash
npx prisma migrate dev --name add_modules_and_topics
```

### Data Seeding
```bash
npx ts-node prisma/seed-modules.ts
```

### Service Integration
The `ModuleTopicScheduler` should be started in the main server file:

```typescript
import { startModuleTopicScheduler } from './services/moduleTopicScheduler';

// Start the scheduler
startModuleTopicScheduler();
```

## Testing Considerations

1. **Module Release Testing**: Verify modules release on schedule
2. **Topic Progression**: Test topic-by-topic progression within modules
3. **Answer Submission**: Test both question and topic answer submission
4. **Progress Calculation**: Verify accurate progress tracking
5. **Deadline Management**: Test deadline enforcement and point reduction

## Benefits of New System

1. **Better Organization**: Content grouped by learning themes
2. **Flexible Pacing**: Different modules have appropriate topic counts
3. **Clear Progression**: Logical flow through leadership development
4. **Enhanced Learning**: Module-based structure supports better retention
5. **Scalability**: Easy to add/modify modules and topics

## Future Enhancements

1. **Module Prerequisites**: Require module completion before next module
2. **Adaptive Timing**: Adjust release schedule based on completion rates
3. **Module Certificates**: Award certificates for module completion
4. **Peer Learning**: Enable topic-based discussions and collaboration
5. **Advanced Analytics**: Track learning patterns across modules
