# Claude Code Agents Documentation

## 🤖 **Available Agents**

This document outlines the specialized agents available in Claude Code and their optimal use cases for the Apex Dashboard project.

---

## 🔧 **General-Purpose Agent**

**Agent Type**: `general-purpose`

**Description**: General-purpose agent for researching complex questions, searching for code, and executing multi-step tasks autonomously.

**Tools Available**: All tools (*, Read, Write, Edit, Glob, Grep, Bash, etc.)

### **When to Use**
- ✅ Multi-file code searches requiring multiple rounds of exploration
- ✅ Complex refactoring tasks spanning multiple components
- ✅ Research tasks that need comprehensive codebase analysis
- ✅ Bug investigation requiring deep code exploration
- ✅ Feature implementation planning across multiple modules

### **Personal Bests Feature Usage**
```typescript
// Example: Use when implementing Phase 1 data transformation
// Agent can search through existing race data structures,
// analyze transformation patterns, and implement the core logic
```

**Sample Task**:
```
"Research how the current iRating history transformation works in the codebase, 
then implement similar pattern for personal bests aggregation across all race data"
```

---

## ⚙️ **Status Line Setup Agent**

**Agent Type**: `statusline-setup`

**Description**: Specialized agent for configuring Claude Code status line settings.

**Tools Available**: Read, Edit

### **When to Use**
- ✅ Configuring development environment status indicators
- ✅ Setting up project-specific status line information
- ✅ Customizing Claude Code interface elements

### **Not Relevant for Current Feature**
This agent is not needed for the Personal Bests feature implementation.

---

## 🎨 **Output Style Setup Agent**

**Agent Type**: `output-style-setup`

**Description**: Specialized agent for creating and configuring Claude Code output styles.

**Tools Available**: Read, Write, Edit, Glob, Grep

### **When to Use**
- ✅ Customizing code output formatting
- ✅ Setting up project-specific style configurations
- ✅ Configuring development environment appearance

### **Personal Bests Feature Usage**
Could be used to configure output styles for:
- Personal bests data display formatting
- iRating analysis result presentation
- Development logging styles for the new feature

---

## 🎯 **Optimal Agent Usage for Personal Bests Feature**

### **Phase 1: Data Foundation**
```typescript
// Use general-purpose agent for:
Task: "Analyze existing race data transformation patterns in src/lib/iracing-data-transform.ts 
and implement PersonalBestsTransformer following the same architectural patterns"
```

### **Phase 2: Performance Analysis**  
```typescript
// Use general-purpose agent for:
Task: "Research strength of field calculations in the codebase and implement 
iRating equivalency analysis module with comprehensive test coverage"
```

### **Phase 3: UI Components**
```typescript  
// Use general-purpose agent for:
Task: "Analyze existing card component patterns in src/components/ and create 
atomic PersonalBest card components following the established design system"
```

### **Phase 4: Integration**
```typescript
// Use general-purpose agent for:
Task: "Research the driver dashboard integration patterns and add Personal Bests 
preview section with navigation to the full page"
```

### **Phase 5: Enhancement**
```typescript
// Use general-purpose agent for:
Task: "Implement progressive loading patterns similar to existing components 
and add comprehensive error handling for the Personal Bests feature"
```

---

## 🚀 **Agent Usage Best Practices**

### **Do Use Agents When:**
- Task requires searching across multiple files
- Implementation spans several components
- Research phase needs comprehensive code exploration  
- Complex refactoring with multiple dependencies
- Bug investigation requiring deep analysis

### **Don't Use Agents When:**
- Simple single-file edits
- Straightforward component creation following clear patterns
- Minor configuration changes
- Direct file reads for specific information

### **Agent Task Optimization**
```typescript
// ✅ Good Agent Task
"Research existing authentication patterns, analyze session management, 
and implement personal bests caching with smart invalidation"

// ❌ Poor Agent Task  
"Read the authentication file"
```

---

## 🧪 **Agent Testing Strategy**

### **Development Phase Testing**
- Use general-purpose agent to research testing patterns
- Implement comprehensive test suites for new modules
- Analyze existing test coverage and extend patterns

### **Integration Testing**
- Agent can research end-to-end testing approaches
- Implement cross-component integration tests
- Validate data flow from transformation to UI

---

## 📋 **Agent Task Templates**

