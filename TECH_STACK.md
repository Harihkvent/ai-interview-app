# Technology Stack Documentation

This document provides a comprehensive overview of all technologies used in the **CareerPath AI** project, explaining what each technology is and why it's used.

---

## 🎨 Frontend Technologies

### React 18
**What it is:**  
React is a JavaScript library for building user interfaces, developed by Meta (Facebook). It uses a component-based architecture and virtual DOM for efficient rendering.

**Why we use it:**
- **Component Reusability**: Build modular, reusable UI components (Dashboard, InterviewSession, etc.)
- **Virtual DOM**: Efficient updates and rendering for smooth user experience
- **Large Ecosystem**: Access to extensive libraries and community support
- **State Management**: Easy to manage complex application state
- **Modern Development**: Hooks API for cleaner, more maintainable code

---

### Vite
**What it is:**  
Vite is a modern frontend build tool that provides lightning-fast development server and optimized production builds using native ES modules.

**Why we use it:**
- **Instant Server Start**: No bundling during development, starts in milliseconds
- **Hot Module Replacement (HMR)**: Changes reflect instantly without full page reload
- **Optimized Builds**: Uses Rollup for production with tree-shaking and code splitting
- **TypeScript Support**: First-class TypeScript integration out of the box
- **Better DX**: Significantly faster than traditional bundlers like Webpack

---

### TypeScript
**What it is:**  
TypeScript is a strongly-typed superset of JavaScript that compiles to plain JavaScript, developed by Microsoft.

**Why we use it:**
- **Type Safety**: Catch errors at compile-time before they reach production
- **Better IDE Support**: Autocomplete, refactoring, and inline documentation
- **Code Quality**: Enforces consistent code patterns and interfaces
- **Maintainability**: Easier to understand and refactor large codebases
- **Team Collaboration**: Self-documenting code through type definitions

---

### TailwindCSS
**What it is:**  
TailwindCSS is a utility-first CSS framework that provides low-level utility classes to build custom designs.

**Why we use it:**
- **Rapid Development**: Build UIs quickly with pre-built utility classes
- **Consistent Design**: Enforces design system through configuration
- **Glassmorphism**: Easy to implement modern UI effects
- **Responsive Design**: Built-in responsive utilities for all screen sizes
- **Small Bundle Size**: Purges unused CSS in production builds

---

### React Router v7
**What it is:**  
React Router is the standard routing library for React applications, enabling navigation between different views.

**Why we use it:**
- **Declarative Routing**: Define routes as React components
- **Nested Routes**: Support for complex application structures
- **Protected Routes**: Easy implementation of authentication guards
- **URL Parameters**: Handle dynamic routes (e.g., `/interview/:sessionId`)
- **Navigation History**: Browser history management and programmatic navigation

---

### Axios
**What it is:**  
Axios is a promise-based HTTP client for making API requests from the browser.

**Why we use it:**
- **Promise-Based**: Clean async/await syntax for API calls
- **Interceptors**: Centralized request/response handling for auth tokens
- **Error Handling**: Consistent error handling across the application
- **Request Cancellation**: Cancel pending requests when needed
- **Browser Compatibility**: Works across all modern browsers

---

### @react-oauth/google
**What it is:**  
Official Google OAuth library for React applications.

**Why we use it:**
- **Social Login**: Enable users to sign in with Google accounts
- **Secure Authentication**: OAuth 2.0 standard implementation
- **User Convenience**: One-click login without password creation
- **React Integration**: Purpose-built for React applications
- **Token Management**: Automatic handling of OAuth tokens

---

### Prism.js
**What it is:**  
Prism is a lightweight, extensible syntax highlighter for code snippets.

**Why we use it:**
- **Code Display**: Syntax highlighting for coding questions
- **Language Support**: Supports Python, JavaScript, and other languages
- **Lightweight**: Minimal performance impact
- **Customizable**: Theming support for different color schemes
- **Copy-Paste Friendly**: Maintains code formatting

---

### react-simple-code-editor
**What it is:**  
A simple, lightweight code editor component for React.

**Why we use it:**
- **Code Input**: Allow users to write code during technical interviews
- **Syntax Highlighting**: Integrated with Prism.js for highlighting
- **Lightweight**: Minimal bundle size compared to Monaco or CodeMirror
- **Simple API**: Easy to integrate and customize
- **Tab Support**: Proper indentation handling for code

---

### pdfjs-dist
**What it is:**  
PDF.js is a JavaScript library for rendering PDF documents in the browser, developed by Mozilla.

