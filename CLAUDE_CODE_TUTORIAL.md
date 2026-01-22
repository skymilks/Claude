# Claude Code Tutorial: Learning Through the CrownBids Project

Welcome to the Claude Code tutorial! This guide teaches you how to use Claude Code by working with the real **CrownBids** application. You'll learn each feature through practical examples and exercises.

## Table of Contents
1. [Introduction](#introduction)
2. [Core Features](#core-features)
3. [Practical Exercises](#practical-exercises)
4. [Advanced Workflows](#advanced-workflows)
5. [Best Practices](#best-practices)

---

## Introduction

### What is Claude Code?

Claude Code is Anthropic's official CLI tool that helps you work with Claude AI to:
- **Understand** your codebase through intelligent exploration
- **Build** new features with AI assistance
- **Debug** issues faster with AI analysis
- **Refactor** code confidently with explanations
- **Test** applications with comprehensive coverage

### The CrownBids Application

CrownBids is a full-stack web application that:
- Displays Canadian government contracts
- Analyzes company websites to find matching contracts
- Uses a smart matching algorithm to score relevance
- Integrates frontend (vanilla JavaScript) with backend (Node.js/Express)

**File Structure:**
```
/home/user/Claude/
├── Frontend files (index.html, app.js, api-service.js, etc.)
├── backend/ (Express API, PostgreSQL, services)
├── Documentation files (README.md, DEPLOYMENT.md, etc.)
└── Configuration files (package.json, config.js)
```

---

## Core Features

### Feature 1: Code Exploration and Understanding

**Purpose:** Quickly understand how code works without reading everything.

#### Commands to Try:
```bash
claude-code <your-question>
```

#### Real Examples with CrownBids:

**Example 1.1: Understanding the Matching Algorithm**
```bash
claude-code "How does the contract matching algorithm calculate match scores in this app?"
```
Claude will:
- Find the matching logic (likely in `api-service.js` or backend services)
- Explain how scores are calculated
- Show you the keyword extraction process

**Example 1.2: Tracing API Integration**
```bash
claude-code "How does the frontend communicate with the backend API?"
```
Claude will:
- Locate `api-service.js` which handles API calls
- Show the fetch wrapper functions
- Explain error handling and caching

**Example 1.3: Understanding Database Setup**
```bash
claude-code "How is the PostgreSQL database initialized in the backend?"
```
Claude will:
- Find `backend/src/config/database.js`
- Explain the connection and table initialization
- Show you the schema structure

---

### Feature 2: File Reading and Navigation

**Purpose:** Read specific files to understand implementation details.

#### Key Files in CrownBids:

**Frontend Layer:**
- `index.html` (4.1 KB) - Application structure and UI framework
- `app.js` (11 KB) - Main application logic (CrownBids class)
- `api-service.js` (20.7 KB) - API integration and caching
- `styles.css` (13.7 KB) - Responsive design
- `utils.js` (6.5 KB) - Helper functions
- `config.js` (2.4 KB) - Configuration settings

**Backend Layer:**
- `backend/src/server.js` - Express setup and middleware
- `backend/src/config/database.js` - PostgreSQL configuration
- `backend/src/services/contractsService.js` - Contract logic
- `backend/src/services/urlAnalysisService.js` - Website scraping
- `backend/src/routes/contracts.js` - API endpoints
- `backend/src/routes/analyze.js` - Analysis endpoints

#### Navigation Exercise:

**Exercise 2.1: Find Where Contracts Are Fetched**
1. Ask Claude: "Where in the code are contracts fetched from the API?"
2. Claude finds the `fetchContracts()` method in `api-service.js`
3. You can then navigate to that specific line for implementation details

**Exercise 2.2: Understand the Configuration**
1. Check `config.js` to see API endpoints
2. Understand environment-based configuration
3. Learn how to switch between development and production

---

### Feature 3: Code Analysis and Problem Solving

**Purpose:** Get AI analysis of your code to understand issues or improvements.

#### Real-World Scenarios:

**Scenario 3.1: Performance Optimization**
```bash
claude-code "The contract list takes 3 seconds to load. How can we optimize this?"
```
Claude can:
- Identify the API call in `api-service.js`
- Suggest caching strategies (already implemented!)
- Recommend lazy loading or pagination improvements
- Point you to the caching layer already in place

**Scenario 3.2: Bug Investigation**
```bash
claude-code "When I enter a URL without https://, the analysis fails. Where should we add URL validation?"
```
Claude will:
- Find the URL analysis endpoint
- Identify the validation point in `urlAnalysisService.js`
- Show you existing validation in `utils.js`
- Suggest where to add additional checks

**Scenario 3.3: Security Review**
```bash
claude-code "What security measures are in place for the API? Are there any vulnerabilities?"
```
Claude will:
- Review `backend/src/server.js` for security middleware (Helmet, CORS)
- Check rate limiting configuration
- Analyze input validation in services
- Suggest additional security hardening

---

### Feature 4: Code Generation and Implementation

**Purpose:** Generate new code with AI assistance based on existing patterns.

#### Implementation Exercises:

**Exercise 4.1: Add a New Filter**
```bash
claude-code "Add a filter for contract value range to the contracts API"
```
Claude will:
- Analyze existing filter patterns in `api-service.js`
- Generate new filter logic following the same style
- Create the API endpoint modifications
- Show you where to add frontend UI

**Step-by-step process:**
1. Claude examines current filters (department, category, status)
2. Claude generates similar filter logic for value ranges
3. You review the suggested code
4. Claude commits the changes if you approve

**Exercise 4.2: Create a New Utility Function**
```bash
claude-code "Create a utility function to format currency values consistently"
```
Claude will:
- Check existing utilities in `utils.js`
- Generate a function matching your codebase style
- Add proper error handling
- Provide usage examples

---

### Feature 5: Git Integration and Version Control

**Purpose:** Manage git operations as part of your development workflow.

#### Key Commands:

**Feature 5.1: Commit Changes**
```bash
claude-code "I made changes to add URL validation. Create a clear commit message."
```
Claude will:
- Analyze your changes
- Generate a descriptive commit message
- Commit with proper formatting

**Feature 5.2: Branch Management**
```bash
claude-code "I'm working on adding payment integration. What should I do?"
```
Claude will:
- Suggest creating a feature branch
- Show you the command to use
- Guide you through the workflow

**Feature 5.3: Review Changes**
```bash
claude-code "What did I change in the API service file?"
```
Claude will:
- Show the diff of your modifications
- Explain what changed and why
- Identify potential issues

---

### Feature 6: Documentation and Testing

**Purpose:** Generate documentation and test cases for your code.

#### Documentation Exercises:

**Exercise 6.1: API Documentation**
```bash
claude-code "Generate comprehensive API documentation for the /api/contracts endpoint"
```
Claude will:
- Extract endpoint details from code
- Generate OpenAPI/Swagger specification
- Create usage examples with curl/fetch
- Document parameters and responses

**Exercise 6.2: Test Generation**
```bash
claude-code "Create unit tests for the contract matching algorithm"
```
Claude will:
- Identify the matching logic
- Generate test cases for edge cases
- Create test file with proper structure
- Show you how to run tests

---

## Practical Exercises

### Exercise Set 1: Understanding the Codebase

**Goal:** Get comfortable navigating CrownBids with Claude Code

1. **Explore Frontend Structure**
   - Ask: "What is the purpose of each JavaScript file?"
   - Ask: "How does the CrownBids class work?"
   - Ask: "What does the api-service.js do?"

2. **Understand Data Flow**
   - Ask: "How does data flow from backend API to the frontend UI?"
   - Ask: "Where is caching implemented?"
   - Ask: "What happens when a user enters a URL?"

3. **Review Security**
   - Ask: "What security measures protect the API?"
   - Ask: "How is user input validated?"
   - Ask: "Are there any CORS issues?"

---

### Exercise Set 2: Making Your First Changes

**Goal:** Successfully modify the application with Claude Code assistance

1. **Improve Error Messages**
   - Ask: "Update the error handling to show more user-friendly messages"
   - Apply the suggested changes
   - Test by triggering an error condition

2. **Add Logging**
   - Ask: "Add detailed logging to track API calls and contract matching"
   - Implement the logging system
   - Verify logs are appearing

3. **Optimize Performance**
   - Ask: "What can we optimize for faster contract loading?"
   - Implement caching improvements
   - Measure the performance improvement

---

### Exercise Set 3: Adding New Features

**Goal:** Build new features using Claude Code to guide you

1. **Add Favorites Feature**
   - Ask: "How can users save their favorite contracts?"
   - Design localStorage integration
   - Implement with Claude's assistance
   - Add UI to display favorites

2. **Create Export Functionality**
   - Ask: "Add ability to export matched contracts as CSV"
   - Generate export logic
   - Add button to frontend
   - Test the export

3. **Build Search Analytics**
   - Ask: "Track which contracts are most frequently viewed"
   - Implement analytics collection
   - Create simple dashboard
   - Analyze the data

---

## Advanced Workflows

### Workflow 1: Debugging with Claude Code

**Scenario:** Users report that the URL analysis sometimes fails silently

**Steps:**
1. Use Claude to understand the error handling flow
2. Ask Claude to identify potential failure points
3. Have Claude generate additional logging
4. Create specific test cases for edge cases
5. Have Claude fix the issues found

**Commands:**
```bash
claude-code "Why might URL analysis fail silently? Show me error paths."
claude-code "Add comprehensive error logging to urlAnalysisService.js"
claude-code "Create test cases for invalid URLs"
claude-code "Fix the error handling in the analyze endpoint"
```

---

### Workflow 2: Refactoring for Maintainability

**Scenario:** The `app.js` file is getting large (11 KB)

**Steps:**
1. Ask Claude to analyze the code organization
2. Have Claude suggest how to split the code
3. Use Claude to generate smaller, focused modules
4. Gradually move functionality while testing
5. Verify everything still works

**Commands:**
```bash
claude-code "What are the major concerns in app.js?"
claude-code "How should we split app.js into smaller modules?"
claude-code "Generate a ContractManager module extracted from app.js"
claude-code "Refactor app.js to use the new ContractManager module"
```

---

### Workflow 3: Deploying with Confidence

**Scenario:** You're ready to deploy to production

**Steps:**
1. Have Claude review all recent changes
2. Generate comprehensive test plan
3. Create deployment checklist
4. Verify all configurations
5. Generate deployment commands

**Commands:**
```bash
claude-code "Review all my changes for deployment readiness"
claude-code "Generate a complete test plan for the contract API"
claude-code "What should I check before deploying to production?"
claude-code "Generate deployment commands for Render.com"
```

---

## Best Practices

### 1. Be Specific in Your Questions

**Poor:** "How do I improve the app?"
**Better:** "How can we improve the contract matching algorithm to be more accurate?"

**Poor:** "Add a feature"
**Better:** "Add ability for users to save favorite contracts to localStorage"

---

### 2. Review Claude's Suggestions

Always review code generated by Claude:
- Does it match your coding style?
- Are there better alternatives?
- Are there security considerations?
- Will it perform well?

---

### 3. Use Small, Iterative Changes

Instead of asking Claude to completely rewrite a large file:
1. Ask Claude to improve specific functions first
2. Test each change incrementally
3. Commit frequently with clear messages
4. Gradually refactor larger components

---

### 4. Leverage Context

Provide Claude with relevant information:
```bash
claude-code "In the context of the contract matching algorithm,
            how should we handle contracts with no description?"
```

---

### 5. Use Git for Safety

Before making big changes:
```bash
git checkout -b feature/experiment
# Make changes with Claude's help
# Test thoroughly
# If good: git checkout main && git merge feature/experiment
# If bad: git checkout main && git branch -D feature/experiment
```

---

### 6. Document as You Go

Use Claude to help generate documentation:
```bash
claude-code "Generate documentation for the new features I just added"
claude-code "Create a troubleshooting guide for common API errors"
```

---

## Quick Reference: Common Claude Code Commands

### Code Exploration
```bash
claude-code "How does [feature] work?"
claude-code "Where is [functionality] implemented?"
claude-code "Explain the architecture of [component]"
```

### Implementation
```bash
claude-code "Add [feature] following the existing patterns"
claude-code "Fix [bug] in [file]"
claude-code "Refactor [component] to be more efficient"
```

### Analysis
```bash
claude-code "Review [file] for security issues"
claude-code "Analyze performance of [component]"
claude-code "Identify code smells in [area]"
```

### Documentation
```bash
claude-code "Generate documentation for [API/feature]"
claude-code "Create examples for [functionality]"
claude-code "Write a tutorial for [feature]"
```

### Testing
```bash
claude-code "Create unit tests for [component]"
claude-code "Generate test cases for [function]"
claude-code "Identify edge cases in [code]"
```

---

## Next Steps

Now that you understand Claude Code features:

1. **Try Exercise Set 1** - Get comfortable exploring the CrownBids codebase
2. **Try Exercise Set 2** - Make your first modifications with Claude's help
3. **Try Exercise Set 3** - Build new features independently
4. **Tackle Advanced Workflows** - Use Claude for complex refactoring and deployment

### Learning Resources

- Claude API Documentation: https://docs.anthropic.com
- CrownBids README: See README.md in this repository
- Backend Documentation: See backend/README.md
- Deployment Guides: See DEPLOYMENT.md and GITHUB_PAGES_DEPLOYMENT.md

---

## Troubleshooting

### "Claude doesn't understand my question"
- Be more specific with file names and line numbers
- Provide code context in your question
- Ask a simpler, more focused question first

### "The generated code doesn't compile"
- Copy the exact error message
- Ask Claude to fix the specific error
- Provide the file context where the error occurred

### "Changes break my application"
- Use git to revert: `git checkout -- .`
- Ask Claude to explain what went wrong
- Make smaller, more incremental changes

---

## Summary

Claude Code is a powerful tool for:
✅ Understanding codebases quickly
✅ Generating code that matches your style
✅ Debugging complex issues
✅ Refactoring with confidence
✅ Creating documentation and tests
✅ Managing git operations

By working through the CrownBids application, you've learned how to leverage Claude Code for real-world development tasks. Start with the exercises, and gradually use Claude Code for more complex workflows in your own projects!

Happy coding! 🚀
