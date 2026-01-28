# 🛠️ Udaay — LakeCity Civic Issue Reporting Platform

**Udaay** is a full-stack civic-tech platform built during the **Google LakeCity Hackathon**.  
It empowers citizens to report civic issues (potholes, garbage, water leaks, streetlights, etc.) using images and leverages **Google Cloud AI services** to automatically verify and prioritize those issues.

The system is designed with a **robust, cloud-native fallback architecture**, ensuring AI validation remains reliable even under service failures.

---

## 🏆 Google LakeCity Hackathon Highlight

This project is proudly built using **Google Cloud Platform (GCP)** services and showcases:

- ✅ **Google Vertex AI (Gemini)** for multimodal image understanding
- ✅ **Secure GCP Service Accounts & IAM**
- ✅ **Cloud-based AI inference with scalable architecture**
- ✅ **Production-grade fallback AI service design**
- ✅ **Modern DevOps practices aligned with GCP**

---

## 📌 Table of Contents

- 🚀 Overview  
- ☁️ Google Cloud Architecture  
- 📂 Project Structure  
- 💡 Core Features  
- 🧠 System Architecture & Flow  
- 🛠️ Tech Stack  
- ⚡ Getting Started  
- 🧪 Usage & Testing  
- 🔐 Authentication & Security  
- 🧩 Environment Configuration  
- 🚧 Deployment  
- 🎯 Future Enhancements  
- ❤️ Contributing  
- 📜 License  

---

## 🚀 Overview

Udaay enables:

- 📸 **Image-based civic issue reporting**
- 🤖 **AI-driven image validation using Google Vertex AI**
- 🔁 **Cloud-resilient fallback AI processing**
- 📊 **End-to-end issue lifecycle tracking**
- 🔐 **Secure authentication with OTP & JWT**

Citizens submit issues via a web interface, and the backend asynchronously validates each submission using **Google Vertex AI (Gemini)**.  
If the primary AI pipeline is unavailable, the system automatically falls back to a **Spring Boot–based AI microservice**.

---

## ☁️ Google Cloud Architecture

Udaay is built as a **cloud-first, Google-native civic-tech platform**, intentionally designed to demonstrate real-world usage of **multiple Google Cloud services working together** in a production-style architecture.

The system leverages **managed AI, secure cloud infrastructure, and scalable backend services** to ensure reliability, security, and performance.

---

### 🧠 Google Vertex AI (Gemini)

At the core of Udaay’s intelligence layer is **Google Vertex AI (Gemini)**, used for **multimodal civic issue validation**.

**How Vertex AI is used:**
- Images uploaded by users are analyzed using **Gemini multimodal models**
- The model performs **zero-shot classification** without custom training
- Each image is classified into one of:
  - Garbage
  - Pothole
  - Drainage
  - Streetlight
  - Water Leak
- The model also infers:
  - **Priority level** (Low / Medium / High)
  - **Confidence reasoning** explaining the decision

**Why Vertex AI:**
- Handles **image + text context together**
- No dataset labeling required during hackathon
- Enterprise-grade reliability and scalability
- Easy integration via secure APIs

Vertex AI acts as the **primary AI validation engine** in the system.

---

### 🪣 Google Cloud Storage (GCS)

Udaay uses **Google Cloud Storage** for **secure and scalable image handling**.

**Usage:**
- Civic issue images are uploaded and stored in GCS buckets
- Backend services reference images via signed or controlled access
- Images are passed to Vertex AI for inference without exposing them publicly

**Benefits:**
- Highly durable object storage
- Seamless integration with Vertex AI
- Eliminates direct image handling on frontend
- Reduces backend memory and bandwidth load

---

### 🔥 Firebase (Authentication & Platform Services)

Firebase is used to simplify **user onboarding and authentication workflows**.

**Firebase usage includes:**
- Phone number–based OTP authentication
- Secure user identity verification
- Fast, scalable authentication without custom OTP infrastructure

**Why Firebase:**
- Rapid setup during hackathon
- Battle-tested authentication system
- Tight integration with Google Cloud ecosystem
- Reduces security risks from custom auth logic

Firebase ensures **only verified users** can submit civic issues.

---

### 🖥️ Google Compute Engine (Backend Infrastructure)

Backend services are deployed on **Google Compute Engine (GCE)** to provide full control over the runtime environment.

**What runs on Compute Engine:**
- Node.js + Express main backend
- Spring Boot AI fallback microservice
- Nginx reverse proxy

**Why Compute Engine:**
- Fine-grained control over networking and security
- Suitable for long-running backend services
- Ideal for Dockerized applications
- Easy migration path to managed services like Cloud Run

---

### 🔐 Google Cloud IAM & Security

Security is enforced using **Google Cloud Identity and Access Management (IAM)**.

**Security design highlights:**
- Dedicated **GCP Service Account** for AI inference
- Least-privilege IAM roles (Vertex AI access only)
- Service account keys stored securely on backend
- No Google credentials exposed to frontend or clients

**Access pattern:**
- Frontend → Backend (JWT protected)
- Backend → Vertex AI (IAM authenticated)
- Backend → Fallback AI service (internal JWT)