### **Research & Analysis**
```
Task: "Research [specific pattern/feature] in the codebase, analyze the current 
implementation approach, and provide recommendations for [new feature] following 
the same architectural patterns"

Agent: general-purpose
```

### **Implementation**
```  
Task: "Implement [feature] by analyzing existing [similar feature] patterns, 
creating the necessary components, and ensuring integration with current 
[system/module] following established conventions"

Agent: general-purpose
```

### **Testing & Validation**
```
Task: "Research existing test patterns for [component type], implement 
comprehensive test coverage for [new feature], and validate integration 
with existing test suite"

Agent: general-purpose
```

---

## ⚠️ **Agent Limitations & Considerations**

### **Rate Limiting**
- Agents may perform multiple tool calls
- Consider impact on API rate limits for extensive research tasks
- Break large tasks into smaller, focused agent calls

### **Context Management**
- Each agent invocation is stateless
- Provide comprehensive task descriptions
- Specify exact deliverables expected

### **Task Scope**
- Agents work best with clearly defined objectives
- Avoid overly broad or vague task descriptions
- Break complex features into logical agent tasks

---

## 📊 **Agent Usage Tracking**

### **Current Feature Progress**
- **Phase 1**: Ready for general-purpose agent assistance
- **Research Complete**: Architecture analysis done manually
- **Next Agent Task**: Data transformation implementation

### **Recommended Agent Sequence**
1. **Research existing patterns** (general-purpose)
2. **Implement core transformation** (general-purpose)  
3. **Create UI components** (general-purpose)
4. **Integration and testing** (general-purpose)

---

## 🏆 **Specialized Development Agents**

### **iRacing Expert Coder Agent**

**Agent Type**: `iracing-expert-coder`

**Description**: A specialized, expert coder renowned for respecting DRY, SOLID, KISS and atomic development principles. Has extensive knowledge of iRacing API or gets up-to-date through research. This agent collaborates with the QA Analyst for iterative code improvement.

**Tools Available**: All tools (*, Read, Write, Edit, Glob, Grep, Bash, WebFetch for research)

#### **Core Responsibilities**
- ✅ Implement features following DRY, SOLID, KISS, and atomic development principles
- ✅ Research iRacing API patterns and integrate with existing codebase conventions
- ✅ Write comprehensive, testable code with proper TypeScript typing
- ✅ Collaborate with QA Analyst for iterative improvement
- ✅ Only commit code after QA Analyst approval

#### **Workflow Process**
```typescript
1. Research existing patterns and iRacing API requirements
2. Implement feature following architectural principles
3. Send code to QA Analyst for review
4. Iterate based on QA feedback until approval
5. Commit only when QA Analyst judges code as "excellent quality"
```

#### **When to Use**
- ✅ Complex iRacing data transformation implementations
- ✅ API integration requiring deep iRacing knowledge
- ✅ Performance-critical data processing modules
- ✅ Features requiring comprehensive research and implementation

#### **Personal Bests Feature Usage**
```typescript
Task: "Research existing iRating calculation patterns in the codebase, implement 
the PersonalBestsTransformer module following atomic development principles, 
and collaborate with QA Analyst to ensure code quality meets project standards"
```

---

### **QA Code Quality Analyst Agent**

**Agent Type**: `qa-code-quality-analyst`

**Description**: A QA analyst specializing in code quality assessment against DRY, SOLID, KISS, and atomic development principles. Provides detailed feedback to coders and ensures excellent code quality before approving commits.

**Tools Available**: Read, Grep, Glob (for analysis), limited Write for feedback documentation

#### **Core Responsibilities**
- ✅ Review code against DRY, SOLID, KISS, and atomic development principles
- ✅ Analyze code for TypeScript best practices and type safety
- ✅ Assess test coverage and code maintainability
- ✅ Provide detailed, actionable feedback for improvement
- ✅ Only approve commits when code quality is "excellent"

#### **Quality Assessment Criteria**
```typescript
DRY Assessment:
- No code duplication
- Reuse of existing utilities and patterns
- Shared logic properly abstracted

SOLID Assessment:
- Single Responsibility Principle compliance
- Open/Closed Principle adherence
- Interface Segregation and Dependency Inversion

KISS Assessment:
- Simple, readable implementation
- Minimal cognitive complexity
- Clear, self-documenting code

Atomic Development:
- Independently testable functions
- Clear separation of concerns
- Incremental, logical code structure
```

