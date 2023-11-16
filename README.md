# Credit System Application

This credit system application is designed to manage customer registrations, loan eligibility checks, loan views, and loan payments. The application is containerized using Docker for easy setup and deployment.

## Prerequisites

Before you start, ensure you have the following installed on your machine:

- Docker
- Docker Compose

## Getting Started

To set up the project on your local machine:

### Installation

1. **Clone the Repository**

    ```bash
    git clone https://github.com/shukapurv/credit-system.git
    ```

2. **Navigate to the Project Directory**

    ```bash
    cd credit-system
    ```

3. **Build and Run with Docker Compose**

    ```bash
    docker-compose up --build
    ```

   The application should now be up and running at `http://localhost:6868`.

## Development

Use the following commands for development:

- **Run in Detached Mode**:

    ```bash
    docker-compose up -d
    ```

- **Stop and Remove Containers, Networks, and Volumes**:

    ```bash
    docker-compose down
    ```

