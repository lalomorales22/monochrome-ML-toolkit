# Monochrome ML Toolkit

[View on GitHub](https://github.com/lalomorales22/monochrome-ml-toolkit)

<img width="675" alt="Screenshot of the Monochrome ML Toolkit application interface" src="https://github.com/user-attachments/assets/3ce34fd6-b9ab-4aea-88d5-a8c41f68cc5a" />

An advanced, web-based machine learning environment designed for both learning and practical application. This toolkit empowers you to load, process, visualize, and model data using classic algorithms implemented from scratch, all within an intuitive, interactive interface.

## ✨ Core Features

This toolkit is designed to be a comprehensive, hands-on learning and analysis platform. Here's what you can do:

- **Interactive Data Handling**:
  - **Upload Your Data**: Load datasets in both **CSV** and **JSON** (array of objects) formats.
  - **AI-Powered Data Generation**: Describe the data you need, and let the AI generate custom synthetic datasets for classification or clustering directly in the app.
  - **Data Profiling**: Instantly get statistical summaries and previews of your loaded data.
  - **Data Processing**: Handle missing values with various strategies (mean, median, mode, or drop rows).
  - **Export & Save**: Download your processed data as a CSV or JSON file, or save it directly to the in-app File Gallery.

- **Hands-On Model Training**:
  - **K-Means Clustering**: Unsupervised learning with interactive cluster visualization.
  - **Logistic Regression**: Binary classification with detailed performance metrics and charts.
  - **Neural Network**: A from-scratch feed-forward network for both classification and regression. Design your own architecture and watch it train in real-time.

- **Data Visualization**:
  - A dedicated **Visualize** tab to explore your data.
  - Load data from a file or directly from your **File Gallery**.
  - Create interactive **scatter plots**, **bar charts**, and **line charts** with configurable axes.

- **AI-Powered Tools**:
  - **Integrated AI Tutor**: Ask questions about ML concepts and get contextual, educational answers from a Gemini-powered tutor.
  - **AI Data Generator**: Describe a dataset in plain English and get a structured JSON or CSV file.
  - **File Gallery**: Manage your generated and processed datasets. View, load, export, or delete files, all stored conveniently in your browser's local storage.
  - **Flexible AI Backend**: Seamlessly switches between a local Ollama instance (if available) and the Gemini API for robust AI support.

## 🚀 How to Run Locally

To get this project running on your local machine, follow these steps:

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/lalomorales22/monochrome-ml-toolkit.git
    cd monochrome-ml-toolkit
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Run the development server**:
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:9002`.

4.  **(Optional) Set up local AI with Ollama**:
    For the highest-quality, local-first AI responses, you can connect the toolkit to an Ollama instance.
    - Install [Ollama](https://ollama.com/) and run a model (e.g., `ollama run llama3`).
    - Create a `.env` file in the root of the project and add your Ollama host URL:
      ```
      OLLAMA_HOST=http://localhost:11434
      ```
    - If `OLLAMA_HOST` is not set, the app will default to using the Gemini API.

## 🕹️ How to Use the App

1.  **Load Data**: Navigate to the **Data** tab to upload a CSV/JSON file or use the AI to generate a new dataset.
2.  **Visualize Data**: Go to the **Visualize** tab to plot your data and discover patterns.
3.  **Process Data**: Use the data processing tools on the **Data** tab to clean your dataset.
4.  **Train a Model**: Go to the **Modeling** tab, select a model (K-Means, Logistic Regression, or Neural Network), configure the parameters, and click "Train Model".
5.  **Analyze Results**: Review the performance metrics and visualizations for your trained model.
6.  **Learn & Explore**: Use the **AI Tutor** and **Data Generator** tabs to deepen your understanding and create new datasets. Manage your saved files in the **File Gallery**.

---

This project was built with Firebase Studio.