#### **Feedback Categories**
- 🔴 **Critical**: Must fix before proceeding
- 🟡 **Important**: Should fix for better quality
- 🟢 **Suggestion**: Nice-to-have improvements
- ✅ **Approved**: Ready for commit

#### **When to Use**
- ✅ After iRacing Expert Coder completes implementation
- ✅ Before any significant code commits
- ✅ For architectural review of complex modules
- ✅ When code quality validation is required

---

### **Additional Specialized Agents**

### **Performance Optimization Specialist Agent**

**Agent Type**: `performance-optimization-specialist`

**Description**: Expert in React performance, caching strategies, and data optimization. Focuses on making features fast, efficient, and scalable.

**Tools Available**: Read, Edit, Bash (for performance testing), Grep, Glob

#### **Core Responsibilities**
- ✅ Analyze performance bottlenecks in React components
- ✅ Optimize data transformation and caching strategies
- ✅ Implement efficient rendering patterns (memoization, virtualization)
- ✅ Measure and improve bundle size and load times
- ✅ Optimize API usage and reduce redundant calls

#### **When to Use**
- ✅ After core feature implementation for optimization
- ✅ When performance issues are identified
- ✅ For large dataset handling optimization
- ✅ Cache strategy implementation and optimization

#### **Personal Bests Feature Usage**
```typescript
Task: "Analyze the PersonalBests feature for performance bottlenecks, optimize 
data transformation efficiency, implement proper memoization for UI components, 
and ensure sub-500ms load times"
```

---

### **UI/UX Integration Specialist Agent**

**Agent Type**: `ui-ux-integration-specialist`

**Description**: Expert in React component architecture, design system integration, and user experience optimization. Ensures components follow established patterns and provide excellent UX.

**Tools Available**: Read, Write, Edit, Glob, Grep

#### **Core Responsibilities**
- ✅ Implement components following existing design system patterns
- ✅ Ensure consistent UI/UX across the application
- ✅ Optimize component reusability and composition
- ✅ Implement responsive design and accessibility features
- ✅ Create smooth loading states and error handling UX

#### **When to Use**
- ✅ For complex UI component implementation
- ✅ When integrating new features into existing dashboard
- ✅ For responsive design and accessibility requirements
- ✅ Creating reusable component libraries

#### **Personal Bests Feature Usage**
```typescript
Task: "Create the PersonalBests UI components following the existing card patterns, 
implement progressive loading states, ensure responsive design, and integrate 
seamlessly with the current driver dashboard design system"
```

---

## 🔄 **Agent Collaboration Workflow**

### **Development Cycle**
```
1. iRacing Expert Coder → Research & Implement
2. QA Code Quality Analyst → Review & Provide Feedback
3. iRacing Expert Coder → Address Feedback & Iterate
4. QA Code Quality Analyst → Re-review
5. Repeat 3-4 until QA approves as "excellent quality"
6. iRacing Expert Coder → Commit approved code
7. Performance Optimization Specialist → Optimize (if needed)
8. UI/UX Integration Specialist → Polish UI/UX (if needed)
```

### **Quality Gates**
- **Gate 1**: Code functionality and basic principles (iRacing Expert Coder)
- **Gate 2**: Quality standards and best practices (QA Code Quality Analyst)
- **Gate 3**: Performance optimization (Performance Optimization Specialist)
- **Gate 4**: UI/UX integration (UI/UX Integration Specialist)

---

## 📋 **Agent Task Templates**

### **Expert Coder Task**
```
Task: "Research [existing patterns], implement [feature] following DRY/SOLID/KISS/atomic 
principles, collaborate with QA Analyst for quality review, and iterate until 
approval before committing"

Agent: iracing-expert-coder
```

### **QA Analyst Task**
```
Task: "Review [implemented code] against DRY, SOLID, KISS, and atomic development 
principles. Provide detailed feedback with priority levels. Only approve when 
code quality is excellent."

Agent: qa-code-quality-analyst
```

### **Performance Specialist Task**
```
Task: "Analyze [feature] for performance bottlenecks, optimize data processing 
and rendering, implement efficient caching, and ensure <500ms load times"

Agent: performance-optimization-specialist
```

### **UI/UX Specialist Task**
```
Task: "Create [UI components] following existing design patterns, implement 
responsive design and accessibility features, and ensure seamless integration 
with current dashboard"

Agent: ui-ux-integration-specialist
```

---

*This document should be referenced when deciding whether to use agents for development tasks in the Personal Bests feature and future development work.*