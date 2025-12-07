#  File Sharing Backend Server

This repository contains the backend API for a secure file sharing application, built according to the provided requirements. It handles user authentication, secure file storage, access control, and audit logging.

##  Important Note for Assessors (Free-Tier Hosting)

This backend is hosted on a free-tier service (**Render**), which utilizes a sleep policy to conserve resources.

**Action Required:** If this is the first API call (e.g., login, register, or fetching files) after a period of inactivity (typically 15 minutes or more), the server may take **up to 60 seconds** to spin up and process the request. Subsequent requests will be near-instant. Please wait up to a minute for the first API call to respond.

-----

### 2\. Install Dependencies

Install the required Node packages.

```bash
npm install
```

>  **Troubleshooting:** If `npm install` fails due to dependency conflicts (common with older Node versions or complex projects), use the `--legacy-peer-deps` flag:
>
> ```bash
> npm install --legacy-peer-deps
> ```

-----

## 💻 Tech Stack & Key Components

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Backend** | **Node.js, Express.js** | Provides a robust, non-blocking RESTful API structure. |
| **Database** | **MongoDB (Mongoose)** | Flexible NoSQL database used for storing user accounts and file metadata. |
| **File Storage** | **Cloudinary** | Cloud-based solution for securely storing uploaded files. |
| **Authentication** | **JWT (JSON Web Tokens)** | Used for state management and secure access control after user login. |
| **File Handling** | **Multer, Cloudinary-Storage** | Middleware used to handle multipart form data and upload streams to Cloudinary. |
| **File Serving** | **Axios (Streaming)** | Used to fetch files from Cloudinary and **stream** them securely through the server, ensuring correct headers for all file types (PDF, DOCX). |
| **Audit Log** | **Node `fs` Module** | Simple, file-system based logging for recording file activity (`audit.log`). |

-----

## Features Implemented

The server provides endpoints to support the following functionalities, including core requirements and bonus features:

### Core Functionality

  * **User Authentication:** Secure registration and login.
  * **File Upload:** Handles file uploads with validation for size (**Max 5MB**) and type (**Photos, PDF, Word, Excel, CSV**).
  * **Access Control:** Strict authorization checks to ensure only owners or explicitly shared users can download a file.
  * **File Sharing (Users):** Allows file owners to share access with specific registered users.
  * **File Sharing (Link):** Generates a secure link requiring user authentication for access.
  * **Metadata Management:** Stores and retrieves file metadata (name, type, size, owner, creation date).

### Bonus Features

  * **Link Expiry:** Owners can set an expiration time for shared links, after which access is automatically revoked.
  * **Audit Log:** Records critical file activities (shares, link generation, downloads) to a file on the server (`audit.log`).

-----

## Local Setup Instructions

Follow these steps to get the server running on your local machine.

### 1\. Clone the Repository

```bash
git clone <your-server-repo-url>
cd <your-server-repo-folder>
```


### 3\. Environment Configuration

Create a file named **`.env`** in the root directory of the server folder and add the following keys. You must provide your own credentials for MongoDB Atlas and Cloudinary.

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database (MongoDB Atlas is required for cloud deployment)
MONGO_URI="mongodb+srv://<username>:<password>@<cluster_name>/<db_name>?retryWrites=true&w=majority"

# Security
JWT_SECRET="YOUR_LONG_AND_RANDOM_SECRET_KEY"

# File Storage (Cloudinary)
CLOUDINARY_CLOUD_NAME="your_cloud_name"
CLOUDINARY_API_KEY="your_api_key"
CLOUDINARY_API_SECRET="your_api_secret"

```

### 4\. Start the Server

Start the application in development mode:

```bash
npm start
```

-----

## API Endpoints

The API base path is `/api/`.

| Route | Method | Description | Authentication |
| :--- | :--- | :--- | :--- |
| `/auth/register` | `POST` | Registers a new user. | None |
| `/auth/login` | `POST` | Logs in a user and returns a JWT token. | None |
| `/files/upload` | `POST` | Uploads up to 5 files to Cloudinary. | Required |
| `/files` | `GET` | Retrieves files owned by and shared with the user. | Required |
| `/files/:id/share/user` | `POST` | Shares a file with specified users. | Owner |
| `/files/:id/share/link` | `POST` | Generates a time-limited share link. | Owner |
| `/files/:id/download` | `GET` | Streams a file download via the dashboard. | Owner/Shared User |
| `/files/access/:token` | `GET` | Streams a file download via a shared link. | Authenticated User |
| `/files/:id/audit-log` | `GET` | Retrieves the file's activity log. | Owner |