**Why we use it:**
- **Resume Preview**: Display uploaded PDF resumes in the browser
- **No Server Processing**: Client-side PDF rendering
- **Cross-Browser**: Works consistently across all browsers
- **Text Extraction**: Extract text content from PDFs for analysis
- **Secure**: No need to send PDFs to external services

---

## 🐍 Backend Technologies

### FastAPI
**What it is:**  
FastAPI is a modern, high-performance Python web framework for building APIs, based on standard Python type hints.

**Why we use it:**
- **High Performance**: One of the fastest Python frameworks (comparable to Node.js)
- **Automatic Documentation**: Auto-generated Swagger UI and ReDoc
- **Type Safety**: Pydantic integration for request/response validation
- **Async Support**: Native async/await for concurrent operations
- **Easy to Learn**: Intuitive API design with excellent documentation
- **Production Ready**: Built-in security, CORS, and middleware support

---

### Uvicorn
**What it is:**  
Uvicorn is a lightning-fast ASGI server implementation for Python.

**Why we use it:**
- **ASGI Server**: Required to run FastAPI applications
- **High Performance**: Built on uvloop and httptools for speed
- **WebSocket Support**: Enables real-time communication
- **Auto-Reload**: Development mode with automatic reloading
- **Production Ready**: Stable and battle-tested

---

### Beanie ODM
**What it is:**  
Beanie is an asynchronous Object-Document Mapper (ODM) for MongoDB, built on top of Pydantic.

**Why we use it:**
- **Type Safety**: Pydantic models for MongoDB documents
- **Async/Await**: Native async support for non-blocking database operations
- **Schema Validation**: Automatic validation of database documents
- **Relationships**: Support for document references and relationships
- **Migration Support**: Schema evolution and data migrations
- **FastAPI Integration**: Seamless integration with FastAPI

---

### Motor
**What it is:**  
Motor is an async Python driver for MongoDB.

**Why we use it:**
- **Async MongoDB**: Non-blocking MongoDB operations
- **Beanie Dependency**: Required by Beanie ODM
- **Connection Pooling**: Efficient database connection management
- **Performance**: Handles concurrent database operations efficiently

---

### Pydantic
**What it is:**  
Pydantic is a data validation library using Python type annotations.

**Why we use it:**
- **Data Validation**: Automatic validation of API requests/responses
- **Type Safety**: Runtime type checking and validation
- **Settings Management**: Environment variable validation (.env files)
- **JSON Schema**: Auto-generation of JSON schemas
- **FastAPI Core**: Core dependency of FastAPI

---

### MongoDB (via Docker)
**What it is:**  
MongoDB is a NoSQL document database that stores data in flexible, JSON-like documents.

**Why we use it:**
- **Flexible Schema**: Store complex nested data (interviews, questions, answers)
- **Scalability**: Horizontal scaling for growing data
- **JSON-Like Documents**: Natural fit for Python dictionaries and JavaScript objects
- **Rich Queries**: Powerful query language for complex data retrieval
- **Performance**: Fast reads and writes for real-time applications

---

### Redis (via Docker)
**What it is:**  
Redis is an in-memory data structure store used as a cache, message broker, and database.

**Why we use it:**
- **Caching**: Cache ML job matching results for faster responses
- **Performance**: Sub-millisecond response times
- **Session Storage**: Store user session data
- **Rate Limiting**: Implement API rate limiting
- **Pub/Sub**: Real-time messaging capabilities

---

### RabbitMQ (via Docker)
**What it is:**  
RabbitMQ is a message broker that implements the Advanced Message Queuing Protocol (AMQP).

**Why we use it:**
- **Async Task Processing**: Offload AI question generation to background workers
- **Reliability**: Guaranteed message delivery with acknowledgments
- **Scalability**: Distribute work across multiple worker processes
- **Decoupling**: Separate API server from long-running tasks
- **Management UI**: Built-in web interface for monitoring queues

---

### Pika / aio-pika
**What it is:**  
Pika is a Python client for RabbitMQ. Aio-pika is the async version.

**Why we use it:**
- **RabbitMQ Client**: Connect to RabbitMQ from Python
- **Async Support**: Non-blocking message queue operations
- **Worker Implementation**: Power the background worker process
- **Message Publishing**: Send tasks from API to workers

---

## 🤖 AI & Machine Learning

### LangChain
**What it is:**  
LangChain is a framework for developing applications powered by language models.

**Why we use it:**
- **LLM Integration**: Standardized interface for AI models (Krutrim)
- **Prompt Templates**: Reusable prompt structures for consistency
- **Chain Composition**: Combine multiple AI operations
- **Memory Management**: Maintain conversation context
- **Tool Integration**: Connect LLMs with external tools and APIs

---

