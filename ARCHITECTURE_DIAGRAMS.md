# CareerPath AI - System Architecture Diagram

## Complete System Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        UI[React + Vite SPA<br/>TailwindCSS + TypeScript]
        WSA[Web Speech API<br/>Voice Input]
        Cache[Client Cache<br/>Service]
    end
    
    subgraph "API Gateway Layer"
        FastAPI[FastAPI Server<br/>Port 8000]
        CORS[CORS Middleware]
        JWT[JWT Auth<br/>Middleware]
        Metrics[Prometheus<br/>Metrics]
    end
    
    subgraph "Agentic AI Layer - The Hive"
        Supervisor[Supervisor Agent<br/>Query Router]
        JobScout[Job Scout Agent<br/>Search Specialist]
        ResumeMgr[Resume Manager<br/>Analysis Workflow]
        MCPServer[MCP Server<br/>Internal Tools]
        
        Supervisor -->|Route: job_scout| JobScout
        Supervisor -->|Route: mcp_services| MCPServer
        Supervisor -->|Route: general_chat| LLM
    end
    
    subgraph "Core Business Services"
        SessionSvc[Session Service<br/>Interview Lifecycle]
        QuestionSvc[Question Service<br/>Generation + Cache]
        MLMatcher[ML Job Matcher<br/>Hybrid TF-IDF + Semantic]
        RoadmapGen[Roadmap Generator<br/>AI Career Paths]
        ReportGen[Report Generator<br/>PDF Creation]
        AuthSvc[Auth Service<br/>JWT + OAuth]
    end
    
    subgraph "Data Persistence Layer"
        MongoDB[(MongoDB<br/>Document Store)]
        Redis[(Redis<br/>Cache Layer)]
        FileStore[File Storage<br/>Resume Files]
    end
    
    subgraph "Message Queue Layer"
        RabbitMQ[RabbitMQ<br/>Task Queue]
        Worker[Worker Process<br/>Async Jobs]
        
        RabbitMQ -->|Consume| Worker
    end
    
    subgraph "External Services"
        Krutrim[Krutrim AI<br/>LLM Provider]
        SerpApi[SerpApi<br/>Live Jobs]
        SentenceT[Sentence Transformers<br/>Embeddings]
        GoogleOAuth[Google OAuth<br/>Social Login]
    end
    
    subgraph "ML Components"
        TFIDF[TF-IDF Vectorizer<br/>Keyword Matching]
        Semantic[Semantic Embeddings<br/>384-dim Vectors]
        SkillExtract[Skill Extractor<br/>NLP-based]
        
        MLMatcher --> TFIDF
        MLMatcher --> Semantic
        MLMatcher --> SkillExtract
    end
    
    %% Client to API Gateway
    UI --> FastAPI
    WSA --> UI
    Cache --> UI
    
    %% API Gateway Flow
    FastAPI --> CORS
    CORS --> JWT
    JWT --> Supervisor
    JWT --> SessionSvc
    JWT --> AuthSvc
    FastAPI --> Metrics
    
    %% Agent Interactions
    JobScout --> SerpApi
    JobScout --> MLMatcher
    ResumeMgr --> MongoDB
    MCPServer --> MongoDB
    
    %% Service to Data Layer
    SessionSvc --> MongoDB
    SessionSvc --> RabbitMQ
    QuestionSvc --> MongoDB
    QuestionSvc --> Redis
    MLMatcher --> Redis
    MLMatcher --> MongoDB
    RoadmapGen --> MongoDB
    AuthSvc --> MongoDB
    
    %% Worker Flow
    Worker --> QuestionSvc
    Worker --> MongoDB
    
    %% External Service Calls
    Supervisor --> Krutrim
    JobScout --> Krutrim
    ResumeMgr --> Krutrim
    RoadmapGen --> Krutrim
    QuestionSvc --> Krutrim
    MLMatcher --> SentenceT
    AuthSvc --> GoogleOAuth
    
    %% File Storage
    SessionSvc --> FileStore
    ResumeMgr --> FileStore
    
    %% Styling
    classDef frontend fill:#4F46E5,stroke:#312E81,color:#fff
    classDef gateway fill:#059669,stroke:#065F46,color:#fff
    classDef agent fill:#DC2626,stroke:#991B1B,color:#fff
    classDef service fill:#2563EB,stroke:#1E40AF,color:#fff
    classDef data fill:#7C3AED,stroke:#5B21B6,color:#fff
    classDef external fill:#EA580C,stroke:#9A3412,color:#fff
    classDef ml fill:#0891B2,stroke:#155E75,color:#fff
    
    class UI,WSA,Cache frontend
    class FastAPI,CORS,JWT,Metrics gateway
    class Supervisor,JobScout,ResumeMgr,MCPServer agent
    class SessionSvc,QuestionSvc,MLMatcher,RoadmapGen,ReportGen,AuthSvc service
    class MongoDB,Redis,FileStore,RabbitMQ,Worker data
    class Krutrim,SerpApi,SentenceT,GoogleOAuth external
    class TFIDF,Semantic,SkillExtract ml