This ensures **zero trust between layers** and prevents credential leakage.

---

### 🔁 Resilient & Fault-Tolerant AI Architecture

Udaay is designed with **resilience in mind**, not as a single-point AI dependency.

**AI flow:**
1. Primary AI validation → **Vertex AI (Gemini)**
2. If Vertex AI is unavailable:
   - Request is routed to **Spring Boot AI fallback service**
3. Issue status remains consistent and retryable

This design demonstrates **real-world cloud reliability patterns**, not just demo logic.

---

### 📈 Cloud-Native & Scalable by Design

- Containerized services using Docker
- Stateless backend design
- Easily portable to:
  - Cloud Run
  - GKE
  - Managed Firebase Hosting
- Designed for autoscaling under civic-scale usage

---

### 🏆 Why Google Cloud for Udaay?

Udaay showcases Google Cloud as an **end-to-end civic technology platform**:

- Vertex AI → Intelligent decision-making
- Cloud Storage → Secure media handling
- Firebase → Trusted user authentication
- Compute Engine → Reliable backend compute
- IAM → Enterprise-grade security

Together, these services demonstrate how **Google Cloud can power smart cities and citizen-centric platforms at scale**.

---

## 📂 Project Structure

```

Udaay/
├── .github/                 # GitHub workflows
├── .vscode/                 # Editor configuration
├── ai_backend/              # Spring Boot AI fallback service
├── server/                  # Node.js + Express backend
├── client/                  # React frontend
├── scripts/                 # Utility scripts
├── docker-compose.yml       # Multi-service setup
├── nginx-domain.conf        # Nginx domain config
├── nginx-ssl.conf           # Nginx SSL config
├── start-all.sh             # Start all services locally
├── HTTPS_SETUP.md           # HTTPS configuration guide
├── VERCEL_DEPLOYMENT.md     # Frontend deployment guide
└── README.md                # Project documentation

```

---

## 💡 Core Features

### 🧠 AI-Based Issue Validation

- Uses **Google Vertex AI (Gemini)** for image classification
- Automatic detection of:
  - Garbage
  - Pothole
  - Drainage
  - Streetlight
  - Water Leak
- Assigns **priority levels** (High / Medium / Low)
- Generates a **confidence reason** for transparency

### 🔁 Fallback AI Architecture

If the primary AI service fails:
- The Node.js server securely calls the **Spring Boot AI backend**
- Ensures validation reliability and fault tolerance

### 📊 Issue Lifecycle Management

```

SUBMITTED → PENDING
├─ LIVE (validated successfully)
├─ REJECTED (not a civic issue)
└─ PENDING (AI inconclusive / retry)

````

---

## 🧠 System Architecture & Flow

1. User logs in using OTP
2. User uploads an image with issue details
3. Backend stores the issue as `PENDING`
4. Async AI validation begins:
   - Primary → Google Vertex AI (Gemini)
   - Fallback → Spring Boot AI service
5. Issue status and priority are updated
6. Frontend reflects real-time status

---

## 🛠️ Tech Stack

### Frontend
- React
- Vite
- Modern component-based UI

### Backend
- Node.js
- Express.js
- MongoDB

### AI & ML
- Google Vertex AI (Gemini)
- Spring Boot (AI fallback service)

### Security
- OTP-based login
- JWT authentication
- Internal service JWT for backend-to-backend calls

### DevOps
- Docker & Docker Compose
- Nginx
- Vercel (frontend)

---

## ⚡ Getting Started

### Clone the Repository

```bash
git clone https://github.com/tipubandlapalli/Udaay.git
cd Udaay
````

### Start All Services (Local)

```bash
chmod +x start-all.sh
./start-all.sh
```

This starts:

* React client
* Node.js server
* Spring Boot AI backend

---

## 🧪 Usage & Testing

1. Open the frontend in your browser:

   ```
   http://localhost:5173
   ```
2. Login with phone number + OTP
3. Upload a civic issue image
4. Observe AI-generated:

   * Issue category
   * Confidence reason
   * Priority level
5. Track issue status in real time

---

## 🔐 Authentication & Security

* OTP-based user authentication
* JWT tokens for session management
* Internal JWT secret for service-to-service communication
* Secure Google Cloud service account usage for AI calls

---

## 🚧 Deployment

### Frontend

* Deployed using **Vercel**
* See `VERCEL_DEPLOYMENT.md`

### Backend

* Dockerized Node.js & Spring Boot services
* Nginx used for reverse proxy & SSL
* See `HTTPS_SETUP.md`

---

## 🎯 Future Enhancements

* 🗺️ Map-based issue visualization
* 📩 SMS / Email notifications
* 👮 Admin & officer dashboards
* 📈 Analytics & civic reports
* 🧠 Model fine-tuning for local datasets

---

## ❤️ Contributing

Contributions are welcome!

1. Fork the repository
2. Create a new branch:

   ```bash
   git repo fork https://github.com/rohitdeka-1/Udaay.git
   ```
3. Commit your changes
4. Open a Pull Request

---

## 📜 License

This project is licensed under the **MIT License**.

---

### ✨ Built with passion for smarter cities and better civic engagement