### LangGraph
**What it is:**  
LangGraph is a library for building stateful, multi-actor applications with LLMs, built on top of LangChain.

**Why we use it:**
- **Agentic Architecture**: Build "The Hive" - our multi-agent system
- **State Management**: Track agent states and transitions
- **Agent Orchestration**: Supervisor agent routes to specialized agents
- **Workflow Definition**: Define complex AI workflows as graphs
- **Debugging**: Visualize and debug agent interactions

---

### Sentence Transformers
**What it is:**  
Sentence Transformers is a Python library for state-of-the-art sentence, text, and image embeddings.

**Why we use it:**
- **Semantic Search**: Convert resumes and job descriptions to embeddings
- **Job Matching**: Find semantically similar jobs to user's resume
- **ML-Based Matching**: Go beyond keyword matching
- **Pre-trained Models**: Use battle-tested models (all-MiniLM-L6-v2)
- **Fast Inference**: Efficient embedding generation

---

### PyTorch
**What it is:**  
PyTorch is an open-source machine learning framework developed by Meta.

**Why we use it:**
- **ML Dependency**: Required by Sentence Transformers
- **Model Inference**: Run pre-trained models for embeddings
- **GPU Support**: Accelerate ML operations (if GPU available)
- **Industry Standard**: Most popular ML framework

---

### Scikit-learn
**What it is:**  
Scikit-learn is a machine learning library for Python with classification, regression, and clustering algorithms.

**Why we use it:**
- **Cosine Similarity**: Calculate similarity between resume and job embeddings
- **ML Utilities**: Data preprocessing and evaluation metrics
- **Simple API**: Easy-to-use ML algorithms
- **Well-Documented**: Extensive documentation and examples

---

### NumPy & Pandas
**What it is:**  
NumPy provides numerical computing capabilities, while Pandas offers data manipulation and analysis tools.

**Why we use it:**
- **Data Processing**: Handle job datasets and analytics data
- **Vector Operations**: Efficient array operations for embeddings
- **CSV Handling**: Read job title datasets
- **Analytics**: Compute statistics and metrics
- **ML Pipeline**: Data preprocessing for machine learning

---

## 🔐 Authentication & Security

### PyJWT
**What it is:**  
PyJWT is a Python library for encoding and decoding JSON Web Tokens (JWT).

**Why we use it:**
- **Token-Based Auth**: Stateless authentication for API requests
- **Secure Sessions**: 24-hour session tokens
- **User Identification**: Encode user ID in tokens
- **API Security**: Protect endpoints with token verification

---

### python-jose[cryptography]
**What it is:**  
JOSE (JavaScript Object Signing and Encryption) implementation for Python.

**Why we use it:**
- **JWT Operations**: Create and verify JWT tokens
- **Cryptographic Security**: Secure token signing and encryption
- **OAuth Support**: Handle OAuth token flows
- **Industry Standard**: Implements JOSE standards

---

### bcrypt
**What it is:**  
Bcrypt is a password hashing function designed for secure password storage.

**Why we use it:**
- **Password Security**: Hash user passwords before storing
- **Slow Hashing**: Resistant to brute-force attacks
- **Salt Generation**: Automatic salt generation for each password
- **Industry Standard**: Widely trusted password hashing algorithm

---

### Google OAuth Libraries
**What it is:**  
Official Google authentication libraries for Python.

**Why we use it:**
- **Google Sign-In**: Enable OAuth 2.0 authentication
- **Calendar Integration**: Access Google Calendar API
- **Secure Authentication**: Industry-standard OAuth implementation
- **Token Management**: Handle access and refresh tokens

---

## 📄 Document Processing

### PyPDF2
**What it is:**  
PyPDF2 is a Python library for reading and manipulating PDF files.

**Why we use it:**
- **PDF Parsing**: Extract text from uploaded resume PDFs
- **Metadata Extraction**: Read PDF properties
- **Page Manipulation**: Handle multi-page resumes

---

### pdfplumber
**What it is:**  
Pdfplumber is a library for extracting text and tables from PDFs with high accuracy.

**Why we use it:**
- **Better Extraction**: More accurate text extraction than PyPDF2
- **Table Detection**: Extract structured data from resumes
- **Layout Preservation**: Maintain document structure
- **Fallback Option**: Use when PyPDF2 fails

---

### python-docx
**What it is:**  
Python-docx is a library for creating and updating Microsoft Word (.docx) files.

**Why we use it:**
- **DOCX Support**: Parse Word document resumes
- **Text Extraction**: Extract content from .docx files
- **Multi-Format**: Support both PDF and Word resumes

---

### ReportLab
**What it is:**  
ReportLab is a library for generating PDF documents programmatically.