```

## Data Flow Diagrams

### 1. Interview Session Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API
    participant SessionSvc
    participant QuestionSvc
    participant RabbitMQ
    participant Worker
    participant MongoDB
    participant Krutrim
    
    User->>Frontend: Upload Resume
    Frontend->>API: POST /upload-resume
    API->>SessionSvc: Create Session
    SessionSvc->>MongoDB: Save Session
    SessionSvc->>RabbitMQ: Publish Question Gen Task
    RabbitMQ->>Worker: Consume Task
    Worker->>QuestionSvc: Generate Questions
    QuestionSvc->>Krutrim: LLM Call
    Krutrim-->>QuestionSvc: Generated Questions
    QuestionSvc->>MongoDB: Save Questions
    Worker-->>API: Task Complete
    API-->>Frontend: Session ID
    
    User->>Frontend: Start Round
    Frontend->>API: POST /start-round
    API->>MongoDB: Get Questions
    MongoDB-->>API: Questions
    API-->>Frontend: Questions
    
    User->>Frontend: Submit Answer
    Frontend->>API: POST /submit-answer
    API->>Krutrim: Evaluate Answer
    Krutrim-->>API: Evaluation + Score
    API->>MongoDB: Save Answer
    API-->>Frontend: Feedback
```

### 2. Job Matching Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API
    participant MLMatcher
    participant Redis
    participant MongoDB
    participant SentenceT
    
    User->>Frontend: Request Job Matches
    Frontend->>API: POST /analyze-resume/{session_id}
    API->>MLMatcher: Match Jobs
    MLMatcher->>Redis: Check Cache
    
    alt Cache Hit
        Redis-->>MLMatcher: Cached Results
    else Cache Miss
        MLMatcher->>MongoDB: Get Resume
        MLMatcher->>SentenceT: Generate Embeddings
        SentenceT-->>MLMatcher: Embeddings
        MLMatcher->>MLMatcher: Calculate Hybrid Scores
        MLMatcher->>Redis: Cache Results
        MLMatcher->>MongoDB: Save Matches
    end
    
    MLMatcher-->>API: Top 10 Matches
    API-->>Frontend: Job Matches
    Frontend->>User: Display Results
```

### 3. Agentic AI Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API
    participant Supervisor
    participant JobScout
    participant MCPServer
    participant Krutrim
    participant SerpApi
    participant MongoDB
    
    User->>Frontend: Chat Message
    Frontend->>API: POST /api/v1/agent/chat
    API->>Supervisor: Process Query
    Supervisor->>Krutrim: Classify Intent
    Krutrim-->>Supervisor: Route Decision
    
    alt Route: job_scout
        Supervisor->>JobScout: Delegate
        JobScout->>MongoDB: Load Resume Context
        JobScout->>SerpApi: Search Jobs
        SerpApi-->>JobScout: Live Jobs
        JobScout->>Krutrim: Synthesize Response
        Krutrim-->>JobScout: Conversational Response
        JobScout-->>Supervisor: Final Response
    else Route: mcp_services
        Supervisor->>MCPServer: Call Tool
        MCPServer->>MongoDB: Query Saved Jobs
        MongoDB-->>MCPServer: Job Data
        MCPServer-->>Supervisor: Tool Result
        Supervisor->>Krutrim: Synthesize
        Krutrim-->>Supervisor: Final Response
    else Route: general_chat
        Supervisor->>Krutrim: Direct LLM Call
        Krutrim-->>Supervisor: Response
    end
    
    Supervisor-->>API: Final Response
    API-->>Frontend: Chat Response
    Frontend->>User: Display Message
```

### 4. Resume Analysis Flow

```mermaid
graph LR
    A[Upload Resume] --> B[Extract Text<br/>PyPDF2/python-docx]
    B --> C[Resume Manager Agent]
    
    C --> D[Parser Node]
    D --> E[LLM: Extract Structured Data]
    E --> F[Name, Email, Skills, Experience]
    
    C --> G[Analyzer Node]
    G --> H[LLM: Generate Summary]
    H --> I[Professional Summary]
    G --> J[LLM: Suggest Improvements]
    J --> K[3 Specific Tips]
    
    C --> L[Saver Node]
    F --> L
    I --> L
    K --> L
    L --> M[(MongoDB)]
    
    style C fill:#DC2626,stroke:#991B1B,color:#fff
    style D fill:#2563EB,stroke:#1E40AF,color:#fff
    style G fill:#2563EB,stroke:#1E40AF,color:#fff
    style L fill:#2563EB,stroke:#1E40AF,color:#fff
```