**Why we use it:**
- **PDF Generation**: Create interview evaluation reports
- **Custom Layouts**: Design professional-looking reports
- **Charts & Graphics**: Add visual elements to reports
- **Export Feature**: Download interview results as PDF

---

## 🌐 HTTP & API Integration

### HTTPX
**What it is:**  
HTTPX is a modern HTTP client for Python with async support.

**Why we use it:**
- **Async Requests**: Non-blocking HTTP calls to external APIs
- **HTTP/2 Support**: Modern protocol support
- **API Integration**: Call Krutrim AI API and other services
- **Better than Requests**: Async-first design for FastAPI

---

### Requests
**What it is:**  
Requests is the classic HTTP library for Python.

**Why we use it:**
- **SerpAPI Integration**: Fetch live job data from Google Jobs
- **Simple API**: Easy-to-use synchronous HTTP requests
- **Widely Used**: Industry standard for HTTP in Python

---

## 📧 Email & Communication

### email-validator
**What it is:**  
A robust email address syntax validation library.

**Why we use it:**
- **Email Validation**: Validate user email addresses
- **Syntax Checking**: Ensure properly formatted emails
- **Domain Validation**: Check for valid email domains

---

### SMTP (via Python's smtplib)
**What it is:**  
Simple Mail Transfer Protocol for sending emails.

**Why we use it:**
- **Interview Scheduling**: Send interview confirmation emails
- **Reminders**: Automated email reminders for scheduled interviews
- **Notifications**: User notifications for important events
- **Gmail Integration**: Send emails via Gmail SMTP

---

## 📊 Monitoring & Metrics

### Prometheus Client
**What it is:**  
Official Python client for Prometheus monitoring system.

**Why we use it:**
- **Metrics Collection**: Track API request counts and latency
- **Performance Monitoring**: Monitor application health
- **Custom Metrics**: Define business-specific metrics
- **Observability**: Understand system behavior in production
- **Grafana Integration**: Visualize metrics with dashboards

---

## 🛠️ Development & Utilities

### python-dotenv
**What it is:**  
A library to read key-value pairs from .env files.

**Why we use it:**
- **Environment Variables**: Load configuration from .env files
- **Secret Management**: Keep API keys out of source code
- **Multi-Environment**: Different configs for dev/staging/production
- **Security**: Prevent accidental commit of secrets

---

### python-multipart
**What it is:**  
A streaming multipart parser for Python.

**Why we use it:**
- **File Uploads**: Handle resume file uploads (PDF, DOCX)
- **Form Data**: Parse multipart/form-data requests
- **FastAPI Dependency**: Required for file upload endpoints

---

### tqdm
**What it is:**  
A fast, extensible progress bar for Python.

**Why we use it:**
- **Progress Tracking**: Show progress during ML model loading
- **User Feedback**: Visual feedback for long-running operations
- **Development**: Monitor data processing tasks

---

## 🔗 Integration & Adapters

### langchain-mcp-adapters
**What it is:**  
Adapters for integrating Model Context Protocol (MCP) with LangChain.

**Why we use it:**
- **MCP Integration**: Connect LangChain agents with MCP servers
- **Tool Bridging**: Expose MCP tools to LangChain agents
- **Extensibility**: Add custom tools to the agent ecosystem

---

### MCP (Model Context Protocol)
**What it is:**  
A protocol for connecting AI models with external tools and data sources.

**Why we use it:**
- **Tool Integration**: Extend agent capabilities with custom tools
- **Standardization**: Use standard protocol for tool communication
- **Flexibility**: Add new tools without changing core agent code

---

## 📦 Summary

### Technology Choices Philosophy

1. **Performance First**: FastAPI, Vite, Redis for speed
2. **Type Safety**: TypeScript, Pydantic for reliability
3. **Async Architecture**: Motor, aio-pika, HTTPX for scalability
4. **Modern Stack**: Latest versions of React, FastAPI, MongoDB
5. **Developer Experience**: Hot reload, auto-documentation, type hints
6. **Production Ready**: Monitoring, caching, message queues
7. **AI-Native**: LangChain, LangGraph for agentic architecture

### Architecture Benefits

- **Microservices Ready**: Separate API, worker, and frontend
- **Scalable**: Async operations, message queues, caching
- **Maintainable**: Type safety, modular architecture
- **Secure**: JWT, bcrypt, OAuth, input validation
- **Observable**: Prometheus metrics, logging
- **Fast**: Vite, FastAPI, Redis, MongoDB

---

**Last Updated**: January 2026  
**Project**: CareerPath AI - Agentic Career Advisory Platform