## Component Interaction Matrix

| Component | Interacts With | Purpose |
|-----------|----------------|---------|
| **Frontend** | FastAPI, Web Speech API | User interface, API calls, voice input |
| **FastAPI** | All Services, MongoDB, Redis | API gateway, routing, middleware |
| **Supervisor Agent** | Job Scout, MCP Server, Krutrim | Query routing, orchestration |
| **Job Scout Agent** | SerpApi, ML Matcher, Krutrim | Job search, result synthesis |
| **Resume Manager** | MongoDB, Krutrim | Resume parsing, analysis |
| **Session Service** | MongoDB, RabbitMQ, File Storage | Interview lifecycle management |
| **Question Service** | MongoDB, Redis, Krutrim | Question generation, caching |
| **ML Matcher** | MongoDB, Redis, Sentence Transformers | Hybrid job matching |
| **Worker** | RabbitMQ, Question Service, MongoDB | Async task processing |
| **MCP Server** | MongoDB | Internal tool exposure |

## Technology Stack Layers

```mermaid
graph TB
    subgraph "Presentation Layer"
        A1[React 18]
        A2[TypeScript]
        A3[TailwindCSS]
        A4[React Router]
    end
    
    subgraph "API Layer"
        B1[FastAPI]
        B2[Pydantic]
        B3[JWT Auth]
        B4[CORS]
    end
    
    subgraph "Business Logic Layer"
        C1[LangGraph Agents]
        C2[Session Management]
        C3[Question Generation]
        C4[ML Matching]
    end
    
    subgraph "AI/ML Layer"
        D1[Krutrim LLM]
        D2[Sentence Transformers]
        D3[scikit-learn]
        D4[LangChain]
    end
    
    subgraph "Data Layer"
        E1[MongoDB + Beanie]
        E2[Redis]
        E3[File System]
        E4[RabbitMQ]
    end
    
    subgraph "Infrastructure Layer"
        F1[Docker Compose]
        F2[Prometheus]
        F3[Logging]
    end
    
    A1 --> B1
    A2 --> B1
    A3 --> B1
    A4 --> B1
    
    B1 --> C1
    B2 --> C1
    B3 --> C1
    
    C1 --> D1
    C2 --> D1
    C3 --> D1
    C4 --> D2
    C4 --> D3
    
    C1 --> E1
    C2 --> E1
    C3 --> E2
    C4 --> E2
    C2 --> E4
    
    E1 --> F1
    E2 --> F1
    E4 --> F1
    B1 --> F2
```

## Deployment Architecture

```mermaid
graph TB
    subgraph "Development Environment"
        Dev1[Vite Dev Server<br/>Port 5173]
        Dev2[FastAPI Uvicorn<br/>Port 8000]
        Dev3[Worker Process]
        Dev4[MCP Server]
    end
    
    subgraph "Docker Services"
        Docker1[MongoDB Container<br/>Port 27017]
        Docker2[Redis Container<br/>Port 6379]
        Docker3[RabbitMQ Container<br/>Ports 5672, 15672]
    end
    
    subgraph "External Cloud Services"
        Cloud1[Krutrim AI API]
        Cloud2[SerpApi]
        Cloud3[Google OAuth]
    end
    
    Dev1 -.->|HTTP| Dev2
    Dev2 -.->|TCP| Docker1
    Dev2 -.->|TCP| Docker2
    Dev2 -.->|AMQP| Docker3
    Dev3 -.->|AMQP| Docker3
    Dev4 -.->|TCP| Docker1
    
    Dev2 -.->|HTTPS| Cloud1
    Dev2 -.->|HTTPS| Cloud2
    Dev2 -.->|HTTPS| Cloud3
    
    style Dev1 fill:#4F46E5,stroke:#312E81,color:#fff
    style Dev2 fill:#059669,stroke:#065F46,color:#fff
    style Dev3 fill:#2563EB,stroke:#1E40AF,color:#fff
    style Dev4 fill:#DC2626,stroke:#991B1B,color:#fff
    style Docker1 fill:#7C3AED,stroke:#5B21B6,color:#fff
    style Docker2 fill:#7C3AED,stroke:#5B21B6,color:#fff
    style Docker3 fill:#7C3AED,stroke:#5B21B6,color:#fff
    style Cloud1 fill:#EA580C,stroke:#9A3412,color:#fff
    style Cloud2 fill:#EA580C,stroke:#9A3412,color:#fff
    style Cloud3 fill:#EA580C,stroke:#9A3412,color:#fff
```

---

**Legend**:
- 🔵 **Blue**: Frontend Components
- 🟢 **Green**: API Gateway
- 🔴 **Red**: Agentic AI
- 🔵 **Light Blue**: Business Services
- 🟣 **Purple**: Data Layer
- 🟠 **Orange**: External Services
- 🔷 **Cyan**: ML Components